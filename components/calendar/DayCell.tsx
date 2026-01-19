// Single day cell in the calendar grid (or an empty placeholder).
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';

type DayCellProps = {
  date: Date | null;
  isSelected: boolean;
  noteColor?: string | null;
  onPress?: () => void;
};

export function DayCell({ date, isSelected, noteColor, onPress }: DayCellProps) {
  return (
    <Pressable
      style={[styles.dayCell, isSelected && styles.dayCellSelected]}
      onPress={onPress}
      disabled={!date}>
      {date ? (
        <>
          <ThemedText type="default" style={styles.dayNumber}>
            {date.getDate()}
          </ThemedText>
          <View style={styles.moonContainer}>
            <IconSymbol name="moon.fill" size={16} color="#D3B658" />
          </View>
          {noteColor ? <View style={[styles.noteDot, { backgroundColor: noteColor }]} /> : null}
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dayCell: {
    width: '13.5%',
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
    position: 'relative',
  },
  dayCellSelected: {
    borderColor: '#C0C0C0',
    borderWidth: 2,
  },
  dayNumber: {
    alignSelf: 'flex-end',
    fontSize: 12,
    opacity: 0.9,
  },
  moonContainer: {
    marginTop: 8,
  },
  noteDot: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
