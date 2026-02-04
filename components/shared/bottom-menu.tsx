// Menu bas avec icones et etat actif.
// Pourquoi : offrir une navigation rapide avec un rendu coherant par theme.
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/shared/themed-view';
import { withAlpha } from '@/constants/theme';
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
  const surface = useThemeColor({}, 'surface');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const action = useThemeColor({}, 'btn-action');
  const nav = useThemeColor({}, 'btn-nav');
  const title = useThemeColor({}, 'title');
  const buttonBackground = withAlpha(background, 0.8);
  const buttonBorder = withAlpha(border, 0.6);
  const activeBorder = withAlpha(title, 0.18);

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
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
    </ThemedView>
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
