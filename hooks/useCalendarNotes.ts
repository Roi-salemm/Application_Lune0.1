// Notes logic: load/save notes and expose selected-day notes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { formatKey } from '@/lib/calendar-utils';
import { NoteItem } from '@/types/calendar';

const STORAGE_KEY = 'lune01.notes.v1';

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
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setNotes(JSON.parse(stored));
        }
      } catch {
        setNotes({});
      }
    };
    loadNotes();
  }, []);

  const saveNote = useCallback(async ({ date, title, body, color }: SaveNoteInput) => {
    if (!date || !title.trim()) {
      return false;
    }
    const dateKey = formatKey(date);
    const newNote: NoteItem = {
      id: `${dateKey}-${Date.now()}`,
      dateKey,
      title: title.trim(),
      color,
      body: body.trim(),
    };

    let nextNotes: Record<string, NoteItem[]> = {};
    setNotes((prev) => {
      nextNotes = {
        ...prev,
        [dateKey]: [...(prev[dateKey] ?? []), newNote],
      };
      return nextNotes;
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
      return true;
    } catch {
      return false;
    }
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
