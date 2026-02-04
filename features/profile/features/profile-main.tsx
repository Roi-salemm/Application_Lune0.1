import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';

export function ProfileMain() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
