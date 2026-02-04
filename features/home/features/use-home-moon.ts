// Hook home : lit la phase lunaire depuis SQLite et orchestre le formatage pour l'UI.
// Pourquoi : garder l'ecran simple tout en deleguant les regles de presentation au domain.
// Rafraichissement : recharge SQLite au montage puis selon un interval parametres (et sur refreshMoonData).
import { useCallback, useEffect, useState } from 'react';
import {
  formatAgeDaysLabel,
  formatAsOfLabel,
  formatDistanceKmLabel,
  formatLunarDay,
  formatMoonPhaseLabel,
  formatPercentage,
  formatRemainingDaysLabel,
} from '@/features/home/domain/moon-formatters';
import { fetchMoonEphemerisSnapshot } from '@/features/moon/data/moon-ephemeris-data';
import { fetchNewMoonWindow } from '@/features/moon/data/moon-phase-event-data';
import { syncMoonCaches } from '@/features/moon/moon.sync';

type HomeMoonState = {
  phaseTopLabel?: string;
  phaseBottomLabel?: string;
  percentage?: string;
  asOfLabel?: string;
  phaseLabel?: string;
  ageLabel?: string;
  cycleEndLabel?: string;
  distanceLabel?: string;
  visibleInLabel?: string;
  setInLabel?: string;
  altitudeLabel?: string;
  azimuthLabel?: string;
  syncing: boolean;
  refreshMoonData: () => void;
};

type HomeMoonOptions = {
  refreshMs?: number;
};

export const DEFAULT_HOME_MOON_REFRESH_MS = 30000;

export function useHomeMoon(options: HomeMoonOptions = {}): HomeMoonState {
  const refreshMs = options.refreshMs ?? DEFAULT_HOME_MOON_REFRESH_MS;
  const [phaseTopLabel, setPhaseTopLabel] = useState<string | undefined>(undefined);
  const [phaseBottomLabel, setPhaseBottomLabel] = useState<string | undefined>(undefined);
  const [percentage, setPercentage] = useState<string | undefined>(undefined);
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(undefined);
  const [phaseLabel, setPhaseLabel] = useState<string | undefined>(undefined);
  const [ageLabel, setAgeLabel] = useState<string | undefined>(undefined);
  const [cycleEndLabel, setCycleEndLabel] = useState<string | undefined>(undefined);
  const [distanceLabel, setDistanceLabel] = useState<string | undefined>(undefined);
  const [syncing, setSyncing] = useState<boolean>(false);

  const applyPhaseData = useCallback(
    (data: {
      ageDays?: number | string | null;
      percentage?: number | string | null;
      asOf?: Date | null;
      phaseDeg?: number | string | null;
      distKm?: number | string | null;
    }) => {
      const ageValue = data.ageDays ?? null;
      const formattedDay = formatLunarDay(ageValue);
      setPhaseTopLabel(formattedDay?.top);
      setPhaseBottomLabel(formattedDay?.bottom);
      setAgeLabel(formatAgeDaysLabel(ageValue));
      setPercentage(formatPercentage(data.percentage ?? null));
      const phaseText = formatMoonPhaseLabel({
        illuminationPct: data.percentage ?? null,
        phaseDeg: data.phaseDeg ?? null,
        ageDays: data.ageDays ?? null,
      });
      setPhaseLabel(phaseText);
      setDistanceLabel(formatDistanceKmLabel(data.distKm ?? null));
      if (data.asOf) {
        setAsOfDate(data.asOf);
      }
    },
    []
  );

  const applyCycleWindow = useCallback(
    (params: { next?: Date | null }) => {
      const nextDate = params.next ?? null;
      const remainingDays =
        nextDate ? Math.max(0, (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      setCycleEndLabel(formatRemainingDaysLabel(remainingDays));
    },
    []
  );

  const refreshMoonData = useCallback(async () => {
    if (syncing) {
      return;
    }

    setSyncing(true);

    try {
      await syncMoonCaches({ force: true });
      const targetDate = new Date();
      const snapshot = await fetchMoonEphemerisSnapshot(targetDate);
      if (snapshot) {
        applyPhaseData({
          ageDays: snapshot.ageDays,
          percentage: snapshot.illumPct,
          phaseDeg: snapshot.phaseDeg,
          distKm: snapshot.distKm,
          asOf: snapshot.asOf,
        });
      }
      const newMoonWindow = await fetchNewMoonWindow(snapshot?.asOf ?? targetDate);
      applyCycleWindow({ next: newMoonWindow.next?.asOf ?? null });
    } catch (error) {
      console.warn('Failed to refresh moon data', error);
    } finally {
      setSyncing(false);
    }
  }, [applyCycleWindow, applyPhaseData, syncing]);

  useEffect(() => {
    let cancelled = false;

    const loadPhase = async () => {
      try {
        const targetDate = new Date();
        const snapshot = await fetchMoonEphemerisSnapshot(targetDate);
        if (cancelled) {
          return;
        }
        if (snapshot) {
          applyPhaseData({
            ageDays: snapshot.ageDays,
            percentage: snapshot.illumPct,
            phaseDeg: snapshot.phaseDeg,
            distKm: snapshot.distKm,
            asOf: snapshot.asOf,
          });
        }
        const newMoonWindow = await fetchNewMoonWindow(snapshot?.asOf ?? targetDate);
        if (!cancelled) {
          applyCycleWindow({ next: newMoonWindow.next?.asOf ?? null });
        }
      } catch (error) {
        console.warn('Failed to load moon phase', error);
      }
    };

    void loadPhase();
    if (refreshMs > 0) {
      const interval = setInterval(() => {
        void loadPhase();
      }, refreshMs);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [applyCycleWindow, applyPhaseData, refreshMs]);

  const asOfLabel = formatAsOfLabel(asOfDate);

  return {
    phaseTopLabel,
    phaseBottomLabel,
    percentage,
    asOfLabel,
    phaseLabel,
    ageLabel,
    cycleEndLabel,
    distanceLabel,
    visibleInLabel: undefined,
    setInLabel: undefined,
    altitudeLabel: undefined,
    azimuthLabel: undefined,
    syncing,
    refreshMoonData,
  };
}
