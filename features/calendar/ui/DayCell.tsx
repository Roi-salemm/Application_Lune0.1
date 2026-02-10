// Cellule jour du calendrier (ou placeholder).
// Pourquoi : isoler le rendu d'un jour et limiter les rerenders via memo.
import React, { memo, useCallback } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import Phase0 from '../../../assets/graphisme/p0_nouvelle_lune.svg';
import Phase2 from '../../../assets/graphisme/p2_permier_quard.svg';
import Phase4 from '../../../assets/graphisme/p4_pleine_lune.svg';
import Phase6 from '../../../assets/graphisme/p6_dernier_quard.svg';

type DayCellProps = {
  date: Date | null;
  isSelected: boolean;
  noteColor?: string | null;
  onSelectDate?: (date: Date) => void;
  hidden?: boolean;
  showMoon?: boolean;
  phaseTimeLabel?: string | null;
  phaseValue?: number | null;
};

type SvgResolved = {
  Component?: React.ComponentType<{ width?: number; height?: number }>;
  source?: ImageSourcePropType;
};

function resolveSvgAsset(asset: unknown): SvgResolved {
  if (!asset) {
    return {};
  }

  if (typeof asset === 'function') {
    return { Component: asset as React.ComponentType<{ width?: number; height?: number }> };
  }

  if (typeof asset === 'string') {
    return { source: { uri: asset } };
  }

  if (typeof asset === 'object') {
    const maybeAsset = asset as {
      default?: unknown;
      uri?: unknown;
    };
    if (typeof maybeAsset.default === 'function') {
      return { Component: maybeAsset.default as React.ComponentType<{ width?: number; height?: number }> };
    }
    if (typeof maybeAsset.default === 'string') {
      return { source: { uri: maybeAsset.default } };
    }
    if (typeof maybeAsset.uri === 'string') {
      return { source: { uri: maybeAsset.uri } };
    }
    if (typeof maybeAsset.default === 'number') {
      return { source: maybeAsset.default as ImageSourcePropType };
    }
    if (typeof maybeAsset.default === 'object') {
      return { source: maybeAsset.default as ImageSourcePropType };
    }
  }

  return {};
}

function DayCellComponent({
  date,
  isSelected,
  noteColor,
  onSelectDate,
  hidden,
  showMoon,
  phaseTimeLabel,
  phaseValue,
}: DayCellProps) {
  const showMediaRow = Boolean(noteColor);
  const isHidden = hidden || !date;
  const showMoonInfo = Boolean(date && showMoon);
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

  const renderPhaseIcon = () => {
    const size = 33;
    const renderSvg = (asset: unknown) => {
      const resolved = resolveSvgAsset(asset);
      if (resolved.Component) {
        const Component = resolved.Component;
        return <Component width={size} height={size} />;
      }
      if (resolved.source && Platform.OS === 'web') {
        return (
          <Image
            source={resolved.source}
            style={{ width: size, height: size }}
            resizeMode="contain"
          />
        );
      }
      return null;
    };
    switch (phaseValue) {
      case 0:
        return renderSvg(Phase0);
      case 2:
        return renderSvg(Phase2);
      case 4:
        return renderSvg(Phase4);
      case 6:
        return renderSvg(Phase6);
      default:
        return null;
    }
  };

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
              <ThemedText variant="calendarDay" style={styles.dayNumber} colorName="text">
                {date.getDate()}
              </ThemedText>
            </View>
            {showMoonInfo ? (
              <>
                <View style={styles.moonContainer}>
                  {renderPhaseIcon()}
                </View>
                <View style={styles.metaBlock}>
                  <ThemedText variant="calendarInfo" style={styles.percentText} colorName="annex">
                    0%
                  </ThemedText>
                  <ThemedText variant="calendarInfoTight" style={styles.timeText} colorName="annex">
                    {phaseTimeLabel ?? '--'}
                  </ThemedText>
                </View>
              </>
            ) : null}
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
  },
  timeText: {
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
