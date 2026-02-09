// Acces SQLite aux caches lunaires (canonique, ms_mapping).
// Pourquoi : centraliser la creation des tables et les operations d'ecriture.
import * as SQLite from 'expo-sqlite';

import type { MoonCanoniqueRow, MoonMsMappingRow } from '@/features/moon/moon.api';

const DB_NAME = 'moon_ephemeris.db';
const CANONIQUE_TABLE = 'canonique_data';
const MS_MAPPING_TABLE = 'ms_mapping';

const CANONIQUE_COLUMNS = [
  { name: 'ts_utc', type: 'TEXT PRIMARY KEY' },
  { name: 'm1_ra_ast_deg', type: 'REAL' },
  { name: 'm1_dec_ast_deg', type: 'REAL' },
  { name: 'm2_ra_app_deg', type: 'REAL' },
  { name: 'm2_dec_app_deg', type: 'REAL' },
  { name: 'm10_illum_frac', type: 'REAL' },
  { name: 'm20_range_km', type: 'REAL' },
  { name: 'm20_range_rate_km_s', type: 'REAL' },
  { name: 'm31_ecl_lon_deg', type: 'REAL' },
  { name: 'm31_ecl_lat_deg', type: 'REAL' },
  { name: 'm43_pab_lon_deg', type: 'REAL' },
  { name: 'm43_pab_lat_deg', type: 'REAL' },
  { name: 'm43_phi_deg', type: 'REAL' },
  { name: 's31_ecl_lon_deg', type: 'REAL' },
  { name: 's31_ecl_lat_deg', type: 'REAL' },
  { name: 'created_at_utc', type: 'TEXT' },
];

const MS_MAPPING_COLUMNS = [
  { name: 'ts_utc', type: 'TEXT PRIMARY KEY' },
  { name: 'id', type: 'INTEGER' },
  { name: 'm43_pab_lon_deg', type: 'REAL' },
  { name: 'm10_illum_frac', type: 'REAL' },
  { name: 'm31_ecl_lon_deg', type: 'REAL' },
  { name: 's31_ecl_lon_deg', type: 'REAL' },
  { name: 'phase', type: 'INTEGER' },
  { name: 'phase_hour', type: 'TEXT' },
];

async function ensureColumns(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columns: Array<{ name: string; type: string }>
) {
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${tableName}")`);
  const existing = new Set(info.map((col) => col.name));

  for (const column of columns) {
    if (!existing.has(column.name)) {
      await db.runAsync(`ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`);
    }
  }
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getMoonDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }

  return dbPromise;
}

export async function initMoonDb() {
  const db = await getMoonDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS ${CANONIQUE_TABLE} (${CANONIQUE_COLUMNS.map((col) => `${col.name} ${col.type}`).join(', ')});
    CREATE INDEX IF NOT EXISTS idx_canonique_data_ts ON ${CANONIQUE_TABLE} (ts_utc);
    CREATE TABLE IF NOT EXISTS ${MS_MAPPING_TABLE} (${MS_MAPPING_COLUMNS.map((col) => `${col.name} ${col.type}`).join(', ')});
    CREATE INDEX IF NOT EXISTS idx_ms_mapping_ts ON ${MS_MAPPING_TABLE} (ts_utc);
  `);

  await ensureColumns(db, CANONIQUE_TABLE, CANONIQUE_COLUMNS);
  await ensureColumns(db, MS_MAPPING_TABLE, MS_MAPPING_COLUMNS);

  return db;
}

export async function getMoonCanoniqueRange(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{
    min_ts: string | null;
    max_ts: string | null;
    cnt: number;
  }>(`SELECT MIN(ts_utc) AS min_ts, MAX(ts_utc) AS max_ts, COUNT(*) AS cnt FROM ${CANONIQUE_TABLE}`);

  return {
    min_ts: row?.min_ts ?? null,
    max_ts: row?.max_ts ?? null,
    cnt: row?.cnt ?? 0,
  };
}

export async function upsertMoonCanoniqueRows(
  db: SQLite.SQLiteDatabase,
  rows: MoonCanoniqueRow[]
) {
  const validRows = rows.filter((row) => row.ts_utc);
  if (!validRows.length) {
    return;
  }

  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`
      INSERT OR REPLACE INTO ${CANONIQUE_TABLE} (
        ts_utc,
        m1_ra_ast_deg,
        m1_dec_ast_deg,
        m2_ra_app_deg,
        m2_dec_app_deg,
        m10_illum_frac,
        m20_range_km,
        m20_range_rate_km_s,
        m31_ecl_lon_deg,
        m31_ecl_lat_deg,
        m43_pab_lon_deg,
        m43_pab_lat_deg,
        m43_phi_deg,
        s31_ecl_lon_deg,
        s31_ecl_lat_deg,
        created_at_utc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const row of validRows) {
        await statement.executeAsync([
          row.ts_utc,
          row.m1_ra_ast_deg ?? null,
          row.m1_dec_ast_deg ?? null,
          row.m2_ra_app_deg ?? null,
          row.m2_dec_app_deg ?? null,
          row.m10_illum_frac ?? null,
          row.m20_range_km ?? null,
          row.m20_range_rate_km_s ?? null,
          row.m31_ecl_lon_deg ?? null,
          row.m31_ecl_lat_deg ?? null,
          row.m43_pab_lon_deg ?? null,
          row.m43_pab_lat_deg ?? null,
          row.m43_phi_deg ?? null,
          row.s31_ecl_lon_deg ?? null,
          row.s31_ecl_lat_deg ?? null,
          row.created_at_utc ?? null,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function pruneMoonCanoniqueOutsideRange(
  db: SQLite.SQLiteDatabase,
  start: string,
  end: string
) {
  await db.runAsync(
    `DELETE FROM ${CANONIQUE_TABLE} WHERE ts_utc < ? OR ts_utc > ?`,
    [start, end]
  );
}

export async function getMsMappingRange(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{
    min_ts: string | null;
    max_ts: string | null;
    cnt: number;
  }>(`SELECT MIN(ts_utc) AS min_ts, MAX(ts_utc) AS max_ts, COUNT(*) AS cnt FROM ${MS_MAPPING_TABLE}`);

  return {
    min_ts: row?.min_ts ?? null,
    max_ts: row?.max_ts ?? null,
    cnt: row?.cnt ?? 0,
  };
}

export async function upsertMsMappingRows(
  db: SQLite.SQLiteDatabase,
  rows: MoonMsMappingRow[]
) {
  const validRows = rows.filter((row) => row.ts_utc);
  if (!validRows.length) {
    return;
  }

  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`
      INSERT OR REPLACE INTO ${MS_MAPPING_TABLE} (
        ts_utc,
        id,
        m43_pab_lon_deg,
        m10_illum_frac,
        m31_ecl_lon_deg,
        s31_ecl_lon_deg,
        phase,
        phase_hour
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const row of validRows) {
        await statement.executeAsync([
          row.ts_utc,
          row.id ?? null,
          row.m43_pab_lon_deg ?? null,
          row.m10_illum_frac ?? null,
          row.m31_ecl_lon_deg ?? null,
          row.s31_ecl_lon_deg ?? null,
          row.phase ?? null,
          row.phase_hour ?? null,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function pruneMsMappingOutsideRange(
  db: SQLite.SQLiteDatabase,
  start: string,
  end: string
) {
  await db.runAsync(
    `DELETE FROM ${MS_MAPPING_TABLE} WHERE ts_utc < ? OR ts_utc > ?`,
    [start, end]
  );
}
