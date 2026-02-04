import { NoteItem } from '@/features/calendar/types/CalendarTypes';

type DeleteCalendarNoteInput = {
  note: NoteItem;
  notes: Record<string, NoteItem[]>;
};

export function deleteCalendarNote({ note, notes }: DeleteCalendarNoteInput) {
  const currentList = notes[note.dateKey] ?? [];
  const hasNote = currentList.some((item) => item.id === note.id);
  if (!hasNote) {
    return null;
  }

  const nextNotes = { ...notes };
  const nextList = currentList.filter((item) => item.id !== note.id);
  if (nextList.length) {
    nextNotes[note.dateKey] = nextList;
  } else {
    delete nextNotes[note.dateKey];
  }

  return { nextNotes };
}
