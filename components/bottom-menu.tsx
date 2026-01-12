import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';

const MENU_ITEMS = Array.from({ length: 5 });

type BottomMenuProps = {
  onPressItem?: (index: number) => void;
};

export function BottomMenu({ onPressItem }: BottomMenuProps) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.row}>
        {MENU_ITEMS.map((_, index) => (
          <Pressable
            key={`menu-item-${index}`}
            onPress={() => onPressItem?.(index)}
            style={styles.button}
          />
        ))}
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
  },
});
