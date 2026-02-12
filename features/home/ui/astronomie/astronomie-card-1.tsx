// Card astronomie : affiche l'age actuel de la lune et les nouvelles lunes encadrantes.
// Pourquoi : proposer un bloc visuel simple qui reutilise les donnees deja chargees pour la home.
// Info : les phases suivent une courbe, et un point dore indique la phase courante.
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { phaseLabelToIndex } from '@/features/home/domain/astronomie-phases';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ASTRONOMIE_CARD_HEIGHT } from '@/features/home/ui/astronomie/astronomie-card-dimensions';

import Phase0 from '../../../../assets/graphisme/p0_nouvelle_lune.svg';
import Phase1 from '../../../../assets/graphisme/p1_premier_croissant.svg';
import Phase2 from '../../../../assets/graphisme/p2_permier_quartier.svg';
import Phase3 from '../../../../assets/graphisme/p3_gibbeuse_croissante.svg';
import Phase4 from '../../../../assets/graphisme/p4_pleine_lune.svg';
import Phase5 from '../../../../assets/graphisme/p5_gibbeuse_decroissante.svg';
import Phase6 from '../../../../assets/graphisme/p6_dernier_quartier.svg';
import Phase7 from '../../../../assets/graphisme/p7_dernier_croissant.svg';

type SvgResolved = {
  Component?: React.ComponentType<{ width?: number; height?: number }>;
  source?: ImageSourcePropType;
};

const MOON_SIZE = 26;
const MOON_ASSETS = [Phase0, Phase1, Phase2, Phase3, Phase4, Phase5, Phase6, Phase7, Phase0] as const;
const ARC_MARGIN_X = 0.015;
const MOON_ARC = { startY: 0.58, controlY: 0.08, endY: 0.58 };
const CURVE_ARC = { startY: 0.78, controlY: 0.32, endY: 0.78 };
const CURVE_TOP_OFFSET = 16;
const DATE_ROW_TOP = 122;

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

export type AstronomieCard1Props = {
  ageLabel?: string;
  nextNewMoonRemainingLabel?: string;
  previousNewMoonDayLabel?: string;
  previousNewMoonTimeLabel?: string;
  nextNewMoonDayLabel?: string;
  nextNewMoonTimeLabel?: string;
  phaseLabel?: string;
};

export function AstronomieCard1({
  ageLabel,
  nextNewMoonRemainingLabel,
  previousNewMoonDayLabel,
  previousNewMoonTimeLabel,
  nextNewMoonDayLabel,
  nextNewMoonTimeLabel,
  phaseLabel,
}: AstronomieCard1Props) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const action = useThemeColor({}, 'btn-action');
  const ageValue = ageLabel?.trim() ? ageLabel : '...';
  const nextNewMoonRemainingValue = nextNewMoonRemainingLabel?.trim()
    ? nextNewMoonRemainingLabel
    : '...';
  const startDay = previousNewMoonDayLabel?.trim() ? previousNewMoonDayLabel : '...';
  const startTime = previousNewMoonTimeLabel?.trim() ? previousNewMoonTimeLabel : '...';
  const endDay = nextNewMoonDayLabel?.trim() ? nextNewMoonDayLabel : '...';
  const endTime = nextNewMoonTimeLabel?.trim() ? nextNewMoonTimeLabel : '...';
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const currentPhaseIndex = phaseLabelToIndex(phaseLabel);

  const handleImageLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      setImageLayout({ width, height });
    }
  }, []);

  const curve = useMemo(() => {
    if (!imageLayout.width || !imageLayout.height) {
      return null;
    }
    const startX = imageLayout.width * ARC_MARGIN_X;
    const endX = imageLayout.width * (1 - ARC_MARGIN_X);
    const controlX = imageLayout.width * 0.5;
    return {
      startX,
      endX,
      controlX,
    };
  }, [imageLayout.height, imageLayout.width]);

  const getPointOnArc = useCallback(
    (t: number, arc: { startY: number; controlY: number; endY: number }) => {
      if (!curve) {
        return { x: 0, y: 0 };
      }
      const p0 = { x: curve.startX, y: imageLayout.height * arc.startY };
      const p1 = { x: curve.controlX, y: imageLayout.height * arc.controlY };
      const p2 = { x: curve.endX, y: imageLayout.height * arc.endY };
      const u = 1 - t;
      const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
      const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
      return { x, y };
    },
    [curve, imageLayout.height]
  );

  const moonStyles = useMemo(() => {
    if (!imageLayout.width || !imageLayout.height) {
      return [];
    }
    const half = MOON_SIZE / 2;
    const count = MOON_ASSETS.length;
    const startT = 0.02;
    const endT = 0.98;
    const step = count > 1 ? (endT - startT) / (count - 1) : 0;
    return Array.from({ length: count }).map((_, index) => {
      const t = startT + step * index;
      const point = getPointOnArc(t, MOON_ARC);
      return {
        left: point.x - half,
        top: point.y - half,
      };
    });
  }, [getPointOnArc, imageLayout.height, imageLayout.width]);

  const curvePath = useMemo(() => {
    if (!curve) {
      return '';
    }
    const startY = imageLayout.height * CURVE_ARC.startY + CURVE_TOP_OFFSET;
    const controlY = imageLayout.height * CURVE_ARC.controlY + CURVE_TOP_OFFSET;
    const endY = imageLayout.height * CURVE_ARC.endY + CURVE_TOP_OFFSET;
    return `M ${curve.startX} ${startY} Q ${curve.controlX} ${controlY} ${curve.endX} ${endY}`;
  }, [curve, imageLayout.height]);

  const dotPosition = useMemo(() => {
    if (currentPhaseIndex === null || currentPhaseIndex === undefined || currentPhaseIndex < 0) {
      return null;
    }
    const count = MOON_ASSETS.length;
    const startT = 0.04;
    const endT = 0.96;
    const step = count > 1 ? (endT - startT) / (count - 1) : 0;
    const t = startT + step * Math.min(currentPhaseIndex, count - 1);
    const point = getPointOnArc(t, CURVE_ARC);
    return { ...point, y: point.y + CURVE_TOP_OFFSET };
  }, [currentPhaseIndex, getPointOnArc]);

  const renderMoon = (asset: unknown, index: number) => {
    const resolved = resolveSvgAsset(asset);
    if (resolved.Component) {
      const Component = resolved.Component;
      return (
        <View key={`moon-${index}`} style={[styles.moonItem, moonStyles[index]]}>
          <Component width={MOON_SIZE} height={MOON_SIZE} />
        </View>
      );
    }
    if (resolved.source && Platform.OS === 'web') {
      return (
        <Image
          key={`moon-${index}`}
          source={resolved.source}
          style={[styles.moonItem, moonStyles[index], styles.moonImage]}
          resizeMode="contain"
        />
      );
    }
    return null;
  };

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: surface }]} testID="astronomie_card_1">
      <View style={styles.imageArea} onLayout={handleImageLayout}>
        {moonStyles.length
          ? MOON_ASSETS.map((asset, index) => renderMoon(asset, index))
          : null}
        {curvePath ? (
          <Svg style={styles.curveSvg}>
            <Path d={curvePath} stroke={withAlpha(text, 0.6)} strokeWidth={1.5} fill="none" />
            {dotPosition ? <Circle cx={dotPosition.x} cy={dotPosition.y} r={4.5} fill={action} /> : null}
          </Svg>
        ) : null}
        <View style={styles.centerContent}>
          <ThemedText variant="petitTexte" style={styles.centerLabel} colorName="annex">
            Age actuel de la lune :
          </ThemedText>
          <ThemedText variant="baseline" style={styles.centerValue} colorName="title">
            {ageValue}
          </ThemedText>
          <ThemedText variant="petitTexte" style={styles.centerLabel} colorName="annex">
            Prochin cycle :
          </ThemedText>
          <ThemedText variant="baseline" style={styles.centerValue} colorName="title">
            {nextNewMoonRemainingValue}
          </ThemedText>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.bottomColumn}>
          <ThemedText variant="petitTexte" style={styles.bottomText} colorName="annex">
            {startDay}
          </ThemedText>
          <ThemedText variant="petitTexte" style={styles.bottomText} colorName="annex">
            {startTime}
          </ThemedText>
        </View>
        <View style={styles.bottomColumn}>
          <ThemedText variant="petitTexte" style={styles.bottomText} colorName="annex">
            {endDay}
          </ThemedText>
          <ThemedText variant="petitTexte" style={styles.bottomText} colorName="annex">
            {endTime}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    height: ASTRONOMIE_CARD_HEIGHT,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  imageArea: {
    height: 72,
    marginHorizontal: 10,
    marginTop: -17,
    marginBottom: 6,
    position: 'relative',
  },
  curveSvg: {
    ...StyleSheet.absoluteFillObject,
  },
  moonItem: {
    position: 'absolute',
    width: MOON_SIZE,
    height: MOON_SIZE,
  },
  moonImage: {
    width: MOON_SIZE,
    height: MOON_SIZE,
  },
  centerContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 73,
    alignItems: 'center',
    gap: 2,
  },
  centerLabel: {
    textAlign: 'center',
  },
  centerValue: {
    textAlign: 'center',
  },
  bottomRow: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: DATE_ROW_TOP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -18,
  },
  bottomColumn: {
    alignItems: 'center',
    minWidth: 84,
    gap: 0,
  },
  bottomText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
