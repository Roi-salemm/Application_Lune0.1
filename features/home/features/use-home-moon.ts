// Hook home : lit canonique_data + ms_mapping depuis SQLite et orchestre le formatage pour l'UI.
// Pourquoi : garder l'ecran simple tout en deleguant les regles de presentation au domain.
// Rafraichissement : recharge SQLite au montage, puis calcule localement l'age en continu.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  formatAgeDaysLabel,
  formatAsOfLabel,
  formatDistanceKmLabelFromAu,
  formatLunarCycleLabel,
  formatMoonPhaseLabel,
  formatNewMoonWindowParts,
  formatPercentage,
  formatRemainingFromMs,
  formatRemainingDaysLabel,
} from '@/features/home/domain/moon-formatters';
import { getMoonImageByAgeDays } from '@/features/home/domain/moon-image-map';
import {
  fetchMsMappingCycleBoundsUtc,
  fetchMsMappingSnapshot,
  fetchMsMappingYearCycleIndex,
} from '@/features/moon/data/moon-ms-mapping-data';
import {
  fetchCanoniqueDistanceSnapshot,
  fetchCanoniqueIlluminationWindow,
  type CanoniqueIlluminationWindow,
} from '@/features/moon/data/moon-canonique-data';

type HomeMoonState = {
  phaseTopLabel?: string;
  phaseBottomLabel?: string;
  percentage?: string;
  asOfLabel?: string;
  phaseLabel?: string;
  ageLabel?: string;
  moonImageSource?: ImageSourcePropType;
  cycleEndLabel?: string;
  cycleStartDateLabel?: string;
  cycleEndDateLabel?: string;
  distanceLabel?: string;
  previousNewMoonDayLabel?: string;
  previousNewMoonTimeLabel?: string;
  nextNewMoonDayLabel?: string;
  nextNewMoonTimeLabel?: string;
  nextNewMoonLabel?: string;
  nextNewMoonRemainingLabel?: string;
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
  const [moonImageSource, setMoonImageSource] = useState<ImageSourcePropType | undefined>(undefined);
  const [cycleEndLabel, setCycleEndLabel] = useState<string | undefined>(undefined);
  const [cycleStartDateLabel, setCycleStartDateLabel] = useState<string | undefined>(undefined);
  const [cycleEndDateLabel, setCycleEndDateLabel] = useState<string | undefined>(undefined);
  const [distanceLabel, setDistanceLabel] = useState<string | undefined>(undefined);
  const [previousNewMoonDayLabel, setPreviousNewMoonDayLabel] = useState<string | undefined>(undefined);
  const [previousNewMoonTimeLabel, setPreviousNewMoonTimeLabel] = useState<string | undefined>(undefined);
  const [nextNewMoonDayLabel, setNextNewMoonDayLabel] = useState<string | undefined>(undefined);
  const [nextNewMoonTimeLabel, setNextNewMoonTimeLabel] = useState<string | undefined>(undefined);
  const [nextNewMoonLabel, setNextNewMoonLabel] = useState<string | undefined>(undefined);
  const [nextNewMoonRemainingLabel, setNextNewMoonRemainingLabel] = useState<string | undefined>(undefined);
  const [syncing, setSyncing] = useState<boolean>(false);
  const lastNewMoonRef = useRef<Date | null>(null);
  const nextNewMoonRef = useRef<Date | null>(null);
  const illumPctRef = useRef<number | null>(null);
  const phaseDegRef = useRef<number | null>(null);
  const cycleIndexRef = useRef<number | null>(null);
  const illumWindowRef = useRef<CanoniqueIlluminationWindow | null>(null);
  const illumLoadingRef = useRef(false);
  const loadingRef = useRef(false);

  const normalizeIllumination = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    return value <= 1 ? value * 100 : value;
  };

  const computeIlluminationPct = (
    now: Date,
    window: CanoniqueIlluminationWindow | null
  ): number | null => {
    const previous = window?.previous ?? null;
    const next = window?.next ?? null;
    const prevValue = normalizeIllumination(previous?.illumFrac ?? null);
    const nextValue = normalizeIllumination(next?.illumFrac ?? null);

    if (prevValue === null && nextValue === null) {
      return null;
    }
    if (!previous || prevValue === null) {
      return nextValue;
    }
    if (!next || nextValue === null) {
      return prevValue;
    }

    const spanMs = next.asOf.getTime() - previous.asOf.getTime();
    if (!Number.isFinite(spanMs) || spanMs <= 0) {
      return prevValue;
    }

    const tRaw = (now.getTime() - previous.asOf.getTime()) / spanMs;
    const t = Math.max(0, Math.min(1, tRaw));
    return prevValue + (nextValue - prevValue) * t;
  };

  const loadIlluminationWindow = useCallback(async (targetDate: Date) => {
    if (illumLoadingRef.current) {
      return;
    }
    illumLoadingRef.current = true;
    try {
      const window = await fetchCanoniqueIlluminationWindow(targetDate);
      illumWindowRef.current = window;
    } catch (error) {
      console.warn('Failed to load canonique illumination window', error);
    } finally {
      illumLoadingRef.current = false;
    }
  }, []);

  const updateIllumination = useCallback(async () => {
    const now = new Date();
    let window = illumWindowRef.current;
    const previous = window?.previous ?? null;
    const next = window?.next ?? null;
    const needsRefresh =
      !previous ||
      !next ||
      now.getTime() < previous.asOf.getTime() ||
      now.getTime() > next.asOf.getTime();

    if (needsRefresh) {
      await loadIlluminationWindow(now);
      window = illumWindowRef.current;
    }

    const illumPct = computeIlluminationPct(now, window);
    illumPctRef.current = illumPct;
    setPercentage(formatPercentage(illumPct));
  }, [loadIlluminationWindow]);

  const updateDerivedLabels = useCallback(() => {
    const now = new Date();
    const lastNewMoon = lastNewMoonRef.current;
    const nextNewMoon = nextNewMoonRef.current;
    const ageDays =
      lastNewMoon ? Math.max(0, (now.getTime() - lastNewMoon.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const cycleIndexLabel = formatLunarCycleLabel(cycleIndexRef.current);
    setPhaseTopLabel(cycleIndexLabel?.top);
    setPhaseBottomLabel(cycleIndexLabel?.bottom);
    setAgeLabel(formatAgeDaysLabel(ageDays));
    setMoonImageSource(getMoonImageByAgeDays(ageDays) ?? undefined);

    const phaseText = formatMoonPhaseLabel({
      illuminationPct: illumPctRef.current,
      phaseDeg: phaseDegRef.current,
      ageDays,
    });
    setPhaseLabel(phaseText);

    const remainingDays =
      nextNewMoon ? Math.max(0, (nextNewMoon.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const cycleEndLabel = remainingDays !== null && remainingDays <= 30
      ? formatRemainingDaysLabel(remainingDays)
      : undefined;
    setCycleEndLabel(cycleEndLabel);
    const remainingMs = nextNewMoon ? Math.max(0, nextNewMoon.getTime() - now.getTime()) : null;
    setNextNewMoonRemainingLabel(formatRemainingFromMs(remainingMs));

    setAsOfDate(now);
  }, []);

  const loadMoonData = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setSyncing(true);
    try {
      const targetDate = new Date();
      const [msSnapshot, cycleBounds, canoniqueSnapshot, illumWindow] = await Promise.all([
        fetchMsMappingSnapshot(targetDate),
        fetchMsMappingCycleBoundsUtc(targetDate),
        fetchCanoniqueDistanceSnapshot(targetDate),
        fetchCanoniqueIlluminationWindow(targetDate),
      ]);

      lastNewMoonRef.current = cycleBounds.start;
      nextNewMoonRef.current = cycleBounds.end;
      cycleIndexRef.current = await fetchMsMappingYearCycleIndex({
        targetDate,
        currentCycleStart: cycleBounds.start,
      });
      illumPctRef.current = msSnapshot?.illuminationPct ?? null;
      phaseDegRef.current = msSnapshot?.phaseDeg ?? null;

      illumWindowRef.current = illumWindow;
      const illumPct = computeIlluminationPct(targetDate, illumWindow);
      illumPctRef.current = illumPct;
      setPercentage(formatPercentage(illumPct));
      setDistanceLabel(formatDistanceKmLabelFromAu(canoniqueSnapshot?.distAu ?? null));
      const previousWindow = formatNewMoonWindowParts(cycleBounds.start);
      const nextWindow = formatNewMoonWindowParts(cycleBounds.end);
      setPreviousNewMoonDayLabel(previousWindow?.dayLabel);
      setPreviousNewMoonTimeLabel(previousWindow?.timeLabel);
      setNextNewMoonDayLabel(nextWindow?.dayLabel);
      setNextNewMoonTimeLabel(nextWindow?.timeLabel);
      setNextNewMoonLabel(nextWindow ? `${nextWindow.dayLabel} ${nextWindow.timeLabel}` : undefined);
      setCycleStartDateLabel(previousWindow ? `${previousWindow.dayLabel} ${previousWindow.timeLabel}` : undefined);
      setCycleEndDateLabel(nextWindow ? `${nextWindow.dayLabel} ${nextWindow.timeLabel}` : undefined);
      setAsOfDate(new Date());

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
    void updateIllumination();
    const interval = setInterval(() => {
      void updateIllumination();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [updateIllumination]);

  useEffect(() => {
    updateDerivedLabels();
    if (refreshMs > 0) {
      const interval = setInterval(() => {
        updateDerivedLabels();
        const nowMs = Date.now();
        const nextNewMoon = nextNewMoonRef.current;
        const lastNewMoon = lastNewMoonRef.current;
        const sameLocalDay =
          nextNewMoon &&
          (() => {
            const now = new Date(nowMs);
            return (
              nextNewMoon.getFullYear() === now.getFullYear() &&
              nextNewMoon.getMonth() === now.getMonth() &&
              nextNewMoon.getDate() === now.getDate()
            );
          })();
        if (!lastNewMoon || (nextNewMoon && nowMs >= nextNewMoon.getTime() && !sameLocalDay)) {
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
    moonImageSource,
    cycleEndLabel,
    cycleStartDateLabel,
    cycleEndDateLabel,
    distanceLabel,
    previousNewMoonDayLabel,
    previousNewMoonTimeLabel,
    nextNewMoonDayLabel,
    nextNewMoonTimeLabel,
    nextNewMoonLabel,
    nextNewMoonRemainingLabel,
    visibleInLabel: undefined,
    setInLabel: undefined,
    altitudeLabel: undefined,
    azimuthLabel: undefined,
    syncing,
    refreshMoonData,
  };
}
