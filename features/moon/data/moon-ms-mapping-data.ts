// Acces SQLite a ms_mapping pour derive age de lunaison et phase.
// Pourquoi : utiliser uniquement les tables locales sans dependance reseau.
// Infos : phase = 0 represente la nouvelle lune, phase_hour contient l'heure exacte (UTC) si fournie.
import { initMoonDb } from '@/features/moon/moon-db';
import { formatSqlUtc, parseSqlUtc, toNumber } from '@/features/moon/data/moon-sql-utils';

type MsMappingRow = {
  ts_utc: string;
  phase?: number | string | null;
  phase_hour?: string | null;
  m10_illum_frac?: number | string | null;
  m31_ecl_lon_deg?: number | string | null;
  s31_ecl_lon_deg?: number | string | null;
};

export type MsMappingSnapshot = {
  asOf: Date;
  illuminationPct: number | null;
  phaseDeg: number | null;
};

export type MsMappingNewMoonWindow = {
  previous: Date | null;
  next: Date | null;
};

export type MsMappingPhaseHour = {
  phase: number;
  date: Date;
};

function normalizePhaseDeg(moonLon: number | null, sunLon: number | null) {
  if (moonLon === null || sunLon === null) {
    return null;
  }
  const raw = moonLon - sunLon;
  const normalized = ((raw % 360) + 360) % 360;
  return normalized;
}

function toEventDate(row: MsMappingRow) {
  const raw = row.phase_hour;
  if (!raw) {
    return null;
  }
  return parseSqlUtc(raw);
}

async function fetchNearestMsMappingRow(targetUtc: string) {
  const db = await initMoonDb();
  let row = await db.getFirstAsync<MsMappingRow>(
    `SELECT ts_utc, phase, phase_hour, m10_illum_frac, m31_ecl_lon_deg, s31_ecl_lon_deg
     FROM ms_mapping
     WHERE ts_utc <= ?
     ORDER BY ts_utc DESC
     LIMIT 1`,
    [targetUtc]
  );

  if (row?.ts_utc) {
    return row;
  }

  row = await db.getFirstAsync<MsMappingRow>(
    `SELECT ts_utc, phase, phase_hour, m10_illum_frac, m31_ecl_lon_deg, s31_ecl_lon_deg
     FROM ms_mapping
     WHERE ts_utc >= ?
     ORDER BY ts_utc ASC
     LIMIT 1`,
    [targetUtc]
  );

  return row?.ts_utc ? row : null;
}

async function fetchNewMoonCandidate(
  targetUtc: string,
  comparator: '<=' | '>=',
  order: 'ASC' | 'DESC'
) {
  const db = await initMoonDb();
  const row = await db.getFirstAsync<MsMappingRow>(
    `SELECT ts_utc, phase_hour
     FROM ms_mapping
     WHERE phase = 0 AND phase_hour IS NOT NULL AND phase_hour ${comparator} ?
     ORDER BY phase_hour ${order}
     LIMIT 1`,
    [targetUtc]
  );

  if (!row?.ts_utc) {
    return null;
  }

  return toEventDate(row);
}

export async function fetchMsMappingSnapshot(
  targetDate: Date
): Promise<MsMappingSnapshot | null> {
  const targetUtc = formatSqlUtc(targetDate);
  const row = await fetchNearestMsMappingRow(targetUtc);
  if (!row?.ts_utc) {
    return null;
  }

  const asOf = parseSqlUtc(row.ts_utc);
  if (!asOf) {
    return null;
  }

  const illumRaw = toNumber(row.m10_illum_frac);
  const illuminationPct =
    illumRaw === null ? null : illumRaw <= 1 ? illumRaw * 100 : illumRaw;

  const moonLon = toNumber(row.m31_ecl_lon_deg);
  const sunLon = toNumber(row.s31_ecl_lon_deg);
  const phaseDeg = normalizePhaseDeg(moonLon, sunLon);

  return {
    asOf,
    illuminationPct,
    phaseDeg,
  };
}

export async function fetchMsMappingNewMoonWindow(
  targetDate: Date
): Promise<MsMappingNewMoonWindow> {
  const targetUtc = formatSqlUtc(targetDate);
  const [previous, next] = await Promise.all([
    fetchNewMoonCandidate(targetUtc, '<=', 'DESC'),
    fetchNewMoonCandidate(targetUtc, '>=', 'ASC'),
  ]);

  return {
    previous,
    next,
  };
}

// Recupere les dates de phases (phase_hour) dans une plage donnee.
// Pourquoi : afficher les jours de phases dans le calendrier sans charger toute la table.
export async function fetchMsMappingPhaseHoursInRange(params: {
  start: Date;
  end: Date;
}): Promise<MsMappingPhaseHour[]> {
  const startUtc = formatSqlUtc(params.start);
  const endUtc = formatSqlUtc(params.end);
  const db = await initMoonDb();
  const rows = await db.getAllAsync<MsMappingRow>(
    `SELECT phase, phase_hour
     FROM ms_mapping
     WHERE phase_hour IS NOT NULL
       AND phase >= 0 AND phase <= 7
       AND phase_hour >= ? AND phase_hour <= ?
     ORDER BY phase_hour ASC`,
    [startUtc, endUtc]
  );

  if (!rows?.length) {
    return [];
  }

  const results: MsMappingPhaseHour[] = [];
  for (const row of rows) {
    const phaseNumeric = typeof row.phase === 'string' ? Number(row.phase) : row.phase;
    if (!Number.isFinite(phaseNumeric)) {
      continue;
    }
    const date = row.phase_hour ? parseSqlUtc(row.phase_hour) : null;
    if (!date) {
      continue;
    }
    results.push({ phase: phaseNumeric as number, date });
  }
  return results;
}

// Compte le numero de cycle lunaire dans l'annee courante (incluant le cycle actuel).
// Pourquoi : afficher un indice de lunaison base sur les nouvelles lunes de ms_mapping.
export async function fetchMsMappingYearCycleIndex(params: {
  targetDate: Date;
  currentCycleStart: Date | null;
}): Promise<number | null> {
  const { targetDate, currentCycleStart } = params;
  if (!currentCycleStart) {
    return null;
  }

  const yearStartLocal = new Date(targetDate.getFullYear(), 0, 1);
  if (currentCycleStart.getTime() < yearStartLocal.getTime()) {
    return 1;
  }

  const startUtc = formatSqlUtc(yearStartLocal);
  const endUtc = formatSqlUtc(currentCycleStart);
  const db = await initMoonDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM ms_mapping
     WHERE phase = 0 AND phase_hour IS NOT NULL AND phase_hour >= ? AND phase_hour <= ?`,
    [startUtc, endUtc]
  );

  const count = row?.cnt ?? 0;
  return count > 0 ? count : 1;
}

// Trouve la prochaine nouvelle lune en partant du debut du jour local.
// Pourquoi : eviter d'utiliser l'heure courante pour la recherche, tout en gardant phase_hour comme reference exacte.
export async function fetchMsMappingNextNewMoonFromDayStart(
  targetDate: Date
): Promise<Date | null> {
  const db = await initMoonDb();
  const dayStartLocal = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );
  const dayStartUtc = formatSqlUtc(dayStartLocal);
  const nowUtc = formatSqlUtc(targetDate);

  const fetchNextAfter = async (utc: string) => {
    const row = await db.getFirstAsync<MsMappingRow>(
      `SELECT ts_utc, phase_hour
       FROM ms_mapping
       WHERE phase = 0 AND phase_hour IS NOT NULL AND phase_hour >= ?
       ORDER BY phase_hour ASC
       LIMIT 1`,
      [utc]
    );

    return row?.phase_hour ? parseSqlUtc(row.phase_hour) : null;
  };

  const candidate = await fetchNextAfter(dayStartUtc);
  if (!candidate) {
    return null;
  }

  if (candidate.getTime() <= targetDate.getTime()) {
    return await fetchNextAfter(nowUtc);
  }

  return candidate;
}
