import { readCalendarNotesStorage } from '@/calendar/data/CalendarNotesStorage';
import { NoteItem } from '@/calendar/types/CalendarTypes';

export async function loadCalendarNotes(): Promise<Record<string, NoteItem[]>> {
  return readCalendarNotesStorage();
}
