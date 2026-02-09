// Ecran debug SQLite avec liste des tables et rafraichissement.
// Pourquoi : diagnostiquer rapidement l'etat de la base embarquee.
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';
import { withAlpha } from '@/constants/theme';
import { useSQLiteDebug } from '@/features/debug/use-sqlite-debug';
import { syncMoonCanoniqueData, syncMoonMsMappingData } from '@/features/moon/moon.sync';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function DebugScreen() {
  const { dbPath, tables, loading, error, refresh, clearTable } = useSQLiteDebug();
  const [clearingTable, setClearingTable] = useState<string | null>(null);
  const [syncingTable, setSyncingTable] = useState<string | null>(null);
  const [syncingCanonique, setSyncingCanonique] = useState(false);
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const action = useThemeColor({}, 'btn-action');
  const refreshButtonBg = withAlpha(surface, 0.2);
  const refreshButtonBorder = withAlpha(border, 0.6);
  const tableCardBg = withAlpha(surface, 0.55);
  const tableHeaderBg = withAlpha(border, 0.2);

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
                    <ThemedText key={`${table.name}-col-${col}`} style={[styles.cell, styles.cellHeader]}>
                      {col}
                    </ThemedText>
                  ))}
                </View>
                {table.rows.map((row, rowIndex) => (
                  <View key={`${table.name}-row-${rowIndex}`} style={styles.row}>
                    {table.columns.map((col) => (
                      <ThemedText key={`${table.name}-${rowIndex}-${col}`} style={styles.cell}>
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
  },
  headerRowTable: {
  },
  cell: {
    minWidth: 120,
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
