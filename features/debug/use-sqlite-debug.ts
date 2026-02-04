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
          const countRow = await db.getFirstAsync<{ cnt: number }>(
            `SELECT COUNT(*) AS cnt FROM "${safeName}"`
          );
          const rows = await db.getAllAsync<Record<string, unknown>>(
            `SELECT * FROM "${safeName}" LIMIT 20`
          );

          nextTables.push({
            name: table.name,
            columns,
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

