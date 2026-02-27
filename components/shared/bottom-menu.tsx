// Menu bas avec icones et etat actif.
// Pourquoi : offrir une navigation rapide avec un rendu coherant par theme.
// Info : le fond utilise un blur reel pour laisser voir le contenu dessous.
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const MENU_ITEMS = [
  { name: 'house.fill' },
  { name: 'book.fill' },
  { name: 'moon.fill' },
  { name: 'star.fill' },
  { name: 'person.fill' },
] as const;

type BottomMenuProps = {
  onPressItem?: (index: number) => void;
  activeIndex?: number;
};

export function BottomMenu({ onPressItem, activeIndex }: BottomMenuProps) {
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const action = useThemeColor({}, 'btn-action');
  const nav = useThemeColor({}, 'btn-nav');
  const title = useThemeColor({}, 'title');
  const surface = useThemeColor({}, 'surface');
  const colorScheme = useColorScheme() ?? 'dark';
  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';
  const buttonBackground = withAlpha(background, 0.8);
  const buttonBorder = withAlpha(border, 0.6);
  const activeBorder = withAlpha(title, 0.18);
  const overlayColor = withAlpha(surface, 0.35);

  return (
    <View style={styles.container}>
      <BlurView intensity={30} tint={blurTint} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor }]} />
      <View style={styles.row}>
        {MENU_ITEMS.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <Pressable
              key={`menu-item-${index}`}
              onPress={() => onPressItem?.(index)}
              style={[
                styles.button,
                { backgroundColor: buttonBackground, borderColor: buttonBorder },
                isActive && { backgroundColor: action, borderColor: activeBorder },
              ]}>
              <IconSymbol name={item.name} size={20} color={isActive ? title : nav} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
