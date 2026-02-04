// Notes logic: load/save notes and expose selected-day notes.
import { useCallback, useEffect, useMemo, useState } from 'react';

import { applyTimeToDate, formatKey } from '@/features/calendar/domain/CalendarDateUtils';
import { cancelCalendarAlert, scheduleCalendarAlert } from '@/features/calendar/services/CalendarNotificationsService';
import { addCalendarNote } from '@/features/calendar/usecases/AddCalendarNote';
import { deleteCalendarNote } from '@/features/calendar/usecases/DeleteCalendarNote';
import { deleteCalendarNoteRecord } from '@/features/calendar/usecases/DeleteCalendarNoteRecord';
import { loadCalendarNotes } from '@/features/calendar/usecases/LoadCalendarNotes';
import { saveCalendarNote } from '@/features/calendar/usecases/SaveCalendarNote';
import { updateCalendarNote } from '@/features/calendar/usecases/UpdateCalendarNote';
import { updateCalendarNoteRecord } from '@/features/calendar/usecases/UpdateCalendarNoteRecord';
import { NoteItem } from '@/features/calendar/types/CalendarTypes';

type SaveNoteInput = {
  date: Date | null;
  title: string;
  body: string;
  color: string;
  alertTime?: string | null;
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

  const saveNote = useCallback(async ({ date, title, body, color, alertTime }: SaveNoteInput) => {
    if (!date || !title.trim()) {
      return false;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const createdAt = Date.now();
    let alertNotificationId: string | null = null;
    if (alertTime) {
      const triggerDate = applyTimeToDate(date, alertTime);
      alertNotificationId = await scheduleCalendarAlert({
        title: trimmedTitle,
        body: trimmedBody,
        triggerDate,
      });
    }

    let newNote: NoteItem | null = null;
    setNotes((prev) => {
      const result = addCalendarNote({
        date,
        title: trimmedTitle,
        body: trimmedBody,
        color,
        alertTime,
        alertNotificationId,
        createdAt,
        notes: prev,
      });
      if (!result) {
        return prev;
      }
      newNote = result.newNote;
      return result.nextNotes;
    });

    if (!newNote) {
      return false;
    }

    return saveCalendarNote({ note: newNote, createdAt });
  }, []);

  const updateNote = useCallback(
    async ({ note, date, title, body, color, alertTime }: SaveNoteInput & { note: NoteItem }) => {
      if (!date || !title.trim()) {
        return false;
      }

      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      const hadAlert = Boolean(note.alertNotificationId);
      if (hadAlert && note.alertNotificationId) {
        await cancelCalendarAlert(note.alertNotificationId);
      }

      let nextAlertId: string | null = null;
      if (alertTime) {
        const triggerDate = applyTimeToDate(date, alertTime);
        nextAlertId = await scheduleCalendarAlert({
          title: trimmedTitle,
          body: trimmedBody,
          triggerDate,
        });
      }

      let updatedNote: NoteItem | null = null;
      setNotes((prev) => {
        const result = updateCalendarNote({
          note,
          date,
          title: trimmedTitle,
          body: trimmedBody,
          color,
          alertTime,
          alertNotificationId: nextAlertId,
          notes: prev,
        });
        if (!result) {
          return prev;
        }
        updatedNote = result.updatedNote;
        return result.nextNotes;
      });

      if (!updatedNote) {
        return false;
      }

      return updateCalendarNoteRecord(updatedNote);
    },
    [],
  );

  const deleteNote = useCallback(async (note: NoteItem) => {
    if (note.alertNotificationId) {
      await cancelCalendarAlert(note.alertNotificationId);
    }
    let shouldDelete = false;
    setNotes((prev) => {
      const result = deleteCalendarNote({ note, notes: prev });
      if (!result) {
        return prev;
      }
      shouldDelete = true;
      return result.nextNotes;
    });

    if (!shouldDelete) {
      return false;
    }

    return deleteCalendarNoteRecord(note.id);
  }, []);

  const selectedNotes = useMemo(() => {
    const selectedKey = selectedDate ? formatKey(selectedDate) : formatKey(today);
    return notes[selectedKey] ?? [];
  }, [notes, selectedDate, today]);

  return {
    notes,
    selectedNotes,
    saveNote,
    updateNote,
    deleteNote,
  };
}
