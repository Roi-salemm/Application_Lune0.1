import { readCalendarNotesStorage } from '@/features/calendar/data/CalendarNotesStorage';
import { NoteItem } from '@/features/calendar/types/CalendarTypes';

export async function loadCalendarNotes(): Promise<Record<string, NoteItem[]>> {
  return readCalendarNotesStorage();
}
