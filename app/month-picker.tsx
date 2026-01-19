// Month picker screen to jump to a specific month/year.
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { MONTHS } from '@/constants/calendar';
import { getDaysInMonth, getStartOffset } from '@/lib/calendar-utils';

type MonthCardProps = {
  year: number;
  monthIndex: number;
  onPick: (year: number, monthIndex: number) => void;
};

const MonthCard = memo(function MonthCard({ year, monthIndex, onPick }: MonthCardProps) {
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
    <Pressable style={styles.monthCard} onPress={() => onPick(year, monthIndex)}>
      <Text style={styles.monthLabel}>{MONTHS[monthIndex]}</Text>
      <View style={styles.dayGrid}>
        {Array.from({ length: leadingEmpty }, (_, index) => (
          <View key={`empty-${index}`} style={[styles.dayDot, styles.dayDotEmpty]} />
        ))}
        {days.map((day) => (
          <View key={day} style={styles.dayDot}>
            <Text style={styles.dayText}>{day}</Text>
          </View>
        ))}
        {Array.from({ length: trailingEmpty }, (_, index) => (
          <View key={`trail-${index}`} style={[styles.dayDot, styles.dayDotEmpty]} />
        ))}
      </View>
    </Pressable>
  );
});

export default function MonthPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  const today = useMemo(() => new Date(), []);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<SectionList<number>>(null);
  const userScrollRef = useRef(false);
  const [yearRange, setYearRange] = useState(() => {
    const current = today.getFullYear();
    return { start: current, end: current };
  });

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
    if (!params.year) {
      return;
    }
    const targetYear = Number(params.year);
    if (!Number.isFinite(targetYear)) {
      return;
    }
    setYearRange((range) => ({
      start: Math.min(range.start, targetYear),
      end: Math.max(range.end, targetYear),
    }));
  }, [params.year]);

  useEffect(() => {
    if (!params.year) {
      return;
    }
    const targetYear = Number(params.year);
    if (!Number.isFinite(targetYear)) {
      return;
    }
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
  }, [params.year, sections]);


  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.yearHeader}>
        <View style={styles.yearPill}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Text style={styles.yearLabel}>{section.title}</Text>
        </View>
      </View>
    ),
    [],
  );

  const renderYear = useCallback(
    ({ item: year }: { item: number }) => (
      <View style={styles.yearBlock}>
        <View style={styles.monthGrid}>
          {MONTHS.map((_, index) => (
            <MonthCard key={`${year}-${index}`} year={year} monthIndex={index} onPick={handlePick} />
          ))}
        </View>
      </View>
    ),
    [handlePick],
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.sheet, { opacity, transform: [{ scale }] }]}>
        <View style={styles.topBar}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="chevron-left" size={20} color="#C7CBD1" />
              <Text style={styles.headerTitle}>Calendrier</Text>
            </Pressable>
            <View style={styles.headerActions}>
              <Pressable style={styles.iconButton}>
                <MaterialIcons name="settings" size={20} color="#C7CBD1" />
              </Pressable>
              <Pressable style={styles.iconButton}>
                <Text style={styles.plusText}>+</Text>
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
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!userScrollRef.current) {
              return;
            }
            const maxYear = years[years.length - 1];
            setYearRange((range) => ({
              start: range.start,
              end: Math.min(maxYear, range.end + 1),
            }));
          }}
          onScroll={(event) => {
            if (!userScrollRef.current) {
              return;
            }
            const offsetY = event.nativeEvent.contentOffset.y;
            if (offsetY < 60) {
              const minYear = years[0];
              setYearRange((range) => ({
                start: Math.max(minYear, range.start - 1),
                end: range.end,
              }));
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#34363A',
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
    color: '#C7CBD1',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    color: '#C7CBD1',
    fontSize: 22,
    lineHeight: 22,
  },
  yearList: {
    paddingBottom: 40,
    paddingTop: 88,
  },
  yearBlock: {
    gap: 16,
    paddingTop: 102,
    paddingBottom: 14,
  },
  yearLabel: {
    color: '#E7E9EC',
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
    rowGap: 20,
  },
  monthCard: {
    width: '31%',
    gap: 8,
  },
  monthLabel: {
    color: '#E7E9EC',
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
    borderColor: 'transparent',
  },
  dayText: {
    color: '#E7E9EC',
    fontSize: 10,
  },
});
