// Calendar list logic: months list, auto-scroll, and "today" visibility.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatList } from 'react-native';

import { CALENDAR_LAYOUT } from '@/features/calendar/ui/CalendarConstants';
import { getDaysInMonth, getStartOffset } from '@/features/calendar/domain/CalendarDateUtils';

export function useCalendarNavigation(today: Date) {
  const listRef = useRef<FlatList<{ year: number; month: number }>>(null);
  const didAutoScroll = useRef(false);
  const [showTodayButton, setShowTodayButton] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const startYear = today.getFullYear() - 1;
  const todayMonthIndex = (today.getFullYear() - startYear) * 12 + today.getMonth();
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(() => todayMonthIndex);

  const months = useMemo(() => {
    const currentYear = today.getFullYear();
    const endYear = currentYear + 5;
    const list: { year: number; month: number }[] = [];
    for (let year = startYear; year <= endYear; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        list.push({ year, month });
      }
    }
    return list;
  }, [startYear, today]);

  const monthLayouts = useMemo(() => {
    const { cellHeight, rowGap, monthSpacing } = CALENDAR_LAYOUT;
    const heights = months.map(({ year, month }) => {
      const daysInMonth = getDaysInMonth(year, month);
      const startOffset = getStartOffset(year, month);
      const rows = Math.ceil((startOffset + daysInMonth) / 7);
      return rows * cellHeight + (rows - 1) * rowGap + monthSpacing;
    });
    const offsets: number[] = [];
    let acc = 0;
    heights.forEach((height) => {
      offsets.push(acc);
      acc += height;
    });
    return { heights, offsets };
  }, [months]);

  const computeTodayOffset = useCallback(() => {
    const { cellHeight, rowGap, listPaddingTop, headerClearancePx } = CALENDAR_LAYOUT;
    const startOffset = getStartOffset(today.getFullYear(), today.getMonth());
    const dayIndex = startOffset + (today.getDate() - 1);
    const weekIndex = Math.floor(dayIndex / 7);
    const monthOffset = monthLayouts.offsets[todayMonthIndex] ?? 0;
    const weekOffset = weekIndex * (cellHeight + rowGap);
    const target = monthOffset + listPaddingTop + weekOffset + headerClearancePx;
    return Math.max(0, target);
  }, [listHeight, monthLayouts.offsets, today, todayMonthIndex]);

  const getMonthIndex = useCallback(
    (year: number, month: number) => {
      return (year - startYear) * 12 + month;
    },
    [startYear],
  );

  const scrollToMonth = useCallback(
    (year: number, month: number) => {
      const { listPaddingTop, headerClearancePx } = CALENDAR_LAYOUT;
      const index = getMonthIndex(year, month);
      if (index < 0 || index >= months.length) {
        return;
      }
      if (listHeight === 0) {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
        return;
      }
      const monthOffset = monthLayouts.offsets[index] ?? 0;
      const target = monthOffset + listPaddingTop + headerClearancePx;
      listRef.current?.scrollToOffset({ offset: Math.max(0, target), animated: true });
    },
    [getMonthIndex, listHeight, monthLayouts.offsets, months.length],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const isVisible = viewableItems.some((item) => item.index === todayMonthIndex);
      setShowTodayButton(!isVisible);
      const firstVisible = viewableItems.find((item) => item.index !== null);
      if (firstVisible?.index != null) {
        setVisibleMonthIndex(firstVisible.index);
      }
    },
  ).current;

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const offset = info.averageItemLength * info.index;
      listRef.current?.scrollToOffset({ offset, animated: false });
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
      });
    },
    [],
  );

  useEffect(() => {
    if (didAutoScroll.current || listHeight === 0) {
      return;
    }
    didAutoScroll.current = true;
    setVisibleMonthIndex(todayMonthIndex);
    requestAnimationFrame(() => {
      const offset = computeTodayOffset();
      listRef.current?.scrollToOffset({ offset, animated: false });
    });
  }, [computeTodayOffset, listHeight, todayMonthIndex]);

  const scrollToToday = useCallback(() => {
    if (listHeight === 0) {
      listRef.current?.scrollToIndex({ index: todayMonthIndex, animated: true, viewPosition: 0.5 });
      return;
    }
    const offset = computeTodayOffset();
    listRef.current?.scrollToOffset({ offset, animated: true });
  }, [computeTodayOffset, listHeight, todayMonthIndex]);

  const onListLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    setListHeight(event.nativeEvent.layout.height);
  }, []);

  return {
    months,
    listRef,
    showTodayButton,
    visibleMonthIndex,
    onViewableItemsChanged,
    viewabilityConfig,
    handleScrollToIndexFailed,
    scrollToToday,
    scrollToMonth,
    onListLayout,
  };
}
