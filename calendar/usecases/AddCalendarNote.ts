import { formatKey } from '@/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/calendar/types/CalendarTypes';

type AddCalendarNoteInput = {
  date: Date | null;
  title: string;
  body: string;
  color: string;
  notes: Record<string, NoteItem[]>;
};

export function addCalendarNote({ date, title, body, color, notes }: AddCalendarNoteInput) {
  if (!date || !title.trim()) {
    return null;
  }

  const dateKey = formatKey(date);
  const newNote: NoteItem = {
    id: `${dateKey}-${Date.now()}`,
    dateKey,
    title: title.trim(),
    color,
    body: body.trim(),
  };

  const nextNotes = {
    ...notes,
    [dateKey]: [...(notes[dateKey] ?? []), newNote],
  };

  return { nextNotes, newNote };
}
