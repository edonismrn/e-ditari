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
  useWindowDimensions,
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
  Calendar as CalendarIcon,
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
  PlusCircle,
  Globe,
  Activity,
  FlaskConical,
  Palette,
  Music,
  Divide,
  FileText,
  Paperclip,
  Download,
  Search,
  LayoutGrid
} from 'lucide-react-native';
import CalendarStrip from '../components/CalendarStrip';
import { formatDate, formatDisplayDate } from '../utils/dateUtils';
import { formatClassName } from '../utils/stringUtils';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import PasswordChangeModal from '../components/PasswordChangeModal';
import PremiumDatePicker from '../components/PremiumDatePicker';

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
  user, onLogout, classes, students, grades, lessons, attendance, homework, notes, notices, tests, teachers,
  onAddGrade, onUpdateGrade, onDeleteGrade, onAddLesson, onUpdateLesson, onDeleteLesson, onToggleAttendance, onJustifyAttendance, onUnjustifyAttendance,
  onAddHomework, onAddNote, onAddTest, onDeleteTest, onRefresh,
  schoolCalendar, schools,
  availableAcademicYears, selectedGlobalAcademicYear, onChangeAcademicYear,
  academicYearHistory
}) => {
  const { t, language } = useLanguage();
  const { showAlert, showConfirm } = useAlert();
  const { updatePassword, login } = useAuth();
  const [activeView, setActiveView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);

  const handleDeleteGrade = (grade) => {
    showConfirm(
      `${t('confirm_delete_grade') || 'A jeni i sigurt që dëshironi të fshini këtë notë?'}`,
      async () => {
        setIsUpdating(true);
        const res = await onDeleteGrade(grade.id);
        setIsUpdating(false);
        if (!res?.error) {
          showAlert(t('grade_deleted_success') || 'Nota u fshi me sukses!', 'success');
          setEditingGrade(null);
        } else {
          showAlert(res.error.message, 'error');
        }
      }
    );
  };

  const handleDeleteJustification = async () => {
    const sId = selectedAttendanceForDetail.student_id || selectedAttendanceForDetail.studentId;
    showConfirm(
      `${t('confirm_delete_justification') || 'A jeni i sigurt që dëshironi të hiqni arsyetimin?'}`,
      async () => {
        setIsUpdating(true);
        try {
          await onUnjustifyAttendance(sId, selectedAttendanceForDetail.date);
          setIsDetailModalVisible(false);
          showAlert(t('justification_deleted_success') || 'Arsyetimi u hoq me sukses', 'success');
        } catch (err) {
          showAlert(err.message, 'error');
        } finally {
          setIsUpdating(false);
        }
      }
    );
  };

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth > 768;

  const isReadOnly = !!selectedGlobalAcademicYear;

  // When the user switches academic year, jump the calendar to September 1st of that year.
  // When returning to current year (null), jump back to today.
  React.useEffect(() => {
    if (selectedGlobalAcademicYear) {
      const parts = selectedGlobalAcademicYear.split('/');
      if (parts.length === 2) {
        const startYear = parseInt(parts[0]);
        const d = new Date(startYear, 8, 1, 12, 0, 0);
        setSelectedDate(d);
      }
    } else {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      setSelectedDate(d);
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
      showAlert(t('password_updated_success'), 'success');
    } catch (err) {
      const errorMsg = err.message === 'Invalid login credentials'
        ? t('invalid_current_password')
        : err.message;
      showAlert(errorMsg, 'error');
      throw err;
    }
  };
  const [navigation, setNavigation] = useState({ view: 'home', data: null });

  // Web Routing sync effect
  React.useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/ballina' || path === '/') {
        setActiveView('home');
        setNavigation({ view: 'home', data: null });
      } else if (path === '/lajmerimet') {
        setActiveView('lajmerimet');
        setNavigation({ view: 'home', data: null });
      } else if (path === '/klasat') {
        setActiveView('home');
        setNavigation({ view: 'my-classes', data: null });
      } else if (path.startsWith('/klasat/')) {
        const parts = path.split('/');
        if (parts.length >= 4) {
          const classId = parts[2];
          const subview = parts[3];

          const foundClass = classes?.find(c => c.id === classId) || { id: classId };

          if (subview === 'agjenda') {
            setActiveView('home');
            setNavigation({ view: 'class-agenda', data: foundClass });
          } else if (subview === 'regjistri') {
            setActiveView('home');
            setNavigation({ view: 'class-detail', data: foundClass });
          } else if (subview === 'notat') {
            setActiveView('home');
            setNavigation({ view: 'class-notat-grid', data: foundClass });
          } else if (subview === 'mungesat') {
            setActiveView('home');
            setNavigation({ view: 'class-attendance-grid', data: foundClass });
            if (user.is_kujdestar) {
              setSelectedSubject('Ditore');
            } else {
              const classSubjects = getAvailableSubjects(foundClass);
              setSelectedSubject(classSubjects.length > 0 ? classSubjects[0] : 'Ditore');
            }
          } else if (subview === 'notat-students') {
            setActiveView('home');
            setNavigation({ view: 'notat-students', data: foundClass });
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    if (!window.teacherInitialLoadDone) {
      handlePopState();
      window.teacherInitialLoadDone = true;
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDesktop, classes]);

  // Sync state changes to browser URL automatically
  React.useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;

    let targetUrl = '/';
    if (activeView === 'lajmerimet') {
      targetUrl = '/lajmerimet';
    } else if (activeView === 'home') {
      if (navigation.view === 'home') targetUrl = '/ballina';
      else if (navigation.view === 'my-classes') targetUrl = '/klasat';
      else if (navigation.view === 'class-agenda' && navigation.data?.id) targetUrl = `/klasat/${navigation.data.id}/agjenda`;
      else if (navigation.view === 'class-detail' && navigation.data?.id) targetUrl = `/klasat/${navigation.data.id}/regjistri`;
      else if (navigation.view === 'class-notat-grid' && navigation.data?.id) targetUrl = `/klasat/${navigation.data.id}/notat`;
      else if (navigation.view === 'class-attendance-grid' && navigation.data?.id) targetUrl = `/klasat/${navigation.data.id}/mungesat`;
      else if (navigation.view === 'notat-students' && navigation.data?.id) targetUrl = `/klasat/${navigation.data.id}/notat-students`;
      else targetUrl = '/ballina';
    }

    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  }, [activeView, navigation, isDesktop]);

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
  const [agendaFilter, setAgendaFilter] = useState('all'); // 'all' or 'mine'

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
    const archivedYear = (academicYearHistory || []).find(h => h.academic_year === selectedGlobalAcademicYear);
    const startDate = archivedYear?.school_year_start || school?.school_year_start;
    const endDate = archivedYear?.school_year_end || school?.school_year_end;

    if (startDate && dateStr < startDate) return { isWork: false, reason: t('no_school_day') };
    if (endDate && dateStr > endDate) return { isWork: false, reason: t('no_school_day') };

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

  const getTermForDate = (dateStr, dbTerm) => {
    if (dbTerm) return Number(dbTerm);
    const school = (schools || []).find(s => s.id === user.school_id) || schools?.[0];
    const archivedYear = (academicYearHistory || []).find(h => h.academic_year === selectedGlobalAcademicYear);
    const boundaryDate = archivedYear?.term_two_start_date || school?.term_two_start_date;
    if (boundaryDate && dateStr) {
      const entryDateStr = dateStr.split('T')[0].split(' ')[0];
      const boundaryDateStr = boundaryDate.split('T')[0].split(' ')[0];
      return (entryDateStr >= boundaryDateStr) ? 2 : 1;
    }
    if (!dateStr) return 1;
    const month = parseInt(dateStr.split('-')[1]);
    return (month >= 9 || month === 1) ? 1 : 2;
  };

  const reformatDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}`;
  };

  // Registration Form State
  const [gradeSemester, setGradeSemester] = useState(0); // 0: All, 1: Term 1, 2: Term 2
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
  const [isSubjectDropdownVisible, setIsSubjectDropdownVisible] = useState(false);
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
  const [selectedCoordinatorClassId, setSelectedCoordinatorClassId] = useState(null);
  const [selectedCoordinatorSubject, setSelectedCoordinatorSubject] = useState(null);
  const [selectedCoordinatorAttendanceSubject, setSelectedCoordinatorAttendanceSubject] = useState(null);
  const [selectedGradeForDetail, setSelectedGradeForDetail] = useState(null);
  const [isSubjectPickerVisible, setIsSubjectPickerVisible] = useState(false);
  const [isAttendanceSubjectPickerVisible, setIsAttendanceSubjectPickerVisible] = useState(false);
  const [coordinatorAttendanceTab, setCoordinatorAttendanceTab] = useState('daily'); // 'daily' or 'hourly'
  const [teacherAttendanceTab, setTeacherAttendanceTab] = useState('daily'); // 'daily' or 'hourly'
  const [selectedAttendanceForDetail, setSelectedAttendanceForDetail] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

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
  let coordinatedClasses = classes.filter(c => c.coordinatorId === user.id);

  // Fallback: If no classes have an explicit coordinator_id yet, but the user is_kujdestar, 
  // show all their teacher classes (legacy behavior) to avoid empty states.
  if (coordinatedClasses.length === 0 && user.is_kujdestar) {
    coordinatedClasses = teacherClasses;
  }

  // Helper to get merged subjects (from class link + teacher profile)
  const getAvailableSubjects = (currentClass) => {
    const classSubjects = currentClass?.subjects || [];
    const profileSubjects = user.subjects || [];
    let merged = [...new Set([...classSubjects, ...profileSubjects])];
    // Filter out generic 'Msues' if more specific subjects exist
    if (merged.length > 1) merged = merged.filter(s => s !== 'Msues');
    return merged.length > 0 ? merged : ['Msues'];
  };

  // Component-level grade color helper
  const getGradeColor = (val) => {
    const g = parseInt(val);
    if (g === 1) return { bg: '#fee2e2', text: '#ef4444', border: '#fecaca' };
    if (g === 2) return { bg: '#ffedd5', text: '#f97316', border: '#fed7aa' };
    if (g === 3) return { bg: '#fef9c3', text: '#eab308', border: '#fef08a' };
    if (g === 4) return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
    if (g === 5) return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
    return { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
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
    if (name.includes('gjuh')) return <BookIcon size={24} color="#2563eb" />;
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
        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BookIcon size={20} color="#64748b" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{teacherClasses.length}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 4 }}>{t('classes_label')}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <GraduationCap size={20} color="#64748b" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{totalStudents}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 4 }}>{t('students_count')}</Text>
          </View>
        </View>

        {/* Coordinator Section */}
        {user.is_kujdestar && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 12 }}>{t('coordinator_section') || 'Kujdestaria'}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#fef2f2',
                  paddingVertical: 20,
                  paddingHorizontal: 8,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: '#fee2e2',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: 'center',
                  minHeight: 110
                }}
                onPress={() => {
                  setSelectedCoordinatorClassId(null);
                  setNavigation({ view: 'coordinator-notes', data: null });
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#e11d48', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                  <ShieldCheck size={22} color="#e11d48" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#9f1239', textAlign: 'center', lineHeight: 14 }} numberOfLines={3}>
                  {t('all_disciplinary_notes') || 'Shnimet Disiplinore'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f5f3ff',
                  paddingVertical: 20,
                  paddingHorizontal: 8,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: '#ddd6fe',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: 'center',
                  minHeight: 110
                }}
                onPress={() => {
                  setSelectedCoordinatorClassId(null);
                  setNavigation({ view: 'coordinator-grades', data: null });
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                  <Award size={22} color="#7c3aed" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#5b21b6', textAlign: 'center', lineHeight: 14 }} numberOfLines={3}>
                  {t('full_grades_matrix') || 'Grilja e Notave'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#f0fdf4',
                  paddingVertical: 20,
                  paddingHorizontal: 8,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: '#dcfce7',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: 'center',
                  minHeight: 110
                }}
                onPress={() => {
                  setSelectedCoordinatorClassId(null);
                  setNavigation({ view: 'coordinator-attendance', data: null });
                }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#16a34a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
                  <UserCheck size={22} color="#16a34a" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803d', textAlign: 'center', lineHeight: 14 }} numberOfLines={3}>
                  {t('attendance_oversight') || 'Pasqyra e Mungesave'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Quick Actions */}
        <View style={{ gap: 16 }}>
          {/* Today's Agenda Summary */}
          {!isDesktop && (() => {
            const todayStr = formatDate(new Date());
            const myLessonsToday = (lessons || [])
              .filter(l =>
                l.teacher_id === user.id &&
                l.date === todayStr &&
                (l.academic_year === selectedGlobalAcademicYear || (!l.academic_year && !selectedGlobalAcademicYear))
              )
              .sort((a, b) => {
                const aH = parseInt(a.topic?.match(/^\[Ora (\d+)\]/)?.[1] || 0);
                const bH = parseInt(b.topic?.match(/^\[Ora (\d+)\]/)?.[1] || 0);
                return aH - bH;
              });

            if (myLessonsToday.length === 0 || !isDesktop) return null;

            return (
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#0f172a" }}>{t("my_agenda")}</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#eff6ff", borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563eb" }}>{formatDisplayDate(new Date())}</Text>
                  </View>
                </View>
                {myLessonsToday.map((lesson, idx) => {
                  const topicMatch = lesson.topic?.match(/^\[Ora (\d+)\] (.*)/);
                  const hour = topicMatch ? topicMatch[1] : "?";
                  const topic = topicMatch ? topicMatch[2] : lesson.topic;
                  const cls = teacherClasses.find(c => c.id === lesson.class_id || c.id === lesson.classId);

                  return (
                    <TouchableOpacity
                      key={lesson.id}
                      style={[styles.premiumCardAction, { marginBottom: 10, paddingVertical: 12 }]}
                      onPress={() => setNavigation({ view: "class-agenda", data: cls })}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: "900", color: "#64748b" }}>{hour}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#1e293b" }}>{topic}</Text>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>{cls?.name || t("unknown_class")}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}

          <TouchableOpacity
            style={styles.premiumCardAction}
            onPress={() => setNavigation({ view: 'my-classes', data: null })}
          >
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <BookIcon size={24} color="#2563eb" />
            </View>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{t('my_classes')}</Text>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderClassAttendanceGrid = (currentClass) => {
    const classStudents = students
      .filter(s => s.classId === currentClass.id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const studentIds = classStudents.map(s => s.id);

    const isDailyView = teacherAttendanceTab === 'daily';
    const teacherSubjects = user.subjects || [];
    const mySubjects = (currentClass.subjects || []).filter(s => teacherSubjects.includes(s));

    const classAttendanceMap = new Map();
    attendance.forEach(a => {
      const isStudent = studentIds.includes(a.student_id) || studentIds.includes(a.studentId);
      if (!isStudent) return;
      if (a.status.includes('present')) return;
      if (gradeSemester !== 0 && getTermForDate(a.date, a.term) !== gradeSemester) return;

      const hourVal = parseInt(a.hour || 0, 10);
      const dateKey = formatDate(a.date);
      if (isDailyView) {
        if (hourVal === 0) {
          classAttendanceMap.set(`${a.student_id || a.studentId}-${dateKey}`, a);
        }
      } else {
        if (hourVal > 0) {
          const aSubject = a.subject || (lessons.find(l =>
            (l.class_id === currentClass.id || l.classId === currentClass.id) &&
            formatDate(l.date) === dateKey &&
            l.topic?.includes(`[Ora ${a.hour}]`)
          )?.subject);

          if (selectedSubject === 'Tutte' ? mySubjects.includes(aSubject) : aSubject === selectedSubject) {
            classAttendanceMap.set(`${a.student_id || a.studentId}-${dateKey}-${a.hour}`, a);
          }
        }
      }
    });
    const classAttendance = Array.from(classAttendanceMap.values());

    return (
      <View style={[styles.viewContainer, { paddingHorizontal: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <TouchableOpacity
            style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, styles.glassBackButton]}
            onPress={() => {
              setNavigation({ view: 'my-classes', data: null });
              setSelectedRegistryStudent(null);
              setSelectedActionStudent(null);
              setSelectedStudentForGrade(null);
            }}
          >
            <ArrowLeft size={18} color="#1e293b" />
            {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
          </TouchableOpacity>
        </View>

        <View style={{ padding: 20, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => {
                setTeacherAttendanceTab('daily');
                setSelectedSubject('Tutte');
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: isDailyView ? 'white' : 'transparent',
                alignItems: 'center',
                shadowColor: isDailyView ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: isDailyView ? 2 : 0
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: isDailyView ? '#2563eb' : '#64748b' }}>{t('daily') || 'Ditore'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setTeacherAttendanceTab('hourly');
                setSelectedSubject('Tutte');
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: !isDailyView ? 'white' : 'transparent',
                alignItems: 'center',
                shadowColor: !isDailyView ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: !isDailyView ? 2 : 0
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '900', color: !isDailyView ? '#2563eb' : '#64748b' }}>{t('hourly_absences') || 'Orare'}</Text>
            </TouchableOpacity>
          </View>

          {!isDailyView && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { marginBottom: 12 }]}>{t('lesson_subject')}</Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'white',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                }}
                onPress={() => setIsAttendanceSubjectPickerVisible(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 10 }}>
                    <BookIcon size={18} color="#2563eb" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                    {selectedSubject === 'Tutte' ? (t('all_subjects') || 'T gjitha lndt') : t(selectedSubject)}
                  </Text>
                </View>
                <ChevronDown size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.semesterSelector}>
          {[
            { id: 0, label: t('all') },
            { id: 1, label: t('first_semester') },
            { id: 2, label: t('second_semester') },
          ].map(sem => (
            <TouchableOpacity
              key={sem.id}
              style={[styles.semesterChip, gradeSemester === sem.id && styles.activeSemesterChip]}
              onPress={() => setGradeSemester(sem.id)}
            >
              <Text style={[styles.semesterChipText, gradeSemester === sem.id && styles.activeSemesterChipText]}>
                {sem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {classStudents.map((student, idx) => {
              const studentAtt = classAttendance.filter(a => a.student_id === student.id || a.studentId === student.id);

              // Grouping logic: depends on view mode
              const displayAtt = [];
              if (isDailyView) {
                const seenDates = new Set();
                const sortedAtt = [...studentAtt].sort((a, b) => {
                  const statusRank = s => s.includes('late') || s.includes('early') ? 2 : (s.includes('absent') ? 1 : 0);
                  return statusRank(b.status) - statusRank(a.status);
                });
                for (const att of sortedAtt) {
                  const dateKey = formatDate(att.date);
                  if (!seenDates.has(dateKey)) {
                    displayAtt.push(att);
                    seenDates.add(dateKey);
                  }
                }
              } else {
                displayAtt.push(...studentAtt);
              }

              displayAtt.sort((a, b) => new Date(a.date) - new Date(b.date));

              const totalUnjustified = studentAtt.filter(a => !a.status.includes('justified') && !a.status.includes('present')).length;
              const totalLate = studentAtt.filter(a => a.status.includes('late')).length;
              const totalEarly = studentAtt.filter(a => a.status.includes('early')).length;
              const totalAbsent = studentAtt.filter(a => a.status.includes('absent') && !a.status.includes('late') && !a.status.includes('early')).length;
              const totalUnjustifiedAbsences = studentAtt.filter(a => !a.status.includes('justified') && !a.status.includes('present')).length;

              return (
                <View key={student.id} style={{
                  backgroundColor: 'white',
                  borderRadius: 24,
                  marginBottom: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.03,
                  shadowRadius: 10,
                  elevation: 2
                }}>
                  {/* Top Header: Student Info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      backgroundColor: idx % 2 === 0 ? '#eff6ff' : '#f8fafc',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: idx % 2 === 0 ? '#dbeafe' : '#e2e8f0'
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: idx % 2 === 0 ? '#2563eb' : '#64748b' }}>
                        {(student.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>{student.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                        {totalAbsent > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                              {totalAbsent} {isDailyView ? (t('absent') || 'Mungesa') : (t('hourly_absences_unit') || 'Ore Mungese')}
                            </Text>
                          </View>
                        )}
                        {totalUnjustifiedAbsences > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#b91c1c' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#b91c1c' }}>
                              {totalUnjustifiedAbsences} {t('unjustified_absences_short') || 'Pa arsye'}
                            </Text>
                          </View>
                        )}
                        {totalLate > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>{totalLate} {t('late') || 'Vones'}</Text>
                          </View>
                        )}
                        {totalEarly > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>{totalEarly} {t('early_exit') || 'Largim'}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Markers Grid */}
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {displayAtt.length > 0 ? displayAtt.map((att, aIdx) => {
                        let color = '#ef4444';
                        let bg = '#fef2f2';
                        let char = 'M';

                        if (att.status.includes('late')) { color = '#f59e0b'; bg = '#fffbeb'; char = 'V'; }
                        else if (att.status.includes('early')) { color = '#f59e0b'; bg = '#fffbeb'; char = 'L'; }

                        return (
                          <TouchableOpacity
                            key={att.id || aIdx}
                            onPress={() => {
                              if (!isReadOnly) {
                                setSelectedAttendanceForDetail(att);
                                setIsDetailModalVisible(true);
                              }
                            }}
                            style={{ alignItems: 'center', gap: 6 }}
                          >
                            <View style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: bg,
                              borderWidth: 2,
                              borderColor: color + '40',
                              alignItems: 'center',
                              justifyContent: 'center',
                              elevation: 2
                            }}>
                              <Text style={{ fontSize: 18, fontWeight: '900', color: color }}>{char}</Text>
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>
                              {formatDate(att.date).split('-').reverse().slice(0, 2).join('/')}
                              {!isDailyView && att.hour ? ` (H${att.hour})` : ''}
                            </Text>
                            <View style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: att.status.includes('justified') ? '#10b981' : '#ef4444'
                            }} />
                          </TouchableOpacity>
                        );
                      }) : (
                        <Text style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', marginLeft: 4 }}>
                          {t('no_records_found') || 'Nuk ka t dhna'}
                        </Text>
                      )}
                    </View>

                    {/* Summary Column on the Right */}
                    <View style={{ marginLeft: 12, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#f1f5f9', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: totalAbsent > 0 ? '#fef2f2' : '#f8fafc',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: totalAbsent > 0 ? '#ef4444' : '#e2e8f0',
                        }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: totalAbsent > 0 ? '#ef4444' : '#64748b' }}>{totalAbsent}</Text>
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748b', marginTop: 4, textTransform: 'uppercase' }}>
                          {isDailyView ? (t('daily') || 'Ditore') : (t('hourly') || 'Orare')}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'center' }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: totalUnjustifiedAbsences > 0 ? '#fef2f2' : '#f8fafc',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: totalUnjustifiedAbsences > 0 ? '#b91c1c' : '#e2e8f0',
                        }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: totalUnjustifiedAbsences > 0 ? '#b91c1c' : '#94a3b8' }}>{totalUnjustifiedAbsences}</Text>
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: totalUnjustifiedAbsences > 0 ? '#b91c1c' : '#94a3b8', marginTop: 4, textTransform: 'uppercase' }}>{t('unjustified_short') || 'Pa ars.'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderClassNotatGrid = (currentClass) => {
    if (!currentClass) return null;
    const classStudents = getDynamicClassStudents(currentClass.id);
    const studentIds = classStudents.map(s => s.id);

    // Filter grades by selected subject and current class students
    const subjectGrades = grades.filter(g =>
      g.subject === selectedSubject &&
      (studentIds.includes(g.student_id) || studentIds.includes(g.studentId)) &&
      (gradeSemester === 0 || getTermForDate(g.date, g.term) === gradeSemester)
    );

    const availableSubjects = getAvailableSubjects(currentClass);

    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        {/* Stylish Centered Header */}
        <View style={{
          backgroundColor: 'white',
          paddingTop: 16,
          paddingBottom: 24,
          paddingHorizontal: 20,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 15,
          elevation: 5,
          zIndex: 10
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}
              onPress={() => {
                setNavigation({ view: 'my-classes', data: null });
                setSelectedRegistryStudent(null);
                setSelectedActionStudent(null);
                setSelectedStudentForGrade(null);
              }}
            >
              <ArrowLeft size={22} color="#1e293b" />
              {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
            </TouchableOpacity>
          </View>

          {/* Subject Dropdown */}
          <View style={{ position: 'relative', zIndex: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>{t('lesson_subject')}</Text>
            <TouchableOpacity
              onPress={() => setIsSubjectDropdownVisible(!isSubjectDropdownVisible)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f1f5f9',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: isSubjectDropdownVisible ? '#2563eb' : 'transparent'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <BookIcon size={18} color="#2563eb" />
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>
                  {selectedSubject ? t(selectedSubject) : t('select_subject')}
                </Text>
              </View>
              <ChevronDown size={20} color="#64748b" style={{ transform: [{ rotate: isSubjectDropdownVisible ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {isSubjectDropdownVisible && (
              <View style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 8,
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
                elevation: 10,
                borderWidth: 1,
                borderColor: '#f1f5f9'
              }}>
                {availableSubjects.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => {
                      setSelectedSubject(sub);
                      setIsSubjectDropdownVisible(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: selectedSubject === sub ? '#eff6ff' : 'transparent',
                      marginBottom: 4
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: selectedSubject === sub ? '800' : '600',
                      color: selectedSubject === sub ? '#2563eb' : '#475569'
                    }}>{t(sub)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Semester Selector */}
        <View style={[styles.semesterSelector, { marginTop: 24, marginBottom: 12 }]}>
          {[
            { id: 0, label: t('all') },
            { id: 1, label: t('first_semester') },
            { id: 2, label: t('second_semester') },
          ].map(sem => (
            <TouchableOpacity
              key={sem.id}
              style={[styles.semesterChip, gradeSemester === sem.id && styles.activeSemesterChip]}
              onPress={() => setGradeSemester(sem.id)}
            >
              <Text style={[styles.semesterChipText, gradeSemester === sem.id && styles.activeSemesterChipText]}>
                {sem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedSubject ? (
          <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 120 }}>
              {classStudents.map((student, idx) => {
                const studentGrades = subjectGrades
                  .filter(g => g.student_id === student.id || g.studentId === student.id)
                  .sort((a, b) => new Date(a.date) - new Date(b.date));
                const avg = studentGrades.length > 0
                  ? (studentGrades.reduce((acc, curr) => acc + curr.grade, 0) / studentGrades.length).toFixed(1)
                  : '0.0';

                return (
                  <View key={student.id} style={{
                    flexDirection: 'row',
                    backgroundColor: 'white',
                    marginHorizontal: 16,
                    marginBottom: 12,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.02,
                    shadowRadius: 5,
                    elevation: 1,
                    overflow: 'hidden'
                  }}>
                    {/* Student Info */}
                    <View style={{ width: 140, padding: 16, borderRightWidth: 1, borderRightColor: '#f8fafc', justifyContent: 'center' }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 13 }} numberOfLines={2}>{student.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                        <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b' }}>{studentGrades.length}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>{t('grades')}</Text>
                      </View>
                    </View>

                    {/* Grades Area */}
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12, alignItems: 'center' }}>
                      {studentGrades.map((gradeObj, gIdx) => (
                        <View key={gradeObj.id || gIdx} style={{ alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8' }}>
                            {gradeObj.date.split('-').reverse().slice(0, 2).join('/')}
                          </Text>
                          <TouchableOpacity
                            onPress={() => !isReadOnly && handleEditGradeClick(gradeObj)}
                            disabled={isReadOnly}
                          >
                            <GradeRing value={gradeObj.grade} size={38} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {!isReadOnly && (
                        <TouchableOpacity
                          style={{
                            width: 38, height: 38, borderRadius: 19, backgroundColor: '#f8fafc',
                            alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
                            borderColor: '#e2e8f0', borderStyle: 'dashed'
                          }}
                          onPress={() => {
                            setSelectedStudentForGrade(student);
                            setIsGradeModalVisible(true);
                          }}
                        >
                          <Plus size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Average */}
                    <View style={{
                      width: 70,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8fafc',
                      borderLeftWidth: 1,
                      borderLeftColor: '#f1f5f9'
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>{t('average')}</Text>
                      <GradeRing value={avg} size={38} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 30, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <BookIcon size={40} color="#2563eb" />
            </View>
            <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '800', textAlign: 'center' }}>{t('select_subject')}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500', textAlign: 'center', marginTop: 4 }}>Ju lutem zgjidhni lndn pr t par notat</Text>
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
        <View style={[styles.navigationHeader, { flexDirection: 'row' }]}>
          <TouchableOpacity style={[styles.glassBackButton]} onPress={() => {
            setNavigation({ view: 'home', data: null });
            setSelectedRegistryStudent(null);
            setSelectedActionStudent(null);
            setSelectedStudentForGrade(null);
          }}>
            <ArrowLeft size={18} color="#1e293b" />
            {isDesktop && <Text style={styles.backButtonText}>{t('back')}</Text>}
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
              placeholder={t('search_classes')}
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
          renderItem={({ item }) => {
            const isExpanded = selectedClassId === item.id;

            return (
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
                <TouchableOpacity
                  onPress={() => setSelectedClassId(isExpanded ? null : item.id)}
                  style={[styles.classCardHeader, { marginBottom: (isDesktop || isExpanded) ? 16 : 0 }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classCardTitle}>{formatClassName(item)}</Text>
                    <Text style={styles.classCardSubtitle}>
                      {getDynamicClassStudents(item.id).length} {t('students_count') || 'nxënësit'}
                    </Text>
                  </View>
                  {!isDesktop && (
                    <ChevronDown
                      size={20}
                      color="#94a3b8"
                      style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                    />
                  )}
                </TouchableOpacity>

                {(isDesktop || isExpanded) && (
                  <View style={[styles.classActionGrid, !isDesktop && { flexDirection: 'column', gap: 8 }]}>
                    {!isReadOnly && (
                      <TouchableOpacity
                        style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#f5f3ff' }]}
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
                    )}

                    <TouchableOpacity
                      style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#f0fdf4' }]}
                      onPress={() => setNavigation({ view: 'class-agenda', data: item })}
                    >
                      <CalendarIcon size={18} color="#16a34a" />
                      <Text style={[styles.classActionText, { color: '#16a34a' }]} numberOfLines={1} adjustsFontSizeToFit>{t('agenda') === 'agenda' ? 'Agjenda' : (t('agenda') || 'Agjenda')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#eff6ff' }]}
                      onPress={() => setNavigation({ view: 'class-detail', data: item })}
                    >
                      <ClipboardList size={18} color="#2563eb" />
                      <Text style={[styles.classActionText, { color: '#2563eb' }]} numberOfLines={1} adjustsFontSizeToFit>{t('class_registry') === 'class_registry' ? 'Regjistri' : (t('class_registry') || 'Regjistri')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#fff1f2' }]}
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
                      style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#fdf4ff' }]}
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
                      style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#fff7ed' }]}
                      onPress={() => setNavigation({ view: 'class-attendance-grid', data: item })}
                    >
                      <Clock size={18} color="#ea580c" />
                      <Text style={[styles.classActionText, { color: '#ea580c' }]} numberOfLines={1} adjustsFontSizeToFit>{t('attendance') || 'Mungesat'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.classActionButton, !isDesktop && { minWidth: '100%', paddingVertical: 14 }, { backgroundColor: '#fffbeb' }]}
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
                )}
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              <View style={[styles.avatarPlaceholder, { width: 80, height: 80, borderRadius: 30 }]}>
                <BookIcon size={40} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyStateTitle}>{t('no_classes_assigned') || 'Nuk keni klasa t caktuara'}</Text>
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
        <Text style={styles.homeSubtitle}>{t('select_class_instruction') || 'Zgjidh klasn'}</Text>
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
              if (targetView === 'class-attendance-grid') {
                setTeacherAttendanceTab('daily');
                setSelectedSubject('Tutte');
              } else if (item.subjects && item.subjects.length > 0) {
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
            <Text style={styles.emptyStateTitle}>{t('no_classes_assigned') || 'Nuk keni klasa t caktuara'}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderActionModal = () => {
    if (!selectedActionStudent || isDetailModalVisible) return null;

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
                  {displayDateStr} {activeActionTab === 'attendance' && selectedAttendanceHour ? `"¢ Ora ${selectedAttendanceHour}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setIsActionModalVisible(false);
                setTempAttendanceStatus(null);
                setSelectedAttendanceHour(null);
                setIsHourDropdownVisible(false);
                setIsMinuteDropdownVisible(false);
                setGradeCustomDate(null);
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
              <PremiumDatePicker
                label={t('registration_date')}
                value={gradeCustomDate || formatDate(selectedDate)}
                onChange={(date) => setGradeCustomDate(date)}
                placeholder="DD/MM/YYYY"
              />
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
                    {[{ id: 'Me Shkrim', key: 'written' }, { id: 'Me Goj', key: 'oral' }, { id: 'Praktik', key: 'practical' }].map(type => (
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
                        setIsActionModalVisible(false);
                        showAlert(t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.', 'info');
                        return;
                      }
                      onAddGrade({
                        studentId: selectedActionStudent.id,
                        classId: selectedActionStudent.classId || selectedActionStudent.class_id,
                        subject: selectedSubject,
                        value: parseInt(gradeValue),
                        comment: gradeComment,
                        type: gradeType,
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
                        setIsActionModalVisible(false);
                        showAlert(t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.', 'info');
                        return;
                      }

                      setIsAttendanceSaving(true);
                      const finalTime = (tempAttendanceStatus === 'late' || tempAttendanceStatus === 'early_exit') ? `${selHour}:${selMinute}` : '';
                      const result = await onToggleAttendance(
                        selectedActionStudent.id,
                        gradeCustomDate || formatDate(selectedDate),
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
                        // Show time modal only if this is the first time the daily becomes late/early_exit
                        if (selectedAttendanceHour && selectedAttendanceHour > 0) {
                          const prevDaily = attendance.find(a =>
                            (a.student_id === selectedActionStudent.id || a.studentId === selectedActionStudent.id) &&
                            a.date === formatDate(selectedDate) &&
                            parseInt(a.hour || 0, 10) === 0
                          );
                          const prevDailyType = prevDaily?.status?.split(':')?.[0];
                          const newDaily = computeNewDailyStatus(
                            selectedActionStudent.id,
                            formatDate(selectedDate),
                            selectedAttendanceHour,
                            tempAttendanceStatus
                          );
                          // Only prompt for time if daily is becoming late/early_exit for the first time
                          if ((newDaily === 'late' || newDaily === 'early_exit') &&
                            (prevDailyType !== 'late' && prevDailyType !== 'early_exit')) {
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
                        setGradeCustomDate(null);
                      }
                      setSelectedAttendanceHour(null);
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
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10, opacity: selectedActionStudent?.id ? 1 : 0.7 }}
                    onPress={selectedActionStudent?.id ? () => setIsClassNote(!isClassNote) : null}
                    disabled={!selectedActionStudent?.id}
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
                        setIsActionModalVisible(false);
                        showAlert(t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.', 'info');
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
                      setGradeCustomDate(null);
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
                    .filter(a => (a.student_id === selectedActionStudent.id || a.studentId === selectedActionStudent.id) && !a.status.includes('present') && !a.status.includes('justified') && (a.hour === 0 || a.hour === '0'))
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
                              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{t('absence_of_day') || "Munges ditore"}</Text>
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

                      const dayStatus = isSchoolDay(new Date(finalDate));
                      if (!dayStatus.isWork) {
                        setIsLessonModalVisible(false);
                        showAlert(t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.', 'info');
                        return;
                      }

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
                  {editingLesson ? t('edit_lesson') || 'Modifiko Orn' : t('register_lesson')}
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
              <View style={{ marginBottom: 8 }}>
                <PremiumDatePicker
                  label={t('zgjidh_daten') || 'Zgjidh datn'}
                  value={lessonDate || formatDate(selectedDate)}
                  onChange={(date) => setLessonDate(date)}
                  placeholder="DD/MM/YYYY"
                />
              </View>
              <View style={{ height: 16 }} />

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



                <TouchableOpacity
                  style={[styles.premiumSubmitButton, !lessonTopic && { opacity: 0.5 }, { marginTop: 16 }]}
                  disabled={!lessonTopic}
                  onPress={() => {
                    const dayStatus = isSchoolDay(new Date(lessonDate || selectedDate));
                    if (!dayStatus.isWork) {
                      setIsLessonModalVisible(false);
                      showAlert(t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.', 'info');
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
                <PremiumDatePicker
                  label={t('zgjidh_daten') || 'Zgjidh datn'}
                  value={lessonDate || formatDate(selectedDate)}
                  onChange={(date) => setLessonDate(date)}
                  placeholder="DD/MM/YYYY"
                />
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

                <Text style={styles.label}>{t('test_description') || 'Prshkrimi i testit'}</Text>
                <TextInput
                  style={styles.premiumInput}
                  placeholder={t('test_description_placeholder') || 'Psh: Provim i dyt periodik...'}
                  value={testDescription}
                  onChangeText={setTestDescription}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.premiumSubmitButton, !testDescription && { opacity: 0.5 }, { backgroundColor: '#f43f5e', marginTop: 20 }]}
                  disabled={!testDescription}
                  onPress={async () => {
                    if (isReadOnly) return;
                    const dateToUse = lessonDate || formatDate(selectedDate);
                    const dayStatus = isSchoolDay(new Date(dateToUse));
                    if (!dayStatus.isWork) {
                      setIsTestModalVisible(false);
                      showAlert(t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.', 'info');
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
                <Text style={styles.modalTitleEmphasized}>{t('edit_lesson') || 'Ndrysho Orn'}</Text>
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



                <TouchableOpacity
                  style={[styles.premiumSubmitButton, (isUpdating || !lessonTopic) && { opacity: 0.5 }, { marginTop: 20 }]}
                  disabled={isUpdating || !lessonTopic}
                  onPress={async () => {
                    if (isReadOnly) return;
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
                      showAlert(t('lesson_updated_success') || 'Ora u prditsua me sukses!', 'success');
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
      .filter(l =>
        (l.class_id === currentClass.id || l.classId === currentClass.id) &&
        l.date === dateStr &&
        (l.academic_year === selectedGlobalAcademicYear || (!l.academic_year && !selectedGlobalAcademicYear))
      );

    const allHours = [1, 2, 3, 4, 5, 6, 7].filter(h => dayLessons.some(l => l.topic?.includes(`[Ora ${h}]`)));

    const getStatusForHour = (studentId, hour) => {
      const record = attendance.find(a =>
        (a.student_id === studentId || a.studentId === studentId) &&
        a.date === dateStr &&
        parseInt(a.hour) === parseInt(hour)
      );
      if (!record) {
        // PER POLICY: Hour 0 (Daily Summary) defaults to 'absent' for Past/Today on WORK DAYS
        const todayStr = formatDate(new Date());
        if (parseInt(hour) === 0 && dateStr <= todayStr && isSchoolDay(selectedDate).isWork) return 'absent';
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

      const timeMatch = status?.match(/(\d{1,2}):(\d{2})/);
      const timeVal = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '';

      if (status === 'absent' || status === 'absent_unjustified' || status === 'absent_justified') return <Text style={{ fontSize: 16, fontWeight: '900', color: '#ef4444' }}>M</Text>;

      if (status?.startsWith('late')) {
        return (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#d97706' }}>V</Text>
            {timeVal ? <Text style={{ fontSize: 8, fontWeight: '800', color: '#d97706', marginTop: -2 }}>{timeVal}</Text> : null}
          </View>
        );
      }
      if (status?.startsWith('early')) {
        return (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#ea580c' }}>L</Text>
            {timeVal ? <Text style={{ fontSize: 8, fontWeight: '800', color: '#ea580c', marginTop: -2 }}>{timeVal}</Text> : null}
          </View>
        );
      }
      return <Text style={{ fontSize: 18, color: '#e2e8f0', fontWeight: '300' }}>·</Text>;
    };

    const rowBtns = [
      { icon: ClipboardList, label: 'Notn', color: '#2563eb', bg: '#eff6ff', tab: 'grade', extra: () => { } },
      { icon: ShieldCheck, label: 'Disiplin', color: '#dc2626', bg: '#fff1f2', tab: 'note', extra: () => setIsClassNote(false) },
    ];

    const sel = selectedRegistryStudent;

    return (
      <View style={[styles.viewContainer, { flex: 1 }]}>
        {/* Compact Back Button + Action Toolbar */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 12 }}>
          {sel ? (
            <View style={{ backgroundColor: '#eff6ff', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 }}>
                <TouchableOpacity
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => {
                    setNavigation({ view: 'my-classes', data: null });
                    setSelectedRegistryStudent(null);
                    setSelectedActionStudent(null);
                    setSelectedStudentForGrade(null);
                  }}
                >
                  <ArrowLeft size={20} color="#2563eb" />
                </TouchableOpacity>
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
                  if (isReadOnly) return null;
                  return (
                    <TouchableOpacity
                      key={btn.label}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: btn.bg,
                        paddingVertical: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: btn.color + '20',
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 }}
                onPress={() => {
                  setNavigation({ view: 'my-classes', data: null });
                  setSelectedRegistryStudent(null);
                  setSelectedActionStudent(null);
                  setSelectedStudentForGrade(null);
                }}
              >
                <ArrowLeft size={22} color="#1e293b" />
              </TouchableOpacity>
              <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 10, borderStyle: 'dashed' }}>
                <Users size={18} color="#94a3b8" />
                <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', fontStyle: 'italic', flex: 1 }}>Klikoni mbi emrin e nxënësit pr veprime</Text>
              </View>
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
                  const teacher = hasLesson ? (user.teacherProfiles?.find(p => p.id === hasLesson.teacher_id) || (isMine ? user : { first_name: 'Ms', last_name: '' })) : null;

                  return (
                    <View key={hour} style={{ width: 68, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRightWidth: 1, borderRightColor: '#f1f5f9', backgroundColor: hasLesson ? (isMine ? '#eff6ff' : '#f8fafc') : '#f8fafc' }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: hasLesson ? (isMine ? '#2563eb' : '#64748b') : '#94a3b8', marginBottom: 2 }}>ORA</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: hasLesson ? (isMine ? '#1e293b' : '#64748b') : '#cbd5e1' }}>{hour}</Text>

                      {hasLesson && !isMine && (
                        <Text style={{ fontSize: 7, fontWeight: '800', color: '#64748b', marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
                          {teacher.last_name || teacher.first_name}
                        </Text>
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
                            disabled={isLocked || isReadOnly}
                            style={{
                              width: 68,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRightWidth: 1,
                              borderRightColor: '#f1f5f9',
                              paddingVertical: 12,
                              opacity: (isLocked || isReadOnly) ? 0.6 : 1
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
            style={[styles.glassBackButton]}
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
      showAlert("Keni shfrytzuar mundsin tuaj t vetme pr t ndryshuar kt not. Pr ndryshime t tjera, kontaktoni administratorin e shkolls.", "info");
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
            <View style={styles.modalHeaderScroll}>
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
              <PremiumDatePicker
                label={t('date_of_grade')}
                value={editGradeDate}
                onChange={(date) => setEditGradeDate(date)}
                placeholder="DD/MM/YYYY"
              />
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
                  {[{ id: 'Me Shkrim', key: 'written' }, { id: 'Me Goj', key: 'oral' }, { id: 'Praktik', key: 'practical' }].map(type => (
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

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, { flex: 1, backgroundColor: '#f1f5f9' }]}
                    onPress={() => handleDeleteGrade(editingGrade)}
                  >
                    <Text style={[styles.premiumSubmitButtonText, { color: '#ef4444' }]}>{t('delete')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, { flex: 1.5 }, !editGradeValue && { opacity: 0.5 }]}
                    disabled={!editGradeValue}
                    onPress={async () => {
                      if (isReadOnly) return;
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
                        showAlert(t('grade_updated_success') || "Nota u prditsua me sukses!", 'success');
                        setEditingGrade(null);
                      }
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>{t('save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderGradeHistory = (data) => {
    const history = grades
      .filter(g => (g.student_id === data.student.id || g.studentId === data.student.id) && g.subject === data.subject)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const average = history.length > 0
      ? (history.reduce((acc, curr) => acc + curr.grade, 0) / history.length).toFixed(1)
      : '0.0';

    return (
      <View style={styles.viewContainer}>
        <View style={[styles.navigationHeader, { flexDirection: 'row' }]}>
          <TouchableOpacity style={[styles.glassBackButton]} onPress={() => setNavigation({ view: 'notat-subjects', data: data })}>
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
          data={history}
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

                {!isReadOnly && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleEditGradeClick(item)}
                      style={styles.editIconContainer}
                    >
                      <Pencil size={22} color={(item.modification_count || 0) >= 1 ? '#cbd5e1' : '#2563eb'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteGrade(item)}
                      style={[styles.editIconContainer, { backgroundColor: '#fef2f2' }]}
                    >
                      <Trash2 size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('nuk_ka_nota')}</Text>}
        />
      </View>
    );
  };

  const renderGradeModal = () => {
    if (isDetailModalVisible) return null;
    return (
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
              {/* Date selection */}
              <View style={{ marginBottom: 16 }}>
                <PremiumDatePicker
                  label={t('registration_date') || 'Data e regjistrimit'}
                  value={formatDate(selectedDate)}
                  onChange={(date) => {
                    const d = new Date(date);
                    d.setHours(12, 0, 0, 0);
                    setSelectedDate(d);
                  }}
                  placeholder="DD/MM/YYYY"
                />
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
                {[
                  { id: 'Me Shkrim', key: 'written' },
                  { id: 'Me Goj', key: 'oral' },
                  { id: 'Praktik', key: 'practical' }
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
                  if (isReadOnly) return;
                  // Holiday Block Check
                  if (!isSchoolDay(selectedDate).isWork) {
                    setIsGradeModalVisible(false);
                    showAlert(
                      t('holiday_registration_blocked') || 'Data e przgjedhur sht fest/pushim. Nuk sht e mundur t caktohet not, munges, or msimi apo shnim disiplinor.',
                      'warning',
                      t('holiday_registration_blocked_title') || 'Pushim'
                    );
                    return;
                  }

                  onAddGrade({
                    studentId: selectedStudentForGrade.id,
                    classId: navigation.data?.id,
                    subject: selectedSubject,
                    value: parseInt(gradeValue),
                    comment: gradeComment,
                    type: gradeType,
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
  };




  const renderAgenda = (currentClass) => {
    const dateStr = formatDate(selectedDate);
    const dayLessons = lessons.filter(l => (l.class_id === currentClass?.id || l.classId === currentClass?.id) && l.date === dateStr);

    return (
      <View style={styles.viewContainer}>
        <View style={[styles.navigationHeader, { flexDirection: 'row' }]}>
          <TouchableOpacity style={[styles.glassBackButton]} onPress={() => setNavigation({ view: 'class-detail', data: currentClass })}>
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
      .filter(l =>
        (l.class_id === currentClass?.id || l.classId === currentClass?.id) &&
        l.date === selectedDateStr &&
        (l.academic_year === selectedGlobalAcademicYear || (!l.academic_year && !selectedGlobalAcademicYear))
      )
      .sort((a, b) => {
        const aHour = parseInt(a.topic?.match(/^\[Ora (\d+)\]/)?.[1] || 0);
        const bHour = parseInt(b.topic?.match(/^\[Ora (\d+)\]/)?.[1] || 0);
        return aHour - bHour;
      });

    const dateTests = (tests || []).filter(t => t.date === selectedDateStr && t.class_id === currentClass?.id);

    const schoolDayInfo = isSchoolDay(selectedDate);
    const isWorkDay = schoolDayInfo.isWork;

    return (
      <View style={styles.viewContainer}>
        <View style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 16,
          marginBottom: 10,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <TouchableOpacity
              style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, styles.glassBackButton, { position: 'absolute', left: 0 }]}
              onPress={() => setNavigation({ view: 'my-classes', data: null })}
            >
              <ArrowLeft size={18} color="#1e293b" />
              {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{formatClassName(currentClass)}</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>{t('agenda') || 'Ditari'}</Text>
            </View>
          </View>
        </View>

        {!isWorkDay && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 16,
            backgroundColor: '#fff7ed',
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderWidth: 1,
            borderColor: '#ffedd5'
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarIcon size={20} color="#f97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#9a3412' }}>{schoolDayInfo.reason || t('no_school_day')}</Text>
              <Text style={{ fontSize: 13, color: '#c2410c', fontWeight: '500' }}>{t('no_lessons_scheduled') || 'Nuk ka orë mësimore të planifikuara.'}</Text>
            </View>
          </View>
        )}

        {!isReadOnly && isWorkDay && (
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => {
                setSelectedSubject(null);
                setIsLessonModalVisible(true);
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isDesktop ? 8 : 4,
                backgroundColor: '#2563eb',
                paddingVertical: 12,
                borderRadius: 12,
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4
              }}
            >
              <Plus size={20} color="white" />
              {isDesktop && <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{t('add_lesson_short') || 'Shto orën'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedSubject(null);
                setIsTestModalVisible(true);
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isDesktop ? 8 : 4,
                backgroundColor: '#f43f5e',
                paddingVertical: 12,
                borderRadius: 12,
                shadowColor: '#f43f5e',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4
              }}
            >
              <ClipboardList size={20} color="white" />
              {isDesktop && <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>{t('regjistro_test_provim') || 'Regjistro Provim'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={{ paddingHorizontal: 20 }}>
            {/* Lessons Section */}
            {dayLessons.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                  <BookIcon size={18} color="#2563eb" />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>{t('lessons') || 'Msimi'}</Text>
                </View>
                {dayLessons
                  .filter(l => (agendaFilter === 'all' || l.teacher_id === user.id) && (l.academic_year === selectedGlobalAcademicYear || (!l.academic_year && !selectedGlobalAcademicYear)))
                  .map((lesson, idx) => {
                    const topicParts = lesson.topic?.match(/^\[Ora (\d+)\] (.*)/);
                    const hourNum = topicParts ? topicParts[1] : (lesson.hour || null);
                    const cleanTopic = topicParts ? topicParts[2] : lesson.topic;

                    const lessonHomeworkObj = (homework || []).find(hw =>
                      hw.class_id === lesson.class_id &&
                      hw.subject === lesson.subject &&
                      hw.due_date === lesson.date
                    );
                    const lessonHomework = lessonHomeworkObj?.description;

                    const teacher = user.teacherProfiles?.find(p => p.id === lesson.teacher_id) || (lesson.teacher_id === user.id ? user : { first_name: 'Msues', last_name: '' });
                    const isMyLesson = lesson.teacher_id === user.id;

                    return (
                      <View key={lesson.id} style={[styles.premiumCard, {
                        marginBottom: 16,
                        padding: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: isMyLesson ? '#2563eb' : '#cbd5e1',
                        backgroundColor: isMyLesson ? 'white' : '#f8fafc'
                      }]}>
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
                              {isMyLesson && !isReadOnly && (
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
                                        t('confirm_delete_lesson_msg') || 'Dshironi ta fshini kt or msimore?',
                                        async () => {
                                          const result = await onDeleteLesson(lesson.id);
                                          if (result?.error) {
                                            showAlert(result.error.message, 'error');
                                          } else {
                                            // Cleanup related attendance records to prevent ghost absences
                                            const match = lesson.topic?.match(/^\[Ora (\d+)\]/);
                                            const hNum = match ? match[1] : null;
                                            const currentClassStudents = getDynamicClassStudents(lesson.class_id || lesson.classId);

                                            if (hNum && currentClassStudents.length > 0) {
                                              // Loop through students who have records at this hour and reset them
                                              for (const student of currentClassStudents) {
                                                const hasRecord = (attendance || []).some(a =>
                                                  (a.student_id === student.id || a.studentId === student.id) &&
                                                  a.date === lesson.date &&
                                                  String(a.hour) === String(hNum) &&
                                                  a.status !== 'present'
                                                );

                                                if (hasRecord) {
                                                  await onToggleAttendance(student.id, lesson.date, 'present', hNum, '');
                                                }
                                              }
                                            }
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
                  const teacher = user.teacherProfiles?.find(p => p.id === test.teacher_id) || (test.teacher_id === user.id ? user : { first_name: 'Msues', last_name: '' });
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
                        {isMyTest && !isReadOnly && (
                          <TouchableOpacity
                            onPress={() => {
                              confirmDelete(t('confirm_delete_test') || 'Dshironi ta fshini kt test?', async () => {
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

            {dayLessons.length === 0 && dateTests.length === 0 && isWorkDay && (
              <View style={styles.emptyStateContainer}>
                <View style={[styles.avatarPlaceholder, { width: 80, height: 80, borderRadius: 30 }]}>
                  <CalendarIcon size={40} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyStateTitle}>{t('nuk_ka_ore') || 'Nuk ka asgj t regjistruar pr kt dit.'}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderCoordinatorClassSelection = (targetView, title) => (
    <View style={styles.viewContainer}>
      <View style={styles.navigationHeader}>
        <TouchableOpacity
          style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, styles.glassBackButton]}
          onPress={() => setNavigation({ view: 'home', data: null })}
        >
          <ArrowLeft size={18} color="#1e293b" />
          {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600' }}>{t('select_coordinated_class') || 'Zgjidhni klasn pr t ciln jeni kujdestar:'}</Text>
      </View>

      <FlatList
        data={coordinatedClasses}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.premiumCard, { marginBottom: 16, padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white' }]}
            onPress={() => setSelectedCoordinatorClassId(item.id)}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <LayoutGrid size={24} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{formatClassName(item)}</Text>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>
                {getDynamicClassStudents(item.id).length} {t('students_count')}
              </Text>
            </View>
            <ChevronRight size={22} color="#94a3b8" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <ShieldCheck size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateSubtitle}>{t('no_classes_coordinated') || 'Nuk koordinoni asnj klas'}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderCoordinatorNotes = () => {
    if (!selectedCoordinatorClassId && coordinatedClasses.length > 0) {
      return renderCoordinatorClassSelection('coordinator-notes', t('all_disciplinary_notes'));
    }
    const currentCls = coordinatedClasses.find(c => c.id === selectedCoordinatorClassId);

    if (!currentCls) return (
      <View style={styles.emptyStateContainer}>
        <ShieldCheck size={40} color="#cbd5e1" />
        <Text style={styles.emptyStateSubtitle}>{t('no_classes_coordinated') || 'Nuk koordinoni asnj klas'}</Text>
      </View>
    );

    const studentsInClass = getDynamicClassStudents(currentCls.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const classNotes = notes.filter(n => (n.class_id === currentCls.id || n.classId === currentCls.id));

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, styles.glassBackButton]} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Professional Class Switcher */}
        {coordinatedClasses.length > 1 && (
          <View style={styles.proTabContainer}>
            <TouchableOpacity
              style={{ marginRight: 12, padding: 8 }}
              onPress={() => setSelectedCoordinatorClassId(null)}
            >
              <ArrowLeft size={20} color="#64748b" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {coordinatedClasses.map(c => {
                const isActive = (selectedCoordinatorClassId === c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.proTab, isActive && styles.proTabActive]}
                    onPress={() => setSelectedCoordinatorClassId(c.id)}
                  >
                    <Text style={[styles.proTabText, isActive && styles.proTabTextActive]}>{formatClassName(c)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
          {studentsInClass.map(student => {
            const studentNotes = classNotes.filter(n => n.student_id === student.id || n.studentId === student.id);
            return (
              <View key={student.id} style={[styles.premiumCard, { marginBottom: 18, padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: studentNotes.length > 0 ? '#e11d48' : '#cbd5e1' }]}>
                <View style={{ backgroundColor: '#f8fafc', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#1e293b' }}>{(student.name || '?').charAt(0)}</Text>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#0f172a', flex: 1 }}>{student.name}</Text>
                  {studentNotes.length > 0 && (
                    <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#e11d48' }}>{studentNotes.length}</Text>
                    </View>
                  )}
                </View>

                <View style={{ padding: 16 }}>
                  {studentNotes.length > 0 ? (
                    <View style={{ gap: 12 }}>
                      {studentNotes.map(n => (
                        <View key={n.id} style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <CalendarIcon size={12} color="#64748b" />
                              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b' }}>{reformatDate(n.date)}</Text>
                            </View>
                            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748b' }}>
                                {user.teacherProfiles?.find(p => p.id === n.teacher_id)?.last_name || 'Prof'}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 14, color: '#475569', lineHeight: 20, fontWeight: '500' }}>{n.message || n.note}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>{t('no_notes_found')}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderGradeDetailModal = () => {
    const teacherId = selectedGradeForDetail?.teacher_id || selectedGradeForDetail?.teacherId;
    let gradeTeacherName = '';

    if (selectedGradeForDetail?.profiles) {
      gradeTeacherName = `${selectedGradeForDetail.profiles.first_name} ${selectedGradeForDetail.profiles.last_name}`;
    } else {
      const gradeTeacher = (teachers || []).find(tc => tc.id === teacherId);
      gradeTeacherName = gradeTeacher?.name || '';
    }

    return (
      <Modal visible={!!selectedGradeForDetail} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '65%' }]}>
            <View style={styles.modalHeaderScroll}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{t('grade_details') || 'Detajet e Nots'}</Text>
                <Text style={styles.modalSubtitle}>{selectedGradeForDetail?.subject}</Text>
                {gradeTeacherName ? (
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>{gradeTeacherName}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setSelectedGradeForDetail(null)} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, alignItems: 'center' }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: selectedGradeForDetail ? getGradeColor(selectedGradeForDetail.grade).bg : '#f1f5f9',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: selectedGradeForDetail ? getGradeColor(selectedGradeForDetail.grade).border : '#e2e8f0',
                marginBottom: 16
              }}>
                <Text style={{ fontSize: 32, fontWeight: '900', color: selectedGradeForDetail ? getGradeColor(selectedGradeForDetail.grade).text : '#64748b' }}>
                  {selectedGradeForDetail?.grade}
                </Text>
              </View>

              <View style={{ width: '100%', gap: 10 }}>
                <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{t('date') || 'Data'}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>{selectedGradeForDetail ? reformatDate(selectedGradeForDetail.date) : ''}</Text>
                </View>

                <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{t('grade_type') || 'Lloji i vlersimit'}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>{selectedGradeForDetail?.grade_type || 'Vlersim i rregullt'}</Text>
                </View>

                <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>{t('comment') || 'Koment'}</Text>
                  <Text style={{ fontSize: 14, color: '#475569', fontWeight: '600', fontStyle: 'italic' }}>
                    {selectedGradeForDetail?.description || t('no_comment') || 'Nuk ka koment'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedGradeForDetail(null)}
                style={{
                  marginTop: 20,
                  backgroundColor: '#2563eb',
                  paddingVertical: 12,
                  paddingHorizontal: 40,
                  borderRadius: 16,
                  width: '100%',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>{t('close') || 'Mbyll'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCoordinatorGrades = () => {
    if (!selectedCoordinatorClassId && coordinatedClasses.length > 0) {
      return renderCoordinatorClassSelection('coordinator-grades', t('full_grades_matrix'));
    }
    const currentCls = coordinatedClasses.find(c => c.id === selectedCoordinatorClassId);
    if (!currentCls) return null;

    const studentsInClass = getDynamicClassStudents(currentCls.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const classGrades = grades.filter(g =>
      (g.class_id === currentCls.id || g.classId === currentCls.id) &&
      (g.academic_year === selectedGlobalAcademicYear || (!g.academic_year && !selectedGlobalAcademicYear)) &&
      (gradeSemester === 0 || getTermForDate(g.date, g.term) === gradeSemester)
    );

    // Use subjects taught in this class, sorted alphabetically
    const subjectsWithGrades = [...new Set(classGrades.map(g => g.subject))];
    const classSubjects = getAvailableSubjects(currentCls);
    const allSubjects = ['Tutte', ...[...new Set([...classSubjects, ...subjectsWithGrades])].sort((a, b) => a.localeCompare(b, 'sq'))];

    // Auto-select 'Tutte' if none selected yet
    if (!selectedCoordinatorSubject) {
      setSelectedCoordinatorSubject('Tutte');
    }

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, styles.glassBackButton]} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Professional Class Switcher */}
        {coordinatedClasses.length > 1 && (
          <View style={styles.proTabContainer}>
            <TouchableOpacity
              style={{ marginRight: 12, padding: 8 }}
              onPress={() => {
                setSelectedCoordinatorClassId(null);
                setSelectedCoordinatorSubject(null);
              }}
            >
              <ArrowLeft size={20} color="#64748b" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {coordinatedClasses.map(c => {
                const isActive = (selectedCoordinatorClassId === c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.proTab, isActive && styles.proTabActive]}
                    onPress={() => {
                      setSelectedCoordinatorClassId(c.id);
                      setSelectedCoordinatorSubject(null);
                    }}
                  >
                    <Text style={[styles.proTabText, isActive && styles.proTabTextActive]}>{formatClassName(c)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Premium Subject Dropdown */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('select_subject') || 'Zgjidh Lndn'}</Text>
          <TouchableOpacity
            onPress={() => setIsSubjectPickerVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'white',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                <BookIcon size={18} color="#2563eb" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                {selectedCoordinatorSubject === 'Tutte' ? (t('all_subjects') || 'T gjitha lndt') : (selectedCoordinatorSubject || (t('select_subject') || 'Zgjidh Lndn'))}
              </Text>
            </View>
            <ChevronDown size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Semester 3-Switch Tab */}
        <View style={styles.semesterSelector}>
          {[
            { id: 0, label: t('all') || 'T gjitha' },
            { id: 1, label: t('first_semester') || 'Semestri 1' },
            { id: 2, label: t('second_semester') || 'Semestri 2' },
          ].map(sem => (
            <TouchableOpacity
              key={sem.id}
              style={[styles.semesterChip, gradeSemester === sem.id && styles.activeSemesterChip]}
              onPress={() => setGradeSemester(sem.id)}
            >
              <Text style={[styles.semesterChipText, gradeSemester === sem.id && styles.activeSemesterChipText]}>
                {sem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject Picker Modal */}
        <Modal visible={isSubjectPickerVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.premiumActionModal, { maxHeight: '70%' }]}>
              <View style={styles.modalHeaderScroll}>
                <Text style={styles.modalTitleEmphasized}>{t('select_subject') || 'Zgjidh Lndn'}</Text>
                <TouchableOpacity onPress={() => setIsSubjectPickerVisible(false)} style={styles.closeModalBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ padding: 10 }} showsVerticalScrollIndicator={false}>
                {allSubjects.map(sub => (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => {
                      setSelectedCoordinatorSubject(sub);
                      setIsSubjectPickerVisible(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderRadius: 14,
                      backgroundColor: selectedCoordinatorSubject === sub ? '#eff6ff' : 'white',
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: selectedCoordinatorSubject === sub ? '#2563eb' : '#f1f5f9'
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: selectedCoordinatorSubject === sub ? '#2563eb' : '#475569' }}>
                      {sub === 'Tutte' ? (t('all_subjects') || 'T gjitha lndt') : sub}
                    </Text>
                    {selectedCoordinatorSubject === sub && <Check size={20} color="#2563eb" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 32, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {studentsInClass.map((student, idx) => {
              const sGrades = classGrades.filter(g =>
                (g.student_id === student.id || g.studentId === student.id) &&
                (selectedCoordinatorSubject === 'Tutte' || g.subject === selectedCoordinatorSubject)
              );
              const avg = sGrades.length > 0 ? (sGrades.reduce((acc, curr) => acc + curr.grade, 0) / sGrades.length).toFixed(1) : '0.0';

              return (
                <View key={student.id} style={{
                  backgroundColor: 'white',
                  borderRadius: 24,
                  marginBottom: 16,
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.03,
                  shadowRadius: 10,
                  elevation: 2
                }}>
                  {/* Student Avatar & Info */}
                  <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: idx % 2 === 0 ? '#eff6ff' : '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 15, borderWidth: 1, borderColor: idx % 2 === 0 ? '#dbeafe' : '#e2e8f0' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: idx % 2 === 0 ? '#2563eb' : '#64748b' }}>
                      {(student.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>{student.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
                      {sGrades.sort((a, b) => new Date(a.date) - new Date(b.date)).map(g => (
                        <TouchableOpacity
                          key={g.id}
                          onPress={() => setSelectedGradeForDetail(g)}
                          style={{ alignItems: 'center', gap: 6 }}
                        >
                          <View style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: getGradeColor(g.grade).bg,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 2.5,
                            borderColor: getGradeColor(g.grade).border,
                            shadowColor: getGradeColor(g.grade).text,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 2
                          }}>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: getGradeColor(g.grade).text }}>{g.grade}</Text>
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b' }}>{g.date.split('-').reverse().slice(0, 2).join('/')}</Text>
                        </TouchableOpacity>
                      ))}
                      {sGrades.length === 0 && (
                        <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>{t('no_grades') || 'Pa nota'}</Text>
                      )}
                    </View>
                  </View>

                  {/* Average Ring */}
                  <View style={{ marginLeft: 15, alignItems: 'center' }}>
                    <GradeRing value={avg} size={54} />
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', marginTop: 4, textTransform: 'uppercase' }}>{t('average_short')}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
        {renderGradeDetailModal()}
      </View>
    );
  };


  const renderCoordinatorAttendance = () => {
    if (!selectedCoordinatorClassId && coordinatedClasses.length > 0) {
      return renderCoordinatorClassSelection('coordinator-attendance', t('attendance_oversight'));
    }
    const currentCls = coordinatedClasses.find(c => c.id === selectedCoordinatorClassId);

    if (!currentCls) return (
      <View style={styles.emptyStateContainer}>
        <UserCheck size={40} color="#cbd5e1" />
        <Text style={styles.emptyStateSubtitle}>{t('no_classes_coordinated') || 'Nuk koordinoni asnj klas'}</Text>
      </View>
    );

    const studentsInClass = getDynamicClassStudents(currentCls.id).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const classAttendance = (attendance || []).filter(a =>
      (a.class_id === currentCls.id || a.classId === currentCls.id) &&
      (a.academic_year === selectedGlobalAcademicYear || (!a.academic_year && !selectedGlobalAcademicYear)) &&
      (gradeSemester === 0 || getTermForDate(a.date, a.term) === gradeSemester)
    );

    // Get class subjects for hourly filtering - broaden discovery for coordinators
    const subjectsWithAttendance = [...new Set(classAttendance.map(a => a.subject).filter(Boolean))];
    const subjectsFromLessons = [...new Set((lessons || []).filter(l => l.class_id === currentCls.id || l.classId === currentCls.id).map(l => l.subject).filter(Boolean))];
    const classSubjects = currentCls.subjects || [];

    const availableAttendanceSubjects = [...new Set([...classSubjects, ...subjectsWithAttendance, ...subjectsFromLessons])].filter(s => s !== 'Msues').sort((a, b) => a.localeCompare(b, 'sq'));

    if (!selectedCoordinatorAttendanceSubject) {
      setSelectedCoordinatorAttendanceSubject('Tutte');
    }

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, styles.glassBackButton]} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            {isDesktop && <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b" }}>{t('back')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Professional Class Switcher */}
        {coordinatedClasses.length > 1 && (
          <View style={styles.proTabContainer}>
            <TouchableOpacity
              style={{ marginRight: 12, padding: 8 }}
              onPress={() => {
                setSelectedCoordinatorClassId(null);
                setSelectedCoordinatorSubject(null);
                setSelectedCoordinatorAttendanceSubject(null);
              }}
            >
              <ArrowLeft size={20} color="#64748b" />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {coordinatedClasses.map(c => {
                const isActive = (selectedCoordinatorClassId === c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.proTab, isActive && styles.proTabActive]}
                    onPress={() => {
                      setSelectedCoordinatorClassId(c.id);
                      setSelectedCoordinatorAttendanceSubject(null);
                    }}
                  >
                    <Text style={[styles.proTabText, isActive && styles.proTabTextActive]}>{formatClassName(c)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Tab Switcher: Daily vs Hourly */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 12 }}>
          <TouchableOpacity
            onPress={() => setCoordinatorAttendanceTab('daily')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: coordinatorAttendanceTab === 'daily' ? '#2563eb' : 'white',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: coordinatorAttendanceTab === 'daily' ? '#2563eb' : '#e2e8f0',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <CalendarIcon size={18} color={coordinatorAttendanceTab === 'daily' ? 'white' : '#64748b'} />
            <Text style={{ fontWeight: '800', color: coordinatorAttendanceTab === 'daily' ? 'white' : '#64748b' }}>
              {t('daily') || 'Ditore'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCoordinatorAttendanceTab('hourly')}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: coordinatorAttendanceTab === 'hourly' ? '#2563eb' : 'white',
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: coordinatorAttendanceTab === 'hourly' ? '#2563eb' : '#e2e8f0',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Clock size={18} color={coordinatorAttendanceTab === 'hourly' ? 'white' : '#64748b'} />
            <Text style={{ fontWeight: '800', color: coordinatorAttendanceTab === 'hourly' ? 'white' : '#64748b' }}>
              {t('hourly') || 'Orare'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subject Dropdown for Hourly tab */}
        {coordinatorAttendanceTab === 'hourly' && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setIsAttendanceSubjectPickerVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'white',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                  <BookIcon size={18} color="#2563eb" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b' }}>
                  {selectedCoordinatorAttendanceSubject === 'Tutte' ? (t('all_subjects') || 'T gjitha lndt') : (selectedCoordinatorAttendanceSubject || t('select_subject'))}
                </Text>
              </View>
              <ChevronDown size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.semesterSelector}>
          {[
            { id: 0, label: t('all') || 'T gjitha' },
            { id: 1, label: t('first_semester') || 'Semestri 1' },
            { id: 2, label: t('second_semester') || 'Semestri 2' },
          ].map(sem => (
            <TouchableOpacity
              key={sem.id}
              style={[styles.semesterChip, gradeSemester === sem.id && styles.activeSemesterChip]}
              onPress={() => setGradeSemester(sem.id)}
            >
              <Text style={[styles.semesterChipText, gradeSemester === sem.id && styles.activeSemesterChipText]}>
                {sem.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
          <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {studentsInClass.map((student, idx) => {
              const sAttendanceMap = new Map();
              classAttendance.forEach(a => {
                const isStudent = a.student_id === student.id || a.studentId === student.id;
                if (!isStudent) return;
                if (a.status === 'present') return;

                if (coordinatorAttendanceTab === 'daily') {
                  if (a.hour === 0 || a.hour === '0') {
                    sAttendanceMap.set(formatDate(a.date), a);
                  }
                } else {
                  const hourVal = parseInt(a.hour || 0, 10);
                  if (hourVal > 0) {
                    const dateKey = formatDate(a.date);
                    const aSubject = a.subject || (lessons.find(l =>
                      (l.class_id === currentCls.id || l.classId === currentCls.id) &&
                      formatDate(l.date) === dateKey &&
                      l.topic?.includes(`[Ora ${a.hour}]`)
                    )?.subject);

                    if (selectedCoordinatorAttendanceSubject === 'Tutte' || aSubject === selectedCoordinatorAttendanceSubject) {
                      // Include subject in key to show all absences if Tutte is selected, 
                      // even if they happen at the same hour (e.g. split class)
                      const subjectKey = (selectedCoordinatorAttendanceSubject === 'Tutte') ? `-${aSubject || 'NoSub'}` : '';
                      sAttendanceMap.set(`${dateKey}-${a.hour}${subjectKey}`, a);
                    }
                  }
                }
              });
              const sAttendance = Array.from(sAttendanceMap.values());

              sAttendance.sort((a, b) => new Date(a.date) - new Date(b.date));

              const totalAbsent = sAttendance.filter(a => a.status.includes('absent') && !a.status.includes('late') && !a.status.includes('early')).length;
              const totalLate = sAttendance.filter(a => a.status.includes('late')).length;
              const totalEarly = sAttendance.filter(a => a.status.includes('early')).length;
              const totalUnjustified = sAttendance.filter(a => !a.status.includes('justified') && !a.status.includes('present')).length;
              const totalUnjustifiedAbsences = sAttendance.filter(a => !a.status.includes('justified') && !a.status.includes('present')).length;

              return (
                <View key={student.id} style={{
                  backgroundColor: 'white',
                  borderRadius: 24,
                  marginBottom: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#f1f5f9',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.03,
                  shadowRadius: 10,
                  elevation: 2
                }}>
                  {/* Top Header: Student Info */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      backgroundColor: idx % 2 === 0 ? '#eff6ff' : '#f8fafc',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: idx % 2 === 0 ? '#dbeafe' : '#e2e8f0'
                    }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: idx % 2 === 0 ? '#2563eb' : '#64748b' }}>
                        {(student.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#0f172a' }}>{student.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                        {totalAbsent > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                              {totalAbsent} {coordinatorAttendanceTab === 'hourly' ? (t('hourly_absences_unit') || 'Ore Mungese') : (t('absent') || 'Mungesa')}
                            </Text>
                          </View>
                        )}
                        {totalUnjustifiedAbsences > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#b91c1c' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#b91c1c' }}>
                              {totalUnjustifiedAbsences} {t('unjustified_absences_short') || 'Pa arsye'}
                            </Text>
                          </View>
                        )}
                        {totalLate > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>{totalLate} {t('late') || 'Vones'}</Text>
                          </View>
                        )}
                        {totalEarly > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b' }}>{totalEarly} {t('early_exit') || 'Largim'}</Text>
                          </View>
                        )}
                        {/* Old general unjustified counter - removing as it might be redundant now, or keep it if it covers late/early too */}
                        {(totalUnjustified - totalUnjustifiedAbsences) > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#b91c1c', opacity: 0.6 }} />
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#b91c1c', opacity: 0.6 }}>{(totalUnjustified - totalUnjustifiedAbsences)} {t('other_unjustified') || 'Tjera pa ars.'}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Attendance Content & Right Summary */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Markers Grid */}
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {(() => {
                        const displayAtt = [];
                        if (coordinatorAttendanceTab === 'daily') {
                          const seenDates = new Set();
                          const sorted = [...sAttendance].sort((a, b) => {
                            const rank = s => s.includes('late') || s.includes('early') ? 2 : (s.includes('absent') ? 1 : 0);
                            return rank(b.status) - rank(a.status);
                          });
                          for (const att of sorted) {
                            if (!seenDates.has(att.date)) {
                              displayAtt.push(att);
                              seenDates.add(att.date);
                            }
                          }
                        } else {
                          displayAtt.push(...sAttendance);
                        }
                        displayAtt.sort((a, b) => new Date(a.date) - new Date(b.date));

                        return displayAtt.length > 0 ? displayAtt.map((att, aIdx) => {
                          let color = '#ef4444';
                          let bg = '#fef2f2';
                          let char = 'M';

                          if (att.status.includes('late')) { color = '#f59e0b'; bg = '#fffbeb'; char = 'V'; }
                          else if (att.status.includes('early')) { color = '#f59e0b'; bg = '#fffbeb'; char = 'L'; }

                          return (
                            <TouchableOpacity
                              key={att.id || aIdx}
                              onPress={() => {
                                // Aggressively clear ALL other modal states to prevent double-modals
                                setIsActionModalVisible(false);
                                setSelectedActionStudent(null);
                                setSelectedRegistryStudent(null);
                                setSelectedStudentForGrade(null);
                                setIsGradeModalVisible(false);
                                setIsSubjectPickerVisible(false);
                                setIsAttendanceSubjectPickerVisible(false);

                                setSelectedAttendanceForDetail(att);
                                setIsDetailModalVisible(true);
                              }}
                              style={{ alignItems: 'center', gap: 6 }}
                            >
                              <View style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: bg,
                                borderWidth: 2,
                                borderColor: color + '40',
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: color,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2
                              }}>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: color }}>{char}</Text>
                              </View>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b' }}>
                                {att.date.split('-').reverse().slice(0, 2).join('/')}
                                {coordinatorAttendanceTab === 'hourly' && att.hour ? ` (H${att.hour})` : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        }) : (
                          <Text style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic', marginLeft: 4 }}>
                            {t('no_records_found') || 'Nuk ka t dhna'}
                          </Text>
                        );
                      })()}
                    </View>

                    {/* Right Summary Columns */}
                    <View style={{ marginLeft: 16, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: '#f1f5f9', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: totalAbsent > 0 ? '#fef2f2' : '#f8fafc',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: totalAbsent > 0 ? '#ef4444' : '#e2e8f0',
                        }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: totalAbsent > 0 ? '#ef4444' : '#64748b' }}>{totalAbsent}</Text>
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#64748b', marginTop: 4, textTransform: 'uppercase' }}>
                          {coordinatorAttendanceTab === 'daily' ? (t('daily') || 'Ditore') : (t('hourly') || 'Orare')}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'center' }}>
                        <View style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: totalUnjustifiedAbsences > 0 ? '#fef2f2' : '#f8fafc',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 2,
                          borderColor: totalUnjustifiedAbsences > 0 ? '#b91c1c' : '#e2e8f0',
                        }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: totalUnjustifiedAbsences > 0 ? '#b91c1c' : '#94a3b8' }}>{totalUnjustifiedAbsences}</Text>
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: totalUnjustifiedAbsences > 0 ? '#b91c1c' : '#94a3b8', marginTop: 4, textTransform: 'uppercase' }}>{t('unjustified_short') || 'Pa ars.'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>


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
                    {(() => {
                      const d = new Date(item.created_at);
                      const day = String(d.getDate()).padStart(2, '0');
                      const m = d.getMonth();
                      const year = d.getFullYear();
                      const months = language === 'sq'
                        ? ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gsh', 'Sht', 'Tet', 'Nn', 'Dhj']
                        : language === 'sr'
                          ? ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Avg', 'Sep', 'Okt', 'Nov', 'Dec']
                          : ['Oca', 'Åžub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'AÄŸu', 'Eyl', 'Eki', 'Kas', 'Ara'];
                      return `${day} ${months[m]} ${year}`;
                    })()}
                  </Text>
                  {hasAttachment && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      <FileText size={11} color="#2563eb" />
                      <Text style={{ fontSize: 11, color: '#2563eb', fontWeight: '700' }}>{t('attachment') || 'Bashkngjitje'}</Text>
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
        <View style={[styles.headerTopBar, isDesktop && { paddingHorizontal: 20 }]}>
          <View style={styles.headerLogo}>
            <View style={styles.logoIcon}>
              <BookIcon size={18} color="white" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Ditari Elektronik</Text>
            </View>
          </View>

          {isDesktop && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, flex: 1, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => { setActiveView('home'); setNavigation({ view: 'home', data: null }); }} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: activeView === 'home' ? '#eff6ff' : 'transparent' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: activeView === 'home' ? '#2563eb' : '#64748b' }}>{t('ballina') || 'Ballina'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setActiveView('lajmerimet'); setNavigation({ view: 'home', data: null }); }} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: activeView === 'lajmerimet' ? '#eff6ff' : 'transparent' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: activeView === 'lajmerimet' ? '#2563eb' : '#64748b' }}>{t('notices') || 'Lajmrime'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <ProfileDropdown
            user={user}
            t={t}
            onLogout={onLogout}
            onChangePassword={() => setIsPasswordModalVisible(true)}
            onHelp={() => Linking.openURL('mailto:info@ditari-elektronik.com')}
            availableAcademicYears={availableAcademicYears}
            selectedGlobalAcademicYear={selectedGlobalAcademicYear}
            changeAcademicYear={onChangeAcademicYear}
            schoolCurrentYear={(schools || []).find(s => s.id === user.school_id)?.current_year}
          />
        </View>
        {(activeView === 'home' && (navigation.view === 'class-agenda' || navigation.view === 'class-detail')) && (() => {
          const matchedSchool = (schools || []).find(s => s.id === user.school_id || s.id === user.schoolId) || (schools && schools.length > 0 ? schools[0] : null);

          let startDate = matchedSchool?.school_year_start;
          let endDate = matchedSchool?.school_year_end;

          if (selectedGlobalAcademicYear) {
            const archived = (academicYearHistory || []).find(h => h.academic_year === selectedGlobalAcademicYear);

            if (archived?.school_year_start && archived?.school_year_end) {
              startDate = archived.school_year_start;
              endDate = archived.school_year_end;
            } else {
              const startYear = parseInt(selectedGlobalAcademicYear.split('/')[0]);
              if (!isNaN(startYear)) {
                startDate = `${startYear}-09-01`;
                endDate = `${startYear + 1}-06-30`;
              }
            }
          }

          return (
            <CalendarStrip
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              schoolStartDate={startDate}
              schoolEndDate={endDate}
              schoolCalendar={schoolCalendar}
            />
          );
        })()}

        {isReadOnly && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff7ed',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#ffedd5',
            gap: 12
          }}>
            <AlertTriangle size={18} color="#ea580c" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#ea580c', flex: 1 }}>
              {t('readonly_year_banner')?.replace('{{year}}', selectedGlobalAcademicYear) || `Po shikoni vitin: ${selectedGlobalAcademicYear} (Vetm Lexim)`}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.scrollContent, isDesktop && { flex: 1, paddingHorizontal: 20 }]}>
        {activeView === 'home' && navigation.view === 'home' && renderHome()}
        {activeView === 'home' && navigation.view === 'my-classes' && renderMyClasses()}
        {activeView === 'home' && navigation.view === 'class-detail' && renderStudentSelection(navigation.data)}
        {activeView === 'home' && navigation.view === 'notat-students' && renderStudentSelection(navigation.data)}
        {activeView === 'home' && navigation.view === 'notat-subjects' && renderSubjectSelection(navigation.data)}
        {activeView === 'home' && navigation.view === 'class-notat-grid' && renderClassNotatGrid(navigation.data)}
        {activeView === 'home' && navigation.view === 'class-attendance-grid' && renderClassAttendanceGrid(navigation.data)}
        {activeView === 'home' && navigation.view === 'notat-history' && renderGradeHistory(navigation.data)}
        {activeView === 'home' && navigation.view === 'class-agenda' && renderClassAgenda(navigation.data)}
        {activeView === 'home' && navigation.view === 'coordinator-notes' && renderCoordinatorNotes()}
        {activeView === 'home' && navigation.view === 'coordinator-grades' && renderCoordinatorGrades()}
        {activeView === 'home' && navigation.view === 'coordinator-attendance' && renderCoordinatorAttendance()}
        {activeView === 'lajmerimet' && navigation.view === 'home' && renderNotices()}
      </View>

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

      {/* Global Attendance Subject Picker Modal */}
      <Modal visible={isAttendanceSubjectPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '70%' }]}>
            <View style={styles.modalHeaderScroll}>
              <Text style={styles.modalTitleEmphasized}>{t('select_subject') || 'Zgjidh Lndn'}</Text>
              <TouchableOpacity onPress={() => setIsAttendanceSubjectPickerVisible(false)} style={styles.closeModalBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 10 }} showsVerticalScrollIndicator={false}>
              {(() => {
                let options = [];
                let currentVal = '';
                let onSelect = (val) => { };

                if (navigation.view === 'class-attendance-grid') {
                  const classSubs = navigation.data?.subjects || [];
                  const teacherSubjects = user.subjects || [];
                  const filteredSubs = classSubs.filter(s => teacherSubjects.includes(s));
                  options = ['Tutte', ...filteredSubs];
                  currentVal = selectedSubject;
                  onSelect = (val) => setSelectedSubject(val);
                } else if (navigation.view === 'coordinator-attendance') {
                  const currentCls = coordinatedClasses.find(c => c.id === selectedCoordinatorClassId);
                  if (currentCls) {
                    const cAttendance = (attendance || []).filter(a => (a.class_id === currentCls.id || a.classId === currentCls.id));
                    const subjectsWithAttendance = [...new Set(cAttendance.map(a => a.subject).filter(Boolean))];
                    const subjectsFromLessons = [...new Set((lessons || []).filter(l => l.class_id === currentCls.id || l.classId === currentCls.id).map(l => l.subject).filter(Boolean))];
                    const classSubjects = currentCls.subjects || [];

                    const availableSubs = [...new Set([...classSubjects, ...subjectsWithAttendance, ...subjectsFromLessons])].filter(s => s !== 'Msues').sort((a, b) => a.localeCompare(b, 'sq'));
                    options = ['Tutte', ...availableSubs];
                  }
                  currentVal = selectedCoordinatorAttendanceSubject;
                  onSelect = (val) => setSelectedCoordinatorAttendanceSubject(val);
                }

                return options.map(sub => (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => {
                      onSelect(sub);
                      setIsAttendanceSubjectPickerVisible(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderRadius: 14,
                      backgroundColor: currentVal === sub ? '#eff6ff' : 'white',
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: currentVal === sub ? '#2563eb' : '#f1f5f9'
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: currentVal === sub ? '#2563eb' : '#475569' }}>
                      {sub === 'Tutte' ? (t('all_subjects') || 'T gjitha lndt') : t(sub)}
                    </Text>
                    {currentVal === sub && <Check size={20} color="#2563eb" />}
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Attendance Detail Modal (Moved here to be available globally) */}
      <Modal visible={isDetailModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { padding: 24, alignItems: 'center' }]}>
            <View style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: (() => {
                const s = selectedAttendanceForDetail?.status || '';
                if (s.includes('late')) return '#fffbeb';
                if (s.includes('early')) return '#f5f3ff';
                return '#fef2f2';
              })(),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: (() => {
                const s = selectedAttendanceForDetail?.status || '';
                if (s.includes('late')) return '#fef3c7';
                if (s.includes('early')) return '#ede9fe';
                return '#fee2e2';
              })(),
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 28,
                fontWeight: '900',
                color: (() => {
                  const s = selectedAttendanceForDetail?.status || '';
                  if (s.includes('late')) return '#f59e0b';
                  if (s.includes('early')) return '#8b5cf6';
                  return '#ef4444';
                })()
              }}>
                {selectedAttendanceForDetail?.status.includes('late') ? 'V' : (selectedAttendanceForDetail?.status.includes('early') ? 'L' : 'M')}
              </Text>
            </View>

            <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 12, textAlign: 'center' }}>
              {(() => {
                const s = selectedAttendanceForDetail?.status || '';
                let type = t('absent') || 'Munges';
                if (s.includes('late')) type = t('late') || 'Vones';
                if (s.includes('early')) type = t('early_exit') || 'Largim';

                const isJustified = s.includes('justified');
                return type;
              })()}
            </Text>

            <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 20, paddingVertical: 18, borderRadius: 20, width: '100%', marginBottom: 30, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 15 }}>{t('date') || 'Data'}:</Text>
                <Text style={{ color: '#1e293b', fontWeight: '900', fontSize: 15 }}>{selectedAttendanceForDetail ? formatDisplayDate(selectedAttendanceForDetail.date) : ''}</Text>
              </View>
              {selectedAttendanceForDetail?.hour > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                  <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 15 }}>{t('hour') || 'Ora'}:</Text>
                  <Text style={{ color: '#2563eb', fontWeight: '900', fontSize: 18 }}>{selectedAttendanceForDetail.hour}h</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 15 }}>{t('status') || 'Statusi'}:</Text>
                <Text style={{
                  color: selectedAttendanceForDetail?.status.includes('justified') ? '#059669' : '#ef4444',
                  fontWeight: '900',
                  fontSize: 15
                }}>
                  {selectedAttendanceForDetail?.status.includes('justified') ? (t('justified') || 'Arsyetuar') : (t('unjustified') || 'Paarsyetuar')}
                </Text>
              </View>
              {(selectedAttendanceForDetail?.reason || selectedAttendanceForDetail?.comment || selectedAttendanceForDetail?.note || (selectedAttendanceForDetail?.status?.includes('justified') && selectedAttendanceForDetail?.status?.split(':').length > 1)) && (
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                  <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 12, marginBottom: 8, textTransform: 'uppercase' }}>
                    {selectedAttendanceForDetail?.status?.includes('justified') ? (t('justification_reason') || 'Arsyeja e Arsyetimit') : (t('reason') || 'Arsyeja')}:
                  </Text>
                  <Text style={{ color: '#1e293b', fontWeight: '600', fontSize: 16, lineHeight: 22 }}>
                    {(() => {
                      const s = selectedAttendanceForDetail?.status || '';
                      if (s.includes('justified')) {
                        const parts = s.split(':');
                        // Format: TYPE:justified:REASON or TYPE:TIME:justified:REASON
                        if (parts.includes('justified')) {
                          const idx = parts.indexOf('justified');
                          if (parts[idx + 1]) return parts[idx + 1];
                        }
                      }
                      return selectedAttendanceForDetail.reason || selectedAttendanceForDetail.comment || selectedAttendanceForDetail.note;
                    })()}
                  </Text>
                </View>
              )}
            </View>

            {(selectedAttendanceForDetail?.hour === 0 || selectedAttendanceForDetail?.hour === '0') && (
              <View style={{ width: '100%', marginBottom: 20 }}>
                {selectedAttendanceForDetail?.status.includes('justified') ? (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        const s = selectedAttendanceForDetail.status || '';
                        const parts = s.split(':');
                        const justifiedIdx = parts.indexOf('justified');
                        const currentReason = parts[justifiedIdx + 1] || '';
                        setJustifyReason(currentReason);
                        // We need to temporarily "un-justify" in the UI to show the input
                        setSelectedAttendanceForDetail({
                          ...selectedAttendanceForDetail,
                          status: selectedAttendanceForDetail.status.replace(':justified:', ':editing:')
                        });
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#f1f5f9',
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#e2e8f0'
                      }}
                    >
                      <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 16 }}>
                        {t('edit') || 'Ndrysho'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteJustification}
                      style={{
                        flex: 1,
                        backgroundColor: '#fee2e2',
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#fecaca'
                      }}
                    >
                      <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 16 }}>
                        {t('delete') || 'Fshij'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 11, marginBottom: 8, textTransform: 'uppercase' }}>
                      {t('justification_reason') || 'Arsyeja e Arsyetimit'}
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: 16,
                        padding: 12,
                        borderWidth: 1.5,
                        borderColor: '#e2e8f0',
                        fontSize: 14,
                        color: '#1e293b',
                        minHeight: 60,
                        textAlignVertical: 'top'
                      }}
                      placeholder={t('enter_reason_placeholder') || 'Shkruani arsyen...'}
                      value={justifyReason}
                      onChangeText={setJustifyReason}
                      multiline
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        if (!justifyReason.trim()) {
                          showAlert(t('enter_justification_reason') || 'Ju lutem shkruani arsyen e arsyetimit', 'error');
                          return;
                        }
                        setIsUpdating(true);
                        try {
                          const sId = selectedAttendanceForDetail.student_id || selectedAttendanceForDetail.studentId;
                          await onJustifyAttendance(sId, selectedAttendanceForDetail.date, justifyReason);
                          setIsDetailModalVisible(false);
                          setJustifyReason('');
                          showAlert(t('attendance_justified_success') || 'Mungesa u arsyetua me sukses', 'success');
                        } catch (err) {
                          showAlert(err.message, 'error');
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      style={{
                        marginTop: 16,
                        backgroundColor: '#2563eb',
                        paddingVertical: 14,
                        borderRadius: 16,
                        alignItems: 'center',
                        shadowColor: '#2563eb',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
                        {isUpdating ? (t('saving') || 'Duke ruajtur...') : (t('justify') || 'Arsyeto')}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsDetailModalVisible(false);
              }}
              style={{
                width: '100%',
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: '#f1f5f9',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 5,
                elevation: 2
              }}
            >
              <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 16 }}>{t('close') || 'Mbyll'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {!isDesktop && (
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
      )}

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
                  <Text style={modalStyles.date}>{(() => {
                    const d = new Date(selectedNotice.created_at);
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()}</Text>
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
                  <Text style={modalStyles.attachmentBtnText}>{t('download_attachment') || 'Shkarko bashkngjitjen'}</Text>
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
                  {pendingTimeType === 'late' ? t('time_modal_late_title') || 'â° Ritardo' : t('time_modal_early_exit_title') || 'ðŸšª Uscita Anticipata'}
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
                    ? t('time_modal_late_desc') || 'Lo studente era assente alla prima ora ma Ã¨ arrivato in seguito. Registra l\'ora di ingresso.'
                    : t('time_modal_early_exit_desc') || 'Lo studente era presente ma Ã¨ uscito prima della fine. Registra l\'ora di uscita.'}
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
    backgroundColor: Platform.OS === 'web' ? 'rgba(255, 255, 255, 0.85)' : 'white',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    zIndex: 1000,
    // Glassmorphism effect on Web
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
      }
    })
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    // Add extra padding for mobile web safe area (notch/status bar)
    paddingTop: (Platform.OS === 'web' && window.innerWidth < 1024) ? 24 : 14,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.8,
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
  },
  // Semester Selector Styles
  semesterSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  semesterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
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
    fontWeight: '800',
    color: '#64748b',
  },
  activeSemesterChipText: {
    color: '#2563eb',
  },
  // Grade Average Column Styles
  averageColumn: {
    width: 80,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  averageHeader: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  averageHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
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
  },
  // Coordinator Professional Styles
  proTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 6,
    marginBottom: 28,
    marginHorizontal: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  proTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    transitionDuration: '0.2s',
  },
  proTabActive: {
    backgroundColor: 'white',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  proTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },
  proTabTextActive: {
    color: '#2563eb',
    fontWeight: '900',
  },
  matrixHeader: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  matrixHeaderCell: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
  },
  matrixHeaderText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  matrixRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  matrixNameCell: {
    width: 220,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRightWidth: 3,
    borderRightColor: '#f1f5f9',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        position: 'sticky',
        left: 0,
        zIndex: 10,
        backgroundColor: 'rgba(248, 250, 252, 0.95)',
        backdropFilter: 'blur(10px)',
      }
    })
  },
  matrixGradeCell: {
    width: 110,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  gradeBadgeText: {
    fontSize: 15,
    fontWeight: '900',
  }
});

export default TeacherDashboard;


