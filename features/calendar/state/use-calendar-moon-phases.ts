// Charge les jours de phases lunaires autour du mois visible pour le calendrier.
// Pourquoi : ne charger que des fenetres temporelles utiles et afficher les phases dans la grille.
// Info : les dates de phase_hour sont en UTC et converties en jour local (offset appareil).
import { useCallback, useEffect, useRef, useState } from 'react';

import { formatKey } from '@/features/calendar/domain/CalendarDateUtils';
import { fetchMsMappingPhaseHoursInRange } from '@/features/moon/data/moon-ms-mapping-data';

type MonthRef = { year: number; month: number };

const buildMonthKey = (monthRef: MonthRef) =>
  `${monthRef.year}-${String(monthRef.month + 1).padStart(2, '0')}`;

const getMonthRef = (date: Date) => ({ year: date.getFullYear(), month: date.getMonth() });

const MINUTE_MS = 60 * 1000;

const toLocalDateFromUtc = (utcDate: Date) =>
  new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * MINUTE_MS);

const formatLocalKeyFromUtcDate = (utcDate: Date) => {
  const localDate = toLocalDateFromUtc(utcDate);
  const y = localDate.getUTCFullYear();
  const m = String(localDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(localDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatLocalTimeLabelFromUtcDate = (utcDate: Date) => {
  const localDate = toLocalDateFromUtc(utcDate);
  const hours = String(localDate.getUTCHours()).padStart(2, '0');
  const minutes = String(localDate.getUTCMinutes()).padStart(2, '0');
  return `${hours}h${minutes}`;
};

const buildMonthWindow = (start: MonthRef, count: number) => {
  const startDate = new Date(start.year, start.month, 1, 0, 0, 0, 0);
  const endDate = new Date(start.year, start.month + count, 0, 23, 59, 59, 999);
  const months: MonthRef[] = [];
  for (let i = 0; i < count; i += 1) {
    const refDate = new Date(start.year, start.month + i, 1);
    months.push(getMonthRef(refDate));
  }
  return { startDate, endDate, months };
};

export function useCalendarMoonPhases(params: {
  months: MonthRef[];
  visibleMonthIndex: number;
  today: Date;
}) {
  const { months, visibleMonthIndex, today } = params;
  const [phaseDayKeys, setPhaseDayKeys] = useState<Set<string>>(new Set());
  const [phaseTimesByDay, setPhaseTimesByDay] = useState<Map<string, string>>(new Map());
  const [phaseByDay, setPhaseByDay] = useState<Map<string, number>>(new Map());
  const loadedMonthsRef = useRef<Set<string>>(new Set());
  const prevVisibleIndexRef = useRef<number | null>(null);

  const loadPhaseWindow = useCallback(async (start: MonthRef, count: number) => {
    if (count <= 0) {
      return;
    }
    const window = buildMonthWindow(start, count);
    const allLoaded = window.months.every((monthRef) =>
      loadedMonthsRef.current.has(buildMonthKey(monthRef))
    );
    if (allLoaded) {
      return;
    }

    try {
      const phaseRows = await fetchMsMappingPhaseHoursInRange({
        start: window.startDate,
        end: window.endDate,
      });

      if (phaseRows.length) {
        setPhaseDayKeys((prev) => {
          const next = new Set(prev);
          for (const row of phaseRows) {
            next.add(formatLocalKeyFromUtcDate(row.date));
          }
          return next;
        });
        setPhaseTimesByDay((prev) => {
          const next = new Map(prev);
          for (const row of phaseRows) {
            const key = formatLocalKeyFromUtcDate(row.date);
            next.set(key, formatLocalTimeLabelFromUtcDate(row.date));
          }
          return next;
        });
        setPhaseByDay((prev) => {
          const next = new Map(prev);
          for (const row of phaseRows) {
            next.set(formatLocalKeyFromUtcDate(row.date), row.phase);
          }
          return next;
        });
      }

      window.months.forEach((monthRef) => {
        loadedMonthsRef.current.add(buildMonthKey(monthRef));
      });
    } catch (error) {
      console.warn('Failed to load moon phases for calendar', error);
    }
  }, []);

  useEffect(() => {
    const start = getMonthRef(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    void loadPhaseWindow(start, 3);
  }, [loadPhaseWindow, today]);

  useEffect(() => {
    if (!months.length) {
      return;
    }
    const visible = months[visibleMonthIndex];
    if (!visible) {
      return;
    }
    void loadPhaseWindow(visible, 1);

    const prevIndex = prevVisibleIndexRef.current;
    if (prevIndex !== null && prevIndex !== visibleMonthIndex) {
      const direction = visibleMonthIndex > prevIndex ? 1 : -1;
      if (direction > 0) {
        const startIndex = Math.min(visibleMonthIndex + 1, months.length - 1);
        const count = Math.min(4, months.length - startIndex);
        if (count > 0) {
          void loadPhaseWindow(months[startIndex], count);
        }
      } else {
        const endIndex = Math.max(visibleMonthIndex - 1, 0);
        const startIndex = Math.max(visibleMonthIndex - 4, 0);
        const count = endIndex - startIndex + 1;
        if (count > 0) {
          void loadPhaseWindow(months[startIndex], count);
        }
      }
    }

    prevVisibleIndexRef.current = visibleMonthIndex;
  }, [loadPhaseWindow, months, visibleMonthIndex]);

  return { phaseDayKeys, phaseTimesByDay, phaseByDay };
}
