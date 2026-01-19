import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedView } from '@/components/themed-view';

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
  return (
    <ThemedView style={styles.container}>
      <View style={styles.row}>
        {MENU_ITEMS.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <Pressable
              key={`menu-item-${index}`}
              onPress={() => onPressItem?.(index)}
              style={[styles.button, isActive && styles.buttonActive]}>
              <IconSymbol name={item.name} size={20} color={isActive ? '#1E1E1E' : '#F5F5F5'} />
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
    backgroundColor: '#1E1E1E',
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
    backgroundColor: '#2C2C2C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#D3B658',
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
});
