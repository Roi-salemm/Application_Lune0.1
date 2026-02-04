import { deleteCalendarNoteStorage } from '@/features/calendar/data/CalendarNotesStorage';

export async function deleteCalendarNoteRecord(noteId: string): Promise<boolean> {
  return deleteCalendarNoteStorage(noteId);
}
