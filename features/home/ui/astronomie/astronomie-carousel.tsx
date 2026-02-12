// Section astronomie : titre discret + carousel horizontal de cards.
// Pourquoi : separer la logique d'affichage du scroll horizontal de l'ecran home.
// Info : le carousel reste fluide et montre un apercu de la card suivante.
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { AstronomieCard1, type AstronomieCard1Props } from '@/features/home/ui/astronomie/astronomie-card-1';
import { AstronomieCard2 } from '@/features/home/ui/astronomie/astronomie-card-2';

const CARD_PEEK = 24;
const CARD_GAP = 8;

type AstronomieCarouselProps = AstronomieCard1Props & {
  distanceGeocentricLabel?: string;
};

export function AstronomieCarousel(props: AstronomieCarouselProps) {
  const { width } = useWindowDimensions();
  const containerWidth = Math.max(0, width - 48);
  const cardWidth = containerWidth;

  return (
    <View>
      <ThemedText variant="petitTexte" style={styles.title} colorName="annex">
        Astronomie
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}>
        <View style={[styles.cardWrap, { width: cardWidth }]}>
          <AstronomieCard1 {...props} />
        </View>
        <View style={[styles.cardWrap, styles.lastCard, { width: cardWidth }]}>
          <AstronomieCard2 distanceGeocentricLabel={props.distanceGeocentricLabel} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 8,
    marginLeft: 2,
  },
  scroll: {
    marginLeft: -CARD_PEEK,
    marginRight: -CARD_PEEK,
  },
  scrollContent: {
    paddingLeft: CARD_PEEK,
    paddingRight: CARD_PEEK,
  },
  cardWrap: {
    marginRight: CARD_GAP,
  },
  lastCard: {
    marginRight: 0,
  },
});
