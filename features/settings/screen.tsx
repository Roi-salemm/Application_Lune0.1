// Ecran de configuration des feature flags.
// Pourquoi : donner un controle simple des modules visibles dans l'app.
import { Switch, StyleSheet, View } from 'react-native';
import { useMemo } from 'react';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';
import { withAlpha } from '@/constants/theme';
import { ALL_COMPONENTS } from '@/core/feature-flags/registries';
import { useFeatureSettings } from '@/core/feature-flags/feature-settings';
import type { FeatureKey } from '@/core/feature-flags/feature-types';
import { useThemeColor } from '@/hooks/use-theme-color';

type SettingsItem = {
  id: string;
  label: string;
  feature: FeatureKey;
  enabled: boolean;
};

export default function SettingsScreen() {
  const { ready, resolved, userFlags, setUserFlag } = useFeatureSettings();
  const border = useThemeColor({}, 'border');
  const action = useThemeColor({}, 'btn-action');
  const title = useThemeColor({}, 'title');
  const sectionBorder = withAlpha(border, 0.6);
  const switchTrackOff = withAlpha(border, 0.5);
  const switchTrackOn = withAlpha(action, 0.6);
  const switchThumb = title;

  const grouped = useMemo(() => {
    const next: Record<FeatureKey, SettingsItem[]> = {
      home: [],
      calendar: [],
      'lunar-calendar': [],
      mancy: [],
      profile: [],
      settings: [],
    };

    for (const def of ALL_COMPONENTS) {
      const state = resolved[def.id];
      if (!state || !state.available || !state.userToggleable) {
        continue;
      }
      const enabled = userFlags[def.id] ?? state.defaultEnabled;
      next[def.feature].push({
        id: def.id,
        label: def.label,
        feature: def.feature,
        enabled,
      });
    }

    return next;
  }, [resolved, userFlags]);

  if (!ready) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="default">Chargement...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title} colorName="title">
        Settings
      </ThemedText>
      {Object.entries(grouped).map(([featureKey, items]) => {
        if (!items.length) {
          return null;
        }
        return (
          <View key={`settings-${featureKey}`} style={[styles.section, { borderBottomColor: sectionBorder }]}>
            <ThemedText type="default" style={styles.sectionTitle} colorName="annex">
              {featureKey}
            </ThemedText>
            {items.map((item) => (
              <View key={item.id} style={styles.row}>
                <ThemedText type="default" style={styles.label}>
                  {item.label}
                </ThemedText>
                <Switch
                  value={item.enabled}
                  onValueChange={(value) => setUserFlag(item.id, value)}
                  thumbColor={switchThumb}
                  trackColor={{ false: switchTrackOff, true: switchTrackOn }}
                />
              </View>
            ))}
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    textTransform: 'capitalize',
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flex: 1,
  },
});
