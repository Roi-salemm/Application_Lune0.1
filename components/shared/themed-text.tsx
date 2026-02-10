// Texte thematise avec variantes de styles typographiques.
// Pourquoi : centraliser les couleurs et la typographie pour garder un rendu coherent.
import { Text, type TextProps, type TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { TYPO, type TypoVariant } from '@/constants/typography';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  colorName?: keyof typeof Colors.light & keyof typeof Colors.dark;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  variant?: TypoVariant;
};

const TYPE_STYLE: Record<NonNullable<ThemedTextProps['type']>, TextStyle> = {
  default: TYPO.texte,
  defaultSemiBold: { ...TYPO.texte, fontWeight: '600' },
  title: TYPO.title,
  subtitle: { ...TYPO.baseline, fontWeight: '600' },
  link: { ...TYPO.texte, textDecorationLine: 'underline' },
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  colorName = 'text',
  type = 'default',
  variant,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, colorName);

  return (
    <Text
      style={[
        { color },
        style,
        TYPE_STYLE[type],
        variant ? TYPO[variant] : undefined,
      ]}
      {...rest}
    />
  );
}
