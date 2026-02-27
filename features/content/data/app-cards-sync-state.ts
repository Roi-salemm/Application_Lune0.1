// Etat de synchronisation des cards via AsyncStorage.
// Pourquoi : limiter les syncs reseau et garder un repere de dernier refresh.
// Info : la valeur stockee est un timestamp en millisecondes.
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_CARDS_SYNC_STORAGE_KEY = 'content.app_cards.last_sync_ms';

export async function getAppCardsLastSyncMs(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_CARDS_SYNC_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch (error) {
    console.warn('Failed to read app cards sync state', error);
    return null;
  }
}

export async function setAppCardsLastSyncMs(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_CARDS_SYNC_STORAGE_KEY, String(value));
  } catch (error) {
    console.warn('Failed to persist app cards sync state', error);
  }
}
