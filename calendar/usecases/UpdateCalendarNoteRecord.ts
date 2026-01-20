import { updateCalendarNoteStorage } from '@/calendar/data/CalendarNotesStorage';
import { NoteItem } from '@/calendar/types/CalendarTypes';

export async function updateCalendarNoteRecord(note: NoteItem): Promise<boolean> {
  return updateCalendarNoteStorage(note);
}
