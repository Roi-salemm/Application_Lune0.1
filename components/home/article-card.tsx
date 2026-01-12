import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ArticleCardProps = {
  title: string;
  imageSource: number;
  onPress: () => void;
};

export function ArticleCard({ title, imageSource, onPress }: ArticleCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <ThemedView style={styles.card}>
        <Image source={imageSource} style={styles.image} contentFit="cover" />
        <View style={styles.textContainer}>
          <ThemedText type="subtitle">{title}</ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  image: {
    height: 140,
    width: '100%',
  },
  textContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
