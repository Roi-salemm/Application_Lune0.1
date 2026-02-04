// Acces SQLite aux caches lunaires (ephemerides, phases, canonique).
// Pourquoi : centraliser la creation des tables et les operations d'ecriture.
import * as SQLite from 'expo-sqlite';

import type { MoonCanoniqueRow, MoonEphemerisRow } from '@/features/moon/moon.api';

const DB_NAME = 'moon_ephemeris.db';
const EPHEMERIS_TABLE = 'moon_ephemeris_hour';
const PHASE_EVENT_TABLE = 'moon_phase_event';
const CANONIQUE_TABLE = 'canonique_data';

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

const EPHEMERIS_COLUMNS = [
  { name: 'ts_utc', type: 'TEXT PRIMARY KEY' },
  { name: 'phase_deg', type: 'REAL' },
  { name: 'illum_pct', type: 'REAL' },
  { name: 'age_days', type: 'REAL' },
  { name: 'diam_km', type: 'REAL' },
  { name: 'dist_km', type: 'REAL' },
  { name: 'ra_hours', type: 'REAL' },
  { name: 'dec_deg', type: 'REAL' },
  { name: 'slon_deg', type: 'REAL' },
  { name: 'slat_deg', type: 'REAL' },
  { name: 'sub_obs_lon_deg', type: 'REAL' },
  { name: 'sub_obs_lat_deg', type: 'REAL' },
  { name: 'elon_deg', type: 'REAL' },
  { name: 'elat_deg', type: 'REAL' },
  { name: 'axis_a_deg', type: 'REAL' },
  { name: 'delta_au', type: 'REAL' },
  { name: 'deldot_km_s', type: 'REAL' },
  { name: 'sun_elong_deg', type: 'REAL' },
  { name: 'sun_target_obs_deg', type: 'REAL' },
  { name: 'sun_ra_hours', type: 'REAL' },
  { name: 'sun_dec_deg', type: 'REAL' },
  { name: 'sun_ecl_lon_deg', type: 'REAL' },
  { name: 'sun_ecl_lat_deg', type: 'REAL' },
  { name: 'sun_dist_au', type: 'REAL' },
  { name: 'sun_trail', type: 'TEXT' },
  { name: 'constellation', type: 'TEXT' },
  { name: 'delta_t_sec', type: 'REAL' },
  { name: 'dut1_sec', type: 'REAL' },
  { name: 'pressure_hpa', type: 'REAL' },
  { name: 'temperature_c', type: 'REAL' },
];

const PHASE_EVENT_COLUMNS = [
  { name: 'ts_utc', type: 'TEXT PRIMARY KEY' },
  { name: 'display_at_utc', type: 'TEXT' },
  { name: 'event_type', type: 'TEXT' },
  { name: 'phase_name', type: 'TEXT' },
  { name: 'phase_deg', type: 'REAL' },
  { name: 'illum_pct', type: 'REAL' },
  { name: 'precision_sec', type: 'REAL' },
  { name: 'source', type: 'TEXT' },
];

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
    DROP TABLE IF EXISTS moon_ephemeris;
    DROP TABLE IF EXISTS moon_phase_events;
    CREATE TABLE IF NOT EXISTS ${EPHEMERIS_TABLE} (${EPHEMERIS_COLUMNS.map((col) => `${col.name} ${col.type}`).join(', ')});
    CREATE INDEX IF NOT EXISTS idx_moon_ephemeris_hour_ts ON ${EPHEMERIS_TABLE} (ts_utc);
    CREATE TABLE IF NOT EXISTS ${PHASE_EVENT_TABLE} (${PHASE_EVENT_COLUMNS.map((col) => `${col.name} ${col.type}`).join(', ')});
    CREATE INDEX IF NOT EXISTS idx_moon_phase_event_ts ON ${PHASE_EVENT_TABLE} (ts_utc);
    CREATE TABLE IF NOT EXISTS ${CANONIQUE_TABLE} (${CANONIQUE_COLUMNS.map((col) => `${col.name} ${col.type}`).join(', ')});
    CREATE INDEX IF NOT EXISTS idx_canonique_data_ts ON ${CANONIQUE_TABLE} (ts_utc);
  `);

  await ensureColumns(db, EPHEMERIS_TABLE, EPHEMERIS_COLUMNS);
  await ensureColumns(db, PHASE_EVENT_TABLE, PHASE_EVENT_COLUMNS);
  await ensureColumns(db, CANONIQUE_TABLE, CANONIQUE_COLUMNS);

  return db;
}

export async function hasMoonEphemerisHourRange(db: SQLite.SQLiteDatabase, start: string, end: string) {
  const row = await db.getFirstAsync<{
    min_ts: string | null;
    max_ts: string | null;
    cnt: number;
  }>(
    `SELECT MIN(ts_utc) AS min_ts, MAX(ts_utc) AS max_ts, COUNT(*) AS cnt FROM ${EPHEMERIS_TABLE} WHERE ts_utc >= ? AND ts_utc <= ?`,
    [start, end]
  );

  if (!row || !row.cnt) {
    return false;
  }

  if (!row.min_ts || !row.max_ts) {
    return false;
  }

  return row.min_ts <= start && row.max_ts >= end;
}

export async function upsertMoonEphemerisHourRows(db: SQLite.SQLiteDatabase, rows: MoonEphemerisRow[]) {
  if (!rows.length) {
    return;
  }

  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`
      INSERT OR REPLACE INTO ${EPHEMERIS_TABLE} (
        ts_utc,
        phase_deg,
        illum_pct,
        age_days,
        diam_km,
        dist_km,
        ra_hours,
        dec_deg,
        slon_deg,
        slat_deg,
        sub_obs_lon_deg,
        sub_obs_lat_deg,
        elon_deg,
        elat_deg,
        axis_a_deg,
        delta_au,
        deldot_km_s,
        sun_elong_deg,
        sun_target_obs_deg,
        sun_ra_hours,
        sun_dec_deg,
        sun_ecl_lon_deg,
        sun_ecl_lat_deg,
        sun_dist_au,
        sun_trail,
        constellation,
        delta_t_sec,
        dut1_sec,
        pressure_hpa,
        temperature_c
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const row of rows) {
        await statement.executeAsync([
          row.ts_utc,
          row.phase_deg ?? null,
          row.illum_pct ?? null,
          row.age_days ?? null,
          row.diam_km ?? null,
          row.dist_km ?? null,
          row.ra_hours ?? null,
          row.dec_deg ?? null,
          row.slon_deg ?? null,
          row.slat_deg ?? null,
          row.sub_obs_lon_deg ?? null,
          row.sub_obs_lat_deg ?? null,
          row.elon_deg ?? null,
          row.elat_deg ?? null,
          row.axis_a_deg ?? null,
          row.delta_au ?? null,
          row.deldot_km_s ?? null,
          row.sun_elong_deg ?? null,
          row.sun_target_obs_deg ?? null,
          row.sun_ra_hours ?? null,
          row.sun_dec_deg ?? null,
          row.sun_ecl_lon_deg ?? null,
          row.sun_ecl_lat_deg ?? null,
          row.sun_dist_au ?? null,
          row.sun_trail ?? null,
          row.constellation ?? null,
          row.delta_t_sec ?? null,
          row.dut1_sec ?? null,
          row.pressure_hpa ?? null,
          row.temperature_c ?? null,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function pruneMoonEphemerisHourOutsideRange(
  db: SQLite.SQLiteDatabase,
  start: string,
  end: string
) {
  await db.runAsync(
    `DELETE FROM ${EPHEMERIS_TABLE} WHERE ts_utc < ? OR ts_utc > ?`,
    [start, end]
  );
}

export async function hasMoonPhaseEventRange(db: SQLite.SQLiteDatabase, start: string, end: string) {
  const row = await db.getFirstAsync<{
    min_ts: string | null;
    max_ts: string | null;
    cnt: number;
  }>(
    `SELECT MIN(ts_utc) AS min_ts, MAX(ts_utc) AS max_ts, COUNT(*) AS cnt FROM ${PHASE_EVENT_TABLE} WHERE ts_utc >= ? AND ts_utc <= ?`,
    [start, end]
  );

  if (!row || !row.cnt) {
    return false;
  }

  if (!row.min_ts || !row.max_ts) {
    return false;
  }

  return row.min_ts <= start && row.max_ts >= end;
}

export async function upsertMoonPhaseEventRows(
  db: SQLite.SQLiteDatabase,
  rows: MoonPhaseEventInsertRow[]
) {
  if (!rows.length) {
    return;
  }

  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(`
      INSERT OR REPLACE INTO ${PHASE_EVENT_TABLE} (
        ts_utc,
        display_at_utc,
        event_type,
        phase_name,
        phase_deg,
        illum_pct,
        precision_sec,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      for (const row of rows) {
        await statement.executeAsync([
          row.ts_utc,
          row.display_at_utc ?? null,
          row.event_type ?? null,
          row.phase_name ?? null,
          row.phase_deg ?? null,
          row.illum_pct ?? null,
          row.precision_sec ?? null,
          row.source ?? null,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

export async function pruneMoonPhaseEventOutsideRange(
  db: SQLite.SQLiteDatabase,
  start: string,
  end: string
) {
  await db.runAsync(
    `DELETE FROM ${PHASE_EVENT_TABLE} WHERE ts_utc < ? OR ts_utc > ?`,
    [start, end]
  );
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

export async function clearMoonTables(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    DELETE FROM ${EPHEMERIS_TABLE};
    DELETE FROM ${PHASE_EVENT_TABLE};
  `);
}
