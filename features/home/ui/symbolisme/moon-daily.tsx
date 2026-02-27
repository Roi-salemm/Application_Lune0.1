// Card de phase lunaire quotidienne pour la home.
// Pourquoi : proposer un resume editorial court lie a la phase du jour.
// Info : les valeurs sont en placeholder et devront etre reliees aux donnees finales.
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { BlurCard } from '@/features/home/ui/components/blur-card';
import { useThemeColor } from '@/hooks/use-theme-color';

export function MoonDailyCard() {
  const title = useThemeColor({}, 'title');
  const text = useThemeColor({}, 'text');

  return (
    <BlurCard style={styles.card} variant="moon-daily" testID="moon_daily">
      <ThemedText variant="title" style={styles.title} lightColor={title} darkColor={title}>
        Phase lunaire
      </ThemedText>
      <ThemedText variant="texte" style={styles.body} lightColor={text} darkColor={text}>
        l’expression prend un registre rapide et pragmatique (Rapide (Kshipra/Laghu)). Le trio
        vitesse / demarrage / soin colore ce un commencement et en precise
      </ThemedText>
    </BlurCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
  },
});
