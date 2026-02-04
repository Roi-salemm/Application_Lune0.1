// Acces SQLite aux ephemerides lunaires pour l'app.
// Pourquoi : centraliser les requetes locales et isoler le format ts_utc du reste du code.
import { initMoonDb } from '@/features/moon/moon-db';
import { formatSqlUtc, parseSqlUtc, toNumber } from '@/features/moon/data/moon-sql-utils';

type MoonEphemerisRow = {
  ts_utc: string;
  illum_pct?: number | string | null;
  age_days?: number | string | null;
  phase_deg?: number | string | null;
  axis_a_deg?: number | string | null;
  dist_km?: number | string | null;
};

export type MoonEphemerisSnapshot = {
  asOf: Date;
  illumPct: number | null;
  ageDays: number | null;
  phaseDeg: number | null;
  axisADeg: number | null;
  distKm: number | null;
};

async function getNearestEphemerisRow(targetUtc: string) {
  const db = await initMoonDb();
  let row = await db.getFirstAsync<MoonEphemerisRow>(
    `SELECT ts_utc, illum_pct, age_days, phase_deg, axis_a_deg, dist_km
     FROM moon_ephemeris_hour
     WHERE ts_utc <= ?
     ORDER BY ts_utc DESC
     LIMIT 1`,
    [targetUtc]
  );

  if (row?.ts_utc) {
    return row;
  }

  row = await db.getFirstAsync<MoonEphemerisRow>(
    `SELECT ts_utc, illum_pct, age_days, phase_deg, axis_a_deg, dist_km
     FROM moon_ephemeris_hour
     WHERE ts_utc >= ?
     ORDER BY ts_utc ASC
     LIMIT 1`,
    [targetUtc]
  );

  return row?.ts_utc ? row : null;
}

export async function fetchMoonEphemerisSnapshot(
  targetDate: Date
): Promise<MoonEphemerisSnapshot | null> {
  const targetUtc = formatSqlUtc(targetDate);
  const row = await getNearestEphemerisRow(targetUtc);
  if (!row?.ts_utc) {
    return null;
  }

  const asOf = parseSqlUtc(row.ts_utc);
  if (!asOf) {
    return null;
  }

  return {
    asOf,
    illumPct: toNumber(row.illum_pct),
    ageDays: toNumber(row.age_days),
    phaseDeg: toNumber(row.phase_deg),
    axisADeg: toNumber(row.axis_a_deg),
    distKm: toNumber(row.dist_km),
  };
}
