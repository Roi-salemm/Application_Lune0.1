import { writeCalendarNotesStorage } from '@/calendar/data/CalendarNotesStorage';
import { NoteItem } from '@/calendar/types/CalendarTypes';

export async function saveCalendarNotes(
  notes: Record<string, NoteItem[]>,
): Promise<boolean> {
  return writeCalendarNotesStorage(notes);
}
