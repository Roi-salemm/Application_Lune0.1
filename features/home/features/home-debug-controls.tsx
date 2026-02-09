// Controles debug home : sync des donnees lune et ouverture de l'ecran debug.
// Pourquoi : garder les outils internes separes du rendu utilisateur principal.
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { syncMoonCanoniqueData, syncMoonMsMappingData } from '@/features/moon/moon.sync';

type HomeDebugControlsProps = {
  variant?: 'inline' | 'floating';
  style?: StyleProp<ViewStyle>;
};

export function HomeDebugControls({ variant = 'inline', style }: HomeDebugControlsProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const buttonBackground = useThemeColor({}, 'surface');
  const buttonBorder = useThemeColor({}, 'border');
  const buttonText = useThemeColor({}, 'text');
  const isFloating = variant === 'floating';

  const handleSync = async () => {
    if (syncing) {
      return;
    }
    setSyncing(true);
    try {
      await syncMoonCanoniqueData({ force: true });
      await syncMoonMsMappingData({ force: true });
    } catch (error) {
      console.warn('Failed to sync SQLite data', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ThemedView style={[styles.container, isFloating && styles.containerFloating, style]}>
      <View style={styles.row}>
        <Pressable
          onPress={handleSync}
          disabled={syncing}
          style={[
            styles.button,
            { backgroundColor: buttonBackground, borderColor: buttonBorder },
            isFloating && styles.buttonCompact,
            syncing && styles.buttonDisabled,
          ]}>
          <ThemedText
            type="default"
            style={[styles.buttonText, isFloating && styles.buttonTextCompact]}
            darkColor={buttonText}
            lightColor={buttonText}>
            {syncing ? 'Sync...' : 'Sync SQLite'}
          </ThemedText>
        </Pressable>
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
  },
  buttonTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
});
