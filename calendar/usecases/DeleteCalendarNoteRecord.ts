import { deleteCalendarNoteStorage } from '@/calendar/data/CalendarNotesStorage';

export async function deleteCalendarNoteRecord(noteId: string): Promise<boolean> {
  return deleteCalendarNoteStorage(noteId);
}
