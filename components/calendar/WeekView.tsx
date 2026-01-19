// Week view used when a day is opened.
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DayCell } from '@/components/calendar/DayCell';
import { MONTHS, WEEKDAYS } from '@/constants/calendar';
import { formatKey, getWeekStart, isSameDay } from '@/lib/calendar-utils';
import { NoteItem } from '@/types/calendar';

type WeekViewProps = {
  baseDate: Date;
  selectedDate: Date | null;
  notes: Record<string, NoteItem[]>;
  onSelectDate: (date: Date) => void;
};

export function WeekView({ baseDate, selectedDate, notes, onSelectDate }: WeekViewProps) {
  const weekStart = getWeekStart(baseDate);
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d;
  });

  return (
    <View style={styles.weekSection}>
      <ThemedText type="title" style={styles.monthTitle}>
        {MONTHS[baseDate.getMonth()]} {baseDate.getFullYear()}
      </ThemedText>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <ThemedText key={day} type="default" style={styles.weekday}>
            {day}
          </ThemedText>
        ))}
      </View>
      <View style={styles.weekGrid}>
        {days.map((date, index) => {
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const dateKey = formatKey(date);
          const noteColor = notes[dateKey]?.length ? notes[dateKey][0].color : null;
          return (
            <DayCell
              key={`week-${index}`}
              date={date}
              isSelected={isSelected}
              noteColor={noteColor}
              onPress={() => onSelectDate(date)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekSection: {
    padding: 16,
    gap: 12,
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
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
