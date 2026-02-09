// Synchronisation des caches lunaires (canonique, ms_mapping).
// Pourquoi : maintenir des donnees locales a jour avec une fenetre glissante.
import {
  fetchMoonCanoniqueRange,
  fetchMoonMsMappingRange,
  type MoonCanoniqueResponse,
  type MoonMsMappingResponse,
} from '@/features/moon/moon.api';
import {
  getCanoniqueLastSyncUtcDay,
  setCanoniqueLastSyncUtcDay,
} from '@/features/moon/data/canonique-sync-state';
import {
  getMoonCanoniqueRange,
  getMsMappingRange,
  initMoonDb,
  pruneMoonCanoniqueOutsideRange,
  pruneMsMappingOutsideRange,
  upsertMoonCanoniqueRows,
  upsertMsMappingRows,
} from '@/features/moon/moon-db';

type MoonCanoniqueSyncResult = {
  ready: boolean;
  fetched: number;
  rangeStart: string;
  rangeEnd: string;
  skipped: boolean;
};

type MoonCanoniqueSyncOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

type MoonMsMappingSyncResult = {
  ready: boolean;
  fetched: number;
  rangeStart: string;
  rangeEnd: string;
  skipped: boolean;
};

type MoonMsMappingSyncOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatUtcDayKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function formatSqlUtc(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate()
  )} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(
    date.getUTCSeconds()
  )}`;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildCanoniqueRangeUtc(now = new Date(), days = 45) {
  const todayStart = startOfUtcDay(now);
  const start = addUtcDays(todayStart, -days);
  const end = endOfUtcDay(addUtcDays(todayStart, days));

  return {
    start: formatSqlUtc(start),
    end: formatSqlUtc(end),
  };
}

function buildMsMappingRangeUtc(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear() - 2, 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear() + 7, 11, 31, 23, 59, 59));

  return {
    start: formatSqlUtc(start),
    end: formatSqlUtc(end),
  };
}

function isCanoniqueRangeCovered(
  rangeStart: string,
  rangeEnd: string,
  existing: { min_ts: string | null; max_ts: string | null; cnt: number }
) {
  if (!existing.cnt || !existing.min_ts || !existing.max_ts) {
    return false;
  }
  return existing.min_ts <= rangeStart && existing.max_ts >= rangeEnd;
}

function isMsMappingRangeCovered(
  rangeStart: string,
  rangeEnd: string,
  existing: { min_ts: string | null; max_ts: string | null; cnt: number }
) {
  if (!existing.cnt || !existing.min_ts || !existing.max_ts) {
    return false;
  }
  return existing.min_ts <= rangeStart && existing.max_ts >= rangeEnd;
}

function buildCanoniqueMissingSegments(
  rangeStart: string,
  rangeEnd: string,
  existing: { min_ts: string | null; max_ts: string | null; cnt: number }
) {
  if (!existing.cnt || !existing.min_ts || !existing.max_ts) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  if (existing.max_ts < rangeStart || existing.min_ts > rangeEnd) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  const segments: Array<{ start: string; end: string }> = [];
  if (existing.min_ts > rangeStart) {
    segments.push({ start: rangeStart, end: existing.min_ts });
  }
  if (existing.max_ts < rangeEnd) {
    segments.push({ start: existing.max_ts, end: rangeEnd });
  }

  return segments;
}

function buildMsMappingMissingSegments(
  rangeStart: string,
  rangeEnd: string,
  existing: { min_ts: string | null; max_ts: string | null; cnt: number }
) {
  if (!existing.cnt || !existing.min_ts || !existing.max_ts) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  if (existing.max_ts < rangeStart || existing.min_ts > rangeEnd) {
    return [{ start: rangeStart, end: rangeEnd }];
  }

  const segments: Array<{ start: string; end: string }> = [];
  if (existing.min_ts > rangeStart) {
    segments.push({ start: rangeStart, end: existing.min_ts });
  }
  if (existing.max_ts < rangeEnd) {
    segments.push({ start: existing.max_ts, end: rangeEnd });
  }

  return segments;
}

export async function syncMoonCanoniqueData(
  options: MoonCanoniqueSyncOptions = {}
): Promise<MoonCanoniqueSyncResult> {
  const { signal, force = false } = options;
  const now = new Date();
  const todayKey = formatUtcDayKey(now);
  const range = buildCanoniqueRangeUtc(now, 45);
  const db = await initMoonDb();
  const existing = await getMoonCanoniqueRange(db);
  const isCovered = isCanoniqueRangeCovered(range.start, range.end, existing);
  const lastSync = await getCanoniqueLastSyncUtcDay();

  if (!force && lastSync === todayKey && isCovered) {
    return {
      ready: true,
      fetched: 0,
      rangeStart: range.start,
      rangeEnd: range.end,
      skipped: true,
    };
  }

  let fetched = 0;
  const segments = buildCanoniqueMissingSegments(range.start, range.end, existing);

  for (const segment of segments) {
    const response = await fetchMoonCanoniqueRange(segment.start, segment.end, signal);
    const payload = response as MoonCanoniqueResponse;
    if (!Array.isArray(payload.items)) {
      throw new Error('Moon canonique payload missing items array');
    }
    if (payload.items.length) {
      await upsertMoonCanoniqueRows(db, payload.items);
      fetched += payload.items.length;
    }
  }

  await pruneMoonCanoniqueOutsideRange(db, range.start, range.end);
  await setCanoniqueLastSyncUtcDay(todayKey);
  const updated = await getMoonCanoniqueRange(db);

  return {
    ready: isCanoniqueRangeCovered(range.start, range.end, updated),
    fetched,
    rangeStart: range.start,
    rangeEnd: range.end,
    skipped: false,
  };
}

export async function syncMoonMsMappingData(
  options: MoonMsMappingSyncOptions = {}
): Promise<MoonMsMappingSyncResult> {
  const { signal, force = false } = options;
  const now = new Date();
  const range = buildMsMappingRangeUtc(now);
  const db = await initMoonDb();
  const existing = await getMsMappingRange(db);
  const isCovered = isMsMappingRangeCovered(range.start, range.end, existing);

  if (!force && isCovered) {
    return {
      ready: true,
      fetched: 0,
      rangeStart: range.start,
      rangeEnd: range.end,
      skipped: true,
    };
  }

  let fetched = 0;
  const segments = buildMsMappingMissingSegments(range.start, range.end, existing);

  for (const segment of segments) {
    const response = await fetchMoonMsMappingRange(segment.start, segment.end, signal);
    const payload = response as MoonMsMappingResponse;
    if (!Array.isArray(payload.items)) {
      throw new Error('Moon ms_mapping payload missing items array');
    }
    if (payload.items.length) {
      await upsertMsMappingRows(db, payload.items);
      fetched += payload.items.length;
    }
  }

  await pruneMsMappingOutsideRange(db, range.start, range.end);
  const updated = await getMsMappingRange(db);

  return {
    ready: isMsMappingRangeCovered(range.start, range.end, updated),
    fetched,
    rangeStart: range.start,
    rangeEnd: range.end,
    skipped: false,
  };
}
