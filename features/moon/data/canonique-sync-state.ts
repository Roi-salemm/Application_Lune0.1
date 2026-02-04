// Etat de synchronisation canonique via AsyncStorage.
// Pourquoi : eviter plusieurs syncs par jour UTC et garder un repere de succes.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CANONIQUE_SYNC_STORAGE_KEY = 'moon.canonique.last_sync_utc_day';

export async function getCanoniqueLastSyncUtcDay(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CANONIQUE_SYNC_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to read canonique sync state', error);
    return null;
  }
}

export async function setCanoniqueLastSyncUtcDay(dayUtc: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CANONIQUE_SYNC_STORAGE_KEY, dayUtc);
  } catch (error) {
    console.warn('Failed to persist canonique sync state', error);
  }
}
