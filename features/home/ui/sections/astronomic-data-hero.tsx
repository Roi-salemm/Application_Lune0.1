// Bloc d'informations astronomiques sous le hero de la home.
// Pourquoi : regrouper les details pour la lecture rapide, avec fallback sur "..." si absent.

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';

type AstronomicDataHeroProps = {
  ageLabel?: string;
  cycleEndLabel?: string;
  distanceLabel?: string;
  visibleInLabel?: string;
  setInLabel?: string;
  altitudeLabel?: string;
  azimuthLabel?: string;
};

const fallbackValue = (value?: string) => value ?? '...';

export function AstronomicDataHero({
  ageLabel,
  cycleEndLabel,
  distanceLabel,
  visibleInLabel,
  setInLabel,
  altitudeLabel,
  azimuthLabel,
}: AstronomicDataHeroProps) {
  const infoGroups = [
    [
      { label: 'Age de la lunaison', value: fallbackValue(ageLabel) },
      { label: 'prochain cycle', value: fallbackValue(cycleEndLabel) },
    ],
    [
      { label: 'Distance', value: fallbackValue(distanceLabel) },
      { label: 'Visible dans', value: fallbackValue(visibleInLabel) },
      { label: 'Coucher dans', value: fallbackValue(setInLabel) },
    ],
    [
      { label: 'Altitude', value: fallbackValue(altitudeLabel) },
      { label: 'Azimut', value: fallbackValue(azimuthLabel) },
    ],
  ] as const;

  return (
    <View style={styles.container} testID="astronomic-data-hero">
      {infoGroups.map((group, groupIndex) => (
        <View
          key={`astronomic-group-${groupIndex}`}
          style={[styles.group, groupIndex < infoGroups.length - 1 && styles.groupSpacing]}>
          {group.map((item) => (
            <ThemedText key={item.label} type="default" style={styles.line} colorName="annex">
              {item.label} : {item.value}
            </ThemedText>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  group: {
    alignItems: 'center',
    gap: 4,
  },
  groupSpacing: {
    marginBottom: 16,
  },
  line: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
