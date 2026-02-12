// Hook debug SQLite : liste des tables et actions de maintenance.
// Pourquoi : centraliser les requetes et reutiliser la logique dans l'ecran debug.
import { useEffect, useState } from 'react';

import { getMoonDb } from '@/features/moon/moon-db';

export type SQLiteTableDump = {
  name: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  count: number;
};

type SQLiteDebugState = {
  dbPath?: string;
  tables: SQLiteTableDump[];
  loading: boolean;
  error?: string;
  refresh: () => void;
  clearTable: (tableName: string) => Promise<void>;
};

function sanitizeIdentifier(value: string) {
  return value.replace(/"/g, '""');
}

function shouldHideColumn(columnName: string) {
  return /created_at/i.test(columnName);
}

export function useSQLiteDebug(): SQLiteDebugState {
  const [tables, setTables] = useState<SQLiteTableDump[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [dbPath, setDbPath] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const clearTable = async (tableName: string) => {
    const db = await getMoonDb();
    const safeName = sanitizeIdentifier(tableName);
    await db.runAsync(`DELETE FROM "${safeName}"`);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(undefined);
      try {
        const db = await getMoonDb();
        setDbPath(db.databasePath);

        const tableRows = await db.getAllAsync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        );

        const nextTables: SQLiteTableDump[] = [];
        for (const table of tableRows) {
          const safeName = sanitizeIdentifier(table.name);
          const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${safeName}")`);
          const columns = info.map((col) => col.name);
          const visibleColumns = columns.filter((column) => !shouldHideColumn(column));
          const countRow = await db.getFirstAsync<{ cnt: number }>(
            `SELECT COUNT(*) AS cnt FROM "${safeName}"`
          );
          const rawRows = await db.getAllAsync<Record<string, unknown>>(
            table.name === 'ms_mapping'
              ? `SELECT * FROM "${safeName}" WHERE substr(ts_utc, 1, 7) = '2026-02' ORDER BY ts_utc ASC`
              : `SELECT * FROM "${safeName}" LIMIT 20`
          );
          const rows = rawRows.map((row) => {
            const nextRow: Record<string, unknown> = {};
            for (const column of visibleColumns) {
              nextRow[column] = row[column];
            }
            return nextRow;
          });

          nextTables.push({
            name: table.name,
            columns: visibleColumns,
            rows,
            count: countRow?.cnt ?? 0,
          });
        }

        if (!cancelled) {
          setTables(nextTables);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { dbPath, tables, loading, error, refresh, clearTable };
}

