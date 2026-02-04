// Panneau de detail pour un jour selectionne avec la liste des notes.
// Pourquoi : isoler la logique d'edition/suppression et garder l'ecran principal lisible.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { PanResponderInstance } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { WEEKDAY_LONG } from '@/features/calendar/ui/CalendarConstants';
import { formatDisplay } from '@/features/calendar/domain/CalendarDateUtils';
import { NoteItem } from '@/features/calendar/types/CalendarTypes';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const title = useThemeColor({}, 'title');
  const annex = useThemeColor({}, 'annex');
  const action = useThemeColor({}, 'btn-action');
  const nav = useThemeColor({}, 'btn-nav');
  const moonDefault = useThemeColor({}, 'moon-default');
  const panelBackdrop = surface;
  const detailTitleColor = title;
  const detailTextColor = text;
  const accentColor = moonDefault;
  const menuIconColor = nav;
  const menuButtonBg = withAlpha(surface, 0.2);
  const menuBg = surface;
  const menuText = text;
  const divider = withAlpha(border, 0.6);
  const menuShadow = withAlpha(text, 0.35);
  const transparentColor = withAlpha(border, 0);
  const confirmBackdrop = withAlpha(text, 0.45);
  const confirmCardBg = surface;
  const ghostButtonBg = withAlpha(surface, 0.2);
  const dangerBg = action;
  const noteTitleColor = text;
  const noteBodyColor = annex;
  const emptyTextColor = annex;

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
      style={[
        styles.detailPanel,
        { backgroundColor: panelBackdrop },
        { transform: [{ translateY: panelTranslateY }] },
      ]}
      {...panHandlers}>
      <Modal
        transparent
        visible={Boolean(menuState)}
        onRequestClose={closeMenu}
        animationType="fade">
        <Pressable style={[styles.menuBackdrop, { backgroundColor: transparentColor }]} onPress={closeMenu} />
        {menuState ? (
          <View
            style={[
              styles.noteMenu,
              {
                top: menuPosition.top,
                left: menuPosition.left,
                backgroundColor: menuBg,
                shadowColor: menuShadow,
              },
            ]}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              if (!menuLayout || menuLayout.width !== width || menuLayout.height !== height) {
                setMenuLayout({ width, height });
              }
            }}>
            <Pressable style={styles.noteMenuItem} onPress={handleEditPress}>
              <ThemedText type="default" style={styles.noteMenuText} lightColor={menuText} darkColor={menuText}>
                Modifier
              </ThemedText>
            </Pressable>
            <View style={[styles.noteMenuDivider, { backgroundColor: divider }]} />
            <Pressable style={styles.noteMenuItem} onPress={handleDeletePress}>
              <ThemedText type="default" style={styles.noteMenuText} lightColor={menuText} darkColor={menuText}>
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
        <Pressable style={[styles.confirmBackdrop, { backgroundColor: confirmBackdrop }]} onPress={handleCancelDelete} />
        <View style={[styles.confirmCard, { backgroundColor: confirmCardBg }]}>
          <ThemedText type="default" style={styles.confirmTitle} lightColor={menuText} darkColor={menuText}>
            Supprimer la note ?
          </ThemedText>
          <View style={styles.confirmActions}>
            <Pressable style={[styles.confirmButton, { backgroundColor: ghostButtonBg }]} onPress={handleCancelDelete}>
              <ThemedText type="default" style={styles.confirmButtonText} lightColor={menuText} darkColor={menuText}>
                Annuler
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: dangerBg }]}
              onPress={handleConfirmDelete}>
              <ThemedText type="default" style={styles.confirmButtonText} lightColor={menuText} darkColor={menuText}>
                Supprimer
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ThemedText type="title" style={styles.detailTitle} lightColor={detailTitleColor} darkColor={detailTitleColor}>
        {selectedDate
          ? `${WEEKDAY_LONG[(selectedDate.getDay() + 6) % 7]} ${formatDisplay(selectedDate)}`
          : ''}
      </ThemedText>
      <View style={styles.phaseRow}>
        <IconSymbol name="moon.fill" size={18} color={accentColor} />
        <ThemedText type="default" style={styles.phaseText} lightColor={detailTextColor} darkColor={detailTextColor}>
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
                  <ThemedText type="default" style={styles.noteTitle} lightColor={noteTitleColor} darkColor={noteTitleColor}>
                    {note.title}
                  </ThemedText>
                  <Pressable
                    style={[styles.noteMenuButton, { backgroundColor: menuButtonBg }]}
                    onPress={() => handleMenuPress(note)}
                    ref={(node) => {
                      menuButtonRefs.current[note.id] = node;
                    }}>
                    <MaterialIcons name="more-vert" size={16} color={menuIconColor} />
                  </Pressable>
                </View>
                {note.body ? (
                  <ThemedText type="default" style={styles.noteBody} lightColor={noteBodyColor} darkColor={noteBodyColor}>
                    {note.body}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <ThemedText type="default" style={styles.emptyNotes} lightColor={emptyTextColor} darkColor={emptyTextColor}>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
    position: 'relative',
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
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteTitle: {
    fontSize: 16,
    flex: 1,
  },
  noteMenuButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBody: {
    opacity: 0.7,
  },
  emptyNotes: {
    opacity: 0.6,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  noteMenu: {
    position: 'absolute',
    width: MENU_FALLBACK_WIDTH,
    borderRadius: 12,
    paddingVertical: 6,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  noteMenuItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  noteMenuText: {
    fontSize: 14,
  },
  noteMenuDivider: {
    height: 1,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmCard: {
    marginHorizontal: 28,
    marginTop: '60%',
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  confirmTitle: {
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
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
  },
});
