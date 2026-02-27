// Hook content cards : charge le cache SQLite puis rafraichit via l'API.
// Pourquoi : afficher instantanement les cards locales et garder un refresh automatique.
// Info : le refresh reseau est tente toutes les 6h, sans bloquer l'UI.
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppCardRow } from '@/features/content/app-cards.types';
import { syncAppCards, APP_CARDS_SYNC_INTERVAL_MS } from '@/features/content/app-cards.sync';
import { getAllCards, getFeaturedCards, initAppCardsDb } from '@/features/content/data/app-cards-db';

type UseAppCardsState = {
  featuredCards: AppCardRow[];
  allCards: AppCardRow[];
  loading: boolean;
  refreshing: boolean;
  error?: string;
  refresh: () => void;
};

type UseAppCardsOptions = {
  featuredLimit?: number;
};

export function useAppCards(options: UseAppCardsOptions = {}): UseAppCardsState {
  const { featuredLimit = 4 } = options;
  const [featuredCards, setFeaturedCards] = useState<AppCardRow[]>([]);
  const [allCards, setAllCards] = useState<AppCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const refreshInFlight = useRef(false);

  const loadFromDb = useCallback(async () => {
    await initAppCardsDb();
    const [featured, all] = await Promise.all([
      getFeaturedCards(featuredLimit),
      getAllCards(),
    ]);
    setFeaturedCards(featured);
    setAllCards(all);
  }, [featuredLimit]);

  const refreshFromApi = useCallback(
    async (force = false) => {
      if (refreshInFlight.current) {
        return;
      }
      refreshInFlight.current = true;
      setRefreshing(true);
      setError(undefined);
      try {
        await syncAppCards({ force });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sync cards impossible.');
      } finally {
        try {
          await loadFromDb();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Lecture SQLite impossible.');
        }
        setRefreshing(false);
        refreshInFlight.current = false;
      }
    },
    [loadFromDb]
  );

  const refresh = useCallback(() => {
    void refreshFromApi(true);
  }, [refreshFromApi]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        await loadFromDb();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lecture SQLite impossible.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
      if (!cancelled) {
        void refreshFromApi(true);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadFromDb, refreshFromApi]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshFromApi(false);
    }, APP_CARDS_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshFromApi]);

  return {
    featuredCards,
    allCards,
    loading,
    refreshing,
    error,
    refresh,
  };
}
