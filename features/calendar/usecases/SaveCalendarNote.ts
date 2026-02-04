import { insertCalendarNoteStorage } from '@/features/calendar/data/CalendarNotesStorage';
import { NoteItem } from '@/features/calendar/types/CalendarTypes';

type SaveCalendarNoteInput = {
  note: NoteItem;
  createdAt: number;
};

export async function saveCalendarNote({
  note,
  createdAt,
}: SaveCalendarNoteInput): Promise<boolean> {
  return insertCalendarNoteStorage(note, createdAt);
}
