// Synchronisation des caches lunaires (ephemerides, phases, canonique).
// Pourquoi : maintenir des donnees locales a jour avec une fenetre glissante.
import {
  fetchMoonCanoniqueRange,
  fetchMoonEphemerisRange,
  fetchMoonPhaseEventsRange,
  type MoonCanoniqueResponse,
  type MoonEphemerisResponse,
  type MoonEphemerisRow,
  type MoonPhaseEventRow,
  type MoonPhaseEventsResponse,
} from '@/features/moon/moon.api';
import { getCanoniqueLastSyncUtcDay, setCanoniqueLastSyncUtcDay } from '@/features/moon/data/canonique-sync-state';
import {
  getMoonCanoniqueRange,
  hasMoonEphemerisHourRange,
  hasMoonPhaseEventRange,
  initMoonDb,
  pruneMoonCanoniqueOutsideRange,
  pruneMoonEphemerisHourOutsideRange,
  pruneMoonPhaseEventOutsideRange,
  upsertMoonCanoniqueRows,
  upsertMoonEphemerisHourRows,
  upsertMoonPhaseEventRows,
} from '@/features/moon/moon-db';

type MoonSyncResult = {
  ready: boolean;
  fetchedEphemeris: number;
  fetchedPhaseEvents: number;
  rangeStart: string;
  rangeEnd: string;
};

type MoonSyncOptions = {
  signal?: AbortSignal;
  force?: boolean;
};

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

type MoonPhaseEventInsertRow = {
  ts_utc: string;
  display_at_utc?: string | null;
  event_type?: string | null;
  phase_name?: string | null;
  phase_deg?: number | string | null;
  illum_pct?: number | string | null;
  precision_sec?: number | string | null;
  source?: string | null;
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

function buildThreeMonthRangeUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0, 23, 59, 59));

  return {
    start: formatSqlUtc(start),
    end: formatSqlUtc(end),
  };
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

function normalizeMoonPhaseEventRows(rows: MoonPhaseEventRow[]): MoonPhaseEventInsertRow[] {
  return rows.flatMap((row) => {
    if (!row.ts_utc) {
      return [];
    }

    return [
      {
        ts_utc: String(row.ts_utc),
        display_at_utc: row.display_at_utc ?? null,
        event_type: row.event_type ?? null,
        phase_name: row.phase_name ?? null,
        phase_deg: row.phase_deg ?? null,
        illum_pct: row.illum_pct ?? null,
        precision_sec: row.precision_sec ?? null,
        source: row.source ?? null,
      },
    ];
  });
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

export async function syncMoonCaches(options: MoonSyncOptions = {}): Promise<MoonSyncResult> {
  const { signal, force = false } = options;
  const db = await initMoonDb();
  const range = buildThreeMonthRangeUtc();

  const [hasEphemeris, hasEvents] = await Promise.all([
    force ? Promise.resolve(false) : hasMoonEphemerisHourRange(db, range.start, range.end),
    force ? Promise.resolve(false) : hasMoonPhaseEventRange(db, range.start, range.end),
  ]);

  let fetchedEphemeris = 0;
  let fetchedPhaseEvents = 0;

  if (!hasEphemeris || !hasEvents) {
    let ephemerisResponse: MoonEphemerisResponse | null = null;
    let phaseEventsResponse: MoonPhaseEventsResponse | null = null;

    if (!hasEphemeris) {
      try {
        ephemerisResponse = await fetchMoonEphemerisRange(range.start, range.end, signal);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw error;
        }
        console.warn('Moon ephemeris sync failed', error);
      }
    }

    if (!hasEvents) {
      try {
        phaseEventsResponse = await fetchMoonPhaseEventsRange(range.start, range.end, signal);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw error;
        }
        console.warn('Moon phase events sync failed', error);
      }
    }

    if (ephemerisResponse) {
      const payload = ephemerisResponse as MoonEphemerisResponse;
      if (!Array.isArray(payload.items)) {
        throw new Error('Moon ephemeris payload missing items array');
      }

      const ephemerisRows = payload.items;
      if (ephemerisRows.length) {
        await upsertMoonEphemerisHourRows(db, ephemerisRows);
        fetchedEphemeris = ephemerisRows.length;
      }
    }

    if (phaseEventsResponse) {
      const payload = phaseEventsResponse as MoonPhaseEventsResponse;
      if (!Array.isArray(payload.phase_events)) {
        throw new Error('Moon phase events payload missing phase_events array');
      }

      const phaseEventRows = payload.phase_events;
      if (phaseEventRows.length) {
        const normalized = normalizeMoonPhaseEventRows(phaseEventRows);
        await upsertMoonPhaseEventRows(db, normalized);
        fetchedPhaseEvents = normalized.length;
      }
    }
  }

  await pruneMoonEphemerisHourOutsideRange(db, range.start, range.end);
  await pruneMoonPhaseEventOutsideRange(db, range.start, range.end);

  const [ephemerisReady, eventsReady] = await Promise.all([
    hasMoonEphemerisHourRange(db, range.start, range.end),
    hasMoonPhaseEventRange(db, range.start, range.end),
  ]);

  return {
    ready: ephemerisReady && eventsReady,
    fetchedEphemeris,
    fetchedPhaseEvents,
    rangeStart: range.start,
    rangeEnd: range.end,
  };
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
