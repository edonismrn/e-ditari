import React, { useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getDayName, getMonthName } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 48;
const ITEM_MARGIN = 14;
const TOTAL_ITEM_WIDTH = ITEM_WIDTH + ITEM_MARGIN;

const CalendarStrip = ({ selectedDate, onDateSelect, schoolStartDate, schoolEndDate }) => {
  const { t } = useLanguage();
  const days = t('days');
  const full_days = t('full_days');
  const months = t('months');
  const full_months = t('full_months');
  const flatListRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [visibleDate, setVisibleDate] = useState(selectedDate);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const centerItem = viewableItems[Math.floor(viewableItems.length / 2)];
      if (centerItem && centerItem.item) {
        setVisibleDate(centerItem.item);
      }
    }
  }).current;

  // Generate school year dates: Sept 1 to Jun 30 (or custom from school profile)
  const dates = useMemo(() => {
    let startDate, endDate;

    if (schoolStartDate && schoolEndDate) {
      startDate = new Date(schoolStartDate);
      endDate = new Date(schoolEndDate);
      // Ensure we include the boundary dates by stripping out time logic if needed
      startDate.setHours(0,0,0,0);
      endDate.setHours(23,59,59,999);
    } else {
      const today = new Date();
      const currentMonth = today.getMonth(); // 0-indexed, 8 = Sept
      const currentYear = today.getFullYear();
      
      let startYear, endYear;
      if (currentMonth >= 8) { // Sept or later
        startYear = currentYear;
        endYear = currentYear + 1;
      } else { // Jan-Aug
        startYear = currentYear - 1;
        endYear = currentYear;
      }

      startDate = new Date(startYear, 8, 1); // Sept 1
      endDate = new Date(endYear, 6, 15); // Mid July to be safe
    }

    const dateArray = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      dateArray.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dateArray;
  }, [schoolStartDate, schoolEndDate]);

  // Find index of selected date (or today)
  const initialIndex = useMemo(() => {
    const targetString = selectedDate.toDateString();
    const index = dates.findIndex(d => d.toDateString() === targetString);
    return index !== -1 ? index : 0;
  }, [dates, selectedDate]);

  useEffect(() => {
    if (isReady && flatListRef.current && initialIndex >= 0) {
      // Scroll to the selected date, centered
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: true,
          viewPosition: 0.5 // Centers the item
        });
      }, 100); // slight delay to ensure list layout resolves
    }
  }, [isReady, initialIndex]);

  const getItemLayout = (data, index) => ({
    length: TOTAL_ITEM_WIDTH,
    offset: TOTAL_ITEM_WIDTH * index,
    index,
  });

  const renderItem = ({ item }) => {
    const isSelected = item.toDateString() === selectedDate.toDateString();
    const isWeekend = item.getDay() === 0 || item.getDay() === 6;
    
    // Alternate month backgrounds (light gray vs dark blue)
    const isAlternateMonth = item.getMonth() % 2 === 0;
    const monthBg = isAlternateMonth ? '#93c5fd' : '#f1f5f9';

    return (
      <View style={{ width: TOTAL_ITEM_WIDTH, backgroundColor: monthBg, paddingVertical: 14, alignItems: 'center' }}>
        <TouchableOpacity 
          style={[
            styles.dateCard, 
            { marginRight: 0 }, // Center safely inside the uniform 62px width
            isSelected && styles.selectedCard,
            isWeekend && !isSelected && styles.weekendCard
          ]}
          onPress={() => onDateSelect(item)}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.dayName, isSelected && styles.selectedText, isWeekend && !isSelected && styles.weekendText]}>
            {getDayName(item, full_days || days)}
          </Text>
          <Text style={[styles.dateNumber, isSelected && styles.selectedText, isWeekend && !isSelected && styles.weekendText]}>
            {item.getDate()}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const scrollLeft = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: Math.max(0, flatListRef.current.currentOffset - TOTAL_ITEM_WIDTH * 3),
        animated: true,
      });
    }
  };

  const scrollRight = () => {
    if (flatListRef.current) {
        const maxOffset = (dates.length * TOTAL_ITEM_WIDTH) - width;
      flatListRef.current.scrollToOffset({
        offset: Math.min(maxOffset, (flatListRef.current.currentOffset || 0) + TOTAL_ITEM_WIDTH * 3),
        animated: true,
      });
    }
  };

  const onScroll = (event) => {
    flatListRef.current.currentOffset = event.nativeEvent.contentOffset.x;
  };

  return (
    <View style={styles.container}>
      {/* Prominent Month Header */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', flex: 1, textAlign: 'center', letterSpacing: 1 }}>
          {(full_months[visibleDate.getMonth()] || months[visibleDate.getMonth()]).toUpperCase()}
        </Text>
      </View>

      <View style={styles.navRow}>
        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={scrollLeft}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color="#64748b" />
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={dates}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyExtractor={(item) => item.toDateString()}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
            onLayout={() => setIsReady(true)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={TOTAL_ITEM_WIDTH}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        </View>

        {Platform.OS === 'web' && (
          <TouchableOpacity 
            style={styles.navButton} 
            onPress={scrollRight}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  dateCard: {
    width: ITEM_WIDTH,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginRight: ITEM_MARGIN,
  },
  selectedCard: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  weekendCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
  },
  dayName: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
  },
  monthName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  selectedText: {
    color: 'white',
  },
  weekendText: {
    color: '#ef4444',
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }
    }),
  },
});

export default CalendarStrip;
