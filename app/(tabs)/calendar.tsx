// Calendar screen composed of UI components and calendar hooks.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';

import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';
import { MonthList } from '@/components/calendar/MonthList';
import { NoteFormModal } from '@/components/calendar/NoteFormModal';
import { WeekView } from '@/components/calendar/WeekView';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { COLORS, MONTHS, WEEKDAYS } from '@/constants/calendar';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { useCalendarNotes } from '@/hooks/useCalendarNotes';
import { isSameDay } from '@/lib/calendar-utils';

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
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
    scrollToMonth,
    visibleMonthIndex,
    onListLayout,
  } = useCalendarNavigation(today);

  const visibleMonth = months[visibleMonthIndex] ?? { year: today.getFullYear(), month: today.getMonth() };
  const headerLabel = `${MONTHS[visibleMonth.month]} ${visibleMonth.year}`;

  const { notes, selectedNotes, saveNote } = useCalendarNotes(selectedDate, today);

  useEffect(() => {
    if (!params.year || !params.month) {
      return;
    }
    const year = Number(params.year);
    const monthNumber = Number(params.month);
    if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
      return;
    }
    const monthIndex = Math.min(11, Math.max(0, monthNumber - 1));
    setSelectedDate(new Date(year, monthIndex, 1));
    setPanelOpen(false);
    scrollToMonth(year, monthIndex);
    requestAnimationFrame(() => {
      scrollToMonth(year, monthIndex);
    });
  }, [params.month, params.year, scrollToMonth]);

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

  const handleTodayPress = () => {
    setSelectedDate(today);
    setPanelOpen(false);
    scrollToToday();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.monthButton} onPress={() => router.push('/month-picker')}>
          <MaterialIcons name="chevron-left" size={20} color="#C7CBD1" />
          <ThemedText type="default" style={styles.monthButtonText}>
            {headerLabel}
          </ThemedText>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <MaterialIcons name="settings" size={20} color="#C7CBD1" />
          </Pressable>
          <Pressable style={styles.addButton} onPress={() => setFormOpen(true)}>
            <ThemedText type="default" style={styles.addButtonText}>
              +
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day) => (
          <ThemedText key={day} type="default" style={styles.weekdayHeaderText}>
            {day[0]}
          </ThemedText>
        ))}
      </View>

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
          visibleMonthIndex={visibleMonthIndex}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onListLayout={onListLayout}
        />
      )}

      {/* Floating "today" shortcut. */}
      {showTodayButton && !panelOpen ? (
        <Pressable style={styles.todayButton} onPress={handleTodayPress}>
          <ThemedText type="default" style={styles.todayButtonText}>
            Aujourd&apos;hui
          </ThemedText>
        </Pressable>
      ) : null}

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
    backgroundColor: '#34363A',
  },
  header: {
    paddingTop: 32,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0)',
  },
  monthButtonText: {
    color: '#C7CBD1',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A4C50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#E7E9EC',
    fontSize: 22,
    lineHeight: 24,
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    alignItems: 'center',
  },
  weekdayHeaderText: {
    width: '13.2%',
    textAlign: 'center',
    color: '#C7CBD1',
    fontSize: 12,
  },
  todayButton: {
    position: 'absolute',
    right: 18,
    bottom: 90,
    backgroundColor: '#2F3134',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  todayButtonText: {
    color: '#C9CDD2',
    fontSize: 13,
  },
  splitContainer: {
    flex: 1,
  },
});
