// Card astrologie quotidienne pour la home.
// Pourquoi : proposer un bloc editorial distinct qui resume la phase et le signe du moment.
// Info : les valeurs sont en placeholder et devront etre reliees aux donnees astrologiques.
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function AstroDailyCard() {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const title = useThemeColor({}, 'title');
  const text = useThemeColor({}, 'text');

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: surface }]} testID="astro_daily">
      <View style={styles.topRow}>
        <View style={styles.topColumn}>
          <ThemedText variant="petitTexte" style={styles.topDate} colorName="annex">
            Lundi 5, 1h07
          </ThemedText>
          <ThemedText style={styles.topGlyph} colorName="title">
            ♓
          </ThemedText>
        </View>
        <View style={styles.centerGlyphWrap}>
          <ThemedText style={styles.centerGlyph} colorName="title">
            ♑
          </ThemedText>
        </View>
        <View style={styles.topColumn}>
          <ThemedText variant="petitTexte" style={styles.topDate} colorName="annex">
            Jeudi 8, 10h36
          </ThemedText>
          <ThemedText style={styles.topGlyph} colorName="title">
            ♋
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      <ThemedText variant="baseline" style={styles.subtitle} lightColor={title} darkColor={title}>
        Lune en : Capricorne
      </ThemedText>

      <View style={styles.titleRow}>
        <ThemedText style={styles.titleArrow} lightColor={text} darkColor={text}>
          {'<'}
        </ThemedText>
        <ThemedText variant="title" style={styles.titleText} lightColor={text} darkColor={text}>
          🌘 Dernier croissant en Capricorne
        </ThemedText>
      </View>

      <ThemedText variant="texte" style={styles.body} lightColor={text} darkColor={text}>
        Le cycle se retire progressivement. L’attention se detourne de l’action pour se concentrer sur
        l’essentiel. Ce qui reste est ce qui peut etre conserve sans effort excessif.
      </ThemedText>

      <ThemedText style={styles.watermark} lightColor={text} darkColor={text}>
        ♑
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  topColumn: {
    alignItems: 'center',
    gap: 8,
    minWidth: 90,
  },
  topDate: {
    fontSize: 14,
    textAlign: 'center',
  },
  topGlyph: {
    fontSize: 36,
  },
  centerGlyphWrap: {
    flex: 1,
    alignItems: 'center',
  },
  centerGlyph: {
    fontSize: 52,
  },
  divider: {
    height: 1,
    marginTop: 14,
    marginBottom: 12,
    opacity: 0.6,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  titleArrow: {
    fontSize: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  watermark: {
    position: 'absolute',
    right: 18,
    bottom: -10,
    fontSize: 120,
    opacity: 0.18,
  },
});
