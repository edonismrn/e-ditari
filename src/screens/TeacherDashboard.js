import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  RefreshControl,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import {
  ChevronRight,
  ChevronDown,
  Bell,
  Plus,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  BookOpen as BookIcon,
  Save,
  Trash2,
  ClipboardList,
  UserCheck,
  Calendar,
  Home,
  LogOut,
  Lock,
  ShieldCheck,
  Pencil,
  X,
  Award,
  TrendingUp,
  GraduationCap,
  ArrowUpCircle,
  Check,
  Users,
  Globe,
  Activity,
  FlaskConical,
  Palette,
  Music,
  Divide,
  FileText,
  Paperclip,
  Download,
  Search
} from 'lucide-react-native';
import CalendarStrip from '../components/CalendarStrip';
import { formatDate, formatDisplayDate } from '../utils/dateUtils';
import { formatClassName } from '../utils/stringUtils';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import PasswordChangeModal from '../components/PasswordChangeModal';

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

const GradeRing = ({ value, size = 64, showProgress = false }) => {
  const colors = getGradeColor(value);
  const fillPct = (parseFloat(value) || 0) / 5; // 0 to 1
  const borderWidth = 5;

  if (showProgress) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={(size - borderWidth) / 2}
            stroke="#e2e8f0"
            strokeWidth={borderWidth}
            fill="none"
          />
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

const TeacherDashboard = ({
  user, onLogout, classes, students, grades, lessons, attendance, homework, notes, notices, tests,
  onAddGrade, onUpdateGrade, onAddLesson, onUpdateLesson, onDeleteLesson, onUpdateAttendanceHour, onToggleAttendance, onJustifyAttendance,
  onInitializeAttendance, onAddHomework, onAddNote, onAddTest, onDeleteTest, onRefresh,
  schoolCalendar, schools, onMarkDayAsRest, onUndoRestDay,
  availableAcademicYears, selectedGlobalAcademicYear, onChangeAcademicYear
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const { updatePassword, login } = useAuth();
  const [activeView, setActiveView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingLesson, setEditingLesson] = useState(null);

  // When the user switches academic year, jump the calendar to September 1st of that year.
  // When returning to current year (null), jump back to today.
  React.useEffect(() => {
    if (selectedGlobalAcademicYear) {
      // e.g. "2024/2025" → start year is 2024 → jump to 1 Sep 2024
      const startYear = parseInt(selectedGlobalAcademicYear.split('/')[0]);
      if (!isNaN(startYear)) {
        setSelectedDate(new Date(startYear, 8, 1)); // month 8 = September
      }
    } else {
      setSelectedDate(new Date()); // back to today
    }
  }, [selectedGlobalAcademicYear]);

  const getOccupiedHours = (classId, dateStr) => {
    return (lessons || [])
      .filter(l => (l.class_id === classId || l.classId === classId) && l.date === dateStr)
      .map(l => {
        const match = l.topic?.match(/^\[Ora (\d+)\]/);
        return match ? match[1] : null;
      })
      .filter(h => h !== null);
  };

  const getCurrentHour = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const getTime = (h, m) => new Date(currentYear, currentMonth, currentDate, h, m).getTime();
    const nowTime = now.getTime();

    if (nowTime >= getTime(8, 0) && nowTime < getTime(8, 45)) return 1;
    if (nowTime >= getTime(8, 50) && nowTime < getTime(9, 35)) return 2;
    if (nowTime >= getTime(9, 40) && nowTime < getTime(10, 25)) return 3;
    if (nowTime >= getTime(10, 45) && nowTime < getTime(11, 30)) return 4;
    if (nowTime >= getTime(11, 35) && nowTime < getTime(12, 20)) return 5;
    if (nowTime >= getTime(12, 25) && nowTime < getTime(13, 10)) return 6;
    if (nowTime >= getTime(13, 15) && nowTime < getTime(14, 0)) return 7;

    return null;
  };

  const currentHour = getCurrentHour();

  const getDynamicClassStudents = (classId) => {
    // Since DatabaseContext now handles historical student_classes associations,
    // the 'students' array already contains the correct roster for the selected year.
    return students.filter(s => s.classId === classId || s.class_id === classId);
  };

  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

  const handleUpdatePassword = async (currentPass, newPass) => {
    try {
      // Verify current password count
      await login(user.email, currentPass);
      // If success, update
      await updatePassword(newPass);
      showAlert(t('password_updated_success') || 'Fjalëkalimi u ndryshua me sukses!', 'success');
    } catch (err) {
      const errorMsg = err.message === 'Invalid login credentials'
        ? (t('invalid_current_password') || 'Fjalëkalimi aktual nuk është i saktë')
        : err.message;
      showAlert(errorMsg, 'error');
      throw err;
    }
  };
  const [navigation, setNavigation] = useState({ view: 'home', data: null });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Ensure at least 1s of refresh time for smooth UX on mobile
      await Promise.all([
        onRefresh ? onRefresh() : Promise.resolve(),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const [classSearchText, setClassSearchText] = useState('');

  const formatDateString = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isSchoolDay = (date) => {
    const dateStr = formatDateString(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    const school = (schools || []).find(s => s.id === user.school_id) || schools?.[0];

    // 1. Check school year boundaries
    // Skip when viewing a past academic year — the stored boundaries belong to the CURRENT year
    if (!selectedGlobalAcademicYear) {
      if (school?.school_year_start && dateStr < school.school_year_start) return { isWork: false, reason: t('no_school_day') };
      if (school?.school_year_end && dateStr > school.school_year_end) return { isWork: false, reason: t('no_school_day') };
    }

    // 2. Check explicit calendar overrides
    // Look for class-specific holidays first (if viewing a class), then school-wide
    const currentClassId = navigation.view === 'class-detail' || navigation.view === 'class-agenda' ? navigation.data?.id : null;

    const calendarEvent = (schoolCalendar || []).find(e =>
      e.school_id === user.school_id &&
      e.date === dateStr &&
      (!e.is_class_specific || (currentClassId && e.class_id === currentClassId))
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

  // Registration Form State
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonHomework, setLessonHomework] = useState('');
  const [lessonHour, setLessonHour] = useState('1');
  const [isTest, setIsTest] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(user.subjects?.[0] || '');

  // Grade Form State
  const [gradeValue, setGradeValue] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [gradeType, setGradeType] = useState('Me Shkrim');
  const [selectedStudentForGrade, setSelectedStudentForGrade] = useState(null);
  const [gradeCustomDate, setGradeCustomDate] = useState(null); // null = use selectedDate

  // Modal State
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isLessonModalVisible, setIsLessonModalVisible] = useState(false);
  const [isTestModalVisible, setIsTestModalVisible] = useState(false);
  const [testDescription, setTestDescription] = useState('');
  const [isEditLessonModalVisible, setIsEditLessonModalVisible] = useState(false);
  const [editLessonData, setEditLessonData] = useState(null);
  const [isGradeModalVisible, setIsGradeModalVisible] = useState(false);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [selectedActionStudent, setSelectedActionStudent] = useState(null);
  const [activeActionTab, setActiveActionTab] = useState('grade'); // grade, attendance, note
  const [attendanceTime, setAttendanceTime] = useState('');
  const [selHour, setSelHour] = useState('');
  const [selMinute, setSelMinute] = useState('');
  const [isHourDropdownVisible, setIsHourDropdownVisible] = useState(false);
  const [isMinuteDropdownVisible, setIsMinuteDropdownVisible] = useState(false);
  const [showHourlyAttendance, setShowHourlyAttendance] = useState(Dimensions.get('window').width > 768);
  const [absenceType, setAbsenceType] = useState('unjustified');
  const [justifyReason, setJustifyReason] = useState('');
  const [selectedDateToJustify, setSelectedDateToJustify] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [isClassNote, setIsClassNote] = useState(false);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [confirmState, setConfirmState] = useState({
    visible: false,
    message: '',
    onConfirm: null
  });
  const [tempAttendanceStatus, setTempAttendanceStatus] = useState(null);
  const [isAttendanceSaving, setIsAttendanceSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRegistryStudent, setSelectedRegistryStudent] = useState(null);
  const [selectedAttendanceHour, setSelectedAttendanceHour] = useState(null);

  // Time Modal State (shown after hourly save when daily becomes late/early_exit)
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [pendingTimeType, setPendingTimeType] = useState(null); // 'late' | 'early_exit'
  const [pendingTimeStudentId, setPendingTimeStudentId] = useState(null);
  const [pendingTimeDate, setPendingTimeDate] = useState(null);
  const [timeModalSelHour, setTimeModalSelHour] = useState('');
  const [timeModalSelMinute, setTimeModalSelMinute] = useState('');
  const [isTimeModalHourDropdown, setIsTimeModalHourDropdown] = useState(false);
  const [isTimeModalMinuteDropdown, setIsTimeModalMinuteDropdown] = useState(false);
  const [isTimeSaving, setIsTimeSaving] = useState(false);

  // New Menu States
  const [selectedNotatStudent, setSelectedNotatStudent] = useState(null);
  const [selectedNotatSubject, setSelectedNotatSubject] = useState(null);
  const [lessonDate, setLessonDate] = useState(null); // null = use selectedDate

  // Helper: compute what the daily status would be after setting studentId/date/hour to newStatus
  const computeNewDailyStatus = (studentId, date, changedHour, newStatus) => {
    // Gather all hourly records for this student/date (hours 1-7)
    const existingRecords = attendance.filter(a =>
      (a.student_id === studentId || a.studentId === studentId) &&
      a.date === date &&
      a.hour > 0 && a.hour <= 7
    );

    // Build a map of hour -> base status, applying the new changes
    const statuses = {};
    // 'none' = not yet recorded. An unrecorded hour is NOT the same as absent.
    for (let i = 1; i <= 7; i++) statuses[i] = 'none';
    
    existingRecords.forEach(r => {
      const baseStatus = r.status?.split(':')[0];
      statuses[r.hour] = baseStatus;
    });

    if (changedHour > 0) {
      statuses[changedHour] = newStatus;
    }

    const hourKeys = [1, 2, 3, 4, 5, 6, 7];
    const presentHours = hourKeys.filter(h => statuses[h] === 'present');

    if (presentHours.length === 0) return 'absent';
    
    const firstPresent = Math.min(...presentHours);
    const lastPresent = Math.max(...presentHours);

    // LATE: only when there is an explicit 'absent' BEFORE the first 'present'.
    // Hours never recorded ('none') do NOT trigger late.
    const isLate = hourKeys.some(h => h < firstPresent && statuses[h] === 'absent');
    if (isLate) return 'late';

    // EARLY EXIT: only when there is an explicit 'absent' AFTER the last 'present'.
    // Hours never recorded ('none') do NOT trigger early_exit.
    const isEarlyExit = hourKeys.some(h => h > lastPresent && statuses[h] === 'absent');
    if (isEarlyExit) return 'early_exit';

    return 'present';
  };

  // Auto-initialize attendance for today when viewing class detail
  React.useEffect(() => {
    if (navigation.view === 'class-detail' && navigation.data?.id) {
      const todayStr = new Date().toISOString().split('T')[0];
      const selectedDateStr = formatDate(selectedDate);

      // Only auto-initialize for today's date
      if (selectedDateStr === todayStr) {
        onInitializeAttendance(navigation.data.id, selectedDateStr); // Re-enabled: default to 'absent' per new policy
      }
    }
  }, [navigation, selectedDate]);
  const [selectedHomeClassId, setSelectedHomeClassId] = useState(null);

  // Edit Grade State
  const [editingGrade, setEditingGrade] = useState(null);

  // Persist Navigation State
  React.useEffect(() => {
    const loadNavState = async () => {
      try {
        const saved = await AsyncStorage.getItem(`nav_state_${user.id}`);
        if (saved) {
          const { activeView: savedView, navigation: savedNav } = JSON.parse(saved);
          if (savedView) setActiveView(savedView);
          if (savedNav) setNavigation(savedNav);
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
        await AsyncStorage.setItem(`nav_state_${user.id}`, JSON.stringify({ activeView, navigation }));
      } catch (e) {
        console.error("State save error", e);
      }
    };
    saveNavState();
  }, [activeView, navigation]);
  const [editGradeValue, setEditGradeValue] = useState('');
  const [editGradeComment, setEditGradeComment] = useState('');
  const [editGradeType, setEditGradeType] = useState('Me Shkrim');
  const [editGradeDate, setEditGradeDate] = useState(null);

  const teacherClasses = classes.filter(c => (c.teacherIds || []).includes(user.id));

  // Helper to get merged subjects (from class link + teacher profile)
  const getAvailableSubjects = (currentClass) => {
    const classSubjects = currentClass?.subjects || [];
    const profileSubjects = user.subjects || [];
    let merged = [...new Set([...classSubjects, ...profileSubjects])];
    // Filter out generic 'Mësues' if more specific subjects exist
    if (merged.length > 1) merged = merged.filter(s => s !== 'Mësues');
    return merged.length > 0 ? merged : ['Mësues'];
  };

  const getSubjectAverage = (studentId, subject) => {
    const subjectGrades = grades.filter(g => g.student_id === studentId && g.subject === subject);
    if (subjectGrades.length === 0) return null;
    const sum = subjectGrades.reduce((acc, curr) => acc + curr.grade, 0);
    return (sum / subjectGrades.length).toFixed(1);
  };

  const getTotalAverage = (studentId) => {
    const studentGrades = grades.filter(g => g.student_id === studentId);
    if (studentGrades.length === 0) return null;
    const sum = studentGrades.reduce((acc, curr) => acc + curr.grade, 0);
    return (sum / studentGrades.length).toFixed(1);
  };

  const getSubjectIcon = (subjectName) => {
    const name = subjectName.toLowerCase();
    if (name.includes('matematik')) return <Divide size={24} color="#0d9488" />;
    if (name.includes('fizik')) return <Activity size={24} color="#7c3aed" />;
    if (name.includes('kimi')) return <FlaskConical size={24} color="#db2777" />;
    if (name.includes('biologji')) return <Activity size={24} color="#059669" />;
    if (name.includes('histori')) return <Globe size={24} color="#92400e" />;
    if (name.includes('gjeografi')) return <Globe size={24} color="#0369a1" />;
    if (name.includes('gjuhë')) return <BookIcon size={24} color="#2563eb" />;
    if (name.includes('art')) return <Palette size={24} color="#ea580c" />;
    if (name.includes('muzik')) return <Music size={24} color="#8b5cf6" />;
    if (name.includes('sport')) return <Activity size={24} color="#dc2626" />;
    if (name.includes('informatik')) return <BookIcon size={24} color="#0f172a" />;
    return <GraduationCap size={24} color="#64748b" />;
  };

  const isWeekend = (dateString) => {
    return !isSchoolDay(new Date(dateString)).isWork;
  };

  const renderHome = () => {
    const totalStudents = teacherClasses.reduce((acc, tc) => acc + getDynamicClassStudents(tc.id).length, 0);

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        {/* School Calendar Status (Holiday/Weekend) */}
        {(() => {
          const dayStatus = isSchoolDay(selectedDate);
          if (dayStatus.isWork) return null;

          return (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 20,
              backgroundColor: 'white',
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              borderStyle: 'dashed',
              marginBottom: 24,
              gap: 16
            }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={24} color="#64748b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#475569', textTransform: 'uppercase' }}>
                  {t('holiday') || 'Pushim'}
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700' }}>
                  {dayStatus.reason}
                </Text>
              </View>
            </View>
          );
        })()}
        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BookIcon size={20} color="#64748b" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{teacherClasses.length}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 4 }}>{t('classes_label') || 'Klasat'}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <GraduationCap size={20} color="#64748b" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{totalStudents}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 4 }}>{t('students_count') || 'Nxënësit'}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ gap: 16 }}>
          <TouchableOpacity
            style={styles.premiumCardAction}
            onPress={() => setNavigation({ view: 'my-classes', data: null })}
          >
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <BookIcon size={24} color="#2563eb" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{t('my_classes') === 'my_classes' ? 'Klasat e mia' : (t('my_classes') || 'Klasat e mia')}</Text>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderClassNotatGrid = (currentClass) => {
    const classStudents = students
      .filter(s => s.classId === currentClass.id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const studentIds = classStudents.map(s => s.id);

    // Filter grades by selected subject and current class students
    const subjectGrades = grades.filter(g =>
      g.subject === selectedSubject &&
      (studentIds.includes(g.student_id) || studentIds.includes(g.studentId))
    );

    // Get unique dates
    const uniqueDates = Array.from(new Set(subjectGrades.map(g => g.date))).sort((a, b) => new Date(a) - new Date(b));

    return (
      <View style={[styles.viewContainer, { paddingHorizontal: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'my-classes', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ marginLeft: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>{formatClassName(currentClass)}</Text>
            <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>{t('grades_matrix') || 'Grilja e Notave'}</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={[styles.label, { marginBottom: 12 }]}>{t('lesson_subject') || 'Lënda'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            {getAvailableSubjects(currentClass).map(subject => (
              <TouchableOpacity
                key={subject}
                style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip, { marginRight: 8 }]}
                onPress={() => setSelectedSubject(subject)}
              >
                <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedSubject ? (
          <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
              <View style={{ flex: 1 }}>
                {/* Header Row */}
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' }}>
                  <View style={{ width: 260, padding: 12, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                    <Text style={{ fontWeight: '800', color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>{t('student') || 'Nxënësi'}</Text>
                  </View>
                  {uniqueDates.map(dateStr => (
                    <View key={dateStr} style={{ width: 70, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0', backgroundColor: '#fff' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{new Date(dateStr).toLocaleDateString('sq-AL', { month: 'short' })}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e293b' }}>{new Date(dateStr).getDate()}</Text>
                    </View>
                  ))}
                </View>

                {/* Data Rows */}
                <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 120 }}>
                  {classStudents.map((student, idx) => {
                    const studentGrades = subjectGrades.filter(g => g.student_id === student.id || g.studentId === student.id);
                    return (
                      <View key={student.id} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                        <View style={{ width: 260, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: studentGrades.length === 0 ? '#fee2e2' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 11, fontWeight: '900', color: studentGrades.length === 0 ? '#ef4444' : '#64748b' }}>{studentGrades.length}</Text>
                          </View>
                          <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 13, flex: 1 }} numberOfLines={2}>{student.name}</Text>
                        </View>

                        {uniqueDates.map(dateStr => {
                          const gradeObj = studentGrades.find(g => g.date === dateStr);
                          return (
                            <View key={dateStr} style={{ width: 70, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#f1f5f9', padding: 4 }}>
                              {gradeObj ? (
                                <TouchableOpacity onPress={() => handleEditGradeClick(gradeObj)}>
                                  <GradeRing value={gradeObj.grade} size={42} />
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed' }}
                                  onPress={() => {
                                    setSelectedStudentForGrade(student);
                                    setSelectedDate(new Date(dateStr));
                                    setIsGradeModalVisible(true);
                                  }}
                                >
                                  <Plus size={18} color="#cbd5e1" />
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ClipboardList size={40} color="#cbd5e1" />
            <Text style={{ marginTop: 16, fontSize: 15, color: '#94a3b8', fontWeight: '700' }}>Ju lutem zgjidhni lëndën / Seleziona una materia</Text>
          </View>
        )}
      </View>
    );
  };

  const renderMyClasses = () => {
    const filteredClasses = teacherClasses.filter(c =>
      formatClassName(c).toLowerCase().includes(classSearchText.toLowerCase())
    );

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{t('back') || 'Mbrapsht'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: 16,
            paddingHorizontal: 16,
            height: 50,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            shadowColor: '#94a3b8',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0f172a' }}
              placeholder={t('search_classes') || 'Kërko klasën...'}
              placeholderTextColor="#94a3b8"
              value={classSearchText}
              onChangeText={setClassSearchText}
            />
            {classSearchText.length > 0 && (
              <TouchableOpacity onPress={() => setClassSearchText('')}>
                <XCircle size={20} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          data={filteredClasses}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563eb']}
              tintColor="#2563eb"
              progressViewOffset={50}
            />
          }
          alwaysBounceVertical={true}
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 20,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#94a3b8',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}>
              <View style={styles.classCardHeader}>
                <View>
                  <Text style={styles.classCardTitle}>{formatClassName(item)}</Text>
                  <Text style={styles.classCardSubtitle}>
                    {getDynamicClassStudents(item.id).length} {t('students_count') || 'Nxënësit'}
                  </Text>
                </View>
              </View>

              <View style={styles.classActionGrid}>


                <TouchableOpacity
                  style={[styles.classActionButton, { backgroundColor: '#f5f3ff' }]}
                  onPress={() => {
                    setNavigation({ view: 'my-classes', data: item });
                    setIsLessonModalVisible(true);
                    if (item.subjects && item.subjects.length > 0) {
                      setSelectedSubject(item.subjects[0]);
                    }
                  }}
                >
                  <BookIcon size={18} color="#7c3aed" />
                  <Text style={[styles.classActionText, { color: '#7c3aed' }]} numberOfLines={1} adjustsFontSizeToFit>{t('register_lesson') || 'Regjistro Oren'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.classActionButton, { backgroundColor: '#f0fdf4' }]}
                  onPress={() => setNavigation({ view: 'class-agenda', data: item })}
                >
                  <Calendar size={18} color="#16a34a" />
                  <Text style={[styles.classActionText, { color: '#16a34a' }]} numberOfLines={1} adjustsFontSizeToFit>{t('agenda') === 'agenda' ? 'Agjenda' : (t('agenda') || 'Agjenda')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.classActionButton, { backgroundColor: '#eff6ff' }]}
                  onPress={() => setNavigation({ view: 'class-detail', data: item })}
                >
                  <ClipboardList size={18} color="#2563eb" />
                  <Text style={[styles.classActionText, { color: '#2563eb' }]} numberOfLines={1} adjustsFontSizeToFit>{t('class_registry') === 'class_registry' ? 'Regjistri' : (t('class_registry') || 'Regjistri')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.classActionButton, { backgroundColor: '#fff1f2' }]}
                  onPress={() => {
                    setSelectedActionStudent({ name: formatClassName(item), classId: item.id });
                    setIsActionModalVisible(true);
                    setActiveActionTab('note');
                    setIsClassNote(true);
                  }}
                >
                  <ShieldCheck size={18} color="#e11d48" />
                  <Text style={[styles.classActionText, { color: '#e11d48' }]} numberOfLines={1} adjustsFontSizeToFit>{t('disciplinary_note') || 'Njoftim'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.classActionButton, { backgroundColor: '#fdf4ff' }]}
                  onPress={() => {
                    setNavigation({ view: 'class-notat-grid', data: item });
                    if (item.subjects && item.subjects.length > 0) {
                      setSelectedSubject(item.subjects[0]);
                    }
                  }}
                >
                  <Award size={18} color="#c026d3" />
                  <Text style={[styles.classActionText, { color: '#c026d3' }]} numberOfLines={1} adjustsFontSizeToFit>{t('grades') || 'Notat'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.classActionButton, { backgroundColor: '#fffbeb' }]}
                  onPress={() => {
                    setNavigation({ view: 'my-classes', data: item });
                    setIsTestModalVisible(true);
                    if (item.subjects && item.subjects.length > 0) {
                      setSelectedSubject(item.subjects[0]);
                    }
                  }}
                >
                  <BookIcon size={18} color="#d97706" />
                  <Text style={[styles.classActionText, { color: '#d97706' }]} numberOfLines={1} adjustsFontSizeToFit>{t('test_exam') || 'Test/Provim'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.avatarPlaceholder, { width: 80, height: 80, borderRadius: 30 }]}>
                <BookIcon size={40} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyStateTitle}>{t('no_classes_assigned') || 'Nuk keni klasa të caktuara'}</Text>
            </View>
          )}
        />
      </View>
    );
  };


  const renderClassList = (targetView, title) => (
    <View style={styles.viewContainer}>
      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>{title || t('class_register')}</Text>
        <Text style={styles.homeSubtitle}>{t('select_class_instruction') || 'Zgjidh klasën'}</Text>
      </View>
      <FlatList
        data={teacherClasses}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
            progressViewOffset={50}
          />
        }
        alwaysBounceVertical={true}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.premiumCard}
            onPress={() => {
              setNavigation({ view: targetView, data: item });
              if (item.subjects && item.subjects.length > 0) {
                setSelectedSubject(item.subjects[0]);
              }
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{formatClassName(item)}</Text>
              <Text style={styles.cardSubtitle}>{getDynamicClassStudents(item.id).length} {t('students_count')}</Text>
            </View>
            <ChevronRight size={22} color="#2563eb" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.avatarPlaceholder, { width: 80, height: 80, borderRadius: 30 }]}>
              <BookIcon size={40} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyStateTitle}>{t('no_classes_assigned') || 'Nuk keni klasa të caktuara'}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderActionModal = () => {
    if (!selectedActionStudent) return null;

    const dateStr = gradeCustomDate || formatDate(selectedDate);
    const displayDateStr = formatDisplayDate(gradeCustomDate || selectedDate);
    const tabs = [
      { id: 'grade', label: t('student_grades'), icon: ClipboardList },
      { id: 'attendance', label: t('attendance'), icon: UserCheck },
      { id: 'justify', label: t('justify'), icon: Pencil },
      { id: 'note', label: t('disciplinary_note'), icon: ShieldCheck },
    ];


    return (
      <Modal visible={isActionModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderScroll}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{selectedActionStudent.name}</Text>
                <Text style={styles.modalSubtitle}>
                  {displayDateStr} {activeActionTab === 'attendance' && selectedAttendanceHour ? `• Ora ${selectedAttendanceHour}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setIsActionModalVisible(false);
                setTempAttendanceStatus(null);
                setSelectedAttendanceHour(null);
                setIsHourDropdownVisible(false);
                setIsMinuteDropdownVisible(false);
              }} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Tab Navigation Hidden - show only selected panel */}
            {/* 
            <View style={styles.modalTabs}>
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeActionTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.modalTab, isActive && styles.activeModalTab]}
                    onPress={() => setActiveActionTab(tab.id)}
                  >
                    <Icon size={18} color={isActive ? '#2563eb' : '#94a3b8'} />
                    <Text style={[styles.modalTabText, isActive && styles.activeModalTabText]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            */}

            {/* Date selection - moved below tabs */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>{t('registration_date')}</Text>
              <TouchableOpacity
                style={styles.premiumDatePickerField}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    document.getElementById('hidden-date-input').showPicker();
                  }
                }}
              >
                <View style={styles.premiumDatePickerContent}>
                  <Calendar size={18} color="#2563eb" />
                  <Text style={styles.premiumDatePickerText}>
                    {displayDateStr}
                  </Text>
                </View>
                {Platform.OS === 'web' && (
                  <input
                    id="hidden-date-input"
                    type="date"
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                    value={gradeCustomDate || formatDate(selectedDate)}
                    max={formatDate(new Date())}
                    onChange={(e) => {
                      const text = e.target.value;
                      const picked = new Date(text);
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);

                      if (picked <= today) {
                        setGradeCustomDate(text);
                      } else {
                        showAlert(t('future_date_error') || "Data nuk mund të jetë në të ardhmen!", 'error');
                        setGradeCustomDate(formatDate(new Date()));
                      }
                    }}
                  />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeActionTab === 'grade' && (
                <View style={{ paddingBottom: 20 }}>
                  <Text style={styles.label}>{t('lesson_subject')}</Text>
                  <View style={styles.chipGrid}>
                    {getAvailableSubjects(navigation.data).map(subject => (
                      <TouchableOpacity
                        key={subject}
                        style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip]}
                        onPress={() => setSelectedSubject(subject)}
                      >
                        <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>{t('grade_value')}</Text>
                  <View style={styles.gradeButtonGrid}>
                    {[1, 2, 3, 4, 5].map(val => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.gradeButton, gradeValue === val.toString() && styles.activeGradeButton]}
                        onPress={() => setGradeValue(val.toString())}
                      >
                        <Text style={[styles.gradeButtonText, gradeValue === val.toString() && styles.activeGradeButtonText]}>{val}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>{t('grade_type')}</Text>
                  <View style={styles.chipGrid}>
                    {[{ id: 'Me Shkrim', key: 'written' }, { id: 'Me Gojë', key: 'oral' }, { id: 'Praktikë', key: 'practical' }].map(type => (
                      <TouchableOpacity
                        key={type.id}
                        style={[styles.subjectChip, gradeType === type.id && styles.activeSubjectChip]}
                        onPress={() => setGradeType(type.id)}
                      >
                        <Text style={[styles.subjectChipText, gradeType === type.id && styles.activeSubjectChipText]}>{t(type.key)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>{t('comment')}</Text>
                  <TextInput
                    style={styles.premiumInput}
                    placeholder={t('comment_placeholder')}
                    value={gradeComment}
                    onChangeText={setGradeComment}
                  />

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, !gradeValue && { opacity: 0.5 }]}
                    disabled={!gradeValue}
                    onPress={() => {
                      const dayStatus = isSchoolDay(new Date(gradeCustomDate || selectedDate));
                      if (!dayStatus.isWork) {
                        showAlert(`${t('holiday') || 'Pushim'}: ${dayStatus.reason}`, 'error');
                        return;
                      }
                      onAddGrade({
                        studentId: selectedActionStudent.id,
                        subject: selectedSubject,
                        value: parseInt(gradeValue),
                        comment: `[${gradeType}] ${gradeComment}`.trim(),
                        date: gradeCustomDate || dateStr
                      });
                      setIsActionModalVisible(false);
                      setGradeValue('');
                      setGradeComment('');
                      setGradeType('Me Shkrim');
                      setGradeCustomDate(null);
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeActionTab === 'attendance' && (
                <View style={styles.tabContent}>
                  <Text style={styles.label}>{t('select_status')}</Text>
                  <View style={styles.chipGrid}>
                    {[
                      { id: 'present', key: 'present', color: '#10b981', icon: CheckCircle },
                      { id: 'absent', key: selectedAttendanceHour === 0 ? 'absent_unjustified' : 'absent', color: '#ef4444', icon: XCircle },
                      ...(selectedAttendanceHour === 0 ? [
                        { id: 'late', key: 'late', color: '#f59e0b', icon: Clock },
                        { id: 'early_exit', key: 'early_exit', color: '#f59e0b', icon: Clock }
                      ] : [])
                    ].map(status => {
                      const Icon = status.icon;
                      const isSelected = tempAttendanceStatus === status.id ||
                        (!tempAttendanceStatus && attendance.find(a => (a.student_id === selectedActionStudent.id || a.studentId === selectedActionStudent.id) && a.date === dateStr && parseInt(a.hour || 0) === parseInt(selectedAttendanceHour || 0))?.status === status.id);

                      return (
                        <TouchableOpacity
                          key={status.id}
                          style={[
                            styles.subjectChip,
                            { width: '48%', gap: 8, flexDirection: 'row', alignItems: 'center' },
                            isSelected && { backgroundColor: status.color + '15', borderColor: status.color }
                          ]}
                          onPress={() => {
                            setTempAttendanceStatus(status.id);
                          }}
                        >
                          <Icon size={16} color={isSelected ? status.color : '#94a3b8'} />
                          <Text style={[styles.subjectChipText, isSelected && { color: status.color }]}>{t(status.key)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {(tempAttendanceStatus === 'late' || tempAttendanceStatus === 'early_exit') && (
                    <View style={{ marginTop: 15, backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', zIndex: 100 }}>
                      <Text style={[styles.label, { marginBottom: 12 }]}>{t('entry_exit_time')}</Text>

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        {/* Hour Dropdown */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Ora</Text>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                              backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isHourDropdownVisible ? '#2563eb' : '#e2e8f0'
                            }}
                            onPress={() => { setIsHourDropdownVisible(!isHourDropdownVisible); setIsMinuteDropdownVisible(false); }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: selHour ? '#1e293b' : '#94a3b8' }}>{selHour || 'Ora'}</Text>
                            <ChevronDown size={18} color="#64748b" style={{ transform: [{ rotate: isHourDropdownVisible ? '180deg' : '0deg' }] }} />
                          </TouchableOpacity>

                          {isHourDropdownVisible && (
                            <View style={{
                              marginTop: 8, backgroundColor: 'white',
                              borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, maxHeight: 160
                            }}>
                              <ScrollView nestedScrollEnabled>
                                {['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'].map(h => (
                                  <TouchableOpacity
                                    key={h}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: selHour === h ? '#f0f7ff' : 'white' }}
                                    onPress={() => { setSelHour(h); setIsHourDropdownVisible(false); }}
                                  >
                                    <Text style={{ fontSize: 14, fontWeight: selHour === h ? '700' : '500', color: selHour === h ? '#2563eb' : '#475569' }}>{h}</Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>

                        {/* Minute Dropdown */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Minuta</Text>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                              backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isMinuteDropdownVisible ? '#2563eb' : '#e2e8f0'
                            }}
                            onPress={() => { setIsMinuteDropdownVisible(!isMinuteDropdownVisible); setIsHourDropdownVisible(false); }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: selMinute ? '#1e293b' : '#94a3b8' }}>{selMinute || 'Min'}</Text>
                            <ChevronDown size={18} color="#64748b" style={{ transform: [{ rotate: isMinuteDropdownVisible ? '180deg' : '0deg' }] }} />
                          </TouchableOpacity>

                          {isMinuteDropdownVisible && (
                            <View style={{
                              marginTop: 8, backgroundColor: 'white',
                              borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, maxHeight: 160
                            }}>
                              <ScrollView nestedScrollEnabled>
                                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                  <TouchableOpacity
                                    key={m}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: selMinute === m ? '#f0f7ff' : 'white' }}
                                    onPress={() => { setSelMinute(m); setIsMinuteDropdownVisible(false); }}
                                  >
                                    <Text style={{ fontSize: 14, fontWeight: selMinute === m ? '700' : '500', color: selMinute === m ? '#2563eb' : '#475569' }}>{m}</Text>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={{ marginTop: 16, alignItems: 'center', backgroundColor: '#eff6ff', paddingVertical: 8, borderRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1e40af' }}>{selHour && selMinute ? `${selHour}:${selMinute}` : '--:--'}</Text>
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, (!tempAttendanceStatus || (['late', 'early_exit'].includes(tempAttendanceStatus) && (!selHour || !selMinute))) && { opacity: 0.5 }]}
                    disabled={!tempAttendanceStatus || (['late', 'early_exit'].includes(tempAttendanceStatus) && (!selHour || !selMinute)) || isAttendanceSaving}
                    onPress={async () => {
                      const dayStatus = isSchoolDay(new Date(gradeCustomDate || selectedDate));
                      if (!dayStatus.isWork) {
                        showAlert(`${t('holiday') || 'Pushim'}: ${dayStatus.reason}`, 'error');
                        return;
                      }

                      setIsAttendanceSaving(true);
                      const finalTime = (tempAttendanceStatus === 'late' || tempAttendanceStatus === 'early_exit') ? `${selHour}:${selMinute}` : '';
                      const result = await onToggleAttendance(
                        selectedActionStudent.id,
                        formatDate(selectedDate),
                        tempAttendanceStatus,
                        selectedAttendanceHour,
                        finalTime
                      );
                      setIsAttendanceSaving(false);

                      if (result?.error) {
                        showAlert(result.error.message, 'error');
                      } else {
                        // Close the action modal
                        setIsActionModalVisible(false);
                        setTempAttendanceStatus(null);
                        setAttendanceTime('');
                        setIsHourDropdownVisible(false);
                        setIsMinuteDropdownVisible(false);

                        // If this was an hourly record (hour > 0), check what the daily status became
                        // If it's late or early_exit, show time modal to collect the time
                        if (selectedAttendanceHour && selectedAttendanceHour > 0) {
                          const newDaily = computeNewDailyStatus(
                            selectedActionStudent.id,
                            formatDate(selectedDate),
                            selectedAttendanceHour,
                            tempAttendanceStatus
                          );
                          if (newDaily === 'late' || newDaily === 'early_exit') {
                            setPendingTimeType(newDaily);
                            setPendingTimeStudentId(selectedActionStudent.id);
                            setPendingTimeDate(formatDate(selectedDate));
                            setTimeModalSelHour('');
                            setTimeModalSelMinute('');
                            setIsTimeModalHourDropdown(false);
                            setIsTimeModalMinuteDropdown(false);
                            setIsTimeModalVisible(true);
                          }
                        }
                        setSelectedAttendanceHour(null);
                      }
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>
                      {isAttendanceSaving ? '...' : t('save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeActionTab === 'note' && (
                <View style={styles.tabContent}>
                  <Text style={styles.label}>{t('disciplinary_note')}</Text>
                  <TextInput
                    style={[styles.premiumInput, { height: 120, textAlignVertical: 'top' }]}
                    placeholder={t('note_placeholder')}
                    multiline
                    value={noteText}
                    onChangeText={setNoteText}
                  />

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 }}
                    onPress={() => setIsClassNote(!isClassNote)}
                  >
                    <View style={[
                      { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
                      isClassNote && { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                    ]}>
                      {isClassNote && <CheckCircle size={14} color="white" />}
                    </View>
                    <Text style={{ fontSize: 15, color: '#475569', fontWeight: '600' }}>{t('vlen_per_klase')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, { backgroundColor: '#dc2626' }, !noteText && { opacity: 0.5 }]}
                    disabled={!noteText}
                    onPress={async () => {
                      const dayStatus = isSchoolDay(new Date(gradeCustomDate || selectedDate));
                      if (!dayStatus.isWork) {
                        showAlert(`${t('holiday') || 'Pushim'}: ${dayStatus.reason}`, 'error');
                        return;
                      }

                      if (onAddNote) {
                        const result = await onAddNote({
                          studentId: isClassNote ? null : selectedActionStudent.id,
                          classId: selectedActionStudent.classId,
                          content: noteText,
                          isClassNote: isClassNote,
                          date: dateStr
                        });
                        if (result?.error) {
                          showAlert(result.error.message || 'Errore nel salvare la nota', 'error');
                          return;
                        } else {
                          showAlert(t('note_saved') || 'Nota salvata!', 'success');
                        }
                      }
                      setIsActionModalVisible(false);
                      setNoteText('');
                      setIsClassNote(false);
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>{t('save_note')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeActionTab === 'justify' && (
                <View style={styles.tabContent}>
                  <Text style={styles.label}>{t('attendance_to_justify')}</Text>

                  {Array.from(new Set(attendance
                    .filter(a => (a.student_id === selectedActionStudent.id || a.studentId === selectedActionStudent.id) && !a.status.includes('present') && !a.status.includes('justified'))
                    .map(a => a.date)
                  ))
                    .sort((a, b) => new Date(b) - new Date(a))
                    .slice(0, 5)
                    .map(dateStr => {
                      const isSelected = selectedDateToJustify === dateStr;
                      return (
                        <TouchableOpacity
                          key={dateStr}
                          style={[
                            styles.premiumActionCard,
                            { marginBottom: 8, borderColor: isSelected ? '#2563eb' : '#f1f5f9', backgroundColor: isSelected ? '#eff6ff' : 'white' }
                          ]}
                          onPress={() => {
                            setSelectedDateToJustify(dateStr);
                            setJustifyReason('');
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                              <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{reformatDate(dateStr)}</Text>
                              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('absence_of_day') || "Mungesë ditore"}</Text>
                            </View>
                            <ChevronRight size={18} color={isSelected ? '#2563eb' : '#cbd5e1'} />
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                  {selectedDateToJustify && (
                    <View style={{ marginTop: 20, padding: 16, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={styles.label}>{t('justification_reason')}</Text>
                      <TextInput
                        style={[styles.premiumInput, { height: 80, textAlignVertical: 'top' }]}
                        placeholder={t('enter_reason_placeholder')}
                        value={justifyReason}
                        onChangeText={setJustifyReason}
                        multiline
                      />
                      <TouchableOpacity
                        style={[styles.premiumSubmitButton, !justifyReason && { opacity: 0.5 }]}
                        disabled={!justifyReason}
                        onPress={async () => {
                          const result = await onJustifyAttendance(selectedActionStudent.id, selectedDateToJustify, justifyReason);
                          if (!result?.error) {
                            showAlert(t('attendance_justified_success'), 'success');
                            setSelectedDateToJustify(null);
                            setJustifyReason('');
                          } else {
                            showAlert(result.error.message || 'Error', 'error');
                          }
                        }}
                      >
                        <Text style={styles.premiumSubmitButtonText}>{t('confirm')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {attendance.filter(a => (a.student_id === selectedActionStudent.id || a.studentId === selectedActionStudent.id) && !a.status.includes('present') && !a.status.includes('justified')).length === 0 && (
                    <View style={styles.emptyStateContainer}>
                      <CheckCircle size={40} color="#10b981" opacity={0.3} />
                      <Text style={styles.emptyStateSubtitle}>{t('no_unjustified_absences')}</Text>
                    </View>
                  )}
                </View>
              )}

              {activeActionTab === 'lesson' && (
                <View style={styles.tabContent}>
                  <Text style={styles.label}>{t('lesson_subject')}</Text>
                  <View style={styles.chipGrid}>
                    {getAvailableSubjects(navigation.data).map(subject => (
                      <TouchableOpacity
                        key={subject}
                        style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip]}
                        onPress={() => setSelectedSubject(subject)}
                      >
                        <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>{t('hour')}</Text>
                  <View style={styles.gradeButtonGrid}>
                    {['1', '2', '3', '4', '5', '6', '7'].map(hour => (
                      <TouchableOpacity
                        key={hour}
                        style={[styles.gradeButton, { flex: 1 }, lessonHour === hour && styles.activeGradeButton]}
                        onPress={() => setLessonHour(hour)}
                      >
                        <Text style={[styles.gradeButtonText, lessonHour === hour && styles.activeGradeButtonText]}>{hour}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>{t('lesson_topic')}</Text>
                  <TextInput
                    style={styles.premiumInput}
                    placeholder={t('lesson_topic_placeholder')}
                    value={lessonTopic}
                    onChangeText={setLessonTopic}
                  />

                  <Text style={styles.label}>{t('homework')}</Text>
                  <TextInput
                    style={styles.premiumInput}
                    placeholder={t('homework_placeholder')}
                    value={lessonHomework}
                    onChangeText={setLessonHomework}
                  />

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, !lessonTopic && { opacity: 0.5 }, { marginTop: 16 }]}
                    disabled={!lessonTopic}
                    onPress={async () => {
                      const finalTopic = `[Ora ${lessonHour}] ${lessonTopic}`.trim();
                      const finalDate = lessonDate || formatDate(selectedDate);
                      
                      if (editingLesson) {
                        const oldHourMatch = editingLesson.topic?.match(/\[Ora (\d+)\]/);
                        const oldHour = oldHourMatch ? parseInt(oldHourMatch[1]) : null;
                        
                        await onUpdateLesson(editingLesson.id, {
                          classId: editingLesson.class_id,
                          subject: selectedSubject,
                          topic: finalTopic,
                          date: finalDate,
                        }, oldHour);
                      } else {
                        await onAddLesson({
                          classId: currentClass.id,
                          subject: selectedSubject,
                          topic: finalTopic,
                          homework: lessonHomework,
                          isTest: false,
                          date: finalDate,
                          teacherId: user.id
                        });
                      }
                      
                      setIsLessonModalVisible(false);
                      setEditingLesson(null);
                      setLessonTopic('');
                      setLessonHomework('');
                      setLessonDate(null);
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderLessonForm = (currentClass) => {
    if (!currentClass) return null;
    return (
      <Modal visible={isLessonModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderScroll}>
              <View>
                <Text style={styles.modalTitleEmphasized}>
                  {editingLesson ? t('edit_lesson') || 'Modifiko Orën' : t('register_lesson')}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {formatClassName(currentClass || editingLesson?.class_id)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setIsLessonModalVisible(false);
                setEditingLesson(null);
                setLessonTopic('');
                setLessonHomework('');
              }} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 24 }}>
                <Text style={styles.label}>{t('zgjidh_daten') || 'Zgjidh datën'}</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: '#e2e8f0',
                    gap: 12
                  }}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      document.getElementById('lesson-date-input').showPicker();
                    }
                  }}
                >
                  <Calendar size={20} color="#2563eb" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>
                    {formatDisplayDate(lessonDate || selectedDate)}
                  </Text>

                  {Platform.OS === 'web' && (
                    <input
                      id="lesson-date-input"
                      type="date"
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                      value={lessonDate || formatDate(selectedDate)}
                      onChange={(e) => {
                        const text = e.target.value;
                        const picked = new Date(text);
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);

                        if (picked <= today) {
                          setLessonDate(text);
                        } else {
                          showAlert(t('future_date_error') || "Data nuk mund të jetë në të ardhmen!", 'error');
                          setLessonDate(formatDate(new Date()));
                        }
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.label}>{t('lesson_subject')}</Text>
                <View style={styles.chipGrid}>
                  {getAvailableSubjects(currentClass).map(subject => (
                    <TouchableOpacity
                      key={subject}
                      style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip]}
                      onPress={() => setSelectedSubject(subject)}
                    >
                      <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{t('hour')}</Text>
                <View style={styles.gradeButtonGrid}>
                  {['1', '2', '3', '4', '5', '6', '7'].map(hour => {
                    const occupied = getOccupiedHours(currentClass.id, lessonDate || formatDate(selectedDate));
                    const isOccupied = occupied.includes(hour);
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.gradeButton, { flex: 1 },
                          lessonHour === hour && styles.activeGradeButton,
                          isOccupied && { backgroundColor: '#f1f5f9', opacity: 0.5 }
                        ]}
                        disabled={isOccupied}
                        onPress={() => setLessonHour(hour)}
                      >
                        <Text style={[
                          styles.gradeButtonText,
                          lessonHour === hour && styles.activeGradeButtonText,
                          isOccupied && { color: '#94a3b8' }
                        ]}>{hour}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>{t('lesson_topic')}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('lesson_topic_placeholder')}
                  value={lessonTopic}
                  onChangeText={setLessonTopic}
                />

                <Text style={styles.label}>{t('homework')}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('homework_placeholder')}
                  value={lessonHomework}
                  onChangeText={setLessonHomework}
                />

                <TouchableOpacity
                  style={[styles.premiumSubmitButton, !lessonTopic && { opacity: 0.5 }, { marginTop: 16 }]}
                  disabled={!lessonTopic}
                  onPress={() => {
                    const dayStatus = isSchoolDay(new Date(lessonDate || selectedDate));
                    if (!dayStatus.isWork) {
                      showAlert(`${t('holiday') || 'Pushim'}: ${dayStatus.reason}`, 'error');
                      return;
                    }
                    onAddLesson({
                      classId: currentClass.id,
                      subject: selectedSubject,
                      topic: `[Ora ${lessonHour}] ${lessonTopic}`,
                      homework: lessonHomework,
                      isTest: false,
                      date: lessonDate || formatDate(selectedDate),
                      teacherId: user.id
                    });
                    setIsLessonModalVisible(false);
                    setLessonTopic('');
                    setLessonHomework('');
                    setLessonDate(null);
                  }}
                >
                  <Text style={styles.premiumSubmitButtonText}>{t('save_lesson')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTestRegistrationModal = (currentClass) => {
    if (!currentClass) return null;
    return (
      <Modal visible={isTestModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderScroll}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{t('regjistro_test_provim') || 'Regjistro Test/Provim'}</Text>
                <Text style={styles.modalSubtitle}>{formatClassName(currentClass)}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTestModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 24 }}>
                <Text style={styles.label}>{t('zgjidh_daten') || 'Zgjidh datën'}</Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1.5,
                    borderColor: '#e2e8f0',
                    gap: 12
                  }}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      document.getElementById('test-date-input').showPicker();
                    }
                  }}
                >
                  <Calendar size={20} color="#f43f5e" />
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}>
                    {formatDisplayDate(lessonDate || selectedDate)}
                  </Text>

                  {Platform.OS === 'web' && (
                    <input
                      id="test-date-input"
                      type="date"
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                      value={lessonDate || formatDate(selectedDate)}
                      onChange={(e) => setLessonDate(e.target.value)}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.label}>{t('lesson_subject')}</Text>
                <View style={styles.chipGrid}>
                  {getAvailableSubjects(currentClass).map(subject => (
                    <TouchableOpacity
                      key={subject}
                      style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip, selectedSubject === subject && { backgroundColor: '#f43f5e', borderColor: '#f43f5e' }]}
                      onPress={() => setSelectedSubject(subject)}
                    >
                      <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{t('test_description') || 'Përshkrimi i testit'}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('test_description_placeholder') || 'Psh: Provim i dytë periodik...'}
                  value={testDescription}
                  onChangeText={setTestDescription}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.premiumSubmitButton, !testDescription && { opacity: 0.5 }, { backgroundColor: '#f43f5e', marginTop: 20 }]}
                  disabled={!testDescription}
                  onPress={async () => {
                    const dateToUse = lessonDate || formatDate(selectedDate);
                    const dayStatus = isSchoolDay(new Date(dateToUse));
                    if (!dayStatus.isWork) {
                      showAlert(`${t('holiday') || 'Pushim'}: ${dayStatus.reason}`, 'error');
                      return;
                    }
                    await onAddTest({
                      classId: currentClass.id,
                      subject: selectedSubject,
                      date: dateToUse,
                      description: testDescription
                    });
                    setIsTestModalVisible(false);
                    setTestDescription('');
                    setLessonDate(null);
                  }}
                >
                  <Text style={styles.premiumSubmitButtonText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEditLessonModal = () => {
    if (!editLessonData) return null;
    return (
      <Modal visible={isEditLessonModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderScroll}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{t('edit_lesson') || 'Ndrysho Orën'}</Text>
                <Text style={styles.modalSubtitle}>{editLessonData.subject}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditLessonModalVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View>
                <Text style={styles.label}>{t('hour')}</Text>
                <View style={styles.gradeButtonGrid}>
                  {['1', '2', '3', '4', '5', '6', '7'].map(hour => {
                    const topicParts = editLessonData.topic?.match(/^\[Ora (\d+)\]/);
                    const originalHour = topicParts ? topicParts[1] : null;

                    const occupied = getOccupiedHours(editLessonData.class_id || editLessonData.classId, editLessonData.date);
                    // An hour is considered blocked if it's occupied AND it's not the original hour of this lesson
                    const isBlocked = occupied.includes(hour) && hour !== originalHour;

                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.gradeButton, { flex: 1 },
                          lessonHour === hour && styles.activeGradeButton,
                          isBlocked && { backgroundColor: '#f1f5f9', opacity: 0.5 }
                        ]}
                        disabled={isBlocked}
                        onPress={() => setLessonHour(hour)}
                      >
                        <Text style={[
                          styles.gradeButtonText,
                          lessonHour === hour && styles.activeGradeButtonText,
                          isBlocked && { color: '#94a3b8' }
                        ]}>{hour}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>{t('lesson_topic')}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('lesson_topic_placeholder')}
                  value={lessonTopic}
                  onChangeText={setLessonTopic}
                />

                <Text style={styles.label}>{t('homework')}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('homework_placeholder')}
                  value={lessonHomework}
                  onChangeText={setLessonHomework}
                />

                <TouchableOpacity
                  style={[styles.premiumSubmitButton, (isUpdating || !lessonTopic) && { opacity: 0.5 }, { marginTop: 20 }]}
                  disabled={isUpdating || !lessonTopic}
                  onPress={async () => {
                    setIsUpdating(true);

                    // Check if hour changed to migrate attendance
                    const topicParts = editLessonData.topic?.match(/^\[Ora (\d+)\]/);
                    const originalHour = topicParts ? topicParts[1] : null;

                    if (originalHour && lessonHour !== originalHour) {
                      await onUpdateAttendanceHour(
                        editLessonData.class_id || editLessonData.classId,
                        editLessonData.date,
                        parseInt(originalHour),
                        parseInt(lessonHour)
                      );
                    }

                    const result = await onUpdateLesson(editLessonData.id, {
                      topic: `[Ora ${lessonHour}] ${lessonTopic}`
                    });

                    setIsUpdating(false);

                    if (result?.error) {
                      showAlert(result.error.message, 'error');
                    } else {
                      showAlert(t('lesson_updated_success') || 'Ora u përditësua me sukses!', 'success');
                      setIsEditLessonModalVisible(false);
                      setEditLessonData(null);
                      setLessonTopic('');
                      setLessonHomework('');
                    }
                  }}
                >
                  <Text style={styles.premiumSubmitButtonText}>{isUpdating ? (t('saving') || 'Duke ruajtur...') : (t('save_changes') || 'Ruaj Ndryshimet')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const confirmDelete = (msg, callback) => {
    setConfirmState({
      visible: true,
      message: msg,
      onConfirm: callback
    });
  };

  const renderConfirmModal = () => (
    <Modal visible={confirmState.visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModal}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#fff1f2', marginBottom: 20 }]}>
            <AlertTriangle size={28} color="#ef4444" />
          </View>
          <Text style={styles.confirmTitle}>{t('confirm_action') || 'Konfirmoni Veprimin'}</Text>
          <Text style={styles.confirmMessage}>{confirmState.message}</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={[styles.confirmButton, styles.cancelButton]}
              onPress={() => setConfirmState({ ...confirmState, visible: false })}
            >
              <Text style={styles.cancelButtonText}>{t('cancel') || 'Anulo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, styles.deleteButton]}
              onPress={async () => {
                if (confirmState.onConfirm) {
                  await confirmState.onConfirm();
                }
                setConfirmState({ ...confirmState, visible: false });
              }}
            >
              <Text style={styles.deleteButtonText}>{t('confirm') || 'Konfirmo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderStudentSelection = (currentClass) => {
    const classStudents = getDynamicClassStudents(currentClass.id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const dateStr = formatDate(selectedDate);
    const isToday = dateStr === formatDate(new Date());

    // Lesson hours registered for this class on the selected date
    const dayLessons = lessons
      .filter(l => (l.class_id === currentClass.id || l.classId === currentClass.id) && l.date === dateStr);

    const allHours = [1, 2, 3, 4, 5, 6, 7].filter(h => dayLessons.some(l => l.topic?.includes(`[Ora ${h}]`)));

    const getStatusForHour = (studentId, hour) => {
      const record = attendance.find(a =>
        (a.student_id === studentId || a.studentId === studentId) &&
        a.date === dateStr &&
        parseInt(a.hour) === parseInt(hour)
      );
      if (!record) {
        // PER POLICY: Hour 0 (Daily Summary) defaults to 'absent' for Today
        if (parseInt(hour) === 0 && isToday) return 'absent';
        return 'none';
      }
      return record.status?.split(':')[0];
    };

    const getLessonForHour = (hour) => {
      return dayLessons.find(l => l.topic?.includes(`[Ora ${hour}]`));
    };

    const canEditHour = (hour) => {
      if (user.role === 'admin') return true;
      const lesson = getLessonForHour(hour);
      return lesson && lesson.teacher_id === user.id;
    };

    const StatusCell = ({ status, isLocked }) => {
      if (isLocked && status === 'none') return <Lock size={14} color="#cbd5e1" />;
      if (status === 'present') return <Text style={{ fontSize: 16, fontWeight: '900', color: '#16a34a' }}>P</Text>;
      if (status === 'absent' || status === 'absent_unjustified' || status === 'absent_justified') return <Text style={{ fontSize: 16, fontWeight: '900', color: '#ef4444' }}>M</Text>;
      if (status?.startsWith('late')) return <Text style={{ fontSize: 16, fontWeight: '900', color: '#d97706' }}>V</Text>;
      if (status?.startsWith('early')) return <Text style={{ fontSize: 16, fontWeight: '900', color: '#ea580c' }}>D</Text>;
      return <Text style={{ fontSize: 18, color: '#e2e8f0', fontWeight: '300' }}>·</Text>;
    };

    const rowBtns = [
      { icon: ClipboardList, label: 'Notën', color: '#2563eb', bg: '#eff6ff', tab: 'grade', extra: () => { } },
      { icon: UserCheck, label: 'Praninë', color: '#16a34a', bg: '#f0fdf4', tab: 'attendance', extra: () => { } },
      { icon: ShieldCheck, label: 'Disiplinë', color: '#dc2626', bg: '#fff1f2', tab: 'note', extra: () => setIsClassNote(false) },
      { icon: Pencil, label: 'Justifiko', color: '#7c3aed', bg: '#f5f3ff', tab: 'justify', extra: () => { } },
    ];

    const sel = selectedRegistryStudent;

    return (
      <View style={[styles.viewContainer, { flex: 1 }]}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, position: 'relative', justifyContent: 'center', minHeight: 70 }}>
          <TouchableOpacity style={[styles.glassBackButton, { position: 'absolute', left: 20, zIndex: 10 }]} onPress={() => setNavigation({ view: 'my-classes', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 4 }}>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.8, textAlign: 'center', lineHeight: 30 }}>{formatClassName(currentClass)}</Text>
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
              <View style={{ backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: 'white', letterSpacing: 0.4 }}>{formatDisplayDate(selectedDate)}</Text>
              </View>
              {isToday && currentHour && (
                <View style={{ backgroundColor: '#16a34a', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: 'white' }}>Ora {currentHour}</Text>
                </View>
              )}
              {/* Rest Day Toggle */}
              {(() => {
                const dateStrSelected = formatDate(selectedDate);
                const holidayEvent = (schoolCalendar || []).find(e => e.school_id === user.school_id && e.date === dateStrSelected && e.type === 'holiday');

                return (
                  <TouchableOpacity
                    style={{
                      backgroundColor: holidayEvent ? '#ef4444' : '#f1f5f9',
                      borderRadius: 20,
                      paddingHorizontal: 14,
                      paddingVertical: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: holidayEvent ? '#dc2626' : '#e2e8f0'
                    }}
                    onPress={async () => {
                      if (holidayEvent) {
                        const res = await onUndoRestDay(user.school_id, currentClass.id, dateStrSelected);
                        if (res.success) showAlert(t('undo_rest_day') || 'Ditë normale e punës', 'success');
                      } else {
                        const res = await onMarkDayAsRest(user.school_id, currentClass.id, dateStrSelected);
                        if (res.success) showAlert(t('absences_annulled') || 'Mungesat u anulluan!', 'success');
                      }
                    }}
                  >
                    <Calendar size={12} color={holidayEvent ? 'white' : '#64748b'} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: holidayEvent ? 'white' : '#64748b' }}>
                      {holidayEvent ? (t('undo_rest_day') || 'Hiq Ripuso') : (t('mark_as_rest') || 'Riposo')}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        </View>

        {/* Action Toolbar */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          {sel ? (
            <View style={{ backgroundColor: '#eff6ff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700' }}>Studenti i zgjedhur</Text>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e3a8a' }} numberOfLines={1}>{sel.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedRegistryStudent(null)} style={{ padding: 8, borderRadius: 14, backgroundColor: '#dbeafe' }}>
                  <X size={18} color="#2563eb" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {rowBtns.map(btn => {
                  const Icon = btn.icon;
                  const itemWidth = showHourlyAttendance ? '23.5%' : '48%'; // Adapt width if showing more/less
                  const isSmall = Dimensions.get('window').width < 600;

                  return (
                    <TouchableOpacity
                      key={btn.tab}
                      style={{
                        flex: isSmall ? undefined : 1,
                        width: isSmall ? '48%' : undefined,
                        height: 60,
                        borderRadius: 18,
                        backgroundColor: btn.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        shadowColor: btn.color,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2
                      }}
                      onPress={() => {
                        setSelectedActionStudent(sel);
                        setIsActionModalVisible(true);
                        setActiveActionTab(btn.tab);
                        btn.extra();
                      }}
                    >
                      <Icon size={18} color={btn.color} />
                      <Text style={{ fontSize: 10, fontWeight: '900', color: btn.color, textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>{btn.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 12, borderStyle: 'dashed' }}>
              <Users size={20} color="#94a3b8" />
              <Text style={{ color: '#94a3b8', fontSize: 15, fontWeight: '600', fontStyle: 'italic' }}>Klikoni mbi emrin e nxënësit për veprime</Text>
            </View>
          )}
        </View>

        {/* Full-width Registry Grid */}
        <View style={{ flex: 1, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false} contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ flex: 1 }}>
              {/* Table Header */}
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#f8fafc' }}>
                <View style={{ width: 260, padding: 16, justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' }}>
                  <Text style={{ fontWeight: '800', color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Nxënësi</Text>
                </View>
                <View style={{ width: 130, padding: 16, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0', backgroundColor: '#fdfcfe', flexDirection: 'row', gap: 8 }}>
                  <Text style={{ fontWeight: '900', color: '#7c3aed', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 }}>Gjendja ditore</Text>
                  {allHours.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowHourlyAttendance(!showHourlyAttendance)}
                      style={{ padding: 4, borderRadius: 6, backgroundColor: '#f5f3ff' }}
                    >
                      {showHourlyAttendance ? <XCircle size={14} color="#7c3aed" /> : <Plus size={14} color="#7c3aed" />}
                    </TouchableOpacity>
                  )}
                </View>
                {showHourlyAttendance && allHours.map((hour) => {
                  const hasLesson = getLessonForHour(hour);
                  const isMine = hasLesson && hasLesson.teacher_id === user.id;

                  return (
                    <View key={hour} style={{ width: 68, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRightWidth: 1, borderRightColor: '#f1f5f9', backgroundColor: hasLesson ? '#fff' : '#f8fafc' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: hasLesson ? '#2563eb' : '#94a3b8', marginBottom: 2 }}>ORA</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: hasLesson ? '#1e293b' : '#cbd5e1' }}>{hour}</Text>
                      
                      {isMine && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <TouchableOpacity 
                            style={{ padding: 4, borderRadius: 6, backgroundColor: '#f0f7ff' }}
                            onPress={() => {
                              const cleanTopic = hasLesson.topic?.replace(/\[Ora \d+\]/, '').trim();
                              setEditingLesson(hasLesson);
                              setLessonHour(hour.toString());
                              setSelectedSubject(hasLesson.subject);
                              setLessonTopic(cleanTopic);
                              // Find if there's homework for this lesson/date
                              const hw = homework.find(h => h.class_id === hasLesson.class_id && h.due_date === hasLesson.date && h.subject === hasLesson.subject);
                              setLessonHomework(hw?.description || '');
                              setIsLessonModalVisible(true);
                            }}
                          >
                            <Pencil size={12} color="#2563eb" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{ padding: 4, borderRadius: 6, backgroundColor: '#fff1f2' }}
                            onPress={() => {
                              Alert.alert(
                                t('delete_lesson') || 'Fshi Orën',
                                t('confirm_delete_lesson') || 'A jeni të sigurt që dëshironi të fshini këtë orë? Kjo do të fshijë edhe të dhënat e prezencës për këtë orë.',
                                [
                                  { text: t('cancel'), style: 'cancel' },
                                  { text: t('delete'), style: 'destructive', onPress: () => onDeleteLesson(hasLesson.id, hasLesson.date, hasLesson.class_id, parseInt(hour)) }
                                ]
                              );
                            }}
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Rows */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {classStudents.map((student, idx) => {
                  const isSelected = sel?.id === student.id;
                  const dailyStatus = getStatusForHour(student.id, 0);

                  return (
                    <TouchableOpacity
                      key={student.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedRegistryStudent(isSelected ? null : student)}
                      style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: isSelected ? '#eff6ff' : (idx % 2 === 0 ? 'white' : '#fafafa') }}
                    >
                      {/* Name Column */}
                      <View style={{ width: 260, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderRightWidth: 1, borderRightColor: isSelected ? '#bfdbfe' : '#e2e8f0' }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isSelected ? '#2563eb' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: isSelected ? 'white' : '#64748b' }}>{idx + 1}</Text>
                        </View>
                        <Text style={{ fontWeight: '800', color: isSelected ? '#1e40af' : '#1e293b', fontSize: 14, flex: 1 }} numberOfLines={1}>{student.name}</Text>
                      </View>

                      {/* TASHMË Status Column (Merged Daily/Now) */}
                      <View
                        style={{ width: 130, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#e2e8f0' }}
                      >
                        <View style={{
                          width: '88%',
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: dailyStatus === 'present' ? '#dcfce7' : (dailyStatus.startsWith('absent') ? '#fee2e2' : (dailyStatus !== 'none' ? '#fef3c7' : '#f1f5f9')),
                          borderWidth: 2,
                          borderColor: dailyStatus === 'present' ? '#22c55e' : (dailyStatus.startsWith('absent') ? '#ef4444' : (dailyStatus !== 'none' ? '#f59e0b' : '#e2e8f0')),
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: 6,
                          shadowColor: dailyStatus === 'present' ? '#16a34a' : (dailyStatus.startsWith('absent') ? '#dc2626' : (dailyStatus !== 'none' ? '#d97706' : '#94a3b8')),
                          shadowOffset: { width: 0, height: dailyStatus !== 'none' ? 3 : 1 },
                          shadowOpacity: dailyStatus !== 'none' ? 0.2 : 0.05,
                          shadowRadius: 4,
                          elevation: dailyStatus !== 'none' ? 3 : 1
                        }}>
                          <Text style={{
                            fontSize: 12,
                            fontWeight: '900',
                            color: dailyStatus === 'present' ? '#15803d' : (dailyStatus.startsWith('absent') ? '#b91c1c' : (dailyStatus !== 'none' ? '#b45309' : '#64748b')),
                            textTransform: 'uppercase',
                            letterSpacing: 0.8
                          }}>
                            {dailyStatus === 'none' ? '—' : t(dailyStatus)}
                          </Text>
                        </View>
                      </View>

                      {/* Hourly Cells */}
                      {showHourlyAttendance && allHours.map((hour) => {
                        const status = getStatusForHour(student.id, hour);
                        const isLocked = !canEditHour(hour);
                        const hasLesson = getLessonForHour(hour);

                        const bgColor =
                          status === 'present' ? '#f0fdf4' :
                            status?.startsWith('absent') ? '#fef2f2' :
                              status?.startsWith('late') ? '#fffbeb' :
                                status?.startsWith('early') ? '#fff7ed' : (hasLesson ? 'white' : '#f8fafc');

                        return (
                          <TouchableOpacity
                            key={hour}
                            disabled={isLocked}
                            style={{
                              width: 68,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRightWidth: 1,
                              borderRightColor: '#f1f5f9',
                              paddingVertical: 12,
                              opacity: isLocked ? 0.6 : 1
                            }}
                            onPress={() => {
                              setSelectedActionStudent(student);
                              setActiveActionTab('attendance');
                              setSelectedAttendanceHour(hour);
                              const initialStatus = status !== 'none' ? status.split(':')[0] : null;
                              const timePart = (status.includes(':') && status.split(':').length >= 2) ? status.split(':').slice(1).join(':') : '';
                              setTempAttendanceStatus(initialStatus);
                              if (timePart.includes(':')) {
                                const [h, m] = timePart.split(':');
                                setSelHour(h || '');
                                setSelMinute(m || '');
                              } else {
                                setSelHour('');
                                setSelMinute('');
                              }
                              setIsActionModalVisible(true);
                            }}
                          >
                            <View style={{
                              width: 42,
                              height: 42,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: bgColor,
                              borderWidth: 1,
                              borderColor: status && status !== 'none' ? '#e2e8f0' : (isLocked ? '#f1f5f9' : 'transparent'),
                              borderStyle: isLocked && status === 'none' ? 'dashed' : 'solid'
                            }}>
                              {status === 'none' && !isLocked ? (
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' }} />
                              ) : (
                                <StatusCell status={status} isLocked={isLocked} />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderSubjectSelection = (data) => {
    const totalAvg = getTotalAverage(data.student.id);
    const overallColors = totalAvg ? getGradeColor(totalAvg) : { bg: '#f8fafc', text: '#64748b', border: '#f1f5f9' };

    return (
      <View style={styles.viewContainer}>
        {/* Navigation Header */}
        <View style={[styles.navigationHeader, { paddingBottom: 10 }]}>
          <TouchableOpacity
            style={styles.glassBackButton}
            onPress={() => setNavigation({ view: 'notat-students', data: data.class })}
          >
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{formatClassName(data.class)}</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Student Profile Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#f1f5f9'
          }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#eff6ff',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#dbeafe'
            }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#2563eb' }}>
                {data.student.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b' }}>{data.student.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <TrendingUp size={14} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b' }}>{t('student_average')}</Text>
              </View>
            </View>
            {totalAvg && (
              <View style={{ alignItems: 'center' }}>
                <GradeRing value={totalAvg} size={65} showProgress={true} strokeWidth={6} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', marginTop: 4 }}>{t('total_avg')}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={[styles.label, { marginBottom: 12 }]}>{t('select_subject')}</Text>
        </View>

        <FlatList
          data={getAvailableSubjects(data.class)}
          keyExtractor={item => item}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563eb']}
              tintColor="#2563eb"
              progressViewOffset={50}
            />
          }
          renderItem={({ item }) => {
            const avg = getSubjectAverage(data.student.id, item);
            const grading = avg ? getGradeColor(avg) : null;

            return (
              <TouchableOpacity
                style={{
                  width: (width - 48) / 2,
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 16,
                  margin: 6,
                  borderWidth: 1,
                  borderColor: grading ? grading.border + '30' : '#f1f5f9',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => setNavigation({ view: 'notat-history', data: { ...data, subject: item } })}
              >
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: grading ? grading.bg : '#f8fafc',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  {getSubjectIcon(item)}
                </View>

                <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: '#334155', marginBottom: 12 }}>
                  {item}
                </Text>

                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: '#f8fafc',
                  paddingTop: 8
                }}>
                  <View>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>{t('average')}</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: grading ? grading.text : '#cbd5e1' }}>
                      {avg || '-.-'}
                    </Text>
                  </View>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#f8fafc',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ChevronRight size={14} color="#94a3b8" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const handleEditGradeClick = (grade) => {
    if ((grade.modification_count || 0) >= 1) {
      showAlert("Keni shfrytëzuar mundësinë tuaj të vetme për të ndryshuar këtë notë. Për ndryshime të tjera, kontaktoni administratorin e shkollës.", "info");
      return;
    }

    setEditingGrade(grade);
    setEditGradeValue(grade.grade.toString());
    setEditGradeComment((grade.description || '').replace(/^\[.*?\]\s*/, ''));
    setEditGradeType(grade.grade_type || (grade.description?.match(/^\[(.*?)\]/)?.[1] || 'Me Shkrim'));
    setEditGradeDate(grade.date);
  };

  const renderEditGradeModal = () => {
    if (!editingGrade) return null;

    return (
      <Modal visible={!!editingGrade} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.premiumActionModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{t('edit_grade')}</Text>
                <Text style={styles.modalSubtitle}>{t('nota_e_sotme')}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingGrade(null)} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Date selection for editing */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.label}>{t('date_of_grade')}</Text>
              <TouchableOpacity
                style={styles.premiumDatePickerField}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    document.getElementById('edit-grade-date-input').showPicker();
                  }
                }}
              >
                <View style={styles.premiumDatePickerContent}>
                  <Calendar size={18} color="#2563eb" />
                  <Text style={styles.premiumDatePickerText}>
                    {formatDisplayDate(editGradeDate)}
                  </Text>
                </View>
                {Platform.OS === 'web' && (
                  <input
                    id="edit-grade-date-input"
                    type="date"
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                    value={editGradeDate}
                    max={formatDate(new Date())}
                    onChange={(e) => setEditGradeDate(e.target.value)}
                  />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.tabContent}>
                <Text style={styles.label}>{t('grade_value')}</Text>
                <View style={styles.gradeButtonGrid}>
                  {[1, 2, 3, 4, 5].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.gradeButton, editGradeValue === val.toString() && styles.activeGradeButton]}
                      onPress={() => setEditGradeValue(val.toString())}
                    >
                      <Text style={[styles.gradeButtonText, editGradeValue === val.toString() && styles.activeGradeButtonText]}>{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{t('grade_type')}</Text>
                <View style={styles.chipGrid}>
                  {[{ id: 'Me Shkrim', key: 'written' }, { id: 'Me Gojë', key: 'oral' }, { id: 'Praktikë', key: 'practical' }].map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.subjectChip, editGradeType === type.id && styles.activeSubjectChip]}
                      onPress={() => setEditGradeType(type.id)}
                    >
                      <Text style={[styles.subjectChipText, editGradeType === type.id && styles.activeSubjectChipText]}>{t(type.key)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>{t('comment')}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('comment_placeholder')}
                  value={editGradeComment}
                  onChangeText={setEditGradeComment}
                />

                <TouchableOpacity
                  style={[styles.premiumSubmitButton, !editGradeValue && { opacity: 0.5 }]}
                  disabled={!editGradeValue}
                  onPress={async () => {
                    const result = await onUpdateGrade(
                      editingGrade.id,
                      parseInt(editGradeValue),
                      `[${editGradeType}] ${editGradeComment}`.trim(),
                      editGradeType,
                      editGradeDate
                    );

                    if (result.error) {
                      showAlert(result.error.message, 'error');
                    } else {
                      showAlert(t('grade_updated_success') || "Nota u përditësua me sukses!", 'success');
                      setEditingGrade(null);
                    }
                  }}
                >
                  <Text style={styles.premiumSubmitButtonText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderGradeHistory = (data) => {
    const history = grades.filter(g => g.student_id === data.student.id && g.subject === data.subject);

    const average = history.length > 0
      ? (history.reduce((acc, curr) => acc + curr.grade, 0) / history.length).toFixed(1)
      : '0.0';

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'notat-subjects', data: data })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{data.student.name}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.viewTitleHeader}>{data.subject}</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={[...history].reverse()}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563eb']}
              tintColor="#2563eb"
              progressViewOffset={50}
            />
          }
          renderItem={({ item }) => {
            const gradeColors = getGradeColor(item.grade);
            const legacyParts = item.description?.match(/^\[(.*?)\] (.*)/);
            const gradeType = item.grade_type || (legacyParts ? legacyParts[1] : '');
            const cleanComment = legacyParts ? legacyParts[2] : (item.description || '');
            const displayDate = reformatDate(item.date);

            return (
              <View style={[styles.gradeCardHorizontal, { borderColor: gradeColors.border }]}>
                <View style={styles.dateColumn}>
                  <Text style={styles.gradeDateSmall}>{displayDate}</Text>
                </View>

                <View style={styles.gradeCircleContainer}>
                  <GradeRing value={item.grade} size={46} />
                </View>

                <View style={styles.gradeInfoMain}>
                  {gradeType ? <Text style={styles.typeLabelSmall}>{gradeType}</Text> : null}
                  {cleanComment ? <Text style={styles.gradeCommentSmall} numberOfLines={2}>{cleanComment}</Text> : null}
                </View>

                <TouchableOpacity
                  onPress={() => handleEditGradeClick(item)}
                  style={styles.editIconContainer}
                >
                  <Pencil size={22} color={(item.modification_count || 0) >= 1 ? '#cbd5e1' : '#2563eb'} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('nuk_ka_nota')}</Text>}
        />
      </View>
    );
  };

  const renderGradeModal = () => (
    <Modal visible={isGradeModalVisible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.premiumActionModal}>
          <View style={styles.modalHeaderScroll}>
            <View>
              <Text style={styles.modalTitleEmphasized}>{t('register_grade')}</Text>
              <Text style={styles.modalSubtitle}>{selectedStudentForGrade?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsGradeModalVisible(false)} style={styles.closeModalBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>{t('grade_value')}</Text>
            <View style={styles.gradeButtonGrid}>
              {[1, 2, 3, 4, 5].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[styles.gradeButton, gradeValue === val.toString() && styles.activeGradeButton]}
                  onPress={() => setGradeValue(val.toString())}
                >
                  <Text style={[styles.gradeButtonText, gradeValue === val.toString() && styles.activeGradeButtonText]}>{val}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>{t('grade_type')}</Text>
            <View style={styles.chipGrid}>
              {[
                { id: 'Me Shkrim', key: 'written' },
                { id: 'Me Gojë', key: 'oral' },
                { id: 'Praktikë', key: 'practical' }
              ].map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.subjectChip, gradeType === type.id && styles.activeSubjectChip]}
                  onPress={() => setGradeType(type.id)}
                >
                  <Text style={[styles.subjectChipText, gradeType === type.id && styles.activeSubjectChipText]}>
                    {t(type.key)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('comment')}</Text>
            <TextInput
              style={styles.premiumInput}
              placeholder={t('comment_placeholder')}
              value={gradeComment}
              onChangeText={setGradeComment}
            />
            <TouchableOpacity
              style={[styles.premiumSubmitButton, !gradeValue && { opacity: 0.5 }]}
              disabled={!gradeValue}
              onPress={() => {
                onAddGrade({
                  studentId: selectedStudentForGrade.id,
                  subject: selectedSubject,
                  value: parseInt(gradeValue),
                  comment: `[${gradeType}] ${gradeComment}`.trim(),
                  date: formatDate(selectedDate)
                });
                setIsGradeModalVisible(false);
                setGradeValue('');
                setGradeComment('');
              }}
            >
              <Text style={styles.premiumSubmitButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );




  const renderAgenda = (currentClass) => {
    const dateStr = formatDate(selectedDate);
    const dayLessons = lessons.filter(l => (l.class_id === currentClass?.id || l.classId === currentClass?.id) && l.date === dateStr);

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'class-detail', data: currentClass })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{formatClassName(currentClass)}</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.viewTitleHeader}>{formatClassName(currentClass)}</Text>
            <Text style={styles.dateTextHeader}>{formatDisplayDate(selectedDate)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {dayLessons.length > 0 ? dayLessons.map((lesson, idx) => {
            const topicParts = lesson.topic?.match(/^\[Ora (\d+)\] (.*)/);
            const hourText = topicParts ? `Ora ${topicParts[1]}` : `Ora ${idx + 1}`;
            const cleanTopic = topicParts ? topicParts[2] : lesson.topic;

            // Find matching homework from the separate homework table
            const lessonHomeworkObj = (homework || []).find(hw =>
              hw.class_id === lesson.class_id &&
              hw.subject === lesson.subject &&
              hw.due_date === lesson.date
            );
            const currentLessonHomework = lessonHomeworkObj?.description;

            return (
              <View key={lesson.id} style={styles.nuvolaLessonCard}>
                <View style={[styles.lessonColorBar, { backgroundColor: lesson.is_test ? '#ef4444' : '#2563eb' }]} />
                <View style={styles.premiumHourContainer}>
                  <Text style={styles.premiumHourNumber}>{topicParts ? topicParts[1] : idx + 1}</Text>
                  <Text style={styles.premiumHourLabel}>{t('hour')}</Text>
                </View>
                <View style={styles.lessonContent}>
                  <Text style={styles.professorName}>
                    {user.teacherProfiles?.find(p => p.id === lesson.teacher_id)?.first_name || user.first_name} {user.teacherProfiles?.find(p => p.id === lesson.teacher_id)?.last_name || user.last_name}
                  </Text>
                  <Text style={styles.lessonSubjectEmphasized}>{lesson.subject}</Text>
                  <Text style={styles.lessonTopicValue}>{cleanTopic}</Text>
                  {currentLessonHomework && (
                    <View style={styles.homeworkContainer}>
                      <Clock size={12} color="#64748b" />
                      <Text style={styles.homeworkText}>{currentLessonHomework}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }) : (
            <View style={styles.emptyStateContainer}>
              <BookIcon size={40} color="#e2e8f0" />
              <Text style={styles.emptyTextSmall}>{t('no_lessons')}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderClassAgenda = (currentClass) => {
    const selectedDateStr = formatDate(selectedDate);
    const dayLessons = lessons
      .filter(l => (l.class_id === currentClass?.id || l.classId === currentClass?.id) && l.date === selectedDateStr)
      .sort((a, b) => {
        const aHour = parseInt(a.topic?.match(/^\[Ora (\d+)\]/)?.[1] || 0);
        const bHour = parseInt(b.topic?.match(/^\[Ora (\d+)\]/)?.[1] || 0);
        return aHour - bHour;
      });

    const dateTests = (tests || []).filter(t => t.date === selectedDateStr && t.class_id === currentClass?.id);

    return (
      <View style={styles.viewContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, height: 60, marginBottom: 24 }}>
          <TouchableOpacity
            style={[styles.glassBackButton, { position: 'absolute', left: 16, zIndex: 10 }]}
            onPress={() => setNavigation({ view: 'my-classes', data: null })}
          >
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <Text style={[styles.viewTitleHeader, { fontSize: 22, fontWeight: '900', textAlign: 'center' }]}>{formatClassName(currentClass)}</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Lessons Section */}
          {dayLessons.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <BookIcon size={18} color="#2563eb" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{t('lessons') || 'Mësimi'}</Text>
              </View>
              {dayLessons.map((lesson, idx) => {
                const topicParts = lesson.topic?.match(/^\[Ora (\d+)\] (.*)/);
                const hourNum = topicParts ? topicParts[1] : null;
                const cleanTopic = topicParts ? topicParts[2] : lesson.topic;

                // Find matching homework from the homework table
                const lessonHomeworkObj = (homework || []).find(hw =>
                  hw.class_id === lesson.class_id &&
                  hw.subject === lesson.subject &&
                  hw.due_date === lesson.date
                );
                const lessonHomework = lessonHomeworkObj?.description;

                const teacher = user.teacherProfiles?.find(p => p.id === lesson.teacher_id) || (lesson.teacher_id === user.id ? user : { first_name: 'Mësu' + 'es', last_name: '' });
                const isMyLesson = lesson.teacher_id === user.id;

                return (
                  <View key={lesson.id} style={[styles.premiumCard, { marginBottom: 16, padding: 20, borderLeftWidth: 4, borderLeftColor: '#2563eb' }]}>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        backgroundColor: '#f8fafc',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: '#f1f5f9'
                      }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>{hourNum || idx + 1}</Text>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748b', marginTop: -2, textTransform: 'uppercase' }}>{t('hour') || 'Ora'}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 2 }}>{lesson.subject}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 }}>
                              {teacher.first_name} {teacher.last_name}
                            </Text>
                          </View>
                          {isMyLesson && (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditLessonData(lesson);
                                  setLessonTopic(cleanTopic);
                                  setLessonHour(hourNum || '1');
                                  setLessonHomework(lessonHomework || '');
                                  setSelectedSubject(lesson.subject);
                                  setIsEditLessonModalVisible(true);
                                }}
                                style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 }}
                              >
                                <Pencil size={16} color="#2563eb" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => {
                                  confirmDelete(
                                    t('confirm_delete_lesson_msg') || 'Dëshironi ta fshini këtë orë mësimore?',
                                    async () => {
                                      const result = await onDeleteLesson(lesson.id);
                                      if (result?.error) {
                                        showAlert(result.error.message, 'error');
                                      }
                                    }
                                  );
                                }}
                                style={{ padding: 8, backgroundColor: '#fff1f2', borderRadius: 10 }}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        <View style={{ height: 1.5, backgroundColor: '#f8fafc', marginBottom: 10 }} />

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{t('lesson_topic') || 'Tema'}</Text>
                            <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, fontWeight: '500' }}>{cleanTopic}</Text>
                          </View>
                        </View>

                        {lessonHomework ? (
                          <View style={{ backgroundColor: '#f5f3ff', padding: 10, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: '#ddd6fe', borderLeftWidth: 3, borderLeftColor: '#8b5cf6' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <BookIcon size={12} color="#7c3aed" />
                              <Text style={{ fontWeight: '800', color: '#7c3aed', fontSize: 10, textTransform: 'uppercase' }}>{t('homework_assignment') || 'Detyrat'}</Text>
                            </View>
                            <Text style={{ color: '#4c1d95', fontSize: 13, lineHeight: 18 }}>{lessonHomework}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Tests Section */}
          {dateTests.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e' }} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#f43f5e', textTransform: 'uppercase' }}>{t('test_exam') || 'Verifica / Provim'}</Text>
              </View>
              {dateTests.map((test, idx) => {
                const teacher = user.teacherProfiles?.find(p => p.id === test.teacher_id) || (test.teacher_id === user.id ? user : { first_name: 'Mësues', last_name: '' });
                const isMyTest = test.teacher_id === user.id;

                return (
                  <View key={test.id || idx} style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 16,
                    borderWidth: 2,
                    borderColor: '#f43f5e',
                    borderLeftWidth: 8,
                    shadowColor: '#f43f5e',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 4,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#881337', marginBottom: 2 }}>{test.subject}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#be123c' }}>
                          {teacher.first_name} {teacher.last_name}
                        </Text>
                      </View>
                      {isMyTest && (
                        <TouchableOpacity
                          onPress={() => {
                            confirmDelete(t('confirm_delete_test') || 'Dëshironi ta fshini këtë test?', async () => {
                              await onDeleteTest(test.id);
                            });
                          }}
                          style={{ padding: 6, backgroundColor: '#fff1f2', borderRadius: 8 }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={{ height: 1, backgroundColor: '#ffe4e6', marginBottom: 10 }} />
                    <Text style={{ fontSize: 14, color: '#4c0519', fontWeight: '600', lineHeight: 20 }}>
                      {test.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {dayLessons.length === 0 && dateTests.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.avatarPlaceholder, { width: 80, height: 80, borderRadius: 30 }]}>
                <Calendar size={40} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyStateTitle}>{t('nuk_ka_ore') || 'Nuk ka asgjë të regjistruar për këtë ditë.'}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderNotices = () => {
    const teacherSchoolId = user.school_id;
    const teacherClassIds = classes
      .filter(c => (c.teacherIds || []).includes(user.id))
      .map(c => c.id);

    const visibleNotices = (notices || []).filter(n =>
      (n.school_id === teacherSchoolId || !n.school_id) &&
      (!n.class_id || teacherClassIds.includes(n.class_id))
    );

    return (
      <View style={styles.viewContainer}>
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 120, flexGrow: 1 }}
          data={visibleNotices}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563eb']}
              tintColor="#2563eb"
              progressViewOffset={50}
            />
          }
          ListHeaderComponent={() => (
            <View style={{ marginBottom: 16, marginTop: 10 }}>
              <Text style={styles.sectionTitle}>{t('notices')}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const hasAttachment = !!item.attachment_url;
            return (
              <TouchableOpacity
                activeOpacity={0.82}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 20,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                  shadowColor: '#94a3b8',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 3,
                }}
                onPress={() => setSelectedNotice(item)}
              >
                {/* Icon container on the left */}
                <View style={{
                  width: 50, height: 50, borderRadius: 16,
                  backgroundColor: '#f0f9ff',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  borderWidth: 1,
                  borderColor: '#e0f2fe',
                }}>
                  {hasAttachment
                    ? <FileText size={24} color={'#0ea5e9'} />
                    : <Bell size={24} color={'#0ea5e9'} />
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
                      <FileText size={11} color="#2563eb" />
                      <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '700' }}>{t('attachment') || 'Bashkëngjitje'}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Bell size={36} color="#cbd5e1" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>{t('no_notices')}</Text>
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
              <BookIcon size={18} color="white" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Ditari Elektronik</Text>
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
        {(activeView === 'home' && (navigation.view === 'class-agenda' || navigation.view === 'class-detail')) && (
          <CalendarStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        )}
      </View>

      {activeView === 'home' && navigation.view === 'home' && renderHome()}
      {activeView === 'home' && navigation.view === 'my-classes' && renderMyClasses()}
      {activeView === 'home' && navigation.view === 'class-detail' && renderStudentSelection(navigation.data)}
      {activeView === 'home' && navigation.view === 'notat-students' && renderStudentSelection(navigation.data)}
      {activeView === 'home' && navigation.view === 'notat-subjects' && renderSubjectSelection(navigation.data)}
      {activeView === 'home' && navigation.view === 'class-notat-grid' && renderClassNotatGrid(navigation.data)}
      {activeView === 'home' && navigation.view === 'notat-history' && renderGradeHistory(navigation.data)}
      {activeView === 'home' && navigation.view === 'class-agenda' && renderClassAgenda(navigation.data)}
      {activeView === 'lajmerimet' && navigation.view === 'home' && renderNotices()}

      {renderGradeModal()}

      <PasswordChangeModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        onUpdate={handleUpdatePassword}
        t={t}
      />
      {renderActionModal()}
      {renderEditGradeModal()}
      {renderLessonForm(navigation.data)}
      {renderTestRegistrationModal(navigation.data)}
      {renderEditLessonModal()}
      {renderConfirmModal()}


      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveView('home');
            setNavigation({ view: 'home', data: null });
          }}
        >
          <Home size={24} color={activeView === 'home' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'home' && styles.activeNavText]}>{t('ballina') || 'Ballina'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => {
            setActiveView('lajmerimet');
            setNavigation({ view: 'home', data: null });
          }}
        >
          <View>
            <Bell size={24} color={activeView === 'lajmerimet' ? '#2563eb' : '#94a3b8'} />
            {(() => {
              const teacherSchoolId = user.school_id;
              const unread = (notices || []).filter(n =>
                (n.school_id === teacherSchoolId || !n.school_id)
              ).length;
              if (unread > 0 && activeView !== 'lajmerimet') {
                return (
                  <View style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#db2777', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: '900' }}>{unread > 9 ? '9+' : unread}</Text>
                  </View>
                );
              }
              return null;
            })()}
          </View>
          <Text style={[styles.navText, activeView === 'lajmerimet' && styles.activeNavText]}>{t('notices')}</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Notice Modal */}
      {selectedNotice && (
        <Modal visible={!!selectedNotice} animationType="fade" transparent>
          <View style={modalStyles.overlay}>
            <View style={modalStyles.content}>
              <View style={modalStyles.header}>
                <View style={modalStyles.iconBg}>
                  <Bell size={24} color="#2563eb" />
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
                    Linking.openURL(selectedNotice.attachment_url);
                  }}
                >
                  <Download size={20} color="white" />
                  <Text style={modalStyles.attachmentBtnText}>{t('download_attachment') || 'Shkarko bashkëngjitjen'}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={modalStyles.closeBtn}
                onPress={() => setSelectedNotice(null)}
              >
                <Text style={modalStyles.closeBtnText}>{t('close') || 'Mbyll'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Modal: shown when hourly attendance causes late/early_exit */}
      <Modal visible={isTimeModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '80%' }]}>
            {/* Header */}
            <View style={styles.modalHeaderScroll}>
              <View>
                <Text style={styles.modalTitleEmphasized}>
                  {pendingTimeType === 'late' ? t('time_modal_late_title') || '⏰ Ritardo' : t('time_modal_early_exit_title') || '🚪 Uscita Anticipata'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {pendingTimeType === 'late'
                    ? t('time_modal_late_subtitle') || 'Inserisci l\'orario di entrata'
                    : t('time_modal_early_exit_subtitle') || 'Inserisci l\'orario di uscita'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsTimeModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Info banner */}
              <View style={{ backgroundColor: pendingTimeType === 'late' ? '#fef3c7' : '#fff7ed', borderRadius: 16, padding: 14, marginBottom: 20, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Clock size={18} color={pendingTimeType === 'late' ? '#d97706' : '#ea580c'} />
                <Text style={{ fontSize: 13, color: pendingTimeType === 'late' ? '#92400e' : '#7c2d12', fontWeight: '600', flex: 1, lineHeight: 20 }}>
                  {pendingTimeType === 'late'
                    ? t('time_modal_late_desc') || 'Lo studente era assente alla prima ora ma è arrivato in seguito. Registra l\'ora di ingresso.'
                    : t('time_modal_early_exit_desc') || 'Lo studente era presente ma è uscito prima della fine. Registra l\'ora di uscita.'}
                </Text>
              </View>

              {/* Hour & Minute selectors */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {/* Hour */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>{t('time_modal_hour') || 'Ora'}</Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: isTimeModalHourDropdown ? '#2563eb' : '#e2e8f0' }}
                    onPress={() => { setIsTimeModalHourDropdown(!isTimeModalHourDropdown); setIsTimeModalMinuteDropdown(false); }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: timeModalSelHour ? '#1e293b' : '#94a3b8' }}>{timeModalSelHour || t('time_modal_hour') || 'Ora'}</Text>
                    <ChevronDown size={18} color="#64748b" />
                  </TouchableOpacity>
                  {isTimeModalHourDropdown && (
                    <View style={{ marginTop: 6, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, maxHeight: 180 }}>
                      <ScrollView nestedScrollEnabled>
                        {['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'].map(h => (
                          <TouchableOpacity
                            key={h}
                            style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: timeModalSelHour === h ? '#eff6ff' : 'white' }}
                            onPress={() => { setTimeModalSelHour(h); setIsTimeModalHourDropdown(false); }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: timeModalSelHour === h ? '700' : '500', color: timeModalSelHour === h ? '#2563eb' : '#475569' }}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Minute */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>{t('time_modal_minute') || 'Minuto'}</Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: isTimeModalMinuteDropdown ? '#2563eb' : '#e2e8f0' }}
                    onPress={() => { setIsTimeModalMinuteDropdown(!isTimeModalMinuteDropdown); setIsTimeModalHourDropdown(false); }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '700', color: timeModalSelMinute ? '#1e293b' : '#94a3b8' }}>{timeModalSelMinute || t('time_modal_minute') || 'Min'}</Text>
                    <ChevronDown size={18} color="#64748b" />
                  </TouchableOpacity>
                  {isTimeModalMinuteDropdown && (
                    <View style={{ marginTop: 6, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, maxHeight: 180 }}>
                      <ScrollView nestedScrollEnabled>
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                          <TouchableOpacity
                            key={m}
                            style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: timeModalSelMinute === m ? '#eff6ff' : 'white' }}
                            onPress={() => { setTimeModalSelMinute(m); setIsTimeModalMinuteDropdown(false); }}
                          >
                            <Text style={{ fontSize: 15, fontWeight: timeModalSelMinute === m ? '700' : '500', color: timeModalSelMinute === m ? '#2563eb' : '#475569' }}>{m}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Time preview */}
              <View style={{ alignItems: 'center', backgroundColor: pendingTimeType === 'late' ? '#fef3c7' : '#fff7ed', paddingVertical: 10, borderRadius: 14, marginBottom: 20 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: pendingTimeType === 'late' ? '#d97706' : '#ea580c', letterSpacing: 2 }}>
                  {timeModalSelHour && timeModalSelMinute ? `${timeModalSelHour}:${timeModalSelMinute}` : '--:--'}
                </Text>
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[styles.premiumSubmitButton,
                { backgroundColor: pendingTimeType === 'late' ? '#d97706' : '#ea580c' },
                (!timeModalSelHour || !timeModalSelMinute) && { opacity: 0.5 }
                ]}
                disabled={!timeModalSelHour || !timeModalSelMinute || isTimeSaving}
                onPress={async () => {
                  setIsTimeSaving(true);
                  const finalTime = `${timeModalSelHour}:${timeModalSelMinute}`;
                  const result = await onToggleAttendance(
                    pendingTimeStudentId,
                    pendingTimeDate,
                    pendingTimeType,
                    0, // hour 0 = daily summary
                    finalTime
                  );
                  setIsTimeSaving(false);
                  if (result?.error) {
                    showAlert(result.error.message, 'error');
                  } else {
                    setIsTimeModalVisible(false);
                    setPendingTimeType(null);
                    setPendingTimeStudentId(null);
                    setPendingTimeDate(null);
                    setTimeModalSelHour('');
                    setTimeModalSelMinute('');
                  }
                }}
              >
                <Text style={styles.premiumSubmitButtonText}>
                  {isTimeSaving ? '...' : t('time_modal_save') || 'Salva Orario'}
                </Text>
              </TouchableOpacity>

              {/* Skip button */}
              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 14 }}
                onPress={() => {
                  setIsTimeModalVisible(false);
                  setPendingTimeType(null);
                  setPendingTimeStudentId(null);
                  setPendingTimeDate(null);
                }}
              >
                <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 14 }}>{t('time_modal_skip') || 'Salta (senza orario)'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: 'white',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    zIndex: 10,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  logoutBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
  },
  scrollContent: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    padding: 20,
  },
  // Unified Premium Card
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  // Home / Agenda Styles
  homeHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -1,
  },
  homeSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  timelineContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    width: 60,
    alignItems: 'center',
  },
  timelineDotContainer: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#eff6ff',
    marginTop: 6,
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineSubject: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  timelineTopic: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  // Navigation / Headers
  navigationHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
  },
  glassBackButton: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 14,
    backgroundColor: 'white',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  viewTitleHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  dateTextHeader: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  // Tables / Lists
  studentListItem: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  studentNumberContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  studentNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  studentAttendanceText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  statusSelectorBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  premiumActionModal: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderScroll: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitleEmphasized: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  closeModalBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  premiumSubmitButton: {
    backgroundColor: '#2563eb',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 10,
  },
  premiumSubmitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
  // Tabs in Modal
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeModalTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  activeModalTabText: {
    color: '#2563eb',
  },
  // Grade specific
  gradeButtonGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gradeButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  activeGradeButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  gradeButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#64748b',
  },
  activeGradeButtonText: {
    color: '#2563eb',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeSubjectChip: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  activeSubjectChipText: {
    color: 'white',
  },
  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeNavText: {
    color: '#2563eb',
  },
  // Nuvola Style Additions
  nuvolaLessonCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  lessonColorBar: {
    width: 6,
  },
  premiumHourContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  premiumHourNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
  },
  premiumHourLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  lessonContent: {
    flex: 1,
    padding: 16,
  },
  professorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  lessonSubjectEmphasized: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 6,
  },
  lessonTopicValue: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  homeworkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  homeworkText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  changeClassLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  changeClassText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563eb',
  },
  // Selection Modals (Squares)
  premiumSelectionModal: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  pixelHeader: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  squareGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  squareActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 16,
  },
  squareIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareActionText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
  },
  // Grade History Horizontal Card
  gradeCardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dateColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    marginRight: 12,
  },
  gradeDateSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
  },
  gradeCircleContainer: {
    marginRight: 12,
  },
  gradeInfoMain: {
    flex: 1,
  },
  typeLabelSmall: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  gradeCommentSmall: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  editIconContainer: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  // Date Picker Fields
  premiumDatePickerField: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  premiumDatePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumDatePickerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  alertIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  // Empty states
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  premiumCancelButton: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '800',
  },
  // Dashboard Overhaul Styles
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  dashboardCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  dashboardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
  },
  dashboardLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  premiumClassCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  classCardHeader: {
    marginBottom: 20,
  },
  classCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  classCardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  classActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  classActionButton: {
    flex: 1,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  classActionText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Student Action Buttons Grid (For Regjistro View)
  studentActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  studentActionBtn: {
    width: (width - 72) / 4, // 4 items per row
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  studentActionBtnText: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  // Confirm Modal Styles
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  // Agenda / Home Overhaul Styles
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  agendaHourBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  agendaHourText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2563eb',
  },
  agendaClassText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 2,
  },
  agendaSubjectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  agendaTopicText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    lineHeight: 16,
  },
  agendaIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  }
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
    backgroundColor: '#eff6ff',
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
    backgroundColor: '#2563eb',
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

export default TeacherDashboard;

