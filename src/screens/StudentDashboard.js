import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatClassName } from '../utils/stringUtils';
import Svg, { Circle } from 'react-native-svg';
import { 
  Home, 
  Book, 
  ClipboardCheck, 
  Calendar, 
  LogOut, 
  Bell,
  Lock,
  GraduationCap,
  Award,
  BookOpen as BookIcon,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Link,
  X,
} from 'lucide-react-native';
import CalendarStrip from '../components/CalendarStrip';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import PasswordChangeModal from '../components/PasswordChangeModal';
import { downloadFile } from '../utils/fileUtils';

const { width } = Dimensions.get('window');

// ==== Grade Color Helper (1-5 scale) ====
const getGradeColor = (val) => {
  const num = parseFloat(val);
  if (num >= 5) return { bg: '#dcfce7', text: '#15803d', border: '#22c55e', ring: '#22c55e', fill: 1.0 };
  if (num >= 4) return { bg: '#d1fae5', text: '#065f46', border: '#10b981', ring: '#10b981', fill: 0.8 };
  if (num >= 3) return { bg: '#fef9c3', text: '#854d0e', border: '#eab308', ring: '#eab308', fill: 0.7 };
  if (num >= 2) return { bg: '#ffedd5', text: '#c2410c', border: '#f97316', ring: '#f97316', fill: 0.6 };
  return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444', ring: '#ef4444', fill: 0.4 };
};

// StudentDashboard component starts here
const StudentDashboard = ({ 
  user, onLogout, grades, classes, schools, lessons, attendance, homework, notes, notices, tests, noticeReads, 
  onMarkNoticeRead, onRefresh, currentTerm, schoolCalendar, onInitializeAttendance,
  availableAcademicYears, selectedGlobalAcademicYear, onChangeAcademicYear
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const { updatePassword, login } = useAuth();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  // Jump calendar to the start of the selected academic year so the student sees that year's agenda
  React.useEffect(() => {
    if (selectedGlobalAcademicYear) {
      const startYear = parseInt(selectedGlobalAcademicYear.split('/')[0]);
      if (!isNaN(startYear)) {
        setSelectedDate(new Date(startYear, 8, 1)); // September 1st
      }
    } else {
      setSelectedDate(new Date());
    }
  }, [selectedGlobalAcademicYear]);

  const [isPasswordModalVisible, setIsPasswordModalVisible] = React.useState(false);

  const handleUpdatePassword = async (currentPass, newPass) => {
    try {
      // Re-verify
      await login(user.email, currentPass);
      // Update
      await updatePassword(newPass);
      showAlert(t('password_updated_success'), 'success');
    } catch (err) {
      const errorMsg = err.message === 'Invalid login credentials' 
        ? t('invalid_current_password')
        : err.message;
      showAlert(errorMsg, 'error');
      throw err;
    }
  };
  const [gradeSemester, setGradeSemester] = React.useState(currentTerm || 0); // Default to currentTerm
  
  // Update gradeSemester when currentTerm changes (on login/refresh)
  React.useEffect(() => {
    if (currentTerm && gradeSemester === 0) {
      setGradeSemester(currentTerm);
    }
  }, [currentTerm]);
  const [selectedSubject, setSelectedSubject] = React.useState(null);
  const [selectedNotice, setSelectedNotice] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Global Academic Year context applied to all props by DatabaseContext

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      // Ensure visual feedback on fast connections
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Persist Navigation State
  React.useEffect(() => {
    const loadNavState = async () => {
      try {
        const saved = await AsyncStorage.getItem(`nav_state_${user.id}`);
        if (saved) {
          const savedTab = JSON.parse(saved);
          if (savedTab) setActiveTab(savedTab);
        }
      } catch (e) {
        console.error("Scale load error", e);
      }
    };
    loadNavState();
  }, []);

  React.useEffect(() => {
    const saveNavState = async () => {
      try {
        await AsyncStorage.setItem(`nav_state_${user.id}`, JSON.stringify(activeTab));
      } catch (e) {
        console.error("State save error", e);
      }
    };
    saveNavState();
  }, [activeTab]);

  const formatDateString = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Auto-initialize attendance for today if school day
  React.useEffect(() => {
    if (user.classId && onInitializeAttendance) {
      const todayStr = formatDateString(new Date());
      const selectedDateStr = formatDateString(selectedDate);
      if (selectedDateStr === todayStr && isSchoolDay(selectedDate).isWork) {
        onInitializeAttendance(user.classId, todayStr);
      }
    }
  }, [user.classId, selectedDate]);

  const isSchoolDay = (date) => {
    const dateStr = formatDateString(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    const school = (schools || []).find(s => s.id === user.school_id) || schools?.[0];
    
    // 1. Check school year boundaries
    // Skip this check when viewing a past academic year — the boundaries belong to the CURRENT year
    if (!selectedGlobalAcademicYear) {
      if (school?.school_year_start && dateStr < school.school_year_start) return { isWork: false, reason: t('no_school_day') };
      if (school?.school_year_end && dateStr > school.school_year_end) return { isWork: false, reason: t('no_school_day') };
    }

    // 2. Check explicit calendar overrides
    // Prioritize class-specific holidays, then school-wide
    const calendarEvent = (schoolCalendar || []).find(e => 
      e.school_id === user.school_id && 
      e.date === dateStr &&
      (!e.is_class_specific || e.class_id === user.classId)
    );

    if (calendarEvent) {
      if (calendarEvent.type === 'holiday') return { isWork: false, reason: calendarEvent.description || t('holiday') };
      if (calendarEvent.type === 'work_day') return { isWork: true, reason: calendarEvent.description || t('work_day') };
    }

    // 3. Default weekend logic
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { isWork: false, reason: t('weekend') };
    }

    return { isWork: true };
  };

  const reformatDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}`;
  };

  // Dynamic Semester calculation: prioritize database term column, fallback to date calculation
  const currentSchool = (schools || []).find(s => s.id === user.school_id || s.id === user.schoolId) || schools?.[0];
  const getDynamicSemester = (dateStr, dbTerm) => {
    // 1. Prioritize what's written in DB (term column) as requested by user
    if (dbTerm) return Number(dbTerm);

    // 2. Fallback to Admin configuration (boundary date)
    if (currentSchool?.term_two_start_date && dateStr) {
      const entryDateStr = dateStr.split('T')[0].split(' ')[0];
      const boundaryDateStr = currentSchool.term_two_start_date.split('T')[0].split(' ')[0];
      return (entryDateStr > boundaryDateStr) ? 2 : 1;
    }

    // 3. Last resort fallback based on month
    if (!dateStr) return 1;
    const month = parseInt(dateStr.split('-')[1]);
    return (month >= 9 || month === 1) ? 1 : 2;
  };

  // 1. Filter all data (academic year filtering is already applied globally)
  const userGrades = grades.filter(g => 
    g.student_id === user.id && 
    g.grade > 0
  );

  const userAttendance = attendance.filter(a => 
    a.student_id === user.id && 
    parseInt(a.hour || 0) === 0
  );

  const studentClass = classes.find(c => c.id === user.classId);

  const filteredGrades = gradeSemester === 0
    ? userGrades
    : userGrades.filter(g => getDynamicSemester(g.date, g.term) === gradeSemester);

  const averageGrade = userGrades.length > 0 
    ? (userGrades.reduce((acc, curr) => acc + curr.grade, 0) / userGrades.length).toFixed(1)
    : '-';

  // Subject averages (for the selected semester filter)
  const subjectAverages = React.useMemo(() => {
    const subjects = {};
    filteredGrades.forEach(g => {
      if (!subjects[g.subject]) subjects[g.subject] = { total: 0, count: 0, grades: [] };
      subjects[g.subject].total += g.grade;
      subjects[g.subject].count += 1;
      subjects[g.subject].grades.push(g.grade);
    });
    return Object.keys(subjects).map(sub => ({
      subject: sub,
      average: (subjects[sub].total / subjects[sub].count).toFixed(1),
      count: subjects[sub].count,
      min: Math.min(...subjects[sub].grades),
      max: Math.max(...subjects[sub].grades),
    })).sort((a, b) => b.average - a.average);
  }, [filteredGrades]);

  const totalAbsences = userAttendance.filter(a => a.status.startsWith('absent')).length;
  const unjustifiedCount = userAttendance.filter(a => a.status === 'absent:unjustified').length;
  const latesCount = userAttendance.filter(a => a.status.startsWith('late')).length;
  const earlyExitsCount = userAttendance.filter(a => a.status.startsWith('early_exit')).length;

  // Semester Averages for Dashboard
  const firstSemGrades = userGrades.filter(g => getDynamicSemester(g.date, g.term) === 1);
  const secondSemGrades = userGrades.filter(g => getDynamicSemester(g.date, g.term) === 2);
  
  const firstSemAvg = firstSemGrades.length > 0
    ? (firstSemGrades.reduce((acc, curr) => acc + curr.grade, 0) / firstSemGrades.length).toFixed(1)
    : '0.0';
  
  const secondSemAvg = secondSemGrades.length > 0
    ? (secondSemGrades.reduce((acc, curr) => acc + curr.grade, 0) / secondSemGrades.length).toFixed(1)
    : '0.0';

  // Get notes from new notes table, fallback to lesson hack
  const personalNotes = notes
    ? notes.filter(n => n.student_id === user.id && !n.is_class_note)
    : grades.filter(g => g.student_id === user.id && g.comment?.includes('[NOTE]'));
  const classNotes = notes
    ? notes.filter(n => n.is_class_note && !n.student_id)
    : lessons.filter(l => l.class_id === user.classId && l.topic?.includes('[CLASS_NOTE]'));

  const userNotes = [...(personalNotes || []), ...(classNotes || [])]
    .sort((a,b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  const todayLessons = lessons.filter(l => 
    l.class_id === user.classId && 
    l.date === formatDateString(selectedDate)
  ).filter(l => !l.topic?.includes('[NOTE]') && !l.topic?.includes('[CLASS_NOTE]'));
  
  const selectedDateGrades = userGrades.filter(g => g.date === formatDateString(selectedDate));

  // ─── Grade Ring Component (SVG-less, CSS-style) ───
  const GradeRing = ({ value, size = 64, showProgress = false }) => {
    const colors = getGradeColor(value);
    const fillPct = (parseFloat(value) || 0) / 5; // 0 to 1
    const borderWidth = 5;
    
    if (showProgress) {
        // Simple progress bar completion using Svg if possible, or border technique
        return (
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size}>
              {/* Background circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={(size - borderWidth) / 2}
                stroke="#e2e8f0"
                strokeWidth={borderWidth}
                fill="none"
              />
              {/* Progress circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={(size - borderWidth) / 2}
                stroke={colors.ring}
                strokeWidth={borderWidth}
                strokeDasharray={`${Math.PI * (size - borderWidth) * fillPct} ${Math.PI * (size - borderWidth)}`}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>
            <View style={{ position: 'absolute' }}>
              <Text style={{ fontSize: size * 0.28, fontWeight: '900', color: colors.text }}>{value}</Text>
            </View>
          </View>
        );
    }

    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: borderWidth,
        borderColor: colors.ring,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6 + colors.fill * 0.4,
      }}>
        <Text style={{ fontSize: size * 0.36, fontWeight: '900', color: colors.text }}>{value}</Text>
      </View>
    );
  };

  const renderAttendance = () => {
    const absenceList = [...userAttendance].filter(a => !a.status.includes('present')).reverse();

    return (
      <View style={styles.content}>
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, flexGrow: 1 }}
          data={absenceList}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              colors={['#2563eb']} 
              tintColor="#2563eb"
            />
          }
          alwaysBounceVertical={true}
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 16 }}>
              <View style={[styles.statsDashboard, { flexWrap: 'wrap', justifyContent: 'space-between', gap: 0, rowGap: 12 }]}>
                {/* Total Absences */}
                <View style={[styles.statCard, { width: '48%', flex: 'none', margin: 0, paddingVertical: 16 }]}>
                   <View style={[styles.statIconBadge, { backgroundColor: '#ef444415', width: 36, height: 36, marginBottom: 10 }]}>
                    <Calendar size={18} color="#ef4444" />
                  </View>
                  <Text style={[styles.hBarValue, {color: '#ef4444', fontSize: 26, marginBottom: 2}]}>{totalAbsences}</Text>
                  <Text style={[styles.statCardTitle, { color: '#64748b', marginBottom: 0 }]}>{t('absences')}</Text>
                </View>

                {/* To Justify */}
                <View style={[styles.statCard, { width: '48%', flex: 'none', margin: 0, paddingVertical: 16 }]}>
                   <View style={[styles.statIconBadge, { backgroundColor: '#f59e0b15', width: 36, height: 36, marginBottom: 10 }]}>
                    <AlertTriangle size={18} color="#f59e0b" />
                  </View>
                  <Text style={[styles.hBarValue, {color: '#f59e0b', fontSize: 26, marginBottom: 2}]}>{unjustifiedCount}</Text>
                  <Text style={[styles.statCardTitle, { color: '#64748b', marginBottom: 0 }]}>{t('to_justify') || "Për t'u arsyetuar"}</Text>
                </View>

                {/* Lates */}
                <View style={[styles.statCard, { width: '48%', flex: 'none', margin: 0, paddingVertical: 16 }]}>
                   <View style={[styles.statIconBadge, { backgroundColor: '#3b82f615', width: 36, height: 36, marginBottom: 10 }]}>
                    <Clock size={18} color="#3b82f6" />
                  </View>
                  <Text style={[styles.hBarValue, {color: '#3b82f6', fontSize: 26, marginBottom: 2}]}>{latesCount}</Text>
                  <Text style={[styles.statCardTitle, { color: '#64748b', marginBottom: 0 }]}>{t('late')}</Text>
                </View>

                {/* Early Exits */}
                <View style={[styles.statCard, { width: '48%', flex: 'none', margin: 0, paddingVertical: 16 }]}>
                   <View style={[styles.statIconBadge, { backgroundColor: '#8b5cf615', width: 36, height: 36, marginBottom: 10 }]}>
                    <LogOut size={18} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.hBarValue, {color: '#8b5cf6', fontSize: 26, marginBottom: 2}]}>{earlyExitsCount}</Text>
                  <Text style={[styles.statCardTitle, { color: '#64748b', marginBottom: 0 }]}>{t('early_exit')}</Text>
                </View>
              </View>
              <Text style={[styles.sectionTitleSmall, { marginTop: 12 }]}>{t('attendance_details')}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isAbsent = item.status.startsWith('absent');
            const isWarning = item.status === 'late' || item.status === 'early_exit';
            
            let statusColor = '#10b981';
            let statusChar = 'P';
            
            const statusParts = item.status.split(':');
            const statusType = statusParts[0];
            const isJustified = item.status.includes(':justified');
            
            statusChar = {
              present: 'P',
              absent: 'M',
              late: 'V',
              early_exit: 'D'
            }[statusType] || '?';

            if (statusType === 'absent') statusColor = '#ef4444';
            else if (statusType === 'late' || statusType === 'early_exit') statusColor = '#f59e0b';

            let statusLabel = t(statusType) || statusType;
            if (isJustified) statusLabel += ` (${t('justified')})`;
            else if (item.status.includes(':unjustified')) statusLabel += ` (${t('unjustified')})`;

            const justifiedIndex = statusParts.indexOf('justified');
            const extractedReason = justifiedIndex !== -1 && statusParts.length > justifiedIndex + 1 
              ? statusParts.slice(justifiedIndex + 1).join(':') 
              : '';

            // If it's a "late" or "early_exit", it might have a time in parts[1]
            const timeVal = (statusType === 'late' || statusType === 'early_exit') && statusParts[1] && statusParts[1] !== 'justified' && statusParts[1] !== 'unjustified' 
              ? statusParts[1] 
              : '';

            return (
              <View style={styles.miniDetailRow}>
                <View style={[styles.statusCircle, { width: 32, height: 32, backgroundColor: statusColor, marginRight: 12 }]}>
                  <Text style={[styles.statusInitial, { fontSize: 13 }]}>{statusChar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.miniDetailStatus, {fontWeight: '700', color: '#1e293b'}]}>
                    {statusLabel} {timeVal ? `• ${timeVal}` : ''}
                  </Text>
                  {item.subject ? <Text style={styles.attendanceSubject}>{t(item.subject)}</Text> : null}
                  {(item.description || extractedReason) ? (
                    <Text style={{ fontSize: 13, color: '#059669', fontStyle: 'italic', marginTop: 4 }}>
                      "{item.description || extractedReason}"
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.miniDetailDate, {textAlign: 'right', fontWeight: '800', color: '#64748b'}]}>
                  {reformatDate(item.date)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.statusCircle, { backgroundColor: '#f1f5f9', width: 60, height: 60, marginBottom: 16 }]}>
                <ClipboardCheck size={30} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>{t('no_attendance_recorded')}</Text>
            </View>
          )}
        />
      </View>
    );
  };

  const renderOverview = () => (
    <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            colors={['#2563eb']} 
            tintColor="#2563eb"
          />
        }
        alwaysBounceVertical={true}
    >
      <View style={{ marginTop: 10 }}>
        {/* School Calendar Status (Holiday/Weekend) */}
        {(() => {
          const dayStatus = isSchoolDay(selectedDate);
          if (dayStatus.isWork) return null;

          return (
            <View style={[styles.statusBanner, { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', marginBottom: 24, borderStyle: 'dashed' }]}>
              <View style={[styles.statusCircle, { backgroundColor: '#94a3b8' }]}>
                <Calendar size={22} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusBannerText, { color: '#475569', fontSize: 20, textTransform: 'uppercase' }]}>
                  {t('holiday')}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700' }}>
                  {dayStatus.reason}
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Attendance Status for selected date */}
        {(() => {
          const selectedDateStr = formatDateString(selectedDate);
          let att = userAttendance.find(a => a.date === selectedDateStr && parseInt(a.hour || 0) === 0);
          
          if (!att) return null; // Only show if record exists in DB

          const statusKey = att.status.split(':')[0];
          const isAbsent = statusKey === 'absent';
          const isWarning = statusKey === 'late' || statusKey === 'early_exit';
          
          let statusColor = '#10b981'; // Green for present
          if (isAbsent) statusColor = '#ef4444'; // Red
          if (isWarning) statusColor = '#f59e0b'; // Orange

          const statusInitial = {
            present: 'P',
            absent: 'M',
            late: 'V',
            early_exit: 'D'
          }[statusKey] || '?';

          const statusLabels = {
            present: t('present') || 'Prezent',
            absent: t('absent') || 'Mungon',
            late: (t('late') || 'Vonesë').replace(/ \(.*\)/, ''), // removes the (Në hyrje) stuff
            early_exit: (t('early_exit') || 'Dalje').split(' ')[0], // takes just 'Dalje' if 'Dalje Herët'
          };
          
          const displayStatus = statusLabels[statusKey] || statusKey;

          return (
            <View style={[styles.statusBanner, { backgroundColor: statusColor + '15', borderColor: statusColor, alignItems: 'center', gap: 15 }]}>
              <View style={[styles.statusCircle, { backgroundColor: statusColor }]}>
                <Text style={styles.statusInitial}>{statusInitial}</Text>
              </View>
              <Text style={[styles.statusBannerText, { color: statusColor, fontSize: 22 }]}>
                {displayStatus.toUpperCase()}
              </Text>
            </View>
          );
        })()}

        {/* Disciplinary Notes ... */}
        {(() => {
          const selectedDateStr = formatDateString(selectedDate);
          const selectedDateNotes = userNotes.filter(n => n.date === selectedDateStr || (n.created_at && n.created_at.startsWith(selectedDateStr)));
          
          if (selectedDateNotes.length > 0) {
            return (
              <View style={{ marginTop: 8, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('disciplinary_note')}
                  </Text>
                </View>
                {selectedDateNotes.map((note, idx) => (
                  <View key={note.id || idx} style={{
                    backgroundColor: '#fff1f2',
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 10,
                    borderWidth: 1.5,
                    borderColor: '#fecaca',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: '#ef4444',
                        alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <AlertTriangle size={18} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {note.is_class_note ? (t('class_note') || 'Klasa') : (t('personal_note') || 'Personale')}
                          </Text>
                        </View>
                        {note.profiles && (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c', marginBottom: 4 }}>
                            {note.profiles.first_name} {note.profiles.last_name}
                          </Text>
                        )}
                        <Text style={{ fontSize: 14, color: '#7f1d1d', fontWeight: '600', lineHeight: 20 }}>
                          {note.content}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            );
          }
          return null;
        })()}

        {/* Dedicated Homework Section */}
        {(() => {
          const selectedDateStr = formatDateString(selectedDate);
          const dateHomework = (homework || []).filter(hw => hw.due_date === selectedDateStr && hw.class_id === user.classId);
          
          if (dateHomework.length > 0) {
            return (
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('homework_label')}
                  </Text>
                </View>
                {dateHomework.map((hw, idx) => (
                  <View key={hw.id || idx} style={{
                    backgroundColor: '#f0f9ff',
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 10,
                    borderWidth: 1.5,
                    borderColor: '#bae6fd',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#3b82f6', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                       <Book size={20} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0369a1' }}>{hw.subject}</Text>
                      <Text style={{ fontSize: 15, color: '#0c4a6e', fontWeight: '600' }}>{hw.description}</Text>
                      {hw.profiles && (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#60a5fa', marginTop: 4 }}>
                          {t('issued_by') || 'Lëshuar nga'}: {hw.profiles.first_name} {hw.profiles.last_name}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          }
          return null;
        })()}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('lessons') || 'Mësimi'}</Text>
          <Book size={20} color="#2563eb" />
        </View>
        
        <FlatList
          data={todayLessons}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const topicParts = item.topic?.match(/^\[Ora (\d+)\] (.*)/);
            const hourNum = topicParts ? topicParts[1] : '';
            const cleanTopic = topicParts ? topicParts[2] : item.topic;
            const profName = item.profiles ? `${item.profiles.first_name} ${item.profiles.last_name}` : '';
            
            return (
            <View style={styles.premiumCard}>
              <View style={styles.hourContainer}>
                <Text style={styles.hourNumber}>{hourNum}</Text>
                <Text style={styles.hourLabel}>{t('hour').toUpperCase()}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.lessonHeader}>
                  <View style={{flex: 1}}>
                    <Text style={styles.lessonSubject}>{t(item.subject)}</Text>
                    {profName ? <Text style={styles.profName}>{profName}</Text> : null}
                  </View>
                  {item.is_test && (
                    <View style={[styles.hourBadge, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
                      <Text style={[styles.hourBadgeText, { color: '#ef4444' }]}>TEST</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lessonTopic}>{cleanTopic}</Text>
                {item.homework ? (
                  <View style={styles.homeworkContainer}>
                    <Clock size={14} color="#2563eb" />
                    <Text style={styles.homeworkText}><Text style={{fontWeight: '800'}}>{t('homework_label')}:</Text> {item.homework}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            );
          }}
          ListEmptyComponent={() => {
            const dayStatus = isSchoolDay(selectedDate);
            return (
              <View style={styles.emptyStateContainer}>
                {dayStatus.isWork ? (
                  <>
                    <BookIcon size={32} color="#e2e8f0" />
                    <Text style={styles.emptyText}>{t('nuk_ka_ore')}</Text>
                  </>
                ) : (
                  <>
                    <Calendar size={32} color="#94a3b8" />
                    <Text style={[styles.emptyText, { color: '#64748b', fontWeight: '700' }]}>{dayStatus.reason}</Text>
                  </>
                )}
              </View>
            );
          }}
        />

        {/* Scheduled Tests (Verifiche) */}
        {(() => {
          const selectedDateStr = formatDateString(selectedDate);
          const dateTests = (tests || []).filter(t => t.date === selectedDateStr && t.class_id === user.classId);
          
          if (dateTests.length > 0) {
            return (
              <View style={{ marginTop: 24, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e' }} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {t('test_exam') || 'Verifica / Provim'}
                  </Text>
                </View>
                {dateTests.map((test, idx) => (
                  <View key={test.id || idx} style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 10,
                    borderWidth: 2,
                    borderColor: '#f43f5e',
                    borderLeftWidth: 8,
                    shadowColor: '#f43f5e',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 4,
                  }}>
                     <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#881337', marginBottom: 2 }}>{test.subject}</Text>
                        {test.profiles && (
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#be123c' }}>
                            {test.profiles.first_name} {test.profiles.last_name}
                          </Text>
                        )}
                     </View>
                     <View style={{ height: 1, backgroundColor: '#ffe4e6', marginBottom: 10 }} />
                     <Text style={{ fontSize: 14, color: '#4c0519', fontWeight: '600', lineHeight: 20 }}>
                       {test.description}
                     </Text>
                   </View>
                ))}
              </View>
            );
          }
          return null;
        })()}

        {/* Legacy Grades and duplicate notifications removed from here */}

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );

  const renderGrades = () => {
    const isDetailView = gradeSemester !== 0 && selectedSubject;
    const isSemesterView = gradeSemester !== 0 && !selectedSubject;

    return (
    <View style={styles.content}>
      {/* Semester filter */}
      <View style={styles.semesterSelector}>
        {[
          { id: 0, label: t('all') },
          { id: 1, label: t('first_semester') },
          { id: 2, label: t('second_semester') },
        ].map(sem => (
          <TouchableOpacity
            key={sem.id}
            style={[styles.semesterChip, gradeSemester === sem.id && styles.activeSemesterChip]}
            onPress={() => {
                setGradeSemester(sem.id);
                setSelectedSubject(null);
            }}
          >
            <Text style={[styles.semesterChipText, gradeSemester === sem.id && styles.activeSemesterChipText]}>
              {sem.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 1. SEMESTER SUBJECT LIST VIEW */}
      {isSemesterView && (
        <ScrollView 
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, flexGrow: 1 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              colors={['#2563eb']} 
              tintColor="#2563eb"
            />
          }
          alwaysBounceVertical={true}
        >
          <Text style={[styles.sectionTitleSmall, { marginBottom: 16 }]}>{t('mesatarja_sipas_lendeve')}</Text>
          {subjectAverages.length > 0 ? (
            subjectAverages.map((sub, idx) => {
                const colors = getGradeColor(sub.average);
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.subjectRowFrame, { borderColor: colors.border }]}
                    onPress={() => setSelectedSubject(sub.subject)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectNameLarge}>{t(sub.subject)}</Text>
                    </View>
                    <GradeRing value={sub.average} size={60} showProgress={true} />
                  </TouchableOpacity>
                );
              })
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>{t('nuk_ka_nota')}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 2. SUBJECT DETAIL VIEW OR ALL LIST */}
      {(gradeSemester === 0 || isDetailView) && (
        <View style={{flex: 1}}>
          {isDetailView && (
             <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedSubject(null)} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← {t('back')}</Text>
                </TouchableOpacity>
                <Text style={styles.detailTitle}>{t(selectedSubject)}</Text>
             </View>
          )}
          
          <FlatList
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, flexGrow: 1 }}
            data={isDetailView 
                ? [...filteredGrades].filter(g => g.subject === selectedSubject).reverse()
                : [...filteredGrades].reverse()}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh} 
                colors={['#2563eb']} 
                tintColor="#2563eb"
              />
            }
            alwaysBounceVertical={true}
            renderItem={({ item }) => {
              const legacyParts = item.description?.match(/^\[(.*?)\] (.*)/);
              let rawType = item.grade_type || (legacyParts ? legacyParts[1] : '');
              const gradeType = rawType ? rawType.replace(/[\[\]]/g, '').trim() : '';
              const gradeNotes = item.description ? (legacyParts ? legacyParts[2] : item.description) : '';
              const gradeColors = getGradeColor(item.grade);

              return (
                <View style={[styles.gradeCard, { borderColor: gradeColors.border, padding: 16 }]}>
                  <Text style={[styles.gradeDate, { marginBottom: 10 }]}>{reformatDate(item.date)}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                    <GradeRing value={item.grade} size={48} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gradeSubject}>{t(item.subject)}</Text>
                      {gradeType ? <Text style={styles.typeLabelText}>{gradeType}</Text> : null}
                      {gradeNotes ? (
                        <Text style={styles.gradeComment} numberOfLines={3}>
                          {gradeNotes}
                        </Text>
                      ) : null}
                      {item.profiles && (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 4 }}>
                          {t('issued_by')}: {item.profiles.first_name} {item.profiles.last_name}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyText}>{t('nuk_ka_nota')}</Text>
              </View>
            )}
            ListHeaderComponent={() => {
              if (isDetailView) return null;
              
              const overallColors = getGradeColor(averageGrade);
              const sem1Colors = getGradeColor(firstSemAvg);
              const sem2Colors = getGradeColor(secondSemAvg);

              return (
                <View style={{ paddingBottom: 16 }}>
                  <View style={styles.statsDashboard}>
                    {/* Overall Column */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconBadge, { backgroundColor: overallColors.text + '10' }]}>
                        <Award size={14} color={overallColors.text} />
                      </View>
                      <Text style={[styles.statCardTitle, { color: '#64748b' }]}>{t('total_avg')}</Text>
                      <GradeRing value={averageGrade} size={70} showProgress={true} strokeWidth={8} />
                    </View>

                    {/* Sem 1 Column */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconBadge, { backgroundColor: sem1Colors.text + '10' }]}>
                        <BookIcon size={14} color={sem1Colors.text} />
                      </View>
                      <Text style={[styles.statCardTitle, { color: '#64748b' }]}>{t('first_semester')}</Text>
                      <View style={styles.hBarContainer}>
                        <Text style={[styles.hBarValue, {color: sem1Colors.text}]}>{firstSemAvg}</Text>
                        <View style={[styles.hBarTrack, { height: 10, borderRadius: 5, backgroundColor: '#f1f5f9' }]}>
                          <View style={[styles.hBarFill, { borderRadius: 5, width: `${Math.min(100, (parseFloat(firstSemAvg)/5)*100)}%`, backgroundColor: sem1Colors.ring }]} />
                        </View>
                      </View>
                    </View>

                    {/* Sem 2 Column */}
                    <View style={styles.statCard}>
                      <View style={[styles.statIconBadge, { backgroundColor: sem2Colors.text + '10' }]}>
                        <GraduationCap size={14} color={sem2Colors.text} />
                      </View>
                      <Text style={[styles.statCardTitle, { color: '#64748b' }]}>{t('second_semester')}</Text>
                      <View style={styles.hBarContainer}>
                        <Text style={[styles.hBarValue, {color: sem2Colors.text}]}>{secondSemAvg}</Text>
                        <View style={[styles.hBarTrack, { height: 10, borderRadius: 5, backgroundColor: '#f1f5f9' }]}>
                          <View style={[styles.hBarFill, { borderRadius: 5, width: `${Math.min(100, (parseFloat(secondSemAvg)/5)*100)}%`, backgroundColor: sem2Colors.ring }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.sectionTitleSmall, { marginBottom: 12, marginTop: 12 }]}>{t('te_gjitha_notat')}</Text>
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
    );
  };

  const renderNotices = () => {
    const schoolNotices = notices?.filter(n =>
      (n.school_id === studentClass?.schoolId || !n.school_id) &&
      (!n.class_id || n.class_id === user.classId)
    ) || [];

    return (
      <View style={styles.content}>
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, flexGrow: 1 }}
          data={schoolNotices}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              colors={['#2563eb']} 
              tintColor="#2563eb"
            />
          }
          alwaysBounceVertical={true}
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 16, marginTop: 10 }}>
              <Text style={styles.sectionTitle}>{t('notices')}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isRead = noticeReads?.includes(item.id);
            const hasAttachment = !!item.attachment_url;
            return (
              <TouchableOpacity
                activeOpacity={0.82}
                style={{
                  backgroundColor: isRead ? 'white' : '#fdf2f8',
                  borderRadius: 20,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isRead ? '#f1f5f9' : '#fce7f3',
                  shadowColor: isRead ? '#94a3b8' : '#db2777',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isRead ? 0.06 : 0.10,
                  shadowRadius: 10,
                  elevation: 3,
                }}
                onPress={() => {
                  if (!isRead && onMarkNoticeRead) onMarkNoticeRead(item.id);
                  setSelectedNotice(item);
                }}
              >
                {/* Icon container on the left */}
                <View style={{
                  width: 50, height: 50, borderRadius: 16,
                  backgroundColor: isRead ? '#f0f9ff' : '#fce7f3',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  borderWidth: 1,
                  borderColor: isRead ? '#e0f2fe' : '#fbcfe8',
                }}>
                  {hasAttachment
                    ? <FileText size={24} color={isRead ? '#0ea5e9' : '#db2777'} />
                    : <Bell size={24} color={isRead ? '#0ea5e9' : '#db2777'} />
                  }
                </View>

                {/* Text content */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}>
                    {new Date(item.created_at).toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                  {hasAttachment && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      <FileText size={11} color="#db2777" />
                      <Text style={{ fontSize: 11, color: '#db2777', fontWeight: '700' }}>{t('attachment')}</Text>
                    </View>
                  )}
                </View>

                {/* Unread dot */}
                {!isRead && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#db2777', flexShrink: 0 }} />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.statusCircle, { backgroundColor: '#f1f5f9', width: 60, height: 60, marginBottom: 16 }]}>
                <Bell size={30} color="#94a3b8" />
              </View>
              <Text style={styles.emptyText}>{t('no_notices')}</Text>
            </View>
          )}
        />
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopBar}>
          <View style={styles.headerLogo}>
            <View style={styles.logoIcon}>
              <Book size={20} color="white" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Ditari Elektronik</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {studentClass && (
                  <Text style={styles.headerSubtitle}>{formatClassName(studentClass)}</Text>
                )}
                {selectedGlobalAcademicYear && (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' }} />
                )}
                {selectedGlobalAcademicYear && (
                  <Text style={[styles.headerSubtitle, { color: '#f43f5e', fontWeight: '800' }]}>{selectedGlobalAcademicYear}</Text>
                )}
              </View>
            </View>
          </View>
          <ProfileDropdown
            user={user}
            t={t}
            onLogout={onLogout}
            onChangePassword={() => setIsPasswordModalVisible(true)}
            onHelp={() => Linking.openURL('mailto:info@ditari-elektronik.com')}
            availableAcademicYears={availableAcademicYears}
            selectedGlobalAcademicYear={selectedGlobalAcademicYear}
            changeAcademicYear={onChangeAcademicYear}
          />
        </View>

        {activeTab === 'overview' && (
          <CalendarStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        )}
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'grades' && renderGrades()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'notices' && renderNotices()}

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('overview')}
        >
          <Home size={24} color={activeTab === 'overview' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'overview' && styles.activeNavText]}>{t('overview')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('grades')}
        >
          <Award size={24} color={activeTab === 'grades' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'grades' && styles.activeNavText]}>{t('notat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('attendance')}
        >
          <View>
            <Calendar size={24} color={activeTab === 'attendance' ? '#2563eb' : '#94a3b8'} />
          </View>
          <Text style={[styles.navText, activeTab === 'attendance' && styles.activeNavText]}>{t('mungesa')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('notices')}
        >
          <View>
            <Bell size={24} color={activeTab === 'notices' ? '#2563eb' : '#94a3b8'} />
            {(() => {
              const schoolNotices = notices?.filter(n => n.school_id === studentClass?.schoolId) || [];
              const unreadCount = schoolNotices.filter(n => !noticeReads?.includes(n.id)).length;
              if (unreadCount > 0) {
                return (
                  <View style={styles.badgeContainer}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{unreadCount}</Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>
          <Text style={[styles.navText, activeTab === 'notices' && styles.activeNavText]}>{t('notices')}</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Notice Modal */}
      {selectedNotice && (
        <Modal visible={!!selectedNotice} animationType="fade" transparent>
          {/* ... existing modal content ... */}
          <View style={modalStyles.overlay}>
            <View style={modalStyles.content}>
              <View style={modalStyles.header}>
                <View style={modalStyles.iconBg}>
                  <Bell size={24} color="#db2777" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.title} numberOfLines={2}>{selectedNotice.title}</Text>
                  <Text style={modalStyles.date}>{new Date(selectedNotice.created_at).toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
                </View>
              </View>
              
              <ScrollView style={{ maxHeight: 300, paddingVertical: 20 }} showsVerticalScrollIndicator={false}>
                <Text style={modalStyles.message}>{selectedNotice.message}</Text>
              </ScrollView>

              {selectedNotice.attachment_url && (
                <TouchableOpacity 
                  style={modalStyles.attachmentBtn}
                  onPress={() => {
                    const extension = selectedNotice.attachment_url.split('.').pop().split('?')[0] || 'pdf';
                    const fileName = `${selectedNotice.title.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
                    downloadFile(selectedNotice.attachment_url, fileName);
                  }}
                >
                  <Download size={20} color="white" />
                  <Text style={modalStyles.attachmentBtnText}>{t('download_attachment')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={modalStyles.closeBtn}
                onPress={() => setSelectedNotice(null)}
              >
                <Text style={modalStyles.closeBtnText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <PasswordChangeModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        onUpdate={handleUpdatePassword}
        t={t}
      />

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    ...Platform.select({
      web: { overflow: 'auto' }
    })
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  sectionTitleSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 20,
    marginTop: 10,
    gap: 12,
  },
  statusCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
  },
  notifCard: {
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
  },
  hourContainer: {
    width: 60,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#dbeafe',
  },
  hourNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563eb',
  },
  hourLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#60a5fa',
    marginTop: -2,
  },
  cardAccent: {
    width: 5,
    backgroundColor: '#2563eb',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lessonSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  lessonDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  profName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  lessonTopic: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  homeworkContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  homeworkText: {
    fontSize: 12,
    color: '#1e293b',
    flex: 1,
  },
  emptyStateContainer: {
    padding: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  gradeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  gradeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  gradeSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
  },
  gradeDate: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  gradeComment: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 4,
  },
  typeLabelContainer: {
    marginVertical: 4,
  },
  typeLabelText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  hourBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  hourBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeNavText: {
    color: '#2563eb',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'white',
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  notifBannerText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  notifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  notifBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  semesterSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 8,
  },
  semesterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeSemesterChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  semesterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeSemesterChipText: {
    color: '#2563eb',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 24,
    marginBottom: 10,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  subjectMeta: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  absenceSummaryCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  attendanceCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  attendanceSubject: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  attendanceStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  attendanceStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  subjectRowFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  subjectNameLarge: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  detailHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    flex: 1,
  },
  miniDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  miniDetailDate: {
    fontSize: 12,
    color: '#94a3b8',
    width: 90,
    fontWeight: '600',
  },
  miniDetailStatus: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    fontWeight: '500',
  },
  timeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  statsDashboard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  statIconBadge: {
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  statCardTitle: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  hBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  hBarValue: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 4,
  },
  hBarTrack: {
    height: 5,
    width: '100%',
    fontWeight: '800',
    color: '#2563eb',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#db2777',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 24,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 20,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fdf2f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
  message: {
    fontSize: 16,
    lineHeight: 26,
    color: '#475569',
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#db2777',
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
  },
  attachmentBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 16,
  }
});

export default StudentDashboard;
