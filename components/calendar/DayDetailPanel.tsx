// Detail panel for a selected day with notes list.
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { PanResponderInstance } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { WEEKDAY_LONG } from '@/constants/calendar';
import { formatDisplay } from '@/lib/calendar-utils';
import { NoteItem } from '@/types/calendar';

type DayDetailPanelProps = {
  selectedDate: Date | null;
  selectedNotes: NoteItem[];
  panelTranslateY: Animated.Value;
  panHandlers?: PanResponderInstance['panHandlers'];
};

export function DayDetailPanel({
  selectedDate,
  selectedNotes,
  panelTranslateY,
  panHandlers,
}: DayDetailPanelProps) {
  return (
    <Animated.View
      style={[styles.detailPanel, { transform: [{ translateY: panelTranslateY }] }]}
      {...panHandlers}>
      <ThemedText type="title" style={styles.detailTitle}>
        {selectedDate
          ? `${WEEKDAY_LONG[(selectedDate.getDay() + 6) % 7]} ${formatDisplay(selectedDate)}`
          : ''}
      </ThemedText>
      <View style={styles.phaseRow}>
        <IconSymbol name="moon.fill" size={18} color="#D3B658" />
        <ThemedText type="default" style={styles.phaseText}>
          Phase lunaire: --
        </ThemedText>
      </View>
      <View style={styles.notesList}>
        {selectedNotes.length ? (
          selectedNotes.map((note) => (
            <View key={note.id} style={styles.noteRow}>
              <View style={[styles.noteDotLarge, { backgroundColor: note.color }]} />
              <View style={styles.noteTextBlock}>
                <ThemedText type="default" style={styles.noteTitle}>
                  {note.title}
                </ThemedText>
                {note.body ? (
                  <ThemedText type="default" style={styles.noteBody}>
                    {note.body}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <ThemedText type="default" style={styles.emptyNotes}>
            Aucune notte pour ce jour
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  detailPanel: {
    flex: 1,
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  detailTitle: {
    fontSize: 20,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseText: {
    opacity: 0.8,
  },
  notesList: {
    gap: 12,
  },
  noteRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  noteDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  noteTextBlock: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
  },
  noteBody: {
    opacity: 0.7,
  },
  emptyNotes: {
    opacity: 0.6,
  },
});
