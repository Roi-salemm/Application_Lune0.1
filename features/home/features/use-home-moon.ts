// Hook home : lit canonique_data + ms_mapping depuis SQLite et orchestre le formatage pour l'UI.
// Pourquoi : garder l'ecran simple tout en deleguant les regles de presentation au domain.
// Rafraichissement : recharge SQLite au montage, puis calcule localement l'age en continu.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatAgeDaysLabel,
  formatAsOfLabel,
  formatDistanceKmLabel,
  formatLunarDay,
  formatMoonPhaseLabel,
  formatPercentage,
  formatRemainingDaysLabel,
} from '@/features/home/domain/moon-formatters';
import {
  fetchMsMappingNewMoonWindow,
  fetchMsMappingSnapshot,
} from '@/features/moon/data/moon-ms-mapping-data';
import { fetchCanoniqueDistanceSnapshot } from '@/features/moon/data/moon-canonique-data';

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

export const DEFAULT_HOME_MOON_REFRESH_MS = 1000;

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
  const lastNewMoonRef = useRef<Date | null>(null);
  const nextNewMoonRef = useRef<Date | null>(null);
  const illumPctRef = useRef<number | null>(null);
  const phaseDegRef = useRef<number | null>(null);
  const loadingRef = useRef(false);

  const updateDerivedLabels = useCallback(() => {
    const now = new Date();
    const lastNewMoon = lastNewMoonRef.current;
    const nextNewMoon = nextNewMoonRef.current;
    const ageDays =
      lastNewMoon ? Math.max(0, (now.getTime() - lastNewMoon.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const dayLabel = formatLunarDay(ageDays);
    setPhaseTopLabel(dayLabel?.top);
    setPhaseBottomLabel(dayLabel?.bottom);
    setAgeLabel(formatAgeDaysLabel(ageDays));

    const phaseText = formatMoonPhaseLabel({
      illuminationPct: illumPctRef.current,
      phaseDeg: phaseDegRef.current,
      ageDays,
    });
    setPhaseLabel(phaseText);

    const remainingDays =
      nextNewMoon ? Math.max(0, (nextNewMoon.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    setCycleEndLabel(formatRemainingDaysLabel(remainingDays));
  }, []);

  const loadMoonData = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setSyncing(true);
    try {
      const targetDate = new Date();
      const [msSnapshot, newMoonWindow, canoniqueSnapshot] = await Promise.all([
        fetchMsMappingSnapshot(targetDate),
        fetchMsMappingNewMoonWindow(targetDate),
        fetchCanoniqueDistanceSnapshot(targetDate),
      ]);

      lastNewMoonRef.current = newMoonWindow.previous;
      nextNewMoonRef.current = newMoonWindow.next;
      illumPctRef.current = msSnapshot?.illuminationPct ?? null;
      phaseDegRef.current = msSnapshot?.phaseDeg ?? null;

      setPercentage(formatPercentage(illumPctRef.current));
      setDistanceLabel(formatDistanceKmLabel(canoniqueSnapshot?.distKm ?? null));
      if (msSnapshot?.asOf) {
        setAsOfDate(msSnapshot.asOf);
      } else {
        setAsOfDate(undefined);
      }

      updateDerivedLabels();
    } catch (error) {
      console.warn('Failed to load moon data', error);
    } finally {
      loadingRef.current = false;
      setSyncing(false);
    }
  }, [updateDerivedLabels]);

  const refreshMoonData = useCallback(async () => {
    await loadMoonData();
  }, [loadMoonData]);

  useEffect(() => {
    void loadMoonData();
  }, [loadMoonData]);

  useEffect(() => {
    updateDerivedLabels();
    if (refreshMs > 0) {
      const interval = setInterval(() => {
        updateDerivedLabels();
        const nowMs = Date.now();
        const nextNewMoon = nextNewMoonRef.current;
        const lastNewMoon = lastNewMoonRef.current;
        if (!lastNewMoon || (nextNewMoon && nowMs >= nextNewMoon.getTime())) {
          void loadMoonData();
        }
      }, refreshMs);

      return () => {
        clearInterval(interval);
      };
    }
  }, [loadMoonData, refreshMs, updateDerivedLabels]);

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
