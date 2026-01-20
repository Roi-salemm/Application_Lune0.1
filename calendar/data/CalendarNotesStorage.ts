import * as SQLite from 'expo-sqlite';

import { NoteItem } from '@/calendar/types/CalendarTypes';

const DATABASE_NAME = 'lune01.db';
const NOTES_TABLE = 'calendar_notes';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

type CalendarNoteRow = {
  id: string;
  date_key: string;
  title: string;
  body: string | null;
  color: string;
};

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
}

async function ensureNotesTable() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getDatabase();
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS ${NOTES_TABLE} (
          id TEXT PRIMARY KEY NOT NULL,
          date_key TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT,
          color TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );`,
      );
      await db.execAsync(
        `CREATE INDEX IF NOT EXISTS calendar_notes_date_key_idx ON ${NOTES_TABLE} (date_key);`,
      );
    })();
  }
  await initPromise;
}

export async function initCalendarNotesStorage() {
  await ensureNotesTable();
}

export async function readCalendarNotesStorage(): Promise<Record<string, NoteItem[]>> {
  try {
    await ensureNotesTable();
    const db = await getDatabase();
    const rows = await db.getAllAsync<CalendarNoteRow>(
      `SELECT id, date_key, title, body, color FROM ${NOTES_TABLE} ORDER BY created_at ASC;`,
    );
    const notes: Record<string, NoteItem[]> = {};
    rows.forEach((row) => {
      const note: NoteItem = {
        id: row.id,
        dateKey: row.date_key,
        title: row.title,
        body: row.body ?? '',
        color: row.color,
      };
      if (!notes[note.dateKey]) {
        notes[note.dateKey] = [];
      }
      notes[note.dateKey].push(note);
    });
    return notes;
  } catch {
    return {};
  }
}

export async function insertCalendarNoteStorage(
  note: NoteItem,
  createdAt: number,
): Promise<boolean> {
  try {
    await ensureNotesTable();
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO ${NOTES_TABLE} (id, date_key, title, body, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      note.id,
      note.dateKey,
      note.title,
      note.body,
      note.color,
      createdAt,
    );
    return true;
  } catch {
    return false;
  }
}

export async function updateCalendarNoteStorage(note: NoteItem): Promise<boolean> {
  try {
    await ensureNotesTable();
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE ${NOTES_TABLE}
       SET date_key = ?, title = ?, body = ?, color = ?
       WHERE id = ?;`,
      note.dateKey,
      note.title,
      note.body,
      note.color,
      note.id,
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteCalendarNoteStorage(noteId: string): Promise<boolean> {
  try {
    await ensureNotesTable();
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${NOTES_TABLE} WHERE id = ?;`, noteId);
    return true;
  } catch {
    return false;
  }
}
