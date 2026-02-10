// Controles debug home : sync des donnees lune et ouverture de l'ecran debug.
// Pourquoi : garder les outils internes separes du rendu utilisateur principal.
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type HomeDebugControlsProps = {
  variant?: 'inline' | 'floating';
  style?: StyleProp<ViewStyle>;
};

export function HomeDebugControls({ variant = 'inline', style }: HomeDebugControlsProps) {
  const router = useRouter();
  const buttonBackground = useThemeColor({}, 'surface');
  const buttonBorder = useThemeColor({}, 'border');
  const buttonText = useThemeColor({}, 'text');
  const isFloating = variant === 'floating';

  return (
    <ThemedView style={[styles.container, isFloating && styles.containerFloating, style]}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push('/debug')}
          style={[
            styles.button,
            { backgroundColor: buttonBackground, borderColor: buttonBorder },
            isFloating && styles.buttonCompact,
          ]}>
          <ThemedText
            type="default"
            style={[styles.buttonText, isFloating && styles.buttonTextCompact]}
            darkColor={buttonText}
            lightColor={buttonText}>
            Debug SQLite
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerFloating: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 20,
    elevation: 10,
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
  },
  buttonTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
});
