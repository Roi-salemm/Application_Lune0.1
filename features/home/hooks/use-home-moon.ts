// Hook home : lit canonique_data + ms_mapping depuis SQLite et orchestre le formatage pour l'UI.
// Pourquoi : garder l'ecran simple tout en deleguant les regles de presentation au domain.
// Rafraichissement : gere par polling adaptatif global et des ticks locaux limites a l'ecran actif.
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';

import {
  formatAgeDaysLabel,
  formatAsOfLabel,
  formatDistanceKmLabel,
  formatLunarCycleLabel,
  formatMoonPhaseLabel,
  formatNewMoonWindowParts,
  formatPercentage,
  formatRemainingFromMs,
  formatRemainingDaysLabel,
} from '@/features/home/domain/moon-formatters';
import { getMoonImageByAgeDays } from '@/features/home/domain/moon-image-map';
import {
  fetchMsMappingNewMoonWindow,
  fetchMsMappingSnapshot,
  fetchMsMappingYearCycleIndex,
} from '@/features/moon/data/moon-ms-mapping-data';
import {
  fetchCanoniqueDistanceWindow,
  fetchCanoniqueIlluminationWindow,
  type CanoniqueDistanceWindow,
  type CanoniqueIlluminationWindow,
} from '@/features/moon/data/moon-canonique-data';
import { useAdaptivePollingJob } from '@/features/moon/orchestration/adaptive-polling';

type HomeMoonState = {
  phaseTopLabel?: string;
  phaseBottomLabel?: string;
  percentage?: string;
  asOfLabel?: string;
  phaseLabel?: string;
  ageLabel?: string;
  moonImageSource?: ImageSourcePropType;
  cycleEndLabel?: string;
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
  isActive?: boolean;
};

export const DEFAULT_HOME_MOON_REFRESH_MS = 60 * 1000;
const ILLUMINATION_IDLE_REFRESH_MS = 5 * 60 * 1000;
const DISTANCE_REFRESH_MS = 1000;
const DISTANCE_WINDOW_REFRESH_MS = 5 * 60 * 1000;
const DERIVED_IDLE_REFRESH_MS = 5 * 60 * 1000;
const ILLUMINATION_STEP_PCT = 0.01;

export function useHomeMoon(options: HomeMoonOptions = {}): HomeMoonState {
  const refreshMs = options.refreshMs ?? DEFAULT_HOME_MOON_REFRESH_MS;
  const isFocused = options.isActive ?? true;
  const [phaseTopLabel, setPhaseTopLabel] = useState<string | undefined>(undefined);
  const [phaseBottomLabel, setPhaseBottomLabel] = useState<string | undefined>(undefined);
  const [percentage, setPercentage] = useState<string | undefined>(undefined);
  const [asOfDate, setAsOfDate] = useState<Date | undefined>(undefined);
  const [phaseLabel, setPhaseLabel] = useState<string | undefined>(undefined);
  const [ageLabel, setAgeLabel] = useState<string | undefined>(undefined);
  const [moonImageSource, setMoonImageSource] = useState<ImageSourcePropType | undefined>(undefined);
  const [cycleEndLabel, setCycleEndLabel] = useState<string | undefined>(undefined);
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
  const distanceWindowRef = useRef<CanoniqueDistanceWindow | null>(null);
  const distanceLoadingRef = useRef(false);
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

  const loadDistanceWindow = useCallback(async (targetDate: Date) => {
    if (distanceLoadingRef.current) {
      return;
    }
    distanceLoadingRef.current = true;
    try {
      const window = await fetchCanoniqueDistanceWindow(targetDate);
      distanceWindowRef.current = window;
    } catch (error) {
      console.warn('Failed to load canonique distance window', error);
    } finally {
      distanceLoadingRef.current = false;
    }
  }, []);

  const normalizeDistance = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    if (value > 0 && value <= 10) {
      return value * 149_597_870.7;
    }
    return value;
  };

  const computeDistanceKm = (
    now: Date,
    window: CanoniqueDistanceWindow | null
  ): number | null => {
    const previous = window?.previous ?? null;
    const next = window?.next ?? null;
    const prevValue = normalizeDistance(previous?.distKm ?? null);
    const nextValue = normalizeDistance(next?.distKm ?? null);

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

  const computeIlluminationNextDelayMs = (
    now: Date,
    window: CanoniqueIlluminationWindow | null
  ): number | null => {
    const previous = window?.previous ?? null;
    const next = window?.next ?? null;
    const prevValue = normalizeIllumination(previous?.illumFrac ?? null);
    const nextValue = normalizeIllumination(next?.illumFrac ?? null);

    if (prevValue === null || nextValue === null || !previous || !next) {
      return null;
    }

    const spanMs = next.asOf.getTime() - previous.asOf.getTime();
    if (!Number.isFinite(spanMs) || spanMs <= 0) {
      return null;
    }

    const ratePerMs = (nextValue - prevValue) / spanMs;
    if (!Number.isFinite(ratePerMs) || ratePerMs === 0) {
      return null;
    }

    const nowMs = now.getTime();
    const tRaw = (nowMs - previous.asOf.getTime()) / spanMs;
    const t = Math.max(0, Math.min(1, tRaw));
    const current = prevValue + (nextValue - prevValue) * t;

    const step = ILLUMINATION_STEP_PCT;
    const direction = ratePerMs > 0 ? 1 : -1;
    const scaled = current / step;
    const nextBucket = direction > 0 ? Math.ceil(scaled) : Math.floor(scaled);
    let target = nextBucket * step;

    if (Math.abs(target - current) < step / 2) {
      target += direction * step;
    }

    if (direction > 0) {
      target = Math.min(target, Math.max(prevValue, nextValue));
    } else {
      target = Math.max(target, Math.min(prevValue, nextValue));
    }

    const delta = target - current;
    if (delta === 0) {
      return null;
    }

    const delayMs = delta / ratePerMs;
    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      return null;
    }

    return Math.max(50, delayMs);
  };

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
    return computeIlluminationNextDelayMs(now, window) ?? ILLUMINATION_IDLE_REFRESH_MS;
  }, [loadIlluminationWindow]);

  const updateDistance = useCallback(async () => {
    const now = new Date();
    let window = distanceWindowRef.current;
    const previous = window?.previous ?? null;
    const next = window?.next ?? null;
    const needsRefresh =
      !previous ||
      !next ||
      now.getTime() < previous.asOf.getTime() ||
      now.getTime() > next.asOf.getTime();

    if (needsRefresh) {
      await loadDistanceWindow(now);
      window = distanceWindowRef.current;
    }

    const distanceKm = computeDistanceKm(now, window);
    setDistanceLabel(formatDistanceKmLabel(distanceKm));
  }, [loadDistanceWindow]);

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
      const [msSnapshot, newMoonWindow, distanceWindow, illumWindow] = await Promise.all([
        fetchMsMappingSnapshot(targetDate),
        fetchMsMappingNewMoonWindow(targetDate),
        fetchCanoniqueDistanceWindow(targetDate),
        fetchCanoniqueIlluminationWindow(targetDate),
      ]);

      lastNewMoonRef.current = newMoonWindow.previous;
      nextNewMoonRef.current = newMoonWindow.next;
      cycleIndexRef.current = await fetchMsMappingYearCycleIndex({
        targetDate,
        currentCycleStart: newMoonWindow.previous,
      });
      illumPctRef.current = msSnapshot?.illuminationPct ?? null;
      phaseDegRef.current = msSnapshot?.phaseDeg ?? null;

      illumWindowRef.current = illumWindow;
      const illumPct = computeIlluminationPct(targetDate, illumWindow);
      illumPctRef.current = illumPct;
      setPercentage(formatPercentage(illumPct));
      distanceWindowRef.current = distanceWindow;
      const distanceKm = computeDistanceKm(targetDate, distanceWindow);
      setDistanceLabel(formatDistanceKmLabel(distanceKm));
      const previousWindow = formatNewMoonWindowParts(newMoonWindow.previous);
      const nextWindow = formatNewMoonWindowParts(newMoonWindow.next);
      setPreviousNewMoonDayLabel(previousWindow?.dayLabel);
      setPreviousNewMoonTimeLabel(previousWindow?.timeLabel);
      setNextNewMoonDayLabel(nextWindow?.dayLabel);
      setNextNewMoonTimeLabel(nextWindow?.timeLabel);
      setNextNewMoonLabel(nextWindow ? `${nextWindow.dayLabel} ${nextWindow.timeLabel}` : undefined);
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

  const tickDerivedLabels = useCallback(async () => {
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
      await loadMoonData();
      return;
    }

    updateDerivedLabels();
  }, [loadMoonData, updateDerivedLabels]);

  const derivedActiveJob = useMemo(
    () => ({
      id: 'home-moon-derived-active',
      run: tickDerivedLabels,
      defaultDelayMs: refreshMs,
      minDelayMs: 250,
      maxDelayMs: 10_000,
    }),
    [refreshMs, tickDerivedLabels]
  );

  const derivedIdleJob = useMemo(
    () => ({
      id: 'home-moon-derived-idle',
      run: tickDerivedLabels,
      defaultDelayMs: DERIVED_IDLE_REFRESH_MS,
      minDelayMs: 60_000,
      maxDelayMs: DERIVED_IDLE_REFRESH_MS,
    }),
    [tickDerivedLabels]
  );

  const illumActiveJob = useMemo(
    () => ({
      id: 'home-moon-illumination-active',
      run: updateIllumination,
      defaultDelayMs: 1000,
      minDelayMs: 50,
      maxDelayMs: 10_000,
    }),
    [updateIllumination]
  );

  const illumIdleJob = useMemo(
    () => ({
      id: 'home-moon-illumination-idle',
      run: async () => {
        await updateIllumination();
        return ILLUMINATION_IDLE_REFRESH_MS;
      },
      defaultDelayMs: ILLUMINATION_IDLE_REFRESH_MS,
      minDelayMs: 60_000,
      maxDelayMs: ILLUMINATION_IDLE_REFRESH_MS,
    }),
    [updateIllumination]
  );

  const distanceJob = useMemo(
    () => ({
      id: 'home-moon-distance',
      run: updateDistance,
      defaultDelayMs: DISTANCE_REFRESH_MS,
      minDelayMs: 1000,
      maxDelayMs: 60_000,
    }),
    [updateDistance]
  );

  const distanceWindowJob = useMemo(
    () => ({
      id: 'home-moon-distance-window',
      run: async () => {
        await loadDistanceWindow(new Date());
        return DISTANCE_WINDOW_REFRESH_MS;
      },
      defaultDelayMs: DISTANCE_WINDOW_REFRESH_MS,
      minDelayMs: 60_000,
      maxDelayMs: DISTANCE_WINDOW_REFRESH_MS,
    }),
    [loadDistanceWindow]
  );

  useAdaptivePollingJob(derivedActiveJob, isFocused);
  useAdaptivePollingJob(derivedIdleJob, !isFocused);
  useAdaptivePollingJob(illumActiveJob, isFocused);
  useAdaptivePollingJob(illumIdleJob, !isFocused);
  useAdaptivePollingJob(distanceJob, isFocused);
  useAdaptivePollingJob(distanceWindowJob, isFocused);

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
