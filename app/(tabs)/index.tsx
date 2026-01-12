import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { BottomMenu } from '@/components/bottom-menu';
import { ArticleCard } from '@/components/home/article-card';
import { MoonPhaseHeader } from '@/components/home/moon-phase-header';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <MoonPhaseHeader />
        <ThemedView style={styles.cardSection}>
          <ArticleCard
            title="Découvrir la lune"
            imageSource={require('@/assets/images/partial-react-logo.png')}
            onPress={() => router.push('/modal')}
          />
        </ThemedView>
      </ScrollView>
      <BottomMenu />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 140,
    gap: 24,
  },
  cardSection: {
    width: '100%',
    gap: 16,
  },
});
