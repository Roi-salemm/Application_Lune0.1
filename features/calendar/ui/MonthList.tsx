// Month list view using FlatList to render month grids.
import React, { useMemo, useCallback } from 'react';
import { FlatList, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { DayCell } from '@/features/calendar/ui/DayCell';
import { CALENDAR_LAYOUT } from '@/features/calendar/ui/CalendarConstants';
import { formatKey, getDaysInMonth, getStartOffset, isSameDay } from '@/features/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/features/calendar/types/CalendarTypes';

type MonthListProps = {
  months: Array<{ year: number; month: number }>;
  listRef: React.RefObject<FlatList<{ year: number; month: number }>> | React.MutableRefObject<FlatList<{ year: number; month: number }> | null>;
  selectedDate: Date | null;
  notes: Record<string, NoteItem[]>;
  phaseDayKeys: Set<string>;
  phaseTimesByDay: Map<string, string>;
  phaseByDay: Map<string, number>;
  onSelectDate: (date: Date) => void;
  visibleMonthIndex: number;
  onViewableItemsChanged: (info: { viewableItems: Array<{ index: number | null }> }) => void;
  viewabilityConfig: { viewAreaCoveragePercentThreshold: number };
  onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;
  onListLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void;
  listStyle?: StyleProp<ViewStyle>;
};

export function MonthList({
  months,
  listRef,
  selectedDate,
  notes,
  phaseDayKeys,
  phaseTimesByDay,
  phaseByDay,
  onSelectDate,
  visibleMonthIndex,
  onViewableItemsChanged,
  viewabilityConfig,
  onScrollToIndexFailed,
  onListLayout,
  listStyle,
}: MonthListProps) {
  const { cellHeight, rowGap, monthSpacing } = CALENDAR_LAYOUT;

  const monthLayouts = useMemo(() => {
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
  }, [months, cellHeight, rowGap, monthSpacing]);

  const getItemLayout = useCallback(
    (_: ArrayLike<{ year: number; month: number }> | null, index: number) => ({
      length: monthLayouts.heights[index],
      offset: monthLayouts.offsets[index],
      index,
    }),
    [monthLayouts],
  );

  const renderDayCell = (date: Date | null, monthKey: string, index: number) => {
    const isSelected = date && selectedDate ? isSameDay(date, selectedDate) : false;
    const dateKey = date ? formatKey(date) : '';
    const noteColor = dateKey && notes[dateKey]?.length ? notes[dateKey][0].color : null;
    const showMoon = dateKey ? phaseDayKeys.has(dateKey) : false;
    const phaseTimeLabel = dateKey ? phaseTimesByDay.get(dateKey) ?? null : null;
    const phaseValue = dateKey ? phaseByDay.get(dateKey) ?? null : null;
    return (
      <DayCell
        key={`${monthKey}-${index}`}
        date={date}
        isSelected={isSelected}
        noteColor={noteColor}
        showMoon={showMoon}
        phaseTimeLabel={phaseTimeLabel}
        phaseValue={phaseValue}
        hidden={!date}
        onSelectDate={onSelectDate}
      />
    );
  };

  const renderMonth = (year: number, month: number, index: number) => {
    if (Math.abs(index - visibleMonthIndex) > 1) {
      return <View style={[styles.monthSpacer, { height: monthLayouts.heights[index] }]} />;
    }
    const daysInMonth = getDaysInMonth(year, month);
    const startOffset = getStartOffset(year, month);
    const totalCells = startOffset + daysInMonth;
    const remainder = totalCells % 7;
    const trailingEmpty = remainder === 0 ? 0 : 7 - remainder;
    const cells = Array.from({ length: totalCells + trailingEmpty }, (_, index) => {
      if (index < startOffset) {
        return null;
      }
      if (index >= startOffset + daysInMonth) {
        return null;
      }
      return new Date(year, month, index - startOffset + 1);
    });

    return (
      <View style={styles.monthSection}>
        <View style={styles.daysGrid}>
          {cells.map((date, index) => renderDayCell(date, `${year}-${month}`, index))}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={months}
      keyExtractor={(item) => `${item.year}-${item.month}`}
      renderItem={({ item, index }) => renderMonth(item.year, item.month, index)}
      getItemLayout={getItemLayout}
      onLayout={onListLayout}
      style={listStyle}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      initialNumToRender={6}
      windowSize={8}
      maxToRenderPerBatch={6}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollToIndexFailed={onScrollToIndexFailed}
    />
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 140,
    paddingTop: CALENDAR_LAYOUT.listPaddingTop,
  },
  monthSection: {
    gap: 10,
    marginBottom: 20,
  },
  monthSpacer: {
    marginBottom: 20,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
});
