// Notes logic: load/save notes and expose selected-day notes.
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatKey } from '@/calendar/domain/CalendarDateUtils';
import { addCalendarNote } from '@/calendar/usecases/AddCalendarNote';
import { loadCalendarNotes } from '@/calendar/usecases/LoadCalendarNotes';
import { saveCalendarNote } from '@/calendar/usecases/SaveCalendarNote';
import { NoteItem } from '@/calendar/types/CalendarTypes';

type SaveNoteInput = {
  date: Date | null;
  title: string;
  body: string;
  color: string;
};

export function useCalendarNotes(selectedDate: Date | null, today: Date) {
  const [notes, setNotes] = useState<Record<string, NoteItem[]>>({});

  useEffect(() => {
    const loadNotes = async () => {
      const stored = await loadCalendarNotes();
      setNotes(stored);
    };
    loadNotes();
  }, []);

  const saveNote = useCallback(async ({ date, title, body, color }: SaveNoteInput) => {
    let newNote: NoteItem | null = null;
    let createdAt: number | null = null;
    setNotes((prev) => {
      const result = addCalendarNote({ date, title, body, color, notes: prev });
      if (!result) {
        return prev;
      }
      newNote = result.newNote;
      createdAt = result.createdAt;
      return result.nextNotes;
    });

    if (!newNote || createdAt == null) {
      return false;
    }

    return saveCalendarNote({ note: newNote, createdAt });
  }, []);

  const selectedNotes = useMemo(() => {
    const selectedKey = selectedDate ? formatKey(selectedDate) : formatKey(today);
    return notes[selectedKey] ?? [];
  }, [notes, selectedDate, today]);

  return {
    notes,
    selectedNotes,
    saveNote,
  };
}
