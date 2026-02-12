// Card astronomie 2 : affiche un schema simple Terre/orbite/Lune et des libelles de distance.
// Pourquoi : offrir un second visuel dans le carousel sans dependre encore des donnees.
// Info : la lune utilise l'asset svg du premier quartier.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';

import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { useAstronomieOrbit } from '@/features/home/features/use-astronomie-orbit';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ASTRONOMIE_CARD_HEIGHT } from '@/features/home/ui/astronomie/astronomie-card-dimensions';
import MoonPhase from '../../../../assets/graphisme/p2_permier_quartier.svg';

type SvgResolved = {
  Component?: React.ComponentType<{ width?: number; height?: number }>;
  source?: ImageSourcePropType;
};

const DEBUG_ORBIT_ANIMATION = false;
const ORBIT_ANIMATION_MS = 12_000;
const MOON_SIZE = 22;

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

export type AstronomieCard2Props = {
  distanceGeocentricLabel?: string;
};

export function AstronomieCard2({ distanceGeocentricLabel }: AstronomieCard2Props) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const earth = useThemeColor({}, 'earth');
  const orbitColor = withAlpha(text, 0.6);
  const [orbitLayout, setOrbitLayout] = useState({ width: 216, height: 108 });
  const { angleRad } = useAstronomieOrbit();
  const [debugAngleRad, setDebugAngleRad] = useState<number | null>(null);
  const orbitRxRatio = 100.8 / 216;
  const orbitRyRatio = 36 / 108;

  const renderMoon = () => {
    const resolved = resolveSvgAsset(MoonPhase);
    if (resolved.Component) {
      const Component = resolved.Component;
      return <Component width={MOON_SIZE} height={MOON_SIZE} />;
    }
    if (resolved.source && Platform.OS === 'web') {
      return <Image source={resolved.source} style={styles.moonImage} resizeMode="contain" />;
    }
    return null;
  };

  const handleOrbitLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      setOrbitLayout({ width, height });
    }
  }, []);

  useEffect(() => {
    if (!DEBUG_ORBIT_ANIMATION) {
      setDebugAngleRad(null);
      return;
    }
    let rafId = 0;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = (elapsed % ORBIT_ANIMATION_MS) / ORBIT_ANIMATION_MS;
      setDebugAngleRad(progress * Math.PI * 2);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const moonStyle = useMemo(() => {
    const orbitAngle = debugAngleRad ?? angleRad;
    const width = orbitLayout.width;
    const height = orbitLayout.height;
    const cx = width / 2;
    const cy = height / 2;
    const moonRadius = MOON_SIZE / 2;
    const rx = Math.max(0, width * orbitRxRatio);
    const ry = Math.max(0, height * orbitRyRatio);
    const x = cx + rx * Math.cos(orbitAngle);
    const y = cy + ry * Math.sin(orbitAngle);
    return { left: x - moonRadius, top: y - moonRadius };
  }, [angleRad, debugAngleRad, orbitLayout.height, orbitLayout.width, orbitRxRatio, orbitRyRatio]);

  const geocentricValue = distanceGeocentricLabel?.trim() ? distanceGeocentricLabel : '...';
  const topocentricValue = '...';

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: surface }]} testID="astronomie_card_2">
      <View style={styles.orbitArea}>
        <View style={styles.orbitLayer} onLayout={handleOrbitLayout}>
          <Svg style={styles.orbitSvg} viewBox={`0 0 ${orbitLayout.width} ${orbitLayout.height}`}>
            <Ellipse
              cx={orbitLayout.width / 2}
              cy={orbitLayout.height / 2}
              rx={orbitLayout.width * orbitRxRatio}
              ry={orbitLayout.height * orbitRyRatio}
              stroke={orbitColor}
              strokeWidth={2.5}
              fill="none"
            />
          </Svg>
          <View style={[styles.moonWrap, moonStyle]}>{renderMoon()}</View>
        </View>
        <View style={[styles.earth, { backgroundColor: earth }]} />
      </View>

      <View style={styles.textBlock}>
        <ThemedText variant="petitTexte" style={styles.textLine} colorName="annex">
          Distance Terre-Lune (Geocentrique) : {geocentricValue}
        </ThemedText>
        <ThemedText variant="petitTexte" style={styles.textLine} colorName="annex">
          Distance Terre-Lune (Topocentrique) : {topocentricValue}
        </ThemedText>
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
  orbitArea: {
    height: 96,
    marginHorizontal: 10,
    marginBottom: 6,
    position: 'relative',
  },
  orbitLayer: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    height: 108,
  },
  orbitSvg: {
    width: '100%',
    height: '100%',
  },
  earth: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    left: '25%',
    top: 25,
  },
  moonWrap: {
    position: 'absolute',
    width: MOON_SIZE,
    height: MOON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonImage: {
    width: MOON_SIZE,
    height: MOON_SIZE,
  },
  textBlock: {
    gap: 0,
    marginTop: 4,
  },
  textLine: {
    textAlign: 'left',
  },
});
