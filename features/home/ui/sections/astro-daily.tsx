// hook de la Card astrologie 1 quotidienne pour la home.
// Pourquoi : proposer un bloc editorial distinct qui resume le signe lunaire du moment en local.
// Info : les valeurs sont calculees localement a partir des tables SQLite.
// Logique de recalcul :
// - Par defaut, mise a jour toutes les 60 minutes.
// - Autour des seuils (sign_egress_ts_utc et phase_change_ts_utc), refresh toutes les 5 minutes
//   dans la fenetre [-5m, +5m] autour du seuil. Si on est avant, le prochain refresh est planifie
//   au debut de la fenetre.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/shared/themed-text';
import { useAstroDaily } from '@/features/home/features/use-astro-daily';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatTimeValue } from '@/features/calendar/domain/CalendarDateUtils';

const SIGN_GLYPHS = [
  '♈',
  '♉',
  '♊',
  '♋',
  '♌',
  '♍',
  '♎',
  '♏',
  '♐',
  '♑',
  '♒',
  '♓',
] as const;

const PHASE_LABELS: Record<string, string> = {
  '0': 'Nouvelle Lune',
  '1': 'Premier croissant',
  '2': 'Premier quartier',
  '3': 'Gibbeuse croissante',
  '4': 'Pleine Lune',
  '5': 'Gibbeuse decroissante',
  '6': 'Dernier quartier',
  '7': 'Dernier croissant',
};

function parseIsoDate(value: string | null | undefined) {
  if (!value || value === '...') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function formatLocalDateTime(value: string | null | undefined) {
  const date = parseIsoDate(value);
  if (!date) {
    return '...';
  }
  const weekdays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const weekday = weekdays[date.getDay()] ?? '';
  const day = String(date.getDate()).padStart(2, '0');
  return `${weekday} ${day}, ${formatTimeValue(date)}`;
}

export function AstroDailyCard() {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const title = useThemeColor({}, 'title');
  const text = useThemeColor({}, 'text');
  const { moonCard } = useAstroDaily();

  const signIndexRaw = typeof moonCard?.sign_index === 'number' ? moonCard.sign_index : Number.NaN;
  const signIndex = Number.isFinite(signIndexRaw)
    ? Math.max(0, Math.min(11, Math.floor(signIndexRaw)))
    : -1;
  const signGlyph = signIndex >= 0 ? SIGN_GLYPHS[signIndex] : '◌';
  const prevGlyph = signIndex >= 0 ? SIGN_GLYPHS[(signIndex + 11) % 12] : '◌';
  const nextGlyph = signIndex >= 0 ? SIGN_GLYPHS[(signIndex + 1) % 12] : '◌';
  const signName = moonCard?.sign_name_fr ?? '...';
  const degInSign = moonCard?.deg_in_sign_dms ?? '...';
  const phaseLabel = moonCard?.phase_key ? PHASE_LABELS[moonCard.phase_key] ?? '...' : '...';

  const headerLeft = useMemo(
    () => formatLocalDateTime(moonCard?.sign_ingress_ts_utc),
    [moonCard?.sign_ingress_ts_utc]
  );
  const headerRight = useMemo(
    () => formatLocalDateTime(moonCard?.sign_egress_ts_utc),
    [moonCard?.sign_egress_ts_utc]
  );

  return (
    <View style={[styles.card, { borderColor: border, backgroundColor: surface }]} testID="astro_daily">
      <View style={styles.topRow}>
        <View style={styles.topColumn}>
          <ThemedText style={styles.topGlyph} colorName="title">
            {prevGlyph}
          </ThemedText>
          <ThemedText variant="petitTexte" style={styles.topDate} colorName="annex">
            {headerLeft}
          </ThemedText>
        </View>
        <View style={styles.centerGlyphWrap}>
          <ThemedText style={styles.centerGlyph} colorName="title">
            {signGlyph}
          </ThemedText>
          <ThemedText variant="baseline" style={styles.centerLabel} colorName="title">
            {signName}
          </ThemedText>
        </View>
        <View style={styles.topColumn}>
          <ThemedText style={styles.topGlyph} colorName="title">
            {nextGlyph}
          </ThemedText>
          <ThemedText variant="petitTexte" style={styles.topDate} colorName="annex">
            {headerRight}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: border }]} />

      <ThemedText variant="baseline" style={styles.subtitle} lightColor={title} darkColor={title}>
        Lune en : {signName} {degInSign}
      </ThemedText>

      <View style={styles.titleRow}>
        <ThemedText style={styles.titleArrow} lightColor={text} darkColor={text}>
          {'<'}
        </ThemedText>
        <ThemedText variant="title" style={styles.titleText} lightColor={text} darkColor={text}>
          {phaseLabel} en {signName}
        </ThemedText>
      </View>

      <ThemedText style={styles.watermark} lightColor={text} darkColor={text}>
        {signGlyph}
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
    gap: 4,
    minWidth: 90,
  },
  topDate: {
    fontSize: 12,
    textAlign: 'center',
  },
  topGlyph: {
    fontSize: 28,
  },
  centerGlyphWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  centerGlyph: {
    fontSize: 48,
  },
  centerLabel: {
    fontSize: 16,
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
  watermark: {
    position: 'absolute',
    right: 18,
    bottom: -10,
    fontSize: 120,
    opacity: 0.18,
  },
});
