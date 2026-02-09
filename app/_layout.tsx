// Layout racine : configure la navigation et la synchronisation des donnees au demarrage.
// Pourquoi : centraliser la navigation globale et les effets applicatifs uniques (dont canonique).
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { FeatureSettingsProvider } from '@/core/feature-flags/feature-settings';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncMoonCanoniqueData } from '@/features/moon/moon.sync';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const controller = new AbortController();

    const syncMoonData = async () => {
      try {
        await syncMoonCanoniqueData({ signal: controller.signal });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        console.warn('Failed to sync moon canonique data', error);
      }
    };

    void syncMoonData();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <FeatureSettingsProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="month-picker" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="debug" options={{ title: 'Debug SQLite' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        </Stack>
        <StatusBar
          style={themeKey === 'dark' ? 'light' : 'dark'}
          backgroundColor={Colors[themeKey].background}
          hidden={false}
        />
      </ThemeProvider>
    </FeatureSettingsProvider>
  );
}
