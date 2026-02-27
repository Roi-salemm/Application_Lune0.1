// Hook astronomie : charge l'angle d'orbite lunaire depuis canonique_data.
// Pourquoi : isoler le refresh 10 minutes et exposer un angle simple a l'UI.
// Info : angle par defaut a 0 (extreme droite) si les donnees manquent.
import { useCallback, useMemo, useState } from 'react';

import { moonLongitudeToOrbitAngleRad } from '@/features/home/domain/astronomie-orbit';
import { fetchCanoniqueOrbitSnapshot } from '@/features/moon/data/moon-canonique-data';
import { useAdaptivePollingJob } from '@/features/moon/orchestration/adaptive-polling';

const TEN_MINUTES_MS = 10 * 60 * 1000;

type AstronomieOrbitOptions = {
  isActive?: boolean;
};

export function useAstronomieOrbit(options: AstronomieOrbitOptions = {}) {
  const isActive = options.isActive ?? true;
  const [angleRad, setAngleRad] = useState(0);

  const load = useCallback(async () => {
    try {
      const snapshot = await fetchCanoniqueOrbitSnapshot(new Date());
      const nextAngle = moonLongitudeToOrbitAngleRad(snapshot?.moonLonDeg ?? null);
      setAngleRad(nextAngle ?? 0);
    } catch {
      setAngleRad(0);
    }
  }, []);

  const job = useMemo(
    () => ({
      id: 'home-astronomie-orbit',
      run: async () => {
        await load();
        return TEN_MINUTES_MS;
      },
      defaultDelayMs: TEN_MINUTES_MS,
      minDelayMs: 60 * 1000,
      maxDelayMs: TEN_MINUTES_MS,
      errorDelayMs: TEN_MINUTES_MS,
    }),
    [load]
  );

  useAdaptivePollingJob(job, isActive);

  return { angleRad };
}
