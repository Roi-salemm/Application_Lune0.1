// Week view used when a day is opened.
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DayCell } from '@/calendar/ui/DayCell';
import { formatKey, getWeekStart, isSameDay } from '@/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/calendar/types/CalendarTypes';

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
              onSelectDate={onSelectDate}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekSection: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
