// En-tete phase de lune pour la home : titres, grand rond et pastilles de la maquette.
// Pourquoi : encapsuler la mise en page (positions absolues) pour ajuster le rendu sans toucher l'ecran.
// Info : les pastilles sont en absolu autour du cercle pour coller au visuel.

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const MOON_SIZE = 180;
const PILL_HEIGHT = 46;
const PILL_OFFSET_X = 12;
const FADE_DURATION_MS = 700;

type MoonPhaseHeaderProps = {
  title?: string;
  subtitle?: string;
  leftTopLabel?: string;
  leftBottomLabel?: string;
  rightTopLabel?: string;
  rightBottomLabel?: string;
  moonImageSource?: ImageSourcePropType;
};

type MoonPhasePillProps = {
  topLabel?: string;
  bottomLabel?: string;
  style?: StyleProp<ViewStyle>;
  backgroundColor: string;
  borderColor: string;
  strongColor: string;
};

export function MoonPhaseHeader({
  title = 'Phase de la lune',
  subtitle,
  leftTopLabel,
  leftBottomLabel,
  rightTopLabel,
  rightBottomLabel = 'illuminer',
  moonImageSource,
}: MoonPhaseHeaderProps) {
  const subtitleText = subtitle ?? '...';
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const titleColor = useThemeColor({}, 'title');
  const moonColor = useThemeColor({}, 'moon-default');
  const pillBackground = withAlpha(surface, 0.16);
  const pillBorder = withAlpha(border, 0.7);
  const pillStrong = titleColor;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title} colorName="title">
          {title}
        </ThemedText>
        <ThemedText style={styles.subtitle} colorName="annex">
          {subtitleText}
        </ThemedText>
      </View>
      <View style={styles.moonCluster}>
        <MoonPhaseImage source={moonImageSource} fallbackColor={moonColor} />
        <MoonPhasePill
          topLabel={leftTopLabel}
          bottomLabel={leftBottomLabel}
          style={styles.leftPill}
          backgroundColor={pillBackground}
          borderColor={pillBorder}
          strongColor={pillStrong}
        />
        <MoonPhasePill
          topLabel={rightTopLabel}
          bottomLabel={rightBottomLabel}
          style={styles.rightPill}
          backgroundColor={pillBackground}
          borderColor={pillBorder}
          strongColor={pillStrong}
        />
      </View>
    </View>
  );
}

type MoonPhaseImageProps = {
  source?: ImageSourcePropType;
  fallbackColor: string;
};

function MoonPhaseImage({ source, fallbackColor }: MoonPhaseImageProps) {
  const [currentSource, setCurrentSource] = useState<ImageSourcePropType | null>(
    source ?? null
  );
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!source) {
      setCurrentSource(null);
      opacity.setValue(1);
      return;
    }

    if (source === currentSource) {
      return;
    }

    opacity.setValue(0);
    setCurrentSource(source);
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [currentSource, opacity, source]);

  const backgroundColor = currentSource ? 'transparent' : fallbackColor;

  return (
    <View style={[styles.moon, { backgroundColor }]}>
      {currentSource ? (
        <Animated.Image
          source={currentSource}
          style={[styles.moonImage, { opacity }]}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}

function MoonPhasePill({
  topLabel = '...',
  bottomLabel,
  style,
  backgroundColor,
  borderColor,
  strongColor,
}: MoonPhasePillProps) {
  return (
    <View style={[styles.pill, { backgroundColor, borderColor }, style]}>
      <ThemedText style={styles.pillTop}>{topLabel}</ThemedText>
      {bottomLabel ? (
        <ThemedText style={styles.pillBottom} lightColor={strongColor} darkColor={strongColor}>
          {bottomLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  moonCluster: {
    marginTop: 24,
    width: '100%',
    height: MOON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moon: {
    width: MOON_SIZE,
    height: MOON_SIZE,
    borderRadius: MOON_SIZE / 2,
    overflow: 'hidden',
  },
  moonImage: {
    width: '100%',
    height: '100%',
  },
  leftPill: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: [{ translateX: -PILL_OFFSET_X }, { translateY: -PILL_HEIGHT / 2 }],
  },
  rightPill: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateX: PILL_OFFSET_X }, { translateY: -PILL_HEIGHT / 2 }],
  },
  pill: {
    minWidth: 84,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTop: {
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
    opacity: 0.75,
  },
  pillBottom: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
