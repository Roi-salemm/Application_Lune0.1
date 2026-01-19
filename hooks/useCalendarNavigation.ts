// Calendar list logic: months list, auto-scroll, and "today" visibility.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlatList } from 'react-native';

export function useCalendarNavigation(today: Date) {
  const listRef = useRef<FlatList<{ year: number; month: number }>>(null);
  const didAutoScroll = useRef(false);
  const [showTodayButton, setShowTodayButton] = useState(false);

  const months = useMemo(() => {
    const currentYear = today.getFullYear();
    const startYear = currentYear - 1;
    const endYear = currentYear + 5;
    const list: { year: number; month: number }[] = [];
    for (let year = startYear; year <= endYear; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        list.push({ year, month });
      }
    }
    return list;
  }, [today]);

  const todayMonthIndex = useMemo(() => {
    const currentYear = today.getFullYear();
    return (currentYear - (currentYear - 1)) * 12 + today.getMonth();
  }, [today]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const isVisible = viewableItems.some((item) => item.index === todayMonthIndex);
      setShowTodayButton(!isVisible);
    },
  ).current;

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const offset = info.averageItemLength * info.index;
      listRef.current?.scrollToOffset({ offset, animated: false });
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true });
      });
    },
    [],
  );

  useEffect(() => {
    if (didAutoScroll.current) {
      return;
    }
    didAutoScroll.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: todayMonthIndex, animated: false });
    });
  }, [todayMonthIndex]);

  const scrollToToday = useCallback(() => {
    listRef.current?.scrollToIndex({ index: todayMonthIndex, animated: true });
  }, [todayMonthIndex]);

  return {
    months,
    listRef,
    showTodayButton,
    onViewableItemsChanged,
    viewabilityConfig,
    handleScrollToIndexFailed,
    scrollToToday,
  };
}
