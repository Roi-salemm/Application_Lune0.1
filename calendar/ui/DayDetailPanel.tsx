// Detail panel for a selected day with notes list.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
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

const MENU_PADDING = 12;
const MENU_FALLBACK_WIDTH = 150;
const MENU_FALLBACK_HEIGHT = 94;

export function DayDetailPanel({
  selectedDate,
  selectedNotes,
  panelTranslateY,
  panHandlers,
  onEditNote,
  onDeleteNote,
}: DayDetailPanelProps) {
  const menuButtonRefs = useRef<Record<string, React.ElementRef<typeof Pressable> | null>>({});
  const [menuState, setMenuState] = useState<{
    note: NoteItem;
    anchor: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [menuLayout, setMenuLayout] = useState<{ width: number; height: number } | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState<NoteItem | null>(null);
  const windowSize = Dimensions.get('window');

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const handleMenuPress = useCallback((note: NoteItem) => {
    setMenuLayout(null);
    if (menuState?.note.id === note.id) {
      closeMenu();
      return;
    }

    const target = menuButtonRefs.current[note.id];
    const measureTarget = target as unknown as {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
    };
    if (!measureTarget?.measureInWindow) {
      setMenuState({
        note,
        anchor: { x: MENU_PADDING, y: MENU_PADDING, width: 0, height: 0 },
      });
      return;
    }
    measureTarget.measureInWindow((x, y, width, height) => {
      setMenuState({
        note,
        anchor: { x, y, width, height },
      });
    });
  }, [closeMenu, menuState]);

  const menuPosition = useMemo(() => {
    if (!menuState) {
      return { top: 0, left: 0 };
    }
    const menuWidth = menuLayout?.width ?? MENU_FALLBACK_WIDTH;
    const menuHeight = menuLayout?.height ?? MENU_FALLBACK_HEIGHT;
    const maxLeft = windowSize.width - menuWidth - MENU_PADDING;
    const left = Math.min(
      Math.max(menuState.anchor.x + menuState.anchor.width - menuWidth, MENU_PADDING),
      maxLeft,
    );
    let top = menuState.anchor.y - menuHeight - 8;
    if (top < MENU_PADDING) {
      top = menuState.anchor.y + menuState.anchor.height + 8;
    }
    return { top, left };
  }, [menuLayout, menuState, windowSize.width]);

  const handleEditPress = useCallback(() => {
    if (!menuState) {
      return;
    }
    onEditNote?.(menuState.note);
    closeMenu();
  }, [closeMenu, menuState, onEditNote]);

  const handleDeletePress = useCallback(() => {
    if (!menuState) {
      return;
    }
    setConfirmDeleteNote(menuState.note);
    closeMenu();
  }, [closeMenu, menuState, onDeleteNote]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteNote(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDeleteNote) {
      return;
    }
    onDeleteNote?.(confirmDeleteNote);
    setConfirmDeleteNote(null);
  }, [confirmDeleteNote, onDeleteNote]);

  return (
    <Animated.View
      style={[styles.detailPanel, { transform: [{ translateY: panelTranslateY }] }]}
      {...panHandlers}>
      <Modal
        transparent
        visible={Boolean(menuState)}
        onRequestClose={closeMenu}
        animationType="fade">
        <Pressable style={styles.menuBackdrop} onPress={closeMenu} />
        {menuState ? (
          <View
            style={[styles.noteMenu, { top: menuPosition.top, left: menuPosition.left }]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (!menuLayout || menuLayout.width !== width || menuLayout.height !== height) {
                setMenuLayout({ width, height });
              }
            }}>
            <Pressable style={styles.noteMenuItem} onPress={handleEditPress}>
              <ThemedText type="default" style={styles.noteMenuText}>
                Modifier
              </ThemedText>
            </Pressable>
            <View style={styles.noteMenuDivider} />
            <Pressable style={styles.noteMenuItem} onPress={handleDeletePress}>
              <ThemedText type="default" style={styles.noteMenuText}>
                Supprimer
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </Modal>
      <Modal
        transparent
        visible={Boolean(confirmDeleteNote)}
        onRequestClose={handleCancelDelete}
        animationType="fade">
        <Pressable style={styles.confirmBackdrop} onPress={handleCancelDelete} />
        <View style={styles.confirmCard}>
          <ThemedText type="default" style={styles.confirmTitle}>
            Supprimer la note ?
          </ThemedText>
          <View style={styles.confirmActions}>
            <Pressable style={styles.confirmButton} onPress={handleCancelDelete}>
              <ThemedText type="default" style={styles.confirmButtonText}>
                Annuler
              </ThemedText>
            </Pressable>
            <Pressable style={[styles.confirmButton, styles.confirmButtonDanger]} onPress={handleConfirmDelete}>
              <ThemedText type="default" style={styles.confirmButtonText}>
                Supprimer
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
                    onPress={() => handleMenuPress(note)}
                    ref={(node) => {
                      menuButtonRefs.current[note.id] = node;
                    }}>
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
    position: 'relative',
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
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  noteMenu: {
    position: 'absolute',
    width: MENU_FALLBACK_WIDTH,
    backgroundColor: '#3A3B3E',
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  noteMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  noteMenuText: {
    color: '#E7E9EC',
    fontSize: 14,
  },
  noteMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  confirmCard: {
    marginHorizontal: 28,
    marginTop: '60%',
    backgroundColor: '#2F3134',
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  confirmTitle: {
    color: '#E7E9EC',
    fontSize: 16,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  confirmButtonDanger: {
    backgroundColor: '#4A2D2D',
  },
  confirmButtonText: {
    color: '#E7E9EC',
    fontSize: 14,
  },
});
