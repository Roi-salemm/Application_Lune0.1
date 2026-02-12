// Ecran debug SQLite avec liste des tables et rafraichissement.
// Pourquoi : diagnostiquer rapidement l'etat de la base embarquee.
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';
import { withAlpha } from '@/constants/theme';
import { useSQLiteDebug } from '@/features/debug/use-sqlite-debug';
import type { MoonCard1Tropical } from '@/features/home/ui/moon-card-1-tropical';
import { buildMoonCard1Tropical } from '@/features/moon/domain/moon-tropical';
import { syncMoonCanoniqueData, syncMoonMsMappingData } from '@/features/moon/moon.sync';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function DebugScreen() {
  const { dbPath, tables, loading, error, refresh, clearTable } = useSQLiteDebug();
  const [clearingTable, setClearingTable] = useState<string | null>(null);
  const [syncingTable, setSyncingTable] = useState<string | null>(null);
  const [syncingCanonique, setSyncingCanonique] = useState(false);
  const [moonCard, setMoonCard] = useState<MoonCard1Tropical | null>(null);
  const [moonCardError, setMoonCardError] = useState<string | null>(null);
  const [moonCardLoading, setMoonCardLoading] = useState<boolean>(false);
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const action = useThemeColor({}, 'btn-action');
  const refreshButtonBg = withAlpha(surface, 0.2);
  const refreshButtonBorder = withAlpha(border, 0.6);
  const tableCardBg = withAlpha(surface, 0.55);
  const tableHeaderBg = withAlpha(border, 0.2);
  const moonCardBg = withAlpha(surface, 0.7);

  useEffect(() => {
    let cancelled = false;

    const loadMoonCard = async () => {
      setMoonCardLoading(true);
      setMoonCardError(null);
      try {
        const card = await buildMoonCard1Tropical(new Date());
        if (!cancelled) {
          setMoonCard(card);
        }
      } catch (err) {
        if (!cancelled) {
          setMoonCardError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (!cancelled) {
          setMoonCardLoading(false);
        }
      }
    };

    void loadMoonCard();

    return () => {
      cancelled = true;
    };
  }, [tables]);

  const formatMoonCardValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return '...';
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '...';
    }
    if (typeof value === 'string') {
      return value.trim().length ? value : '...';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  };

  const moonCardEntries = moonCard
    ? [
        { key: 'ts_utc', value: moonCard.ts_utc },
        { key: 'phase_key', value: moonCard.phase_key },
        { key: 'phase_change_ts_utc', value: moonCard.phase_change_ts_utc },
        { key: 'illumination_frac', value: moonCard.illumination_frac },
        { key: 'sign_index', value: moonCard.sign_index },
        { key: 'sign_name_fr', value: moonCard.sign_name_fr },
        { key: 'sign_name_en', value: moonCard.sign_name_en },
        { key: 'lon_tropical_deg', value: moonCard.lon_tropical_deg },
        { key: 'deg_in_sign', value: moonCard.deg_in_sign },
        { key: 'deg_in_sign_dms', value: moonCard.deg_in_sign_dms },
        { key: 'sign_ingress_ts_utc', value: moonCard.sign_ingress_ts_utc },
        { key: 'sign_egress_ts_utc', value: moonCard.sign_egress_ts_utc },
        { key: 'voc_status', value: moonCard.voc_status },
        { key: 'is_void_of_course', value: moonCard.is_void_of_course },
        { key: 'voc_start_ts_utc', value: moonCard.voc_start_ts_utc },
        { key: 'voc_end_ts_utc', value: moonCard.voc_end_ts_utc },
        { key: 'precision', value: moonCard.precision },
      ]
    : [];

  const handleClearTable = (tableName: string) => {
    Alert.alert(
      'Vider la table ?',
      `Cette action supprimera toutes les lignes de "${tableName}".`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => {
            void confirmClearTable(tableName);
          },
        },
      ]
    );
  };

  const handleSyncTable = async (tableName: string) => {
    if (syncingTable) {
      return;
    }
    setSyncingTable(tableName);
    try {
      if (tableName === 'ms_mapping') {
        await syncMoonMsMappingData();
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Sync ms_mapping impossible.');
    } finally {
      setSyncingTable(null);
      refresh();
    }
  };

  const confirmClearTable = async (tableName: string) => {
    if (clearingTable) {
      return;
    }
    setClearingTable(tableName);
    try {
      await clearTable(tableName);
      refresh();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de vider la table.');
    } finally {
      setClearingTable(null);
    }
  };

  const handleRefresh = async () => {
    if (syncingCanonique) {
      return;
    }
    setSyncingCanonique(true);
    try {
      await syncMoonCanoniqueData({ force: true });
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Sync canonique impossible.');
    } finally {
      setSyncingCanonique(false);
      refresh();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <ThemedText type="title">SQLite Debug</ThemedText>
          <Pressable
            onPress={handleRefresh}
            disabled={syncingCanonique}
            style={[
              styles.refreshButton,
              { backgroundColor: refreshButtonBg, borderColor: refreshButtonBorder },
              syncingCanonique && styles.refreshButtonDisabled,
            ]}>
            <ThemedText type="default" style={styles.refreshButtonText} lightColor={text} darkColor={text}>
              {syncingCanonique ? 'Sync...' : 'Rafraichir'}
            </ThemedText>
          </Pressable>
        </View>
        {dbPath ? (
          <ThemedText type="default" style={styles.pathText}>
            {dbPath}
          </ThemedText>
        ) : null}
        {loading ? (
          <ThemedText type="default">Chargement...</ThemedText>
        ) : null}
        {error ? (
          <ThemedText type="default" style={styles.errorText} lightColor={action} darkColor={action}>
            {error}
          </ThemedText>
        ) : null}
        <ThemedView style={[styles.moonCard, { backgroundColor: moonCardBg, borderColor: border }]}>
          <ThemedText type="title" style={styles.tableTitle}>
            MoonCard1Tropical (local)
          </ThemedText>
          {moonCardLoading ? (
            <ThemedText type="default">Chargement...</ThemedText>
          ) : null}
          {moonCardError ? (
            <ThemedText type="default" style={styles.errorText} lightColor={action} darkColor={action}>
              {moonCardError}
            </ThemedText>
          ) : null}
          {!moonCardLoading && !moonCardError && moonCardEntries.length ? (
            <View style={styles.moonCardList}>
              {moonCardEntries.map((entry) => (
                <View key={`moon-card-${entry.key}`} style={styles.moonCardRow}>
                  <ThemedText type="default" style={styles.moonCardKey}>
                    {entry.key}
                  </ThemedText>
                  <ThemedText type="default" style={styles.moonCardValue}>
                    {formatMoonCardValue(entry.value)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
          {!moonCardLoading && !moonCardError && !moonCardEntries.length ? (
            <ThemedText type="default">Aucune donnee.</ThemedText>
          ) : null}
        </ThemedView>
        {!loading && !tables.length ? (
          <ThemedText type="default">Aucune table trouvee.</ThemedText>
        ) : null}

        {tables.map((table) => (
          <ThemedView key={table.name} style={[styles.tableCard, { backgroundColor: tableCardBg }]}>
            <View style={styles.tableHeader}>
              <ThemedText type="title" style={styles.tableTitle}>
                {table.name}
              </ThemedText>
              <View style={styles.tableActions}>
                {table.name === 'ms_mapping' ? (
                  <Pressable
                    onPress={() => handleSyncTable(table.name)}
                    disabled={syncingTable === table.name}
                    style={[
                      styles.clearButton,
                      { borderColor: action },
                      syncingTable === table.name && styles.clearButtonDisabled,
                    ]}>
                    <ThemedText type="default" style={[styles.clearButtonText, { color: action }]}>
                      {syncingTable === table.name ? 'Sync...' : 'Sync'}
                    </ThemedText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => handleClearTable(table.name)}
                  disabled={clearingTable === table.name}
                  style={[
                    styles.clearButton,
                    { borderColor: action },
                    clearingTable === table.name && styles.clearButtonDisabled,
                  ]}>
                  <ThemedText type="default" style={[styles.clearButtonText, { color: action }]}>
                    {clearingTable === table.name ? 'Vider...' : 'Vider'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
            <ThemedText type="default" style={styles.tableMeta}>
              {table.count} lignes
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={[styles.row, styles.headerRowTable, { backgroundColor: tableHeaderBg }]}>
                  {table.columns.map((col) => (
                    <ThemedText
                      key={`${table.name}-col-${col}`}
                      style={[styles.cell, styles.cellHeader]}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      {col}
                    </ThemedText>
                  ))}
                </View>
                {table.rows.map((row, rowIndex) => (
                  <View key={`${table.name}-row-${rowIndex}`} style={styles.row}>
                    {table.columns.map((col) => (
                      <ThemedText
                        key={`${table.name}-${rowIndex}-${col}`}
                        style={styles.cell}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {row[col] === null || row[col] === undefined ? '' : String(row[col])}
                      </ThemedText>
                    ))}
                  </View>
                ))}
                {!table.rows.length ? (
                  <ThemedText type="default" style={styles.emptyRows}>
                    Aucune donnee.
                  </ThemedText>
                ) : null}
              </View>
            </ScrollView>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  refreshButtonText: {
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  pathText: {
    opacity: 0.7,
  },
  errorText: {
  },
  moonCard: {
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  moonCardList: {
    gap: 6,
  },
  moonCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  moonCardKey: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
  },
  moonCardValue: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
  tableCard: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  tableTitle: {
    fontSize: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tableMeta: {
    opacity: 0.7,
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearButtonDisabled: {
    opacity: 0.6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  headerRowTable: {
    alignItems: 'center',
  },
  cell: {
    width: 150,
    minWidth: 150,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  cellHeader: {
    fontWeight: '700',
  },
  emptyRows: {
    paddingVertical: 8,
    opacity: 0.7,
  },
});
