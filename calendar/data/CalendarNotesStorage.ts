import AsyncStorage from '@react-native-async-storage/async-storage';

import { NoteItem } from '@/calendar/types/CalendarTypes';

const NOTES_STORAGE_KEY = 'lune01.notes.v1';

export async function readCalendarNotesStorage(): Promise<Record<string, NoteItem[]>> {
  try {
    const stored = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored) as Record<string, NoteItem[]>;
  } catch {
    return {};
  }
}

export async function writeCalendarNotesStorage(
  notes: Record<string, NoteItem[]>,
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}
