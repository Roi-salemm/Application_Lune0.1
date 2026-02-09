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

async function fetchNewMoonCandidate(targetUtc: string, comparator: '<=' | '>=', order: 'ASC' | 'DESC') {
  const db = await initMoonDb();
  const row = await db.getFirstAsync<MsMappingRow>(
    `SELECT ts_utc, phase_hour
     FROM ms_mapping
     WHERE phase = 0 AND phase_hour IS NOT NULL AND ts_utc ${comparator} ?
     ORDER BY ts_utc ${order}
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
