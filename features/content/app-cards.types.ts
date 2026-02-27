// Types des cards de contenu : contrats API et lignes SQLite.
// Pourquoi : centraliser les schemas pour garantir une coherence entre fetch, cache et UI.
// Info : ces types representent uniquement le listing, sans contenu detaille.
export type AppCardType = 'article' | 'cycle' | 'audio' | 'meditation' | 'information';
export type AppCardAccessLevel = 'free' | 'premium';

export type AppCardCoverMedia = {
  id: string;
  url: string;
};

export type AppCardApiItem = {
  id: string;
  type: AppCardType;
  slug: string;
  title: string;
  baseline: string | null;
  description: string | null;
  accessLevel: AppCardAccessLevel;
  status: string | null;
  featuredRank: number | null;
  publishedAt: string | null;
  updatedAt: string;
  coverMedia: AppCardCoverMedia | null;
};

export type AppCardsApiResponse = {
  count: number;
  limit: number;
  offset: number;
  items: AppCardApiItem[];
};

export type AppCardRow = {
  id: string;
  type: AppCardType;
  slug: string;
  title: string;
  baseline: string | null;
  description: string | null;
  accessLevel: AppCardAccessLevel;
  status: string | null;
  featuredRank: number | null;
  publishedAt: string | null;
  updatedAt: string;
  coverMedia_id: string | null;
  coverMedia_url: string | null;
  fetchedAt: string;
};
