import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const MONTHS = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const WEEKDAY_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const COLORS = ['#D3B658', '#87B8D8', '#8BD49C', '#E5A3A3', '#C9A3E5', '#F0C36D', '#B5B5B5'];
const STORAGE_KEY = 'lune01.notes.v1';

type NoteItem = {
  id: string;
  dateKey: string;
  title: string;
  color: string;
  body: string;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getStartOffset(year: number, month: number) {
  const sundayBased = new Date(year, month, 1).getDay();
  return (sundayBased + 6) % 7;
}

function formatKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export default function CalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const listRef = useRef<FlatList<{ year: number; month: number }>>(null);
  const didAutoScroll = useRef(false);
  const [showTodayButton, setShowTodayButton] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, NoteItem[]>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formColor, setFormColor] = useState(COLORS[0]);
  const panelTranslateY = useRef(new Animated.Value(0)).current;

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
    const loadNotes = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setNotes(JSON.parse(stored));
        }
      } catch {
        setNotes({});
      }
    };
    loadNotes();
  }, []);

  useEffect(() => {
    if (didAutoScroll.current) {
      return;
    }
    didAutoScroll.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: todayMonthIndex, animated: false });
    });
  }, [todayMonthIndex]);

  const scrollToToday = () => {
    listRef.current?.scrollToIndex({ index: todayMonthIndex, animated: true });
  };

  const handleSelectDate = (date: Date) => {
    const isSame = selectedDate ? isSameDay(selectedDate, date) : false;
    setSelectedDate(date);
    if (panelOpen || isSame) {
      setPanelOpen(true);
      return;
    }
    setPanelOpen(false);
  };

  const handleSaveNote = async () => {
    if (!selectedDate || !formTitle.trim()) {
      return;
    }
    const dateKey = formatKey(selectedDate);
    const newNote: NoteItem = {
      id: `${dateKey}-${Date.now()}`,
      dateKey,
      title: formTitle.trim(),
      color: formColor,
      body: formBody.trim(),
    };
    const nextNotes = {
      ...notes,
      [dateKey]: [...(notes[dateKey] ?? []), newNote],
    };
    setNotes(nextNotes);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
    setFormTitle('');
    setFormBody('');
    setFormColor(COLORS[0]);
    setFormOpen(false);
  };

  const selectedKey = selectedDate ? formatKey(selectedDate) : formatKey(today);
  const selectedNotes = notes[selectedKey] ?? [];

  const renderDayCell = (date: Date | null, monthKey: string, index: number) => {
    const isSelected = date && selectedDate ? isSameDay(date, selectedDate) : false;
    const dateKey = date ? formatKey(date) : '';
    const noteColor = dateKey && notes[dateKey]?.length ? notes[dateKey][0].color : null;
    return (
      <Pressable
        key={`${monthKey}-${index}`}
        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
        onPress={() => (date ? handleSelectDate(date) : null)}
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

  const renderWeek = () => {
    const base = selectedDate ?? today;
    const weekStart = getWeekStart(base);
    const days = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + index);
      return d;
    });
    return (
      <View style={styles.weekSection}>
        <ThemedText type="title" style={styles.monthTitle}>
          {MONTHS[base.getMonth()]} {base.getFullYear()}
        </ThemedText>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((day) => (
            <ThemedText key={day} type="default" style={styles.weekday}>
              {day}
            </ThemedText>
          ))}
        </View>
        <View style={styles.weekGrid}>
          {days.map((date, index) => renderDayCell(date, 'week', index))}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {panelOpen ? (
        <View style={styles.splitContainer}>
          {renderWeek()}
          <Animated.View
            style={[styles.detailPanel, { transform: [{ translateY: panelTranslateY }] }]}
            {...panResponder.panHandlers}>
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
        </View>
      ) : (
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
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      )}

      {showTodayButton && !panelOpen ? (
        <Pressable style={styles.todayButton} onPress={scrollToToday}>
          <ThemedText type="default" style={styles.todayButtonText}>
            Retour a aujourd hui
          </ThemedText>
        </Pressable>
      ) : null}

      <Pressable style={styles.addButton} onPress={() => setFormOpen(true)}>
        <ThemedText type="default" style={styles.addButtonText}>
          +
        </ThemedText>
      </Pressable>

      {formOpen ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.formOverlay}>
          <Pressable style={styles.formBackdrop} onPress={Keyboard.dismiss} />
          <View style={styles.formCard}>
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled">
              <ThemedText type="title" style={styles.formTitle}>
                Nouvelle notte
              </ThemedText>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Titre"
                placeholderTextColor="#7A7A7A"
                style={styles.input}
              />
              <View style={styles.dateRow}>
                <ThemedText type="default" style={styles.dateLabel}>
                  Date:
                </ThemedText>
                <ThemedText type="default" style={styles.dateValue}>
                  {selectedDate ? formatDisplay(selectedDate) : ''}
                </ThemedText>
              </View>
              <View style={styles.colorRow}>
                {COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setFormColor(color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      formColor === color && styles.colorDotSelected,
                    ]}
                  />
                ))}
              </View>
              <TextInput
                value={formBody}
                onChangeText={setFormBody}
                placeholder="Notte"
                placeholderTextColor="#7A7A7A"
                style={[styles.input, styles.textArea]}
                multiline
              />
              <View style={styles.formActions}>
                <Pressable style={styles.cancelButton} onPress={() => setFormOpen(false)}>
                  <ThemedText type="default" style={styles.cancelButtonText}>
                    Annuler
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleSaveNote}>
                  <ThemedText type="default" style={styles.saveButtonText}>
                    Sauvegarder
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  weekSection: {
    padding: 16,
    gap: 12,
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
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
  formOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 24,
  },
  formBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  formCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 20,
    maxHeight: '85%',
  },
  formContent: {
    gap: 12,
  },
  formTitle: {
    fontSize: 20,
  },
  input: {
    borderRadius: 12,
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F5F5F5',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateLabel: {
    opacity: 0.7,
  },
  dateValue: {
    opacity: 0.9,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#F5F5F5',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#B5B5B5',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#D3B658',
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#1E1E1E',
  },
});
