// Ecran d'accueil : compose le hero lunaire et les sections activees par feature flags.
// Pourquoi : garder un point d'entree simple et deleguer chaque bloc a un composant dedie.
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/shared/themed-view';
import { FeatureSectionList } from '@/core/feature-flags/feature-renderer';
import { MoonPhaseHeader } from '@/features/home/components/moon-phase-header';
import { HomeDebugControls } from '@/features/home/features/home-debug-controls';
import { useHomeMoon } from '@/features/home/features/use-home-moon';
import { HOME_REGISTRY } from '@/features/home/registry';
import { AstronomicDataHero } from '@/features/home/ui/sections/astronomic-data-hero';

const HOME_CONTENT_REGISTRY = HOME_REGISTRY.filter((item) => item.id !== 'home.debug-sqlite');

export default function HomeScreen() {
  const {
    phaseTopLabel,
    phaseBottomLabel,
    percentage,
    asOfLabel,
    phaseLabel,
    ageLabel,
    moonImageSource,
    cycleEndLabel,
    distanceLabel,
    visibleInLabel,
    setInLabel,
    altitudeLabel,
    azimuthLabel,
  } = useHomeMoon();

  return (
    <ThemedView style={styles.container}>
      <HomeDebugControls variant="floating" />
      <View style={styles.hero}>
        <MoonPhaseHeader
          title={phaseLabel ?? '...'}
          subtitle={asOfLabel}
          leftTopLabel={phaseTopLabel}
          leftBottomLabel={phaseBottomLabel}
          rightTopLabel={percentage}
          moonImageSource={moonImageSource}
        />
      </View>
      <View style={styles.details}>
        <AstronomicDataHero
          ageLabel={ageLabel}
          cycleEndLabel={cycleEndLabel}
          distanceLabel={distanceLabel}
          visibleInLabel={visibleInLabel}
          setInLabel={setInLabel}
          altitudeLabel={altitudeLabel}
          azimuthLabel={azimuthLabel}
        />
      </View>
      <View style={styles.content}>
        <FeatureSectionList components={HOME_CONTENT_REGISTRY} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  details: {
    paddingTop: 18,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 96,
    paddingTop: 28,
  },
});
