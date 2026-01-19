// Calendar screen composed of UI components and calendar hooks.
import React, { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';
import { MonthList } from '@/components/calendar/MonthList';
import { NoteFormModal } from '@/components/calendar/NoteFormModal';
import { WeekView } from '@/components/calendar/WeekView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COLORS } from '@/constants/calendar';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { useCalendarNotes } from '@/hooks/useCalendarNotes';
import { isSameDay } from '@/lib/calendar-utils';

export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formColor, setFormColor] = useState(COLORS[0]);
  const panelTranslateY = useRef(new Animated.Value(0)).current;

  const {
    months,
    listRef,
    onViewableItemsChanged,
    viewabilityConfig,
    handleScrollToIndexFailed,
    scrollToToday,
    showTodayButton,
  } = useCalendarNavigation(today);

  const { notes, selectedNotes, saveNote } = useCalendarNotes(selectedDate, today);

  // Drag gesture to dismiss the detail panel.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            panelTranslateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 120 || gesture.vy > 1.2) {
            Animated.timing(panelTranslateY, {
              toValue: 400,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              panelTranslateY.setValue(0);
              setPanelOpen(false);
            });
            return;
          }
          Animated.spring(panelTranslateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [panelTranslateY],
  );

  // Update selection and toggle the detail panel.
  const handleSelectDate = (date: Date) => {
    const isSame = selectedDate ? isSameDay(selectedDate, date) : false;
    setSelectedDate(date);
    if (panelOpen || isSame) {
      setPanelOpen(true);
      return;
    }
    setPanelOpen(false);
  };

  // Persist a new note to state and storage.
  const handleSaveNote = async () => {
    const saved = await saveNote({
      date: selectedDate,
      title: formTitle,
      body: formBody,
      color: formColor,
    });
    if (!saved) {
      return;
    }
    setFormTitle('');
    setFormBody('');
    setFormColor(COLORS[0]);
    setFormOpen(false);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Main view: month list or split week/detail panel. */}
      {panelOpen ? (
        <View style={styles.splitContainer}>
          <WeekView
            baseDate={selectedDate ?? today}
            selectedDate={selectedDate}
            notes={notes}
            onSelectDate={handleSelectDate}
          />
          <DayDetailPanel
            selectedDate={selectedDate}
            selectedNotes={selectedNotes}
            panelTranslateY={panelTranslateY}
            panHandlers={panResponder.panHandlers}
          />
        </View>
      ) : (
        <MonthList
          months={months}
          listRef={listRef}
          selectedDate={selectedDate}
          notes={notes}
          onSelectDate={handleSelectDate}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      )}

      {/* Floating "today" shortcut. */}
      {showTodayButton && !panelOpen ? (
        <Pressable style={styles.todayButton} onPress={scrollToToday}>
          <ThemedText type="default" style={styles.todayButtonText}>
            Retour a aujourd hui
          </ThemedText>
        </Pressable>
      ) : null}

      {/* Floating add button to open the note form. */}
      <Pressable style={styles.addButton} onPress={() => setFormOpen(true)}>
        <ThemedText type="default" style={styles.addButtonText}>
          +
        </ThemedText>
      </Pressable>

      {/* Note creation modal. */}
      <NoteFormModal
        visible={formOpen}
        selectedDate={selectedDate}
        formTitle={formTitle}
        formBody={formBody}
        formColor={formColor}
        onChangeTitle={setFormTitle}
        onChangeBody={setFormBody}
        onChangeColor={setFormColor}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveNote}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  todayButton: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    backgroundColor: '#ffffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  todayButtonText: {
    color: '#F5F5F5',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D3B658',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#1E1E1E',
    fontSize: 28,
    lineHeight: 30,
  },
  splitContainer: {
    flex: 1,
  },
});
