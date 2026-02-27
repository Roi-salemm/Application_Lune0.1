// Synchronisation des cards de contenu : fetch reseau + cache SQLite.
// Pourquoi : garder l'app a jour tout en permettant l'affichage offline.
// Info : un intervalle minimal evite les refreshs trop frequents.
import { fetchCardsFromApi } from '@/features/content/app-cards.api';
import type { AppCardApiItem, AppCardRow } from '@/features/content/app-cards.types';
import { initAppCardsDb, upsertCards } from '@/features/content/data/app-cards-db';
import { getAppCardsLastSyncMs, setAppCardsLastSyncMs } from '@/features/content/data/app-cards-sync-state';

export const APP_CARDS_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

type SyncResult = {
  fetched: number;
  skipped: boolean;
  touched: number;
  upserted: number;
};

function mapApiToRow(item: AppCardApiItem, fetchedAt: string): AppCardRow {
  return {
    id: item.id,
    type: item.type,
    slug: item.slug,
    title: item.title,
    baseline: item.baseline ?? null,
    description: item.description ?? null,
    accessLevel: item.accessLevel,
    status: item.status ?? null,
    featuredRank: item.featuredRank ?? null,
    publishedAt: item.publishedAt ?? null,
    updatedAt: item.updatedAt,
    coverMedia_id: item.coverMedia?.id ?? null,
    coverMedia_url: item.coverMedia?.url ?? null,
    fetchedAt,
  };
}

export async function syncAppCards(options: { force?: boolean; signal?: AbortSignal } = {}): Promise<SyncResult> {
  const { force = false, signal } = options;
  await initAppCardsDb();
  const lastSync = await getAppCardsLastSyncMs();
  const nowMs = Date.now();

  if (!force && lastSync && nowMs - lastSync < APP_CARDS_SYNC_INTERVAL_MS) {
    return { fetched: 0, skipped: true, touched: 0, upserted: 0 };
  }

  const items = await fetchCardsFromApi(signal);
  const fetchedAt = new Date(nowMs).toISOString();
  const rows = items.map((item) => mapApiToRow(item, fetchedAt));
  const { upserted, touched } = await upsertCards(rows);
  await setAppCardsLastSyncMs(nowMs);

  return { fetched: rows.length, skipped: false, touched, upserted };
}
