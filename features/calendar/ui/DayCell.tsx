// Cellule jour du calendrier (ou placeholder).
// Pourquoi : isoler le rendu d'un jour et limiter les rerenders via memo.
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type DayCellProps = {
  date: Date | null;
  isSelected: boolean;
  noteColor?: string | null;
  onSelectDate?: (date: Date) => void;
  hidden?: boolean;
};

function DayCellComponent({ date, isSelected, noteColor, onSelectDate, hidden }: DayCellProps) {
  const showMediaRow = Boolean(noteColor);
  const isHidden = hidden || !date;
  const unselectedBorder = useThemeColor({}, 'unselected-border');
  const action = useThemeColor({}, 'btn-action');
  const annex = useThemeColor({}, 'annex');
  const dayCellBorder = unselectedBorder;
  const selectionRing = action;
  const selectionShadow = withAlpha(action, 0.5);
  const moonIcon = useThemeColor({}, 'moon-default');
  const mediaDot = annex;
  const handlePress = useCallback(() => {
    if (date && onSelectDate) {
      onSelectDate(date);
    }
  }, [date, onSelectDate]);

  return (
    <View style={[styles.dayCellWrap, isHidden && styles.dayCellHidden]}>
      {isSelected ? (
        <View
          pointerEvents="none"
          style={[styles.selectionRing, { borderColor: selectionRing, shadowColor: selectionShadow }]}
        />
      ) : null}
      <Pressable
        style={[styles.dayCell, { borderColor: dayCellBorder }]}
        onPress={handlePress}
        disabled={isHidden}>
        {date ? (
          <>
            <View style={styles.headerRow}>
              <ThemedText type="default" style={styles.dayNumber} colorName="text">
                {date.getDate()}
              </ThemedText>
            </View>
            <View style={styles.moonContainer}>
              <IconSymbol name="moon.fill" size={33} color={moonIcon} />
            </View>
            <View style={styles.metaBlock}>
              <ThemedText type="default" style={styles.percentText} colorName="annex">
                0%
              </ThemedText>
              <ThemedText type="default" style={styles.timeText} colorName="annex">
                20h44
              </ThemedText>
            </View>
            {showMediaRow ? (
              <View style={styles.mediaRow}>
                <View style={[styles.mediaDot, { backgroundColor: mediaDot }]} />
                <View style={[styles.mediaDot, { backgroundColor: mediaDot }]} />
                <View style={[styles.mediaDot, { backgroundColor: mediaDot }]} />
              </View>
            ) : null}
            {noteColor ? <View style={[styles.noteDot, { backgroundColor: noteColor }]} /> : null}
          </>
        ) : null}
      </Pressable>
    </View>
  );
}

function areEqual(prev: DayCellProps, next: DayCellProps) {
  const prevTime = prev.date ? prev.date.getTime() : null;
  const nextTime = next.date ? next.date.getTime() : null;
  return (
    prevTime === nextTime &&
    prev.isSelected === next.isSelected &&
    prev.noteColor === next.noteColor &&
    prev.hidden === next.hidden
  );
}

export const DayCell = memo(DayCellComponent, areEqual);

const styles = StyleSheet.create({
  dayCellWrap: {
    width: '13.2%',
    height: 122,
    borderRadius: 22,
    position: 'relative',
  },
  dayCell: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 0,
    paddingHorizontal: 2,
    alignItems: 'center',
    position: 'relative',
  },
  selectionRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerRow: {
    width: '100%',
    alignItems: 'center',
  },
  dayNumber: {
    alignSelf: 'center',
    fontSize: 12,
  },
  moonContainer: {
    marginTop: 0,
    marginBottom: 1,
  },
  metaBlock: {
    alignItems: 'center',
    gap: 0,
  },
  percentText: {
    fontSize: 10,
    lineHeight: 15,
  },
  timeText: {
    fontSize: 10,
    lineHeight: 12,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },
  mediaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.7,
  },
  noteDot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    left: '55%',
    bottom: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: -3.5,
  },
  dayCellHidden: {
    opacity: 0,
  },
});
