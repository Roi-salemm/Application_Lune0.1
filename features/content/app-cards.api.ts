// API cards : recupere le listing de contenu sans details.
// Pourquoi : isoler la couche reseau pour stabiliser le cache SQLite.
// Info : seuls les champs du listing sont acceptes.
import { withApiBase } from '@/lib/api';
import type { AppCardApiItem, AppCardsApiResponse, AppCardAccessLevel, AppCardType } from './app-cards.types';

const APP_CARDS_ENDPOINT = '/api/content/cards';

function isValidType(value: unknown): value is AppCardType {
  return (
    value === 'article' ||
    value === 'cycle' ||
    value === 'audio' ||
    value === 'meditation' ||
    value === 'information'
  );
}

function isValidAccessLevel(value: unknown): value is AppCardAccessLevel {
  return value === 'free' || value === 'premium';
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizeString(value);
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizeItem(raw: Record<string, unknown>): AppCardApiItem | null {
  const id = normalizeString(raw.id);
  const type = raw.type;
  const slug = normalizeString(raw.slug);
  const title = normalizeString(raw.title);
  const description = normalizeNullableString(raw.description);
  const accessLevel = raw.accessLevel;
  const status = normalizeNullableString(raw.status);
  const updatedAt = normalizeString(raw.updatedAt);

  if (!id || !isValidType(type) || !slug || !title || !isValidAccessLevel(accessLevel) || !updatedAt) {
    return null;
  }

  const baseline = normalizeNullableString(raw.baseline);
  const featuredRank = normalizeNumber(raw.featuredRank);
  const publishedAt = normalizeNullableString(raw.publishedAt);
  const coverMediaRaw = raw.coverMedia as { id?: unknown; url?: unknown } | null | undefined;
  const coverMediaId = coverMediaRaw ? normalizeNullableString(coverMediaRaw.id) : null;
  const coverMediaUrl = coverMediaRaw ? normalizeNullableString(coverMediaRaw.url) : null;

  return {
    id,
    type,
    slug,
    title,
    baseline,
    description,
    accessLevel,
    status,
    featuredRank,
    publishedAt,
    updatedAt,
    coverMedia: coverMediaId && coverMediaUrl ? { id: coverMediaId, url: coverMediaUrl } : null,
  };
}

async function readErrorBody(response: Response) {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    return trimmed.length ? trimmed.slice(0, 400) : null;
  } catch {
    return null;
  }
}

export async function fetchCardsFromApi(signal?: AbortSignal): Promise<AppCardApiItem[]> {
  const url = withApiBase(APP_CARDS_ENDPOINT);
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new Error(
      `App cards request failed: ${response.status}${detail ? ` - ${detail}` : ''}`
    );
  }

  const payload = (await response.json()) as AppCardsApiResponse;
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error('App cards payload missing items array');
  }

  return payload.items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => normalizeItem(item))
    .filter((item): item is AppCardApiItem => item !== null);
}
