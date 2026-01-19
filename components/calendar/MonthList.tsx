// Month list view using FlatList to render month grids.
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DayCell } from '@/components/calendar/DayCell';
import { MONTHS, WEEKDAYS } from '@/constants/calendar';
import { formatKey, getDaysInMonth, getStartOffset, isSameDay } from '@/lib/calendar-utils';
import { NoteItem } from '@/types/calendar';

type MonthListProps = {
  months: Array<{ year: number; month: number }>;
  listRef: React.RefObject<FlatList<{ year: number; month: number }>>;
  selectedDate: Date | null;
  notes: Record<string, NoteItem[]>;
  onSelectDate: (date: Date) => void;
  onViewableItemsChanged: (info: { viewableItems: Array<{ index: number | null }> }) => void;
  viewabilityConfig: { viewAreaCoveragePercentThreshold: number };
  onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;
};

export function MonthList({
  months,
  listRef,
  selectedDate,
  notes,
  onSelectDate,
  onViewableItemsChanged,
  viewabilityConfig,
  onScrollToIndexFailed,
}: MonthListProps) {
  const renderDayCell = (date: Date | null, monthKey: string, index: number) => {
    const isSelected = date && selectedDate ? isSameDay(date, selectedDate) : false;
    const dateKey = date ? formatKey(date) : '';
    const noteColor = dateKey && notes[dateKey]?.length ? notes[dateKey][0].color : null;
    return (
      <DayCell
        key={`${monthKey}-${index}`}
        date={date}
        isSelected={isSelected}
        noteColor={noteColor}
        onPress={date ? () => onSelectDate(date) : undefined}
      />
    );
  };

  const renderMonth = (year: number, month: number) => {
    const daysInMonth = getDaysInMonth(year, month);
    const startOffset = getStartOffset(year, month);
    const cells = Array.from({ length: startOffset + daysInMonth }, (_, index) => {
      if (index < startOffset) {
        return null;
      }
      return new Date(year, month, index - startOffset + 1);
    });

    return (
      <View style={styles.monthSection}>
        <ThemedText type="title" style={styles.monthTitle}>
          {MONTHS[month]} {year}
        </ThemedText>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <ThemedText key={day} type="default" style={styles.weekday}>
              {day}
            </ThemedText>
          ))}
        </View>
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
      renderItem={({ item }) => renderMonth(item.year, item.month)}
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
    padding: 24,
    paddingBottom: 200,
    gap: 28,
  },
  monthSection: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    gap: 16,
  },
  monthTitle: {
    fontSize: 22,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    opacity: 0.7,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
});
