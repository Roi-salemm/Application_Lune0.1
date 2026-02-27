// Ecran debug SQLite avec liste des tables et rafraichissement.
// Pourquoi : diagnostiquer rapidement l'etat de la base embarquee.
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { ThemedText } from '@/components/shared/themed-text';
import { ThemedView } from '@/components/shared/themed-view';
import { withAlpha } from '@/constants/theme';
import type { AppCardRow } from '@/features/content/app-cards.types';
import { syncAppCards } from '@/features/content/app-cards.sync';
import { deleteAppCardById, getAllCardsForDebug, initAppCardsDb } from '@/features/content/data/app-cards-db';
import { useSQLiteDebug } from '@/features/debug/use-sqlite-debug';
import { useHomeMoon } from '@/features/home/hooks/use-home-moon';
import type { MoonCard1Tropical } from '@/features/home/ui/moon-card-1-tropical';
import { formatLocalDayKey } from '@/features/moon/data/moon-sql-utils';
import { buildMoonCard1Tropical } from '@/features/moon/domain/moon-tropical';
import {
  fetchMsMappingLocalDayRow,
  fetchMsMappingNewMoonWindow,
} from '@/features/moon/data/moon-ms-mapping-data';
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
  const [appCards, setAppCards] = useState<AppCardRow[]>([]);
  const [appCardsLoading, setAppCardsLoading] = useState(false);
  const [appCardsError, setAppCardsError] = useState<string | null>(null);
  const [syncingAppCards, setSyncingAppCards] = useState(false);
  const [deletingAppCardId, setDeletingAppCardId] = useState<string | null>(null);
  const [appCardModal, setAppCardModal] = useState<AppCardRow | null>(null);
  const [msMappingDebug, setMsMappingDebug] = useState<{
    dayKey: string;
    row: Awaited<ReturnType<typeof fetchMsMappingLocalDayRow>>;
    windowPrevious: Date | null;
    windowNext: Date | null;
  } | null>(null);
  const [msMappingDebugLoading, setMsMappingDebugLoading] = useState(false);
  const [msMappingDebugError, setMsMappingDebugError] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const {
    ageLabel,
    cycleEndLabel,
    distanceLabel,
    visibleInLabel,
    setInLabel,
    altitudeLabel,
    azimuthLabel,
  } = useHomeMoon({ isActive: isFocused });
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const action = useThemeColor({}, 'btn-action');
  const refreshButtonBg = withAlpha(surface, 0.2);
  const refreshButtonBorder = withAlpha(border, 0.6);
  const tableCardBg = withAlpha(surface, 0.55);
  const tableHeaderBg = withAlpha(border, 0.2);
  const moonCardBg = withAlpha(surface, 0.7);
  const modalOverlayBg = withAlpha(border, 0.75);
  const appCardJson = appCardModal ? JSON.stringify(appCardModal, null, 2) : '';
  const appCardsTable = tables.find((table) => table.name === 'app_card');
  const appCardsCount =
    appCardsTable?.count ?? (!appCardsLoading && !appCardsError ? appCards.length : null);
  const appCardsCountLabel = appCardsCount === null ? '...' : `${appCardsCount} cards en cache`;

  const loadAppCardsDebug = useCallback(async () => {
    setAppCardsLoading(true);
    setAppCardsError(null);
    try {
      await initAppCardsDb();
      const rows = await getAllCardsForDebug();
      setAppCards(rows);
    } catch (err) {
      setAppCardsError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setAppCardsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    void loadAppCardsDebug();
  }, [loadAppCardsDebug, tables]);

  useEffect(() => {
    let cancelled = false;

    const loadMsMappingDebug = async () => {
      setMsMappingDebugLoading(true);
      setMsMappingDebugError(null);
      try {
        const now = new Date();
        const dayKey = formatLocalDayKey(now);
        const [row, newMoonWindow] = await Promise.all([
          fetchMsMappingLocalDayRow(now),
          fetchMsMappingNewMoonWindow(now),
        ]);

        if (!cancelled) {
          setMsMappingDebug({
            dayKey,
            row,
            windowPrevious: newMoonWindow.previous,
            windowNext: newMoonWindow.next,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setMsMappingDebugError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
      } finally {
        if (!cancelled) {
          setMsMappingDebugLoading(false);
        }
      }
    };

    void loadMsMappingDebug();

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

  const formatDebugValue = (value: unknown) => {
    if (value instanceof Date) {
      return `${value.toISOString()} (${value.toLocaleString()})`;
    }
    return formatMoonCardValue(value);
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

  const debugLabelEntries = [
    { key: 'Age de la lunaison', value: ageLabel },
    { key: 'prochain cycle', value: cycleEndLabel },
    { key: 'Distance', value: distanceLabel },
    { key: 'Visible dans', value: visibleInLabel },
    { key: 'Coucher dans', value: setInLabel },
    { key: 'Altitude', value: altitudeLabel },
    { key: 'Azimut', value: azimuthLabel },
  ];

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
        await syncMoonMsMappingData({ force: true });
      }
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Sync ms_mapping impossible.');
    } finally {
      setSyncingTable(null);
      refresh();
    }
  };

  const handleSyncAppCards = async () => {
    if (syncingAppCards) {
      return;
    }
    setSyncingAppCards(true);
    try {
      await syncAppCards({ force: true });
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Sync app cards impossible.');
    } finally {
      setSyncingAppCards(false);
      await loadAppCardsDebug();
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

  const confirmDeleteAppCard = async (cardId: string) => {
    if (deletingAppCardId) {
      return;
    }
    setDeletingAppCardId(cardId);
    try {
      await deleteAppCardById(cardId);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setDeletingAppCardId(null);
      await loadAppCardsDebug();
      refresh();
    }
  };

  const handleDeleteAppCard = (cardId: string) => {
    Alert.alert(
      'Supprimer la card ?',
      `Cette action supprimera la card ${cardId} de la base locale.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void confirmDeleteAppCard(cardId);
          },
        },
      ]
    );
  };

  const handleShowAppCardJson = (card: AppCardRow) => {
    setAppCardModal(card);
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
        <ThemedView style={[styles.tableCard, { backgroundColor: tableCardBg }]}>
          <View style={styles.tableHeader}>
            <ThemedText type="title" style={styles.tableTitle}>
              App Cards (cache)
            </ThemedText>
            <Pressable
              onPress={handleSyncAppCards}
              disabled={syncingAppCards}
              style={[
                styles.clearButton,
                { borderColor: action },
                syncingAppCards && styles.clearButtonDisabled,
              ]}>
              <ThemedText type="default" style={[styles.clearButtonText, { color: action }]}>
                {syncingAppCards ? 'Sync...' : 'Synchronisation'}
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="default" style={styles.tableMeta}>
            {appCardsCountLabel}
          </ThemedText>
          {appCardsLoading ? <ThemedText type="default">Chargement...</ThemedText> : null}
          {appCardsError ? (
            <ThemedText type="default" style={styles.errorText} lightColor={action} darkColor={action}>
              {appCardsError}
            </ThemedText>
          ) : null}
          {!appCardsLoading && !appCardsError && appCards.length ? (
            <FlatList
              data={appCards}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <View style={[styles.appCardsRow, styles.appCardsHeader, { backgroundColor: tableHeaderBg }]}>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellId, styles.appCardsHeaderText]}>
                    id
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellTitle, styles.appCardsHeaderText]}>
                    title
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellRank, styles.appCardsHeaderText]}>
                    rank
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellDate, styles.appCardsHeaderText]}>
                    updatedAt
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellDate, styles.appCardsHeaderText]}>
                    fetchedAt
                  </ThemedText>
                  <View style={styles.appCardsCellAction} />
                </View>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.appCardsRow} onPress={() => handleShowAppCardJson(item)}>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellId]}
                    numberOfLines={1}>
                    {item.id}
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellTitle]}
                    numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellRank]}
                    numberOfLines={1}>
                    {item.featuredRank ?? '-'}
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellDate]}
                    numberOfLines={1}>
                    {item.updatedAt}
                  </ThemedText>
                  <ThemedText
                    variant="petitTexte"
                    style={[styles.appCardsCell, styles.appCardsCellDate]}
                    numberOfLines={1}>
                    {item.fetchedAt}
                  </ThemedText>
                  <Pressable
                    onPress={() => handleDeleteAppCard(item.id)}
                    disabled={deletingAppCardId === item.id}
                    style={[
                      styles.appCardsDelete,
                      { borderColor: action },
                      deletingAppCardId === item.id && styles.clearButtonDisabled,
                    ]}>
                    <ThemedText type="default" style={[styles.clearButtonText, { color: action }]}>
                      {deletingAppCardId === item.id ? '...' : 'Supprimer'}
                    </ThemedText>
                  </Pressable>
                </Pressable>
              )}
            />
          ) : null}
          {!appCardsLoading && !appCardsError && !appCards.length ? (
            <ThemedText type="default">Aucune donnee.</ThemedText>
          ) : null}
        </ThemedView>
        <Modal
          visible={!!appCardModal}
          transparent
          animationType="fade"
          onRequestClose={() => setAppCardModal(null)}>
          <View style={[styles.modalOverlay, { backgroundColor: modalOverlayBg }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAppCardModal(null)} />
            <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" style={styles.modalTitle}>
                  App Card JSON
                </ThemedText>
                <Pressable
                  onPress={() => setAppCardModal(null)}
                  style={[styles.modalCloseButton, { borderColor: action }]}>
                  <ThemedText type="default" style={[styles.modalCloseText, { color: action }]}>
                    Fermer
                  </ThemedText>
                </Pressable>
              </View>
              <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentInner}>
                <ThemedText type="default" style={styles.modalJson}>
                  {appCardJson}
                </ThemedText>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
        <ThemedView style={[styles.moonCard, { backgroundColor: moonCardBg, borderColor: border }]}>
          <ThemedText type="title" style={styles.tableTitle}>
            Labels astronomiques (debug)
          </ThemedText>
          <View style={styles.moonCardList}>
            {debugLabelEntries.map((entry) => (
              <View key={`debug-label-${entry.key}`} style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  {entry.key}
                </ThemedText>
                <ThemedText type="default" style={styles.moonCardValue}>
                  {formatMoonCardValue(entry.value)}
                </ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
        <ThemedView style={[styles.moonCard, { backgroundColor: moonCardBg, borderColor: border }]}>
          <ThemedText type="title" style={styles.tableTitle}>
            ms_mapping debug (local day)
          </ThemedText>
          {msMappingDebugLoading ? (
            <ThemedText type="default">Chargement...</ThemedText>
          ) : null}
          {msMappingDebugError ? (
            <ThemedText type="default" style={styles.errorText} lightColor={action} darkColor={action}>
              {msMappingDebugError}
            </ThemedText>
          ) : null}
          {!msMappingDebugLoading && !msMappingDebugError && msMappingDebug ? (
            <View style={styles.moonCardList}>
              <View style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  day_key_local (jour local)
                </ThemedText>
                <ThemedText type="default" style={styles.moonCardValue}>
                  {formatDebugValue(msMappingDebug.dayKey)}
                </ThemedText>
              </View>
              <View style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  row.ts_utc (ligne du jour: ts_utc)
                </ThemedText>
                <ThemedText type="default" style={styles.moonCardValue}>
                  {formatDebugValue(msMappingDebug.row?.ts_utc)}
                </ThemedText>
              </View>
              <View style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  row.phase (phase du jour)
                </ThemedText>
                <ThemedText type="default" style={styles.moonCardValue}>
                  {formatDebugValue(msMappingDebug.row?.phase)}
                </ThemedText>
              </View>
              <View style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  row.phase_hour (heure exacte de phase)
                </ThemedText>
                <ThemedText type="default" style={styles.moonCardValue}>
                  {formatDebugValue(msMappingDebug.row?.phase_hour)}
                </ThemedText>
              </View>
              <View style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  cycle_start_utc (debut cycle via fenetre)
                </ThemedText>
                <ThemedText type="default" style={[styles.moonCardValue, { color: action }]}>
                  {formatDebugValue(msMappingDebug.windowPrevious)}
                </ThemedText>
              </View>
              <View style={styles.moonCardRow}>
                <ThemedText type="default" style={styles.moonCardKey}>
                  cycle_end_utc (fin cycle via fenetre)
                </ThemedText>
                <ThemedText type="default" style={[styles.moonCardValue, { color: action }]}>
                  {formatDebugValue(msMappingDebug.windowNext)}
                </ThemedText>
              </View>
            </View>
          ) : null}
          {!msMappingDebugLoading && !msMappingDebugError && !msMappingDebug ? (
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
  },
  modalCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContent: {
    flexGrow: 0,
  },
  modalContentInner: {
    paddingBottom: 4,
  },
  modalJson: {
    fontSize: 12,
    lineHeight: 16,
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
  appCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  appCardsHeader: {
    marginBottom: 6,
  },
  appCardsHeaderText: {
    fontWeight: '700',
  },
  appCardsCell: {
    fontSize: 11,
    flexShrink: 1,
  },
  appCardsCellId: {
    width: 46,
  },
  appCardsCellTitle: {
    flex: 1,
  },
  appCardsCellRank: {
    width: 42,
    textAlign: 'center',
  },
  appCardsCellDate: {
    width: 110,
  },
  appCardsCellAction: {
    width: 84,
  },
  appCardsDelete: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
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
