// Hook home : charge et rafraichit les donnees astro quotidiennes.
// Pourquoi : centraliser la logique de refresh pour garder l'UI declarative.
import { useEffect, useState } from 'react';

import type { MoonCard1Tropical } from '@/features/home/ui/moon-card-1-tropical';
import { buildMoonCard1Tropical } from '@/features/moon/domain/moon-tropical';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const SIXTY_MINUTES_MS = 60 * 60 * 1000;

function parseIsoDate(value: string | null | undefined) {
  if (!value || value === '...') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function computeNextRefreshMs(now: Date, card: MoonCard1Tropical | null) {
  const defaultDelay = SIXTY_MINUTES_MS;
  if (!card) {
    return defaultDelay;
  }

  const thresholds = [card.sign_egress_ts_utc, card.phase_change_ts_utc];
  const candidates: number[] = [];

  for (const value of thresholds) {
    const date = parseIsoDate(value);
    if (!date) {
      continue;
    }
    const targetMs = date.getTime();
    const windowStart = targetMs - FIVE_MINUTES_MS;
    const windowEnd = targetMs + FIVE_MINUTES_MS;
    const nowMs = now.getTime();

    if (nowMs < windowStart) {
      candidates.push(windowStart - nowMs);
    } else if (nowMs >= windowStart && nowMs <= windowEnd) {
      candidates.push(FIVE_MINUTES_MS);
    }
  }

  if (!candidates.length) {
    return defaultDelay;
  }

  return Math.max(30 * 1000, Math.min(...candidates));
}

export function useAstroDaily() {
  const [moonCard, setMoonCard] = useState<MoonCard1Tropical | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const card = await buildMoonCard1Tropical(new Date());
        if (!cancelled) {
          setMoonCard(card);
          if (timeout) {
            clearTimeout(timeout);
          }
          const delay = computeNextRefreshMs(new Date(), card);
          timeout = setTimeout(load, delay);
        }
      } catch {
        if (!cancelled) {
          if (timeout) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(load, SIXTY_MINUTES_MS);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return { moonCard };
}
