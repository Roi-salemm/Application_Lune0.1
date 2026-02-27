// Card presentation : affiche une image et un titre pour une card de contenu.
// Pourquoi : partager la meme mise en page entre toutes les cards du carousel.
// Info : la hauteur reprend la dimension des cards astronomie.
import { ImageBackground, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/shared/themed-text';
import { withApiBase } from '@/lib/api';
import { BlurCard } from '@/features/home/ui/components/blur-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { PRE_CARD_HEIGHT } from '@/features/home/ui/astronomie/astronomie-card-dimensions';
import type { AppCardRow } from '@/features/content/app-cards.types';

const DESCRIPTION_BOTTOM_GAP = 15;
const TYPE_CHIP_COLORS = {
  base: {
    border: 'rgba(255,255,255,0.35)',
    background: 'transparent',
    text: '#FFFFFF',
  },
  article: {
    border: '#f0cf91bd',
    background: 'rgba(87, 72, 45, 0.25)',
    text: '#FFFFFF',
  },
  cycle: {
    border: '#7FC7F2',
    background: 'rgba(127,199,242,0.25)',
    text: '#FFFFFF',
  },
  audio: {
    border: '#D3A0F2',
    background: 'rgba(211,160,242,0.25)',
    text: '#FFFFFF',
  },
  meditation: {
    border: '#86E0B0',
    background: 'rgba(134,224,176,0.25)',
    text: '#FFFFFF',
  },
} as const;

export type PresentationCardProps = {
  card?: AppCardRow | null;
  testID?: string;
};

function resolveCoverUrl(url?: string | null) {
  if (!url) {
    return null;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return withApiBase(url);
}

export function PresentationCard({ card, testID }: PresentationCardProps) {
  const border = useThemeColor({}, 'border');
  const annex = useThemeColor({}, 'annex');
  const title = card?.title?.trim() ? card.title : 'placeholder';
  const baseline = card?.baseline?.trim() ? card.baseline : null;
  const description = card?.description?.trim() ? card.description : null;
  const coverUrl = resolveCoverUrl(card?.coverMedia_url);
  const typeChip = resolveTypeChip(card?.type);
  const chipColors = typeChip ? TYPE_CHIP_COLORS[typeChip.colorKey] : TYPE_CHIP_COLORS.base;
  const content = (
    <View style={styles.textBlock}>
      <View style={styles.topBlock}>
        <ThemedText variant="title" style={styles.title} colorName="title" numberOfLines={2}>
          {title}
        </ThemedText>
        {typeChip ? (
          <View style={styles.infoRow}>
            <View
              style={[
                styles.typeChip,
                { borderColor: chipColors.border, backgroundColor: chipColors.background },
              ]}>
              <MaterialIcons name={typeChip.icon} size={12} color={chipColors.text} />
              <ThemedText
                variant="petitTexte"
                style={[styles.typeChipText, { color: chipColors.text }]}
                numberOfLines={1}>
                {typeChip.label}
              </ThemedText>
            </View>
          </View>
        ) : null}
        {/*
        {baseline ? (
          <ThemedText
            variant="baseline"
            style={styles.baseline}
            lightColor={annex}
            darkColor={annex}
            numberOfLines={1}>
            {baseline}
          </ThemedText>
        ) : null}
        */}
      </View>
      {description ? (
        <ThemedText
          variant="texte"
          style={styles.description}
          colorName="text"
          numberOfLines={4}
          ellipsizeMode="tail">
          {description}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <BlurCard style={styles.card} variant="default" testID={testID}>
      {coverUrl ? (
        <ImageBackground source={{ uri: coverUrl }} style={styles.background} resizeMode="cover">
          <CardGradientOverlay />
          <View style={styles.contentWrap}>{content}</View>
        </ImageBackground>
      ) : (
        <View style={[styles.background, { backgroundColor: border }]}>
          <CardGradientOverlay />
          <View style={styles.contentWrap}>{content}</View>
        </View>
      )}
    </BlurCard>
  );
}

function resolveTypeChip(type?: AppCardRow['type'] | null) {
  if (!type) {
    return null;
  }
  if (type === 'information') {
    return null;
  }
  switch (type) {
    case 'article':
      return { label: 'Article', icon: 'description' as const, colorKey: 'article' as const };
    case 'cycle':
      return { label: 'Cycle', icon: 'autorenew' as const, colorKey: 'cycle' as const };
    case 'audio':
      return { label: 'Audio', icon: 'headphones' as const, colorKey: 'audio' as const };
    case 'meditation':
      return { label: 'Meditation', icon: 'self-improvement' as const, colorKey: 'meditation' as const };
    default:
      return { label: type, icon: 'label' as const, colorKey: 'base' as const };
  }
}

function CardGradientOverlay() {
  return (
    <Svg
      pointerEvents="none"
      style={styles.gradientOverlay}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="cardGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#000" stopOpacity={0} />
          <Stop offset={0.6} stopColor="#000" stopOpacity={0.30} />
          <Stop offset={1} stopColor="#000" stopOpacity={0.5} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#cardGradient)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    height: PRE_CARD_HEIGHT,
    overflow: 'hidden',
  },
  background: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 0,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  textBlock: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBlock: {
    gap: 4,
  },
  title: {
    textAlign: 'left',
    color: '#FFFFFF',
    // fontSize: 22,
    // fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  baseline: {
    textAlign: 'left',
    flexShrink: 1,
    minWidth: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  description: {
    textAlign: 'left',
    lineHeight: 19,
    marginBottom: DESCRIPTION_BOTTOM_GAP,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeChipText: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
