// Ecran de selection de mois pour naviguer rapidement.
// Pourquoi : offrir un acces direct aux mois sans scroller tout le calendrier.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/shared/themed-text';
import { withAlpha } from '@/constants/theme';
import { MONTHS } from '@/features/calendar/ui/CalendarConstants';
import { getDaysInMonth, getStartOffset } from '@/features/calendar/domain/CalendarDateUtils';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type MonthCardProps = {
  year: number;
  monthIndex: number;
  onPick: (year: number, monthIndex: number) => void;
  onLayout?: (event: { nativeEvent: { layout: { height: number } } }) => void;
};

const MonthCard = memo(function MonthCard({ year, monthIndex, onPick, onLayout }: MonthCardProps) {
  const transparentColor = withAlpha(useThemeColor({}, 'border'), 0);
  const { days, leadingEmpty, trailingEmpty } = useMemo(() => {
    const count = getDaysInMonth(year, monthIndex);
    const startOffset = getStartOffset(year, monthIndex);
    const totalCells = startOffset + count;
    const remainder = totalCells % 7;
    return {
      days: Array.from({ length: count }, (_, index) => index + 1),
      leadingEmpty: startOffset,
      trailingEmpty: remainder === 0 ? 0 : 7 - remainder,
    };
  }, [monthIndex, year]);

  return (
    <Pressable style={styles.monthCard} onPress={() => onPick(year, monthIndex)} onLayout={onLayout}>
      <ThemedText type="default" style={styles.monthLabel} colorName="text">
        {MONTHS[monthIndex]}
      </ThemedText>
      <View style={styles.dayGrid}>
        {Array.from({ length: leadingEmpty }, (_, index) => (
          <View
            key={`empty-${index}`}
            style={[styles.dayDot, styles.dayDotEmpty, { borderColor: transparentColor }]}
          />
        ))}
        {days.map((day) => (
          <View key={day} style={styles.dayDot}>
            <ThemedText variant="calendarInfo" style={styles.dayText} colorName="annex">
              {day}
            </ThemedText>
          </View>
        ))}
        {Array.from({ length: trailingEmpty }, (_, index) => (
          <View
            key={`trail-${index}`}
            style={[styles.dayDot, styles.dayDotEmpty, { borderColor: transparentColor }]}
          />
        ))}
      </View>
    </Pressable>
  );
});

export default function MonthPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  const today = useMemo(() => new Date(), []);
  const colorScheme = useColorScheme() ?? 'dark';
  const targetYear = useMemo(() => {
    const raw = params.year ? Number(params.year) : NaN;
    return Number.isFinite(raw) ? raw : today.getFullYear();
  }, [params.year, today]);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<SectionList<number>>(null);
  const userScrollRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const didScrollToTargetRef = useRef(false);
  const [target, setTarget] = useState<{ year: number; monthIndex: number } | null>(null);
  const [targetCardHeight, setTargetCardHeight] = useState<number | null>(null);
  const yearOffsetsRef = useRef(new Map<number, number>());
  const calendarBackground = useThemeColor({}, 'background');
  const headerText = useThemeColor({}, 'title');
  const headerIcon = useThemeColor({}, 'btn-nav');
  const plusText = useThemeColor({}, 'btn-action');
  const iconButtonBorder = withAlpha(useThemeColor({}, 'border'), 0.6);
  const blurTint = colorScheme === 'dark' ? 'dark' : 'light';
  const [yearRange, setYearRange] = useState(() => ({
    start: targetYear,
    end: targetYear,
  }));

  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    const startYear = currentYear - 1;
    const endYear = currentYear + 5;
    return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
  }, [today]);

  const sections = useMemo(() => {
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const startYear = Math.max(minYear, yearRange.start);
    const endYear = Math.min(maxYear, yearRange.end);
    return years
      .filter((year) => year >= startYear && year <= endYear)
      .map((year) => ({
        title: String(year),
        year,
        data: [year],
      }));
  }, [yearRange, years]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const handlePick = useCallback((year: number, monthIndex: number) => {
    router.replace({
      pathname: '/(tabs)/calendar',
      params: { year: String(year), month: String(monthIndex + 1) },
    });
  }, [router]);

  useEffect(() => {
    const targetMonthNumber = Number(params.month);
    if (!Number.isFinite(targetMonthNumber)) {
      return;
    }
    const monthIndex = Math.min(11, Math.max(0, targetMonthNumber - 1));
    setTarget({ year: targetYear, monthIndex });
    setTargetCardHeight(null);
    didScrollToTargetRef.current = false;
    userScrollRef.current = false;
    yearOffsetsRef.current.clear();
    setYearRange({ start: targetYear, end: targetYear });
  }, [params.month, targetYear]);

  useEffect(() => {
    const sectionIndex = sections.findIndex((section) => section.year === targetYear);
    if (sectionIndex === -1) {
      return;
    }
    requestAnimationFrame(() => {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewPosition: 0,
        animated: false,
      });
    });
  }, [sections, targetYear]);

  useEffect(() => {
    if (!target || targetCardHeight == null) {
      return;
    }
    const yearOffset = yearOffsetsRef.current.get(target.year);
    if (yearOffset == null) {
      return;
    }
    if (didScrollToTargetRef.current) {
      return;
    }
    const rowGap = MONTH_ROW_GAP;
    const rowIndex = Math.floor(target.monthIndex / 3);
    const offset = yearOffset + rowIndex * (targetCardHeight + rowGap) - YEAR_LIST_PADDING_TOP;
    didScrollToTargetRef.current = true;
    requestAnimationFrame(() => {
      listRef.current?.getScrollResponder()?.scrollTo({ y: Math.max(0, offset), animated: false });
    });
  }, [target, targetCardHeight]);

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string; year: number } }) => (
      <View style={styles.yearHeader}>
        <View style={styles.yearPill}>
          <BlurView intensity={30} tint={blurTint} style={StyleSheet.absoluteFillObject} />
          <ThemedText type="default" style={styles.yearLabel} colorName="title">
            {section.title}
          </ThemedText>
        </View>
      </View>
    ),
    [],
  );

  const renderYear = useCallback(
    ({ item: year }: { item: number }) => (
      <View
        style={styles.yearBlock}
        onLayout={(event) => {
          yearOffsetsRef.current.set(year, event.nativeEvent.layout.y);
        }}>
        <View style={styles.monthGrid}>
          {MONTHS.map((_, index) => (
            <MonthCard
              key={`${year}-${index}`}
              year={year}
              monthIndex={index}
              onPick={handlePick}
              onLayout={
                target && target.year === year && target.monthIndex === index
                  ? (event) => setTargetCardHeight(event.nativeEvent.layout.height)
                  : undefined
              }
            />
          ))}
        </View>
      </View>
    ),
    [handlePick, target],
  );

  return (
    <View style={[styles.container, { backgroundColor: calendarBackground }]}>
      <Animated.View style={[styles.sheet, { opacity, transform: [{ scale }] }]}>
        <View style={styles.topBar}>
          <BlurView intensity={35} tint={blurTint} style={StyleSheet.absoluteFillObject} />
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="chevron-left" size={20} color={headerIcon} />
              <ThemedText type="default" style={styles.headerTitle} lightColor={headerText} darkColor={headerText}>
                Calendrier
              </ThemedText>
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable style={[styles.iconButton, { borderColor: iconButtonBorder }]}>
                <MaterialIcons name="settings" size={20} color={headerIcon} />
              </Pressable>
              <Pressable style={[styles.iconButton, { borderColor: iconButtonBorder }]}>
                <ThemedText type="default" style={styles.plusText} lightColor={plusText} darkColor={plusText}>
                  +
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => String(item)}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.yearList}
          initialNumToRender={2}
          windowSize={5}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          updateCellsBatchingPeriod={16}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderYear}
          onViewableItemsChanged={() => {
            if (!userScrollRef.current) {
              return;
            }
          }}
          onContentSizeChange={(_, height) => {
            contentHeightRef.current = height;
          }}
          onLayout={(event) => {
            layoutHeightRef.current = event.nativeEvent.layout.height;
          }}
          onScroll={(event) => {
            if (!userScrollRef.current) {
              return;
            }
            const offsetY = event.nativeEvent.contentOffset.y;
            const scrollingUp = offsetY < lastScrollYRef.current;
            lastScrollYRef.current = offsetY;
            if (scrollingUp && offsetY <= -20) {
              const minYear = years[0];
              setYearRange((range) => ({
                start: Math.max(minYear, range.start - 1),
                end: range.end,
              }));
            }
            const layoutHeight = layoutHeightRef.current;
            const contentHeight = contentHeightRef.current;
            if (layoutHeight > 0 && contentHeight > 0) {
              const nearBottom = offsetY + layoutHeight >= contentHeight - 120;
              if (nearBottom) {
                const maxYear = years[years.length - 1];
                setYearRange((range) => ({
                  start: range.start,
                  end: Math.min(maxYear, range.end + 1),
                }));
              }
            }
          }}
          onScrollBeginDrag={() => {
            userScrollRef.current = true;
          }}
          onMomentumScrollBegin={() => {
            userScrollRef.current = true;
          }}
        />
      </Animated.View>
    </View>
  );
}

const YEAR_LIST_PADDING_TOP = 88;
const MONTH_ROW_GAP = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 18,
  },
  topBar: {
    position: 'absolute',
    top: 28,
    left: 18,
    right: 18,
    zIndex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 22,
    lineHeight: 22,
  },
  yearList: {
    paddingBottom: 12,
    paddingTop: YEAR_LIST_PADDING_TOP,
  },
  yearBlock: {
    gap: 16,
    paddingTop: 118,
    paddingBottom: 8,
  },
  yearLabel: {
    fontSize: 28,
  },
  yearPill: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    transform: [{ translateY: 90 }],
  },
  yearHeader: {
    paddingVertical: 6,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: MONTH_ROW_GAP,
  },
  monthCard: {
    width: '31%',
    gap: 8,
  },
  monthLabel: {
    fontSize: 16,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  dayDot: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotEmpty: {
  },
  dayText: {
  },
});
