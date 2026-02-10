// Card de phase lunaire quotidienne pour la home.
// Pourquoi : proposer un resume editorial court lie a la phase du jour.
// Info : les valeurs sont en placeholder et devront etre reliees aux donnees finales.
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function MoonDailyCard() {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const title = useThemeColor({}, 'title');
  const text = useThemeColor({}, 'text');

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: surface }]} testID="moon_daily">
      <ThemedText variant="title" style={styles.title} lightColor={title} darkColor={title}>
        Phase lunaire
      </ThemedText>
      <ThemedText variant="texte" style={styles.body} lightColor={text} darkColor={text}>
        l’expression prend un registre rapide et pragmatique (Rapide (Kshipra/Laghu)). Le trio
        vitesse / demarrage / soin colore ce un commencement et en precise
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
  },
});
