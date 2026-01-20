import { formatKey } from '@/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/calendar/types/CalendarTypes';

type AddCalendarNoteInput = {
  date: Date | null;
  title: string;
  body: string;
  color: string;
  alertTime?: string | null;
  alertNotificationId?: string | null;
  createdAt?: number;
  notes: Record<string, NoteItem[]>;
};

export function addCalendarNote({
  date,
  title,
  body,
  color,
  alertTime,
  alertNotificationId,
  createdAt,
  notes,
}: AddCalendarNoteInput) {
  if (!date || !title.trim()) {
    return null;
  }

  const dateKey = formatKey(date);
  const effectiveCreatedAt = createdAt ?? Date.now();
  const newNote: NoteItem = {
    id: `${dateKey}-${effectiveCreatedAt}`,
    dateKey,
    title: title.trim(),
    color,
    body: body.trim(),
    alertTime: alertTime ?? null,
    alertNotificationId: alertNotificationId ?? null,
  };

  const nextNotes = {
    ...notes,
    [dateKey]: [...(notes[dateKey] ?? []), newNote],
  };

  return { nextNotes, newNote, createdAt: effectiveCreatedAt };
}
