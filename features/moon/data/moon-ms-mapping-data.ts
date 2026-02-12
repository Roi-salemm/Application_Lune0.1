// Acces SQLite a ms_mapping pour derive age de lunaison et phase.
// Pourquoi : utiliser uniquement les tables locales sans dependance reseau.
// Infos : phase = 0 represente la nouvelle lune, phase_hour contient l'heure exacte (UTC) si fournie.
import { initMoonDb } from '@/features/moon/moon-db';
import { formatLocalDayKey, formatSqlUtc, parseSqlUtc, toNumber } from '@/features/moon/data/moon-sql-utils';

export type MsMappingRow = {
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

export type MsMappingCycleBounds = {
  start: Date | null;
  end: Date | null;
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

/*
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
*/

async function fetchMsMappingRowForLocalDay(targetDate: Date) {
  const dayKey = formatLocalDayKey(targetDate);
  const db = await initMoonDb();
  return await db.getFirstAsync<MsMappingRow>(
    `SELECT ts_utc, phase, phase_hour, m10_illum_frac, m31_ecl_lon_deg, s31_ecl_lon_deg
     FROM ms_mapping
     WHERE ts_utc LIKE ?
     ORDER BY ts_utc ASC
     LIMIT 1`,
    [`${dayKey}%`]
  );
}

export async function fetchMsMappingLocalDayRow(targetDate: Date): Promise<MsMappingRow | null> {
  const row = await fetchMsMappingRowForLocalDay(targetDate);
  return row?.ts_utc ? row : null;
}

/*
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
*/

export async function fetchMsMappingSnapshot(
  targetDate: Date
): Promise<MsMappingSnapshot | null> {
  const row = await fetchMsMappingRowForLocalDay(targetDate);
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

/*
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
*/

// Requete unique pour trouver debut/fin du cycle courant (deux nouvelles lunes consecutives).
// Pourquoi : fiabiliser le calcul avec phase_hour normalise et une seule source de verite.
export async function fetchMsMappingCycleBoundsUtc(
  targetDate: Date
): Promise<MsMappingCycleBounds> {
  const db = await initMoonDb();
  const targetUtc = formatSqlUtc(targetDate);
  const row = await db.getFirstAsync<{
    cycle_start_utc?: string | null;
    cycle_end_utc?: string | null;
  }>(
    `WITH nm AS (
       SELECT CASE
         WHEN phase_hour IS NULL THEN NULL
         WHEN instr(phase_hour, '-') = 0 THEN datetime(date(ts_utc) || ' ' || phase_hour)
         ELSE datetime(replace(substr(phase_hour, 1, 19), 'T', ' '))
       END AS nm_utc
       FROM ms_mapping
       WHERE CAST(phase AS INTEGER) = 0
         AND phase_hour IS NOT NULL
     ),
     valid_nm AS (
       SELECT nm_utc FROM nm WHERE nm_utc IS NOT NULL
     ),
     last_nm AS (
       SELECT nm_utc
       FROM valid_nm
       WHERE nm_utc <= datetime(?)
       ORDER BY nm_utc DESC
       LIMIT 1
     ),
     next_nm AS (
       SELECT nm_utc
       FROM valid_nm
       WHERE nm_utc > (SELECT nm_utc FROM last_nm)
       ORDER BY nm_utc ASC
       LIMIT 1
     )
     SELECT
       (SELECT nm_utc FROM last_nm) AS cycle_start_utc,
       (SELECT nm_utc FROM next_nm) AS cycle_end_utc`,
    [targetUtc]
  );

  return {
    start: row?.cycle_start_utc ? parseSqlUtc(row.cycle_start_utc) : null,
    end: row?.cycle_end_utc ? parseSqlUtc(row.cycle_end_utc) : null,
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

// Trouve la prochaine nouvelle lune a partir du jour local (sans filtrer par heure).
// Pourquoi : rester aligne avec une table journaliere tout en gardant phase_hour comme reference exacte.
/*
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

  const row = await db.getFirstAsync<MsMappingRow>(
    `SELECT ts_utc, phase_hour
     FROM ms_mapping
     WHERE phase = 0 AND phase_hour IS NOT NULL AND phase_hour >= ?
     ORDER BY phase_hour ASC
     LIMIT 1`,
    [dayStartUtc]
  );

  if (!row?.phase_hour) {
    return null;
  }

  return parseSqlUtc(row.phase_hour);
}
*/

// Trouve la prochaine nouvelle lune en reconstituant l'heure d'event (date ts_utc + phase_hour).
// Pourquoi : obtenir l'event exact du prochain cycle en s'appuyant sur phase_hour.
/*
export async function fetchMsMappingNextNewMoonEventUtc(): Promise<{
  cycleStartLocal: string | null;
  previousCycleStartLocal: string | null;
  nextCycleStartLocal: string | null;
}> {
  const db = await initMoonDb();
  const row = await db.getFirstAsync<{
    cycle_start_local?: string | null;
    previous_cycle_start_local?: string | null;
    next_cycle_start_local?: string | null;
  }>(
    `WITH nm AS (
       SELECT CASE
         WHEN phase_hour IS NULL THEN NULL
         WHEN instr(phase_hour, '-') = 0 THEN datetime(date(ts_utc) || ' ' || phase_hour)
         ELSE datetime(replace(substr(phase_hour, 1, 19), 'T', ' '))
       END AS nm_utc
       FROM ms_mapping
       WHERE CAST(phase AS INTEGER) = 0
         AND phase_hour IS NOT NULL
     ),
     last_nm AS (
       SELECT nm_utc
       FROM nm
       WHERE nm_utc <= datetime('now')
       ORDER BY nm_utc DESC
       LIMIT 1
     )
     SELECT
       datetime((SELECT nm_utc FROM last_nm), 'localtime') AS cycle_start_local,
       datetime((
         SELECT nm_utc
         FROM nm
         WHERE nm_utc < (SELECT nm_utc FROM last_nm)
         ORDER BY nm_utc DESC
         LIMIT 1
       ), 'localtime') AS previous_cycle_start_local,
       datetime((
         SELECT nm_utc
         FROM nm
         WHERE nm_utc > datetime('now')
         ORDER BY nm_utc ASC
         LIMIT 1
       ), 'localtime') AS next_cycle_start_local`
  );

  return {
    cycleStartLocal: row?.cycle_start_local ?? null,
    previousCycleStartLocal: row?.previous_cycle_start_local ?? null,
    nextCycleStartLocal: row?.next_cycle_start_local ?? null,
  };
}
*/

export async function fetchMsMappingPhaseHourDiagnostics(): Promise<{
  invalidCount: number;
  totalCount: number;
  invalidSamples: Array<{ phase_hour: string | null }>;
  feb17Row: { phase_hour: string | null } | null;
}> {
  const db = await initMoonDb();
  const stats = await db.getFirstAsync<{ invalid_count: number; total_count: number }>(
    `SELECT
       SUM(CASE WHEN datetime(phase_hour) IS NULL THEN 1 ELSE 0 END) AS invalid_count,
       COUNT(*) AS total_count
     FROM ms_mapping
     WHERE CAST(phase AS INTEGER) = 0 AND phase_hour IS NOT NULL`
  );

  const invalidSamples = await db.getAllAsync<{ phase_hour: string | null }>(
    `SELECT phase_hour
     FROM ms_mapping
     WHERE CAST(phase AS INTEGER) = 0
       AND phase_hour IS NOT NULL
       AND datetime(phase_hour) IS NULL
     ORDER BY phase_hour ASC
     LIMIT 5`
  );

  const feb17Row = await db.getFirstAsync<{ phase_hour: string | null }>(
    `SELECT phase_hour
     FROM ms_mapping
     WHERE CAST(phase AS INTEGER) = 0
       AND phase_hour IS NOT NULL
       AND substr(phase_hour, 1, 10) = '2026-02-17'
     ORDER BY phase_hour ASC
     LIMIT 1`
  );

  return {
    invalidCount: stats?.invalid_count ?? 0,
    totalCount: stats?.total_count ?? 0,
    invalidSamples: invalidSamples ?? [],
    feb17Row: feb17Row ?? null,
  };
}
