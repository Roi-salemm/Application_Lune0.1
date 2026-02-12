// Hook astronomie : charge l'angle d'orbite lunaire depuis canonique_data.
// Pourquoi : isoler le refresh 10 minutes et exposer un angle simple a l'UI.
// Info : angle par defaut a 0 (extreme droite) si les donnees manquent.
import { useCallback, useEffect, useState } from 'react';

import { moonLongitudeToOrbitAngleRad } from '@/features/home/domain/astronomie-orbit';
import { fetchCanoniqueOrbitSnapshot } from '@/features/moon/data/moon-canonique-data';

const TEN_MINUTES_MS = 10 * 60 * 1000;

export function useAstronomieOrbit() {
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    void load();
    interval = setInterval(() => {
      void load();
    }, TEN_MINUTES_MS);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [load]);

  return { angleRad };
}
