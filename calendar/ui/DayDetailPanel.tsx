// Detail panel for a selected day with notes list.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Alert, Animated, Pressable, StyleSheet, View } from 'react-native';
import type { PanResponderInstance } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { WEEKDAY_LONG } from '@/calendar/ui/CalendarConstants';
import { formatDisplay } from '@/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/calendar/types/CalendarTypes';

type DayDetailPanelProps = {
  selectedDate: Date | null;
  selectedNotes: NoteItem[];
  panelTranslateY: Animated.Value;
  panHandlers?: PanResponderInstance['panHandlers'];
  onEditNote?: (note: NoteItem) => void;
  onDeleteNote?: (note: NoteItem) => void;
};

export function DayDetailPanel({
  selectedDate,
  selectedNotes,
  panelTranslateY,
  panHandlers,
  onEditNote,
  onDeleteNote,
}: DayDetailPanelProps) {
  const handleNoteMenu = (note: NoteItem) => {
    Alert.alert('Note', 'Choisir une action', [
      {
        text: 'Modifier',
        onPress: () => onEditNote?.(note),
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => onDeleteNote?.(note),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

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
                <View style={styles.noteTitleRow}>
                  <ThemedText type="default" style={styles.noteTitle}>
                    {note.title}
                  </ThemedText>
                  <Pressable
                    style={styles.noteMenuButton}
                    onPress={() => handleNoteMenu(note)}>
                    <MaterialIcons name="more-vert" size={16} color="#C9CDD2" />
                  </Pressable>
                </View>
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
    color: '#D7DADE',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    color: '#D7DADE',
  },
  phaseText: {
    opacity: 0.8,
    color: '#D7DADE',
  },
  notesList: {
    gap: 12,
    color: '#D7DADE',
  },
  noteRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    color: '#D7DADE',
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
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteTitle: {
    fontSize: 16,
    color: '#ffffffff',
    flex: 1,
  },
  noteMenuButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  noteBody: {
    opacity: 0.7,
    color: '#D7DADE',
  },
  emptyNotes: {
    opacity: 0.6,
  },
});
