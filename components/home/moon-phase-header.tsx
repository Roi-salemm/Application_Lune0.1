import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type MoonPhaseHeaderProps = {
  phaseLabel?: string;
  percentage?: string;
};

export function MoonPhaseHeader({
  phaseLabel = 'Phase Lunaire',
  percentage = '100%',
}: MoonPhaseHeaderProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {phaseLabel}
      </ThemedText>
      <ThemedView style={styles.moon} />
      <ThemedText type="default" style={styles.percentage}>
        {percentage}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  title: {
    textAlign: 'center',
  },
  moon: {
    height: 160,
    width: 160,
    borderRadius: 80,
    backgroundColor: '#FFFFFF',
  },
  percentage: {
    opacity: 0.7,
  },
});
