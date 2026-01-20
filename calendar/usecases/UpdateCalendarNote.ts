import { formatKey } from '@/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/calendar/types/CalendarTypes';

type UpdateCalendarNoteInput = {
  note: NoteItem;
  date: Date | null;
  title: string;
  body: string;
  color: string;
  alertTime?: string | null;
  alertNotificationId?: string | null;
  notes: Record<string, NoteItem[]>;
};

export function updateCalendarNote({
  note,
  date,
  title,
  body,
  color,
  alertTime,
  alertNotificationId,
  notes,
}: UpdateCalendarNoteInput) {
  if (!date || !title.trim()) {
    return null;
  }

  const nextDateKey = formatKey(date);
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const updatedNote: NoteItem = {
    ...note,
    dateKey: nextDateKey,
    title: trimmedTitle,
    body: trimmedBody,
    color,
    alertTime: alertTime ?? null,
    alertNotificationId: alertNotificationId ?? null,
  };

  const currentList = notes[note.dateKey] ?? [];
  const hasNote = currentList.some((item) => item.id === note.id);
  if (!hasNote) {
    return null;
  }

  const nextNotes = { ...notes };

  if (note.dateKey === nextDateKey) {
    nextNotes[note.dateKey] = currentList.map((item) =>
      item.id === note.id ? updatedNote : item,
    );
    return { nextNotes, updatedNote };
  }

  const nextOldList = currentList.filter((item) => item.id !== note.id);
  if (nextOldList.length) {
    nextNotes[note.dateKey] = nextOldList;
  } else {
    delete nextNotes[note.dateKey];
  }

  const targetList = notes[nextDateKey] ?? [];
  nextNotes[nextDateKey] = [...targetList, updatedNote];

  return { nextNotes, updatedNote };
}
