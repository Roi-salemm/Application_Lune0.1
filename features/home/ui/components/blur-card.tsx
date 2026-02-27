// Composant de card "blur" simulee pour la home.
// Pourquoi : garder un rendu uniforme sans appliquer de blur reel (performance).
// Info : la variante controle l'opacite et la teinte du fond.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HOME_CARD_VARIANTS, type HomeCardVariant } from '@/features/home/ui/home-card-variants';

type BlurCardProps = {
  variant?: HomeCardVariant;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
};

export function BlurCard({ variant = 'default', style, children, testID }: BlurCardProps) {
  const config = HOME_CARD_VARIANTS[variant] ?? HOME_CARD_VARIANTS.default;
  const border = useThemeColor({}, 'border');
  const overlayBase = useThemeColor({}, config.overlayColorName);
  const borderColor = withAlpha(border, config.borderAlpha);
  const overlayColor = withAlpha(overlayBase, config.overlayAlpha);

  return (
    <View style={[styles.container, style, { borderColor }]} testID={testID}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
