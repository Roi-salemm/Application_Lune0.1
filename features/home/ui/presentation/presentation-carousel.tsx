// Section presentation : titre discret + carousel horizontal de cards dynamiques.
// Pourquoi : afficher les cards "featured" en tete de l'ecran home.
// Info : le carousel reprend les memes marges et le meme peek que la section astronomie.
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { useAppCards } from '@/features/content/hooks/use-app-cards';
import { PresentationCard } from '@/features/home/ui/presentation/presentation-card';

const CARD_PEEK = 24;
const CARD_GAP = 8;

export function PresentationCarousel() {
  const { width } = useWindowDimensions();
  const containerWidth = Math.max(0, width - 48);
  const cardWidth = containerWidth;
  const { allCards } = useAppCards();
  const cards = allCards
    .filter((card) => card.featuredRank !== null && card.featuredRank !== undefined)
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0));
  if (!cards.length) {
    return null;
  }

  return (
    <View>
      <ThemedText variant="petitTexte" style={styles.title} colorName="annex">
        Presentation
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}>
        {cards.map((card, index) => {
          const isLast = index === cards.length - 1;
          return (
            <View
              key={card.id}
              style={[styles.cardWrap, isLast && styles.lastCard, { width: cardWidth }]}>
              <PresentationCard card={card} />
            </View>
          );
        })}
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
