import React, { useMemo, useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getDayName, getMonthName } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 60;
const ITEM_MARGIN = 12;
const TOTAL_ITEM_WIDTH = ITEM_WIDTH + ITEM_MARGIN;

const CalendarStrip = ({ selectedDate, onDateSelect }) => {
  const { t } = useLanguage();
  const days = t('days');
  const months = t('months');
  const flatListRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Generate school year dates: Sept 1 to Jun 30
  const dates = useMemo(() => {
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

    const startDate = new Date(startYear, 8, 1); // Sept 1
    const endDate = new Date(endYear, 6, 15); // Mid July to be safe

    const dateArray = [];
    let d = new Date(startDate);
    while (d <= endDate) {
      dateArray.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dateArray;
  }, []);

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

  const renderItem = ({ item, index }) => {
    const isSelected = item.toDateString() === selectedDate.toDateString();
    
    // Dim weekends slightly
    const isWeekend = item.getDay() === 0 || item.getDay() === 6;

    return (
      <TouchableOpacity 
        style={[
          styles.dateCard, 
          isSelected && styles.selectedCard,
          isWeekend && !isSelected && styles.weekendCard
        ]}
        onPress={() => onDateSelect(item)}
      >
        <Text style={[styles.dayName, isSelected && styles.selectedText, isWeekend && !isSelected && styles.weekendText]}>
          {getDayName(item, days)}
        </Text>
        <Text style={[styles.dateNumber, isSelected && styles.selectedText, isWeekend && !isSelected && styles.weekendText]}>
          {item.getDate()}
        </Text>
        <Text style={[styles.monthName, isSelected && styles.selectedText]}>
          {getMonthName(item, months)}
        </Text>
      </TouchableOpacity>
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
      <View style={styles.navRow}>
        {/* Left Navigation Button */}
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={scrollLeft}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#64748b" />
        </TouchableOpacity>

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
          />
        </View>

        {/* Right Navigation Button */}
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={scrollRight}
          activeOpacity={0.7}
        >
          <ChevronRight size={22} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
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
    paddingHorizontal: 8,
  },
  dateCard: {
    width: ITEM_WIDTH,
    height: 75,
    borderRadius: 16,
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
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dateNumber: {
    fontSize: 20,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }
    }),
  },
});

export default CalendarStrip;
