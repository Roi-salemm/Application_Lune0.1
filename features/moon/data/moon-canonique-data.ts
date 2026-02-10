// Acces SQLite a canonique_data pour fournir la distance Terre-Lune.
// Pourquoi : lire des donnees locales, sans reseau, et eviter des dependances UI.
import { initMoonDb } from '@/features/moon/moon-db';
import { formatSqlUtc, parseSqlUtc, toNumber } from '@/features/moon/data/moon-sql-utils';

type CanoniqueRow = {
  ts_utc: string;
  m20_range_km?: number | string | null;
  m10_illum_frac?: number | string | null;
};

export type CanoniqueDistanceSnapshot = {
  asOf: Date;
  distKm: number | null;
};

export type CanoniqueIlluminationPoint = {
  asOf: Date;
  illumFrac: number | null;
};

export type CanoniqueIlluminationWindow = {
  previous: CanoniqueIlluminationPoint | null;
  next: CanoniqueIlluminationPoint | null;
};

async function fetchNearestCanoniqueRow(targetUtc: string) {
  const db = await initMoonDb();
  let row = await db.getFirstAsync<CanoniqueRow>(
    `SELECT ts_utc, m20_range_km, m10_illum_frac
     FROM canonique_data
     WHERE ts_utc <= ?
     ORDER BY ts_utc DESC
     LIMIT 1`,
    [targetUtc]
  );

  if (row?.ts_utc) {
    return row;
  }

  row = await db.getFirstAsync<CanoniqueRow>(
    `SELECT ts_utc, m20_range_km, m10_illum_frac
     FROM canonique_data
     WHERE ts_utc >= ?
     ORDER BY ts_utc ASC
     LIMIT 1`,
    [targetUtc]
  );

  return row?.ts_utc ? row : null;
}

async function fetchCanoniqueRowBefore(targetUtc: string) {
  const db = await initMoonDb();
  const row = await db.getFirstAsync<CanoniqueRow>(
    `SELECT ts_utc, m10_illum_frac
     FROM canonique_data
     WHERE ts_utc <= ?
     ORDER BY ts_utc DESC
     LIMIT 1`,
    [targetUtc]
  );

  return row?.ts_utc ? row : null;
}

async function fetchCanoniqueRowAfter(targetUtc: string) {
  const db = await initMoonDb();
  const row = await db.getFirstAsync<CanoniqueRow>(
    `SELECT ts_utc, m10_illum_frac
     FROM canonique_data
     WHERE ts_utc >= ?
     ORDER BY ts_utc ASC
     LIMIT 1`,
    [targetUtc]
  );

  return row?.ts_utc ? row : null;
}

export async function fetchCanoniqueDistanceSnapshot(
  targetDate: Date
): Promise<CanoniqueDistanceSnapshot | null> {
  const targetUtc = formatSqlUtc(targetDate);
  const row = await fetchNearestCanoniqueRow(targetUtc);
  if (!row?.ts_utc) {
    return null;
  }

  const asOf = parseSqlUtc(row.ts_utc);
  if (!asOf) {
    return null;
  }

  return {
    asOf,
    distKm: toNumber(row.m20_range_km),
  };
}

// Fenetre d'illumination autour d'une date (ligne precedente et suivante).
// Pourquoi : permettre une interpolation temporelle entre deux pas de 10 minutes.
export async function fetchCanoniqueIlluminationWindow(
  targetDate: Date
): Promise<CanoniqueIlluminationWindow> {
  const targetUtc = formatSqlUtc(targetDate);
  const [previousRow, nextRow] = await Promise.all([
    fetchCanoniqueRowBefore(targetUtc),
    fetchCanoniqueRowAfter(targetUtc),
  ]);

  const toPoint = (row: CanoniqueRow | null): CanoniqueIlluminationPoint | null => {
    if (!row?.ts_utc) {
      return null;
    }
    const asOf = parseSqlUtc(row.ts_utc);
    if (!asOf) {
      return null;
    }
    return {
      asOf,
      illumFrac: toNumber(row.m10_illum_frac),
    };
  };

  return {
    previous: toPoint(previousRow),
    next: toPoint(nextRow),
  };
}
