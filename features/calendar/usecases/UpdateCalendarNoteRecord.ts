import { updateCalendarNoteStorage } from '@/features/calendar/data/CalendarNotesStorage';
import { NoteItem } from '@/features/calendar/types/CalendarTypes';

export async function updateCalendarNoteRecord(note: NoteItem): Promise<boolean> {
  return updateCalendarNoteStorage(note);
}
