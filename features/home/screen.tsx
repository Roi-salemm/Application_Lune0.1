// Ecran d'accueil : compose le hero lunaire et les sections activees par feature flags.
// Pourquoi : garder un point d'entree simple et deleguer chaque bloc a un composant dedie.
import { useCallback, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/shared/themed-view';
import { FeatureSectionList } from '@/core/feature-flags/feature-renderer';
import { MoonPhaseHeader } from '@/features/home/components/moon-phase-header';
import { HomeDebugControls } from '@/features/home/features/home-debug-controls';
import { useHomeMoon } from '@/features/home/features/use-home-moon';
import { HOME_REGISTRY } from '@/features/home/registry';
import { AstronomieCarousel } from '@/features/home/ui/astronomie/astronomie-carousel';
import { AstroDailyCard } from '@/features/home/ui/sections/astro-daily';
import { AstronomicDataHero } from '@/features/home/ui/sections/astronomic-data-hero';
import { MoonDailyCard } from '@/features/home/ui/sections/moon-daily';

const HOME_CONTENT_REGISTRY = HOME_REGISTRY.filter((item) => item.id !== 'home.debug-sqlite');

export default function HomeScreen() {
  const [headerHeight, setHeaderHeight] = useState(260);
  const [heroInteractive, setHeroInteractive] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastHeroInteractive = useRef(true);
  const handleHeaderLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    const nextHeight = event.nativeEvent.layout.height;
    if (Number.isFinite(nextHeight) && nextHeight > 0) {
      setHeaderHeight(nextHeight);
    }
  }, []);
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const shouldBeInteractive = offsetY <= 1;
      if (shouldBeInteractive !== lastHeroInteractive.current) {
        lastHeroInteractive.current = shouldBeInteractive;
        setHeroInteractive(shouldBeInteractive);
      }
    },
    []
  );
  const {
    phaseTopLabel,
    phaseBottomLabel,
    percentage,
    asOfLabel,
    phaseLabel,
    ageLabel,
    moonImageSource,
    cycleEndLabel,
    cycleStartDateLabel,
    cycleEndDateLabel,
    distanceLabel,
    visibleInLabel,
    setInLabel,
    altitudeLabel,
    azimuthLabel,
    previousNewMoonDayLabel,
    previousNewMoonTimeLabel,
    nextNewMoonDayLabel,
    nextNewMoonTimeLabel,
    nextNewMoonRemainingLabel,
  } = useHomeMoon();
  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={styles.container}>
      <HomeDebugControls variant="floating" />
      <View
        style={[styles.hero, heroInteractive && styles.heroInteractive]}
        pointerEvents={heroInteractive ? 'auto' : 'none'}
        onLayout={handleHeaderLayout}>
        <MoonPhaseHeader
          title={phaseLabel ?? '...'}
          subtitle={asOfLabel}
          leftTopLabel={phaseTopLabel}
          leftBottomLabel={phaseBottomLabel}
          rightTopLabel={percentage}
          moonImageSource={moonImageSource}
        />
      </View>
      <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: overlayOpacity }]} />
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 12 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: handleScroll,
        })}
        scrollEventThrottle={16}>
        <View style={styles.details}>
          <AstronomicDataHero
            ageLabel={ageLabel}
            cycleEndLabel={cycleEndLabel}
            cycleStartDateLabel={cycleStartDateLabel}
            cycleEndDateLabel={cycleEndDateLabel}
            distanceLabel={distanceLabel}
            visibleInLabel={visibleInLabel}
            setInLabel={setInLabel}
            altitudeLabel={altitudeLabel}
            azimuthLabel={azimuthLabel}
          />
          <View style={styles.astronomieSection}>
            <AstronomieCarousel
              ageLabel={ageLabel}
              nextNewMoonRemainingLabel={nextNewMoonRemainingLabel}
              previousNewMoonDayLabel={previousNewMoonDayLabel}
              previousNewMoonTimeLabel={previousNewMoonTimeLabel}
              nextNewMoonDayLabel={nextNewMoonDayLabel}
              nextNewMoonTimeLabel={nextNewMoonTimeLabel}
              distanceGeocentricLabel={distanceLabel}
              phaseLabel={phaseLabel}
            />
          </View>
          <View style={styles.moonDaily}>
            <MoonDailyCard />
          </View>
          <View style={styles.astroDaily}>
            <AstroDailyCard />
          </View>
        </View>
        <View style={styles.content}>
          <FeatureSectionList components={HOME_CONTENT_REGISTRY} />
        </View>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  hero: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    zIndex: 0,
  },
  heroInteractive: {
    zIndex: 3,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1,
  },
  scroll: {
    zIndex: 2,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  details: {
    paddingTop: 18,
    paddingHorizontal: 24,
  },
  astroDaily: {
    marginTop: 18,
  },
  moonDaily: {
    marginTop: 18,
  },
  astronomieSection: {
    marginTop: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
});
