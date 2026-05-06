import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Platform,
  Dimensions,
  Pressable
} from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const PremiumDatePicker = ({ 
  value, 
  onChange, 
  placeholder = 'DD/MM/YYYY',
  label,
  disabled = false,
  minDate,
  maxDate
}) => {
  const { language, t } = useLanguage();
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (!value) return new Date();
    // Parse YYYY-MM-DD manually to avoid UTC shift
    const parts = value.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date(value);
  });

  // Formatting helper
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Internal date logic for custom calendar
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // Use local formatting instead of toISOString() to avoid UTC shifts
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    onChange(dateStr);
    setShowCalendar(false);
  };

  const changeMonth = (offset) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Localized names using Intl API (Browser native, very reliable)
    const monthIndex = viewDate.getMonth();
    const monthsArr = language === 'sq'
      ? ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor']
      : language === 'sr'
        ? ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
        : ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const monthName = monthsArr[monthIndex];
    
    // Week days (Albanian: Hën, Mar, Mër, Enj, Pre, Sht, Die)
    const weekDaysShort = [];
    const baseDate = new Date(2021, 0, 4); // A Monday
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      weekDaysShort.push(new Intl.DateTimeFormat(language === 'sq' ? 'sq-AL' : language === 'sr' ? 'sr-RS' : 'tr-TR', { weekday: 'short' }).format(d));
    }

    const days = [];
    // Padding for first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`pad-${i}`} style={styles.dayCell} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = value && new Date(value).getDate() === i && 
                        new Date(value).getMonth() === month && 
                        new Date(value).getFullYear() === year;
      
      const isToday = new Date().getDate() === i && 
                     new Date().getMonth() === month && 
                     new Date().getFullYear() === year;

      days.push(
        <TouchableOpacity 
          key={i} 
          style={[styles.dayCell, isSelected && styles.selectedDay]} 
          onPress={() => handleDateSelect(i)}
        >
          <Text style={[styles.dayText, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayText]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
            <ChevronLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName} {year}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekDaysRow}>
          {weekDaysShort.map((d, i) => (
            <Text key={i} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>
        
        <View style={styles.daysGrid}>
          {days}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={[styles.input, disabled && styles.disabledInput]} 
        onPress={() => !disabled && setShowCalendar(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <CalendarIcon size={18} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowCalendar(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || t('select_date')}</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {renderCalendar()}
            
            <TouchableOpacity 
              style={styles.todayButton}
              onPress={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                onChange(dateStr);
                setShowCalendar(false);
              }}
            >
              <Text style={styles.todayButtonText}>{t('today') || 'Sot'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  disabledInput: {
    opacity: 0.5,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholderText: {
    color: '#cbd5e1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: Platform.OS === 'web' ? 360 : '100%',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  selectedDay: {
    backgroundColor: '#2563eb',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '800',
  },
  todayText: {
    color: '#2563eb',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  todayButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  }
});

export default PremiumDatePicker;
