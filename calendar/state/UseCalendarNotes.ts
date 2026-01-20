// Notes logic: load/save notes and expose selected-day notes.
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatKey } from '@/calendar/domain/CalendarDateUtils';
import { addCalendarNote } from '@/calendar/usecases/AddCalendarNote';
import { loadCalendarNotes } from '@/calendar/usecases/LoadCalendarNotes';
import { saveCalendarNotes } from '@/calendar/usecases/SaveCalendarNotes';
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
    let nextNotes: Record<string, NoteItem[]> | null = null;
    setNotes((prev) => {
      const result = addCalendarNote({ date, title, body, color, notes: prev });
      if (!result) {
        nextNotes = null;
        return prev;
      }
      nextNotes = result.nextNotes;
      return result.nextNotes;
    });

    if (!nextNotes) {
      return false;
    }

    return saveCalendarNotes(nextNotes);
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
