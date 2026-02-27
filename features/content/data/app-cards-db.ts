// Cache SQLite des cards de contenu.
// Pourquoi : garantir un affichage offline et un tri rapide pour le carousel "featured".
// Info : utilise la base locale existante sans modifier les autres tables.
import type { SQLiteDatabase } from 'expo-sqlite';

import { getMoonDb } from '@/features/moon/moon-db';
import type { AppCardRow } from '@/features/content/app-cards.types';

const APP_CARDS_TABLE = 'app_card';

const APP_CARDS_COLUMNS = [
  { name: 'id', type: 'TEXT PRIMARY KEY' },
  { name: 'type', type: 'TEXT NOT NULL' },
  { name: 'slug', type: 'TEXT NOT NULL' },
  { name: 'title', type: 'TEXT NOT NULL' },
  { name: 'baseline', type: 'TEXT' },
  { name: 'description', type: 'TEXT' },
  { name: 'accessLevel', type: 'TEXT NOT NULL' },
  { name: 'status', type: 'TEXT' },
  { name: 'featuredRank', type: 'INTEGER' },
  { name: 'publishedAt', type: 'TEXT' },
  { name: 'updatedAt', type: 'TEXT NOT NULL' },
  { name: 'coverMedia_id', type: 'TEXT' },
  { name: 'coverMedia_url', type: 'TEXT' },
  { name: 'fetchedAt', type: 'TEXT NOT NULL' },
];

let initPromise: Promise<void> | null = null;

async function ensureColumns(
  db: SQLiteDatabase,
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

export async function initAppCardsDb() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getMoonDb();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${APP_CARDS_TABLE} (${APP_CARDS_COLUMNS.map((col) => `${col.name} ${col.type}`).join(', ')});
        CREATE UNIQUE INDEX IF NOT EXISTS idx_app_card_slug ON ${APP_CARDS_TABLE} (slug);
        CREATE INDEX IF NOT EXISTS idx_app_card_featured_rank ON ${APP_CARDS_TABLE} (featuredRank);
        CREATE INDEX IF NOT EXISTS idx_app_card_type ON ${APP_CARDS_TABLE} (type);
        CREATE INDEX IF NOT EXISTS idx_app_card_access_level ON ${APP_CARDS_TABLE} (accessLevel);
      `);
      await ensureColumns(db, APP_CARDS_TABLE, APP_CARDS_COLUMNS);
    })();
  }
  await initPromise;
}

async function getExistingUpdatedAtMap(db: SQLiteDatabase, ids: string[]) {
  const map = new Map<string, string>();
  if (!ids.length) {
    return map;
  }
  const batchSize = 900;
  for (let i = 0; i < ids.length; i += batchSize) {
    const slice = ids.slice(i, i + batchSize);
    const placeholders = slice.map(() => '?').join(', ');
    const rows = await db.getAllAsync<{ id: string; updatedAt: string }>(
      `SELECT id, updatedAt FROM ${APP_CARDS_TABLE} WHERE id IN (${placeholders})`,
      slice
    );
    rows.forEach((row) => {
      if (row?.id && row.updatedAt) {
        map.set(row.id, row.updatedAt);
      }
    });
  }
  return map;
}

export async function upsertCards(cards: AppCardRow[]) {
  await initAppCardsDb();
  const db = await getMoonDb();
  if (!cards.length) {
    return { upserted: 0, touched: 0 };
  }

  const ids = cards.map((card) => card.id);
  const existingMap = await getExistingUpdatedAtMap(db, ids);
  const fetchedAtById = new Map(cards.map((card) => [card.id, card.fetchedAt]));
  const toUpsert: AppCardRow[] = [];
  const toTouch: string[] = [];

  for (const card of cards) {
    const existingUpdatedAt = existingMap.get(card.id);
    if (existingUpdatedAt && existingUpdatedAt === card.updatedAt) {
      toTouch.push(card.id);
    } else {
      toUpsert.push(card);
    }
  }

  await db.withTransactionAsync(async () => {
    if (toUpsert.length) {
      const statement = await db.prepareAsync(`
        INSERT OR REPLACE INTO ${APP_CARDS_TABLE} (
          id,
          type,
          slug,
          title,
          baseline,
          description,
          accessLevel,
          status,
          featuredRank,
          publishedAt,
          updatedAt,
          coverMedia_id,
          coverMedia_url,
          fetchedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      try {
        for (const card of toUpsert) {
          await statement.executeAsync([
            card.id,
            card.type,
            card.slug,
            card.title,
            card.baseline ?? null,
            card.description ?? null,
            card.accessLevel,
            card.status ?? null,
            card.featuredRank ?? null,
            card.publishedAt ?? null,
            card.updatedAt,
            card.coverMedia_id ?? null,
            card.coverMedia_url ?? null,
            card.fetchedAt,
          ]);
        }
      } finally {
        await statement.finalizeAsync();
      }
    }

    if (toTouch.length) {
      const statement = await db.prepareAsync(`
        UPDATE ${APP_CARDS_TABLE}
        SET fetchedAt = ?
        WHERE id = ?
      `);
      try {
        for (const id of toTouch) {
          const fetchedAt = fetchedAtById.get(id) ?? new Date().toISOString();
          await statement.executeAsync([fetchedAt, id]);
        }
      } finally {
        await statement.finalizeAsync();
      }
    }
  });

  return { upserted: toUpsert.length, touched: toTouch.length };
}

export async function getFeaturedCards(limit = 4) {
  await initAppCardsDb();
  const db = await getMoonDb();
  const rows = await db.getAllAsync<AppCardRow>(
    `SELECT * FROM ${APP_CARDS_TABLE}
     WHERE featuredRank IS NOT NULL
     ORDER BY featuredRank ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

export async function getAllCards() {
  await initAppCardsDb();
  const db = await getMoonDb();
  const rows = await db.getAllAsync<AppCardRow>(
    `SELECT * FROM ${APP_CARDS_TABLE}
     ORDER BY
       CASE WHEN featuredRank IS NULL THEN 1 ELSE 0 END,
       featuredRank ASC,
       publishedAt DESC,
       updatedAt DESC`
  );
  return rows;
}

export async function getAllCardsForDebug() {
  await initAppCardsDb();
  const db = await getMoonDb();
  return db.getAllAsync<AppCardRow>(`SELECT * FROM ${APP_CARDS_TABLE} ORDER BY updatedAt DESC`);
}

export async function deleteAppCardById(id: string) {
  await initAppCardsDb();
  const db = await getMoonDb();
  await db.runAsync(`DELETE FROM ${APP_CARDS_TABLE} WHERE id = ?`, [id]);
}

export async function clearCards() {
  await initAppCardsDb();
  const db = await getMoonDb();
  await db.runAsync(`DELETE FROM ${APP_CARDS_TABLE}`);
}
