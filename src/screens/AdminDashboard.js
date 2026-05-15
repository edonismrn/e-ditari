import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  useWindowDimensions,
  TextInput,
  FlatList,
  RefreshControl,
  Linking,
  Platform,
  Image
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Home,
  School,
  Users,
  Hash,
  Database,
  LogOut,
  ShieldCheck,
  Plus,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Building2,
  GraduationCap,
  Settings,
  Lock,
  Search,
  Check,
  UserSquare,
  LayoutGrid,
  UserPlus,
  UserCheck,
  BarChart3,
  Info,
  Calendar,
  BookOpen,
  ChevronDown,
  Archive,
  ArrowUpCircle,
  Bell,
  FileText,
  X,
  Link,
  List,
  Trash,
  Upload,
  Paperclip,
  Download,
  AlertCircle,
  AlertTriangle,
  User,
  ArrowUpRight,
  Edit,
  XCircle,
  CheckCircle
} from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';
import { KOSOVO_DATA } from '../data/kosovoSchools';
import { KOSOVO_SUBJECTS } from '../data/kosovoSubjects';
import { formatClassName } from '../utils/stringUtils';
import { formatDate, formatDisplayDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import PasswordChangeModal from '../components/PasswordChangeModal';
import PremiumDatePicker from '../components/PremiumDatePicker';
import { downloadFile } from '../utils/fileUtils';
import { Modal } from 'react-native';

const { width } = Dimensions.get('window');

const AdminDashboard = ({
  user, onLogout, schools, teachers, classes, students,
  onAddSchool, onAddTeacher, onAddClass, onAddStudent,
  onActivateProfile, onRemoveTeacher, onAssignStudentToClass, onUpdateClassTeachers,
  onDeleteSchool, onDeleteClass, onRemoveTeacherFromClass, onRemoveStudentFromClass,
  onDeleteTeacher, onDeleteStudent, onArchiveYear, onPromoteStudents,
  notices, onAddNotice, onDeleteNotice, onUpdateNotice,
  schoolAdmins, onRefresh, onUploadFile, onDeleteAllData, onUpdateSchoolStatus, onUpdateCurrentTerm,
  onPromoteStudentToClass, onUpdateTermStartDate, onBulkPromoteStudents,
  schoolCalendar, onUpdateSchoolDates, onAddCalendarEvent, onAddCalendarEvents, onDeleteCalendarEvent,
  availableAcademicYears, selectedGlobalAcademicYear, onChangeAcademicYear,
  onUpdateTeacherKujdestar, onUpdateTeacher, onUpdateClassCoordinator, academicYearHistory
}) => {
  const { t, language } = useLanguage();
  const { showAlert, showConfirm } = useAlert();
  const { updatePassword, login } = useAuth();

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth > 768;
  const [navigation, setNavigation] = useState({ view: 'home', data: null });

  // Web Routing sync effect for Admin Dashboard
  React.useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin/ballina' || path === '/admin' || path === '/') {
        setNavigation({ view: 'home', data: null });
      } else if (path === '/admin/shkollat') {
        setNavigation({ view: 'schools', data: null });
      } else if (path === '/admin/mesuesit') {
        setNavigation({ view: 'teachers', data: null });
      } else if (path === '/admin/nxenesit') {
        setNavigation({ view: 'students', data: null });
      } else if (path === '/admin/kodet') {
        setNavigation({ view: 'codes', data: null });
      } else if (path === '/admin/cilesimet') {
        setNavigation({ view: 'settings', data: null });
      } else if (path === '/admin/lajmerimet') {
        setNavigation({ view: 'notices', data: null });
      } else if (path === '/admin/viti-shkollor') {
        setNavigation({ view: 'school_year_mgmt', data: null });
      } else if (path === '/admin/kalendari') {
        setNavigation({ view: 'calendar_mgmt', data: null });
      } else if (path.startsWith('/admin/shkollat/')) {
        const id = path.split('/')[3];
        if (id) {
          const school = schools?.find(s => s.id === id) || { id };
          setNavigation({ view: 'school-detail', data: school });
        }
      } else if (path.startsWith('/admin/klasat/')) {
        const id = path.split('/')[3];
        if (id) {
          const cls = classes?.find(c => c.id === id) || { id };
          setNavigation({ view: 'class-detail', data: cls });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    if (!window.adminInitialLoadDone) {
      handlePopState();
      window.adminInitialLoadDone = true;
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDesktop, schools, classes]);

  // Sync state changes to browser URL automatically
  React.useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;

    let targetUrl = '/admin/ballina';
    const view = navigation.view;
    if (view === 'home') targetUrl = '/admin/ballina';
    else if (view === 'schools') targetUrl = '/admin/shkollat';
    else if (view === 'teachers') targetUrl = '/admin/mesuesit';
    else if (view === 'students') targetUrl = '/admin/nxenesit';
    else if (view === 'codes') targetUrl = '/admin/kodet';
    else if (view === 'settings') targetUrl = '/admin/cilesimet';
    else if (view === 'notices') targetUrl = '/admin/lajmerimet';
    else if (view === 'school_year_mgmt') targetUrl = '/admin/viti-shkollor';
    else if (view === 'calendar_mgmt') targetUrl = '/admin/kalendari';
    else if (view === 'school-detail' && navigation.data?.id) targetUrl = `/admin/shkollat/${navigation.data.id}`;
    else if (view === 'class-detail' && navigation.data?.id) targetUrl = `/admin/klasat/${navigation.data.id}`;

    if (window.location.pathname !== targetUrl) {
      window.history.pushState({}, '', targetUrl);
    }
  }, [navigation, isDesktop]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [selectedAcademicSchoolId, setSelectedAcademicSchoolId] = useState(null);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [termTwoDate, setTermTwoDate] = useState('');
  const [termAcademicYear, setTermAcademicYear] = useState('');
  const [schoolYearStart, setSchoolYearStart] = useState('');
  const [schoolYearEnd, setSchoolYearEnd] = useState('');
  const [tempDatePickerDate, setTempDatePickerDate] = useState(new Date());
  const [showYearDatePicker, setShowYearDatePicker] = useState(null);
  const [calendarSubTab, setCalendarSubTab] = useState('calendar');
  const [academicTab, setAcademicTab] = useState('semesters');
  const [schoolYearSubTab, setSchoolYearSubTab] = useState('start');
  const [selectedPromotionClassId, setSelectedPromotionClassId] = useState(null);
  const [promotedStudentIds, setPromotedStudentIds] = useState(new Set());
  const [isClosingYearProcess, setIsClosingYearProcess] = useState(false);

  // Refs for Date Pickers (Web)
  const termDateRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [calendarStep, setCalendarStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState('single');
  const [rangeStart, setRangeStart] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarDescription, setCalendarDescription] = useState('');

  const handleUpdatePassword = async (currentPass, newPass) => {
    try {
      // Verify current password by re-authenticating
      await login(user.email, currentPass, true);
      // If successful, update to new password
      await updatePassword(newPass);
      showAlert(t('password_updated_success'), 'success');
    } catch (err) {
      const errorMsg = err.message === 'Invalid login credentials'
        ? (t('invalid_current_password') || 'Fjalkalimi aktual nuk sht i sakt')
        : err.message;
      showAlert(errorMsg, 'error');
      throw err; // Let modal handle specific error display
    }
  };


  // Notice Form State
  const [isNoticeModalVisible, setIsNoticeModalVisible] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeAttachments, setNoticeAttachments] = useState([]); // Array of {url, name}
  const [noticeSchoolId, setNoticeSchoolId] = useState(null);
  const [selectedNoticeSchools, setSelectedNoticeSchools] = useState([]);
  const [selectedNoticeClasses, setSelectedNoticeClasses] = useState([]);
  const [isAllSchools, setIsAllSchools] = useState(false);
  const [isAllClasses, setIsAllClasses] = useState(true);
  const [searchNoticeSchools, setSearchNoticeSchools] = useState('');
  const [searchNoticeClasses, setSearchNoticeClasses] = useState('');
  const [isNoticeSchoolDropdownVisible, setIsNoticeSchoolDropdownVisible] = useState(false);
  const [isNoticeClassDropdownVisible, setIsNoticeClassDropdownVisible] = useState(false);
  const [noticeModalStep, setNoticeModalStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [editingNoticeId, setEditingNoticeId] = useState(null);

  // Calendar Management State
  const [selectedCalendarSchool, setSelectedCalendarSchool] = useState(user.school_id || null);
  const [calendarDate, setCalendarDate] = useState('');
  const [calendarType, setCalendarType] = useState('holiday'); // 'holiday', 'work_day'
  const [refreshing, setRefreshing] = useState(false);
  const isSuperAdmin = (user?.role === 'admin' && !user?.school_id) || user?.email?.toLowerCase().trim() === 'admin@ditari-elektronik.com';

  const toggleDateSelection = (dateStr) => {
    if (selectionMode === 'single') {
      setSelectedDates(new Set([dateStr]));
    } else if (selectionMode === 'multi') {
      const newSet = new Set(selectedDates);
      if (newSet.has(dateStr)) newSet.delete(dateStr);
      else newSet.add(dateStr);
      setSelectedDates(newSet);
    } else if (selectionMode === 'range') {
      if (!rangeStart || (rangeStart && dateStr < rangeStart)) {
        setRangeStart(dateStr);
        setSelectedDates(new Set([dateStr]));
      } else {
        // Generate range
        const start = new Date(rangeStart);
        const end = new Date(dateStr);
        const newSet = new Set();
        let current = new Date(start);
        while (current <= end) {
          newSet.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        setSelectedDates(newSet);
        setRangeStart(null);
      }
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setIsUploading(true);

        const uploadResult = await onUploadFile(file.uri, file.name, file.mimeType);

        setIsUploading(false);

        if (uploadResult.publicUrl) {
          setNoticeAttachments(prev => [...prev, { url: uploadResult.publicUrl, name: file.name }]);
        } else {
          const errorMsg = uploadResult.error?.message || t('upload_failed');
          showAlert(errorMsg, 'error');
        }
      }
    } catch (err) {
      console.error('Pick error:', err);
      setIsUploading(false);
      const errorMsg = err.message || t('pick_error');
      showAlert(errorMsg, 'error');
    }
  };

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

  // School Form State
  const [newSchoolCity, setNewSchoolCity] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolHasParalele, setNewSchoolHasParalele] = useState(false);
  const [isCityDropdownVisible, setIsCityDropdownVisible] = useState(false);
  const [isSchoolDropdownVisible, setIsSchoolDropdownVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');

  // Teacher Form State
  const [teacherFirstName, setTeacherFirstName] = useState('');
  const [teacherLastName, setTeacherLastName] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherIsKujdestar, setTeacherIsKujdestar] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);

  // Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassParalele, setNewClassParalele] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Modal Visibility State
  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);
  const [isTeacherModalVisible, setIsTeacherModalVisible] = useState(false);
  const [isClassModalVisible, setIsClassModalVisible] = useState(false);
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);
  const [isAddTeacherToClassModalVisible, setIsAddTeacherToClassModalVisible] = useState(false);

  // Settings Deletion States
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [selectedEntityForAction, setSelectedEntityForAction] = useState(null);
  const [activeSettingsMode, setActiveSettingsMode] = useState(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [isTeacherSelectionMode, setIsTeacherSelectionMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isStudentSelectionMode, setIsStudentSelectionMode] = useState(false);

  // Persist Navigation State
  React.useEffect(() => {
    const loadNavState = async () => {
      try {
        const saved = await AsyncStorage.getItem(`nav_state_${user.id}`);
        if (saved) {
          const savedNav = JSON.parse(saved);
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
        await AsyncStorage.setItem(`nav_state_${user.id}`, JSON.stringify(navigation));
      } catch (e) {
        console.error("State save error", e);
      }
    };
    saveNavState();
  }, [navigation]);

  const resetSchoolForm = () => {
    setNewSchoolCity('');
    setNewSchoolName('');
    setNewSchoolHasParalele(false);
    setIsCityDropdownVisible(false);
    setIsSchoolDropdownVisible(false);
    setCitySearchQuery('');
    setSchoolSearchQuery('');
    setIsSchoolModalVisible(false);
  };

  const resetTeacherForm = () => {
    setTeacherFirstName('');
    setTeacherLastName('');
    setTeacherUsername('');
    setTeacherPassword('');
    setTeacherSubjects([]);
    setTeacherIsKujdestar(false);
    setEditingTeacherId(null);
    setIsTeacherModalVisible(false);
  };

  // Auto-select school for non-super admins if they are in a view that needs navigation.data
  React.useEffect(() => {
    if (!isSuperAdmin && !navigation.data && schools.length > 0) {
      setNavigation(prev => ({ ...prev, data: schools[0] }));
    }
  }, [isSuperAdmin, schools, navigation.view]);

  // Initialize date selection from school info
  React.useEffect(() => {
    const activeSchoolId = isSuperAdmin ? selectedAcademicSchoolId : user.school_id;
    const school = schools.find(s => s.id === activeSchoolId);
    if (school?.term_two_start_date) {
      setTermTwoDate(school.term_two_start_date);
    }
    if (school?.current_year) {
      setTermAcademicYear(school.current_year);
    }
  }, [schools, selectedAcademicSchoolId, user.school_id]);

  const cleanSchoolName = (name) => {
    // Extract text inside single quotes if available (e.g. SHML Gjimnazi 'Sami Frashri' -> Sami Frashri)
    const match = name.match(/'([^']+)'/);
    if (match && match[1]) return match[1];

    // Otherwise, just remove common prefixes
    return name.replace(/^(SHML|SHMFU|SHMU|SHM|SHFMU|Gjimnazi|Shkolla e Mesme|Shkolla e Mesme Teknike|Shkolla e Mesme Ekonomike|Shkolla e Mesme e Muziks)\s+/i, '').trim();
  };

  const generateSchoolCode = (city, name) => {
    const cityPart = (city || '').replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const cleanName = cleanSchoolName(name);

    let namePart = '';
    const words = (cleanName || '').split(/\s+/).filter(w => w.length > 0);

    if (words.length >= 3) {
      namePart = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    } else if (words.length === 2 && words[0].length >= 3) {
      // Per "Rasim Kicina", prende R(0), s(2), e K(0) del secondo nome per fare RSK
      namePart = (words[0][0] + words[0][2] + words[1][0]).toUpperCase();
    } else {
      namePart = (cleanName || '').replace(/\s+/g, '').substring(0, 3).toUpperCase();
    }

    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cityPart}-${namePart}-${randomPart}`;
  };

  const handleAddSchoolLocal = async () => {
    if (!newSchoolCity || !newSchoolName) return;
    const result = await onAddSchool({
      name: newSchoolName,
      city: newSchoolCity,
      code: generateSchoolCode(newSchoolCity, newSchoolName), // This will use the cleaned name inside
      has_paralele: newSchoolHasParalele
    });
    if (!result?.error) {
      if (result.credentials) {
        showAlert(
          t('school_credentials_msg')
            .replace('{email}', result.credentials.email)
            .replace('{password}', result.credentials.password),
          'success',
          t('school_created_title')
        );
      }
      resetSchoolForm();
    }
  };

  const toggleSubject = (subject) => {
    if (teacherSubjects.includes(subject)) {
      setTeacherSubjects(teacherSubjects.filter(s => s !== subject));
    } else {
      setTeacherSubjects([...teacherSubjects, subject]);
    }
  };

  const handleAddTeacherLocal = async (specificSchoolId) => {
    const schoolId = specificSchoolId || navigation.data?.id || navigation.data?.schoolId;
    if (!schoolId) {
      // console.log('Gabim', 'Asnj shkoll e przgjedhur.');
      return;
    }

    if (!teacherFirstName || !teacherLastName || !teacherUsername || !teacherPassword || teacherSubjects.length === 0) {
      return;
    }

    if (editingTeacherId) {
      const result = await onUpdateTeacher(editingTeacherId, {
        firstName: teacherFirstName,
        lastName: teacherLastName,
        subjects: teacherSubjects,
        isKujdestar: teacherIsKujdestar
      });
      if (!result?.error) {
        showAlert(t('teacher_updated'), 'success');
        resetTeacherForm();
      } else {
        showAlert(result.error.message, 'error');
      }
      return;
    }
    const result = await onAddTeacher({
      firstName: teacherFirstName,
      lastName: teacherLastName,
      name: `${teacherFirstName} ${teacherLastName}`,
      username: teacherUsername,
      password: teacherPassword,
      subjects: teacherSubjects,
      schoolId: schoolId,
      email: teacherUsername,
      isKujdestar: teacherIsKujdestar
    });

    if (!result?.error) {
      resetTeacherForm();
      showAlert(t('teacher_added_success'), 'success');
    } else {
      showAlert(result.error.message, 'error');
    }
  };

  const handleAddClassLocal = async (specificSchoolId) => {
    const schoolId = specificSchoolId || navigation.data?.id || navigation.data?.schoolId;
    if (!schoolId) return;

    if (!newClassName) return;

    const school = schools.find(s => s.id === schoolId);
    let finalClassName = newClassName;
    if (school?.has_paralele && newClassParalele) {
      finalClassName = `${newClassName}-${newClassParalele}`;
    }

    const result = await onAddClass({
      name: finalClassName,
      schoolId: schoolId,
      teacherIds: selectedTeacherId ? [selectedTeacherId] : []
    });

    if (!result?.error) {
      setNewClassName('');
      setNewClassParalele('');
      setSelectedTeacherId('');
      setIsClassModalVisible(false);
    }
  };

  const handleAddStudent = async (classId) => {
    if (!studentName || !studentUsername || !studentPassword) {
      // console.log('Gabim', 'Ju lutem plotsoni t gjitha fushat.');
      return;
    }
    await onAddStudent({
      name: studentName,
      username: studentUsername,
      password: studentPassword,
      classId: classId,
      schoolId: navigation.data?.schoolId || navigation.data?.id
    });
    setStudentName('');
    setStudentUsername('');
    setStudentPassword('');
    if (onRefresh) await onRefresh();
    setIsStudentModalVisible(false);
  };

  const renderSettings = () => {
    const getFilteredList = () => {
      const query = settingsSearchQuery.toLowerCase();
      switch (activeSettingsMode) {
        case 'delete_school':
        case 'manage_school_status':
          return (isSuperAdmin ? schools : schools.filter(s => s.id === user.school_id))
            .filter(s => s.name.toLowerCase().includes(query));
        default:
          return [];
      }
    };

    const handleConfirmAction = () => {
      if (!selectedEntityForAction) return;

      const entity = selectedEntityForAction;
      switch (activeSettingsMode) {
        case 'delete_school':
          showConfirm(`${t('confirm_delete_school')}: ${entity.name}? ${t('cascade_warning_school')}`, async () => {
            await onDeleteSchool(entity.id);
            setSelectedEntityForAction(null);
          });
          break;
      }
    };

    return (
      <View style={styles.viewContainer}>
        <Text style={styles.viewTitle}>{t('settings')}</Text>

        {!activeSettingsMode ? (
          <ScrollView contentContainerStyle={styles.settingsMenu}>
            {[
              isSuperAdmin && { id: 'manage_school_status', label: t('manage_school_status'), icon: Lock, color: '#f59e0b' },
              isSuperAdmin && { id: 'delete_school', label: t('delete_school'), icon: School, color: '#ef4444' },
              isSuperAdmin && { id: 'delete_all_data', label: t('delete_all_data'), icon: Trash2, color: '#dc2626' },
            ].filter(Boolean).map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.settingsItem}
                onPress={() => {
                  if (item.id === 'delete_all_data') {
                    showConfirm(t('delete_all_data_confirm'), async () => {
                      setIsProcessing(true);
                      const res = await onDeleteAllData();
                      setIsProcessing(false);
                      if (res?.error) {
                        showAlert(res.error.message, 'error');
                      } else {
                        showAlert(t('delete_all_data_success'), 'success');
                        setNavigation({ view: 'home', data: null });
                      }
                    });
                  } else if (item.id === 'academic_year') {
                    setNavigation({ view: 'academic-year', data: null });
                  } else {
                    setActiveSettingsMode(item.id);
                  }
                }}
              >
                <item.icon size={24} color={item.color} />
                <Text style={styles.settingsItemLabel}>{item.label}</Text>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setActiveSettingsMode(null);
                setSettingsSearchQuery('');
                setSelectedEntityForAction(null);
              }}
            >
              <ArrowLeft size={18} color="#1e293b" />
              {isDesktop && <Text style={styles.backButtonText}>{t('back')}</Text>}
            </TouchableOpacity>

            <View style={styles.searchBarContainer}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchBarInput}
                placeholder={t('search_placeholder')}
                value={settingsSearchQuery}
                onChangeText={setSettingsSearchQuery}
              />
            </View>

            <FlatList
              data={getFilteredList()}
              keyExtractor={item => item.id}
              style={{ flex: 1, marginTop: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.entityItem, selectedEntityForAction?.id === item.id && styles.selectedEntityItem]}
                  onPress={async () => {
                    if (activeSettingsMode === 'manage_school_status') {
                      const currentStatus = item.is_active !== false;
                      const actionLabel = !currentStatus ? t('activate') : t('deactivate');
                      showConfirm(`${actionLabel} ${item.name}?`, async () => {
                        setIsProcessing(true);
                        const res = await onUpdateSchoolStatus(item.id, !currentStatus);
                        setIsProcessing(false);
                        if (res?.error) showAlert(res.error.message, 'error');
                        else showAlert(t('school_status_updated'), 'success');
                      });
                    } else {
                      setSelectedEntityForAction(item);
                    }
                  }}
                >
                  <View>
                    <Text style={styles.entityName}>{item.name}</Text>
                    {item.city && <Text style={styles.entitySub}>{item.city}</Text>}
                    {item.schoolId && <Text style={styles.entitySub}>{schools.find(s => s.id === item.schoolId)?.name}</Text>}
                  </View>
                  {activeSettingsMode === 'delete_school' ? (
                    <Trash2 size={18} color={selectedEntityForAction?.id === item.id ? '#ef4444' : '#94a3b8'} />
                  ) : activeSettingsMode === 'manage_school_status' ? (
                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: item.is_active === false ? '#fee2e2' : '#dcfce7' }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: item.is_active === false ? '#ef4444' : '#10b981' }}>
                        {item.is_active === false ? t('school_status_inactive') : t('school_status_active')}
                      </Text>
                    </View>
                  ) : activeSettingsMode === 'manage_teachers' ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onUpdateTeacherKujdestar(item.id, !item.is_kujdestar);
                      }}
                      style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: item.is_kujdestar ? '#eff6ff' : '#f1f5f9' }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.is_kujdestar ? '#2563eb' : '#64748b' }}>
                        {item.is_kujdestar ? t('coordinator_label') : '—'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              )}
            />

            {selectedEntityForAction && activeSettingsMode !== 'manage_school_status' && (
              <TouchableOpacity style={styles.actionFab} onPress={handleConfirmAction}>
                <Trash2 size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const handleAssignStudentLocal = async (studentId, classId) => {
    const result = await onAssignStudentToClass(studentId, classId);
    if (!result.error) {
      // Refresh from DB so the student list in class-detail is up to date
      if (onRefresh) await onRefresh();
      setIsStudentModalVisible(false);
    }
  };

  const handleAddTeacherToClass = async (teacherId) => {
    // Always read the live class from the classes array to avoid stale state
    const currentClass = classes.find(c => c.id === navigation.data?.id) || navigation.data;
    if (!currentClass) return;
    const existingIds = currentClass.teacherIds || [];
    if (existingIds.includes(teacherId)) return;
    const updatedTeachers = [...existingIds, teacherId];
    await onUpdateClassTeachers(currentClass.id, updatedTeachers);
    // After DB update, trigger a re-fetch so navigation.data's class is fresh
    if (onRefresh) await onRefresh();
    setIsAddTeacherToClassModalVisible(false);
  };

  const handleRemoveTeacherLocal = async (teacherId) => {
    // Always read the live class from the classes array to avoid stale state
    const currentClass = classes.find(c => c.id === navigation.data?.id) || navigation.data;
    if (!currentClass) return;
    const updatedTeachers = (currentClass.teacherIds || []).filter(id => id !== teacherId);
    await onUpdateClassTeachers(currentClass.id, updatedTeachers);
    // After DB update, trigger a re-fetch so navigation.data's class is fresh
    if (onRefresh) await onRefresh();
  };



  const renderMain = () => (
    <ScrollView
      style={styles.scrollContent}
      showsVerticalScrollIndicator={false}
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
      alwaysBounceVertical={true}
    >

      <View style={styles.statsGrid}>
        {isSuperAdmin && (
          <View style={styles.statCard}>
            <BarChart3 size={20} color="#64748b" style={{ marginBottom: 12 }} />
            <Text style={styles.statValue}>{schools.length}</Text>
            <Text style={styles.statLabel}>{t('schools')}</Text>
          </View>
        )}
        <View style={styles.statCard}>
          <Users size={20} color="#64748b" style={{ marginBottom: 12 }} />
          <Text style={styles.statValue}>{teachers.length}</Text>
          <Text style={styles.statLabel}>{t('teachers_label')}</Text>
        </View>
        <View style={styles.statCard}>
          <GraduationCap size={20} color="#64748b" style={{ marginBottom: 12 }} />
          <Text style={styles.statValue}>{students.length}</Text>
          <Text style={styles.statLabel}>{t('students_label')}</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => isSuperAdmin ? setNavigation({ view: 'schools', data: null }) : setNavigation({ view: 'school-detail', data: schools[0] })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#eff6ff' }]}>
            <Building2 size={24} color="#6366f1" />
          </View>
          <Text style={styles.actionTileTitle}>{isSuperAdmin ? t('schools') : t('my_school')}</Text>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => setNavigation({ view: 'teachers', data: null })}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#f0fdf4' }]}>
            <Users size={24} color="#10b981" />
          </View>
          <Text style={styles.actionTileTitle}>{t('manage_teachers')}</Text>
          <ChevronRight size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => setNavigation({ view: 'students', data: null })}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#fdf4ff' }]}>
            <GraduationCap size={24} color="#a21caf" />
          </View>
          <Text style={styles.actionTileTitle}>{t('manage_students')}</Text>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionTile} onPress={() => setNavigation({ view: 'notices', data: null })}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#fdf2f8' }]}>
            <Bell size={24} color="#db2777" />
          </View>
          <Text style={styles.actionTileTitle}>{t('notices')}</Text>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => setNavigation({ view: 'school_year_mgmt', data: null })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#f0fdf4' }]}>
            <BookOpen size={24} color="#10b981" />
          </View>
          <Text style={styles.actionTileTitle}>{t('school_year_mgmt') || 'Menaxhimi i vitit shkollor'}</Text>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionTile}
          onPress={() => setNavigation({ view: 'calendar_mgmt', data: null })}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: '#fff7ed' }]}>
            <Calendar size={24} color="#f97316" />
          </View>
          <Text style={styles.actionTileTitle}>{t('manage_calendar')}</Text>
          <ChevronRight size={20} color="#94a3b8" />
        </TouchableOpacity>

        {isSuperAdmin && (
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => setNavigation({ view: 'codes', data: null })}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#f0f9ff' }]}>
              <ShieldCheck size={24} color="#0ea5e9" />
            </View>
            <Text style={styles.actionTileTitle}>{t('school_directory')}</Text>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderSchools = () => {
    if (navigation.view === 'schools' || navigation.view === 'classes') {
      const isClassesOnly = navigation.view === 'classes';
      const listData = isClassesOnly ? classes : schools;

      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setNavigation({ view: 'home', data: null })}
                >
                  <ArrowLeft size={18} color="#1e293b" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{isClassesOnly ? t('school_classes') : t('manage_schools')}</Text>
              </View>
              {isSuperAdmin && !isClassesOnly && (
                <TouchableOpacity
                  style={styles.smallAddButton}
                  onPress={() => setIsSchoolModalVisible(true)}
                >
                  <Plus size={18} color="white" />
                  <Text style={styles.smallAddButtonText}>{t('add_new_school')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.searchBarContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              placeholder={isClassesOnly ? t('search_classes') : t('search_schools')}
              style={styles.searchBarInput}
              value={settingsSearchQuery}
              onChangeText={setSettingsSearchQuery}
            />
          </View>

          <ScrollView
            style={styles.scrollContent}
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
            alwaysBounceVertical={true}
          >
            {listData
              .filter(item => (isClassesOnly ? item.name : item.name).toLowerCase().includes(settingsSearchQuery.toLowerCase()))
              .map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  onPress={() => setNavigation({ view: isClassesOnly ? 'class-detail' : 'school-detail', data: item })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                    <View style={[styles.actionIconContainer, { backgroundColor: isClassesOnly ? '#f5f3ff' : '#eff6ff', width: 44, height: 44 }]}>
                      {isClassesOnly ? <LayoutGrid size={20} color="#a855f7" /> : <Building2 size={20} color="#6366f1" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{isClassesOnly ? formatClassName(item) : item.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {isClassesOnly
                          ? (schools.find(s => s.id === item.schoolId)?.name || t('no_school'))
                          : (item.address || t('kosovo'))}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      );
    }

    if (navigation.view === 'school-detail') {
      const schoolData = navigation.data;
      const school = schools.find(s => s.id === (schoolData ? schoolData.id : null)) || schoolData;
      const schoolClasses = classes.filter(c => (c.schoolId === school.id || c.school_id === school.id));
      const schoolTeachers = teachers.filter(t => (t.schoolId === school.id || t.school_id === school.id));

      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setNavigation({ view: 'schools', data: null })}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{navigation.data?.name || t('manage_schools')}</Text>
                {navigation.data?.city && <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>{navigation.data.city}</Text>}
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#eff6ff', width: 56, height: 56 }]}>
                  <Building2 size={28} color="#6366f1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.viewTitle}>{school.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Hash size={14} color="#64748b" />
                    <Text style={styles.cardSubtitle}>{school.code}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Users size={18} color="#6366f1" />
                  <Text style={styles.statValue}>{schoolTeachers.length}</Text>
                  <Text style={styles.statLabel}>{t('teachers_count')}</Text>
                </View>
                <View style={styles.statCard}>
                  <LayoutGrid size={18} color="#10b981" />
                  <Text style={styles.statValue}>{schoolClasses.length}</Text>
                  <Text style={styles.statLabel}>{t('classes_label')}</Text>
                </View>
                <View style={styles.statCard}>
                  <GraduationCap size={18} color="#a21caf" />
                  <Text style={styles.statValue}>{students.filter(s => (s.schoolId === school.id || s.school_id === school.id)).length}</Text>
                  <Text style={styles.statLabel}>{t('students_label')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('actions')}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                style={[styles.actionButton, { flex: 1, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
                onPress={() => setIsTeacherModalVisible(true)}
              >
                <UserPlus size={20} color="#6366f1" />
                <Text style={[styles.actionButtonText, { color: '#6366f1' }]}>{t('add_teacher')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { flex: 1, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}
                onPress={() => setIsClassModalVisible(true)}
              >
                <Plus size={20} color="#10b981" />
                <Text style={[styles.actionButtonText, { color: '#10b981' }]}>{t('add_class_short')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{t('school_classes')}</Text>
            {schoolClasses.map(cls => (
              <TouchableOpacity
                key={cls.id}
                style={styles.card}
                onPress={() => setNavigation({ view: 'class-detail', data: cls })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{formatClassName(cls)}</Text>
                  <Text style={styles.cardSubtitle}>
                    {(cls.teacherIds || []).length} {t('teachers_count')} • {students.filter(s => (s.classId === cls.id || s.class_id === cls.id)).length} {t('students_count')}
                  </Text>
                </View>
                <ChevronRight size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))}
            {schoolClasses.length === 0 && (
              <Text style={styles.emptyTextSmall}>{t('no_classes_registered')}</Text>
            )}
          </ScrollView>
        </View>
      );
    }

    if (navigation.view === 'class-detail') {
      // Always read from the live `classes` array so data is fresh after refresh
      const currentClass = classes.find(c => c.id === navigation.data?.id) || navigation.data;
      const classStudents = students.filter(s => s.classId === currentClass.id);
      const school = schools.find(s => s.id === currentClass.schoolId);

      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setNavigation({ view: 'school-detail', data: school })}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{formatClassName(currentClass)}</Text>
                {school && <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>{school.name}</Text>}
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#f5f3ff', width: 52, height: 52 }]}>
                  <LayoutGrid size={24} color="#a855f7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.viewTitle}>{formatClassName(currentClass)}</Text>
                  <Text style={styles.cardSubtitle}>{school?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => showConfirm(`${t('confirm_delete_class')}: ${formatClassName(currentClass)}?`, async () => {
                  if (onDeleteClass) {
                    await onDeleteClass(currentClass.id);
                    setNavigation({ view: 'school-detail', data: school });
                  }
                })}>
                  <Trash2 size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.label}>{t('class_teachers')}</Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => setIsAddTeacherToClassModalVisible(true)}
                  >
                    <Plus size={16} color="#6366f1" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366f1' }}>{t('add')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ gap: 8 }}>
                  {(currentClass.teacherIds || []).map(tId => {
                    const teacher = teachers.find(t => t.id === tId);
                    return (
                      <View key={tId} style={styles.teacherListItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                            <GraduationCap size={16} color="#6366f1" />
                          </View>
                          <View>
                            <Text style={styles.teacherNameText}>{teacher?.name || t('unknown_teacher')}</Text>
                            <Text style={{ fontSize: 11, color: '#64748b' }}>{(teacher?.subjects || []).join(', ')}</Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => onUpdateClassCoordinator(currentClass.id, currentClass.coordinatorId === tId ? null : tId)}
                            style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: currentClass.coordinatorId === tId ? '#eff6ff' : '#f1f5f9' }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: currentClass.coordinatorId === tId ? '#2563eb' : '#94a3b8' }}>{currentClass.coordinatorId === tId ? t('coordinator_label') : t('make_coordinator')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRemoveTeacherLocal(tId)}>
                            <View style={{ padding: 8, borderRadius: 8, backgroundColor: '#fef2f2' }}>
                              <Trash2 size={16} color="#ef4444" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                  {(currentClass.teacherIds || []).length === 0 && (
                    <Text style={styles.emptyTextSmall}>{t('no_teachers_assigned')}</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <View>
                <Text style={styles.sectionTitle}>{t('students_label')} ({classStudents.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.smallAddButton}
                onPress={() => setIsStudentModalVisible(true)}
              >
                <Plus size={16} color="white" />
                <Text style={styles.smallAddButtonText}>{t('add')}</Text>
              </TouchableOpacity>
            </View>

            {classStudents.map(student => (
              <View key={student.id} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} color="#6366f1" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>{student.name}</Text>
                    <Text style={styles.cardSubtitle}>{student.username}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={async () => {
                  await onRemoveStudentFromClass(student.id, currentClass.id);
                  if (onRefresh) await onRefresh();
                }}>
                  <Trash2 size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ))}
            {classStudents.length === 0 && (
              <Text style={styles.emptyTextSmall}>{t('no_students_in_class')}</Text>
            )}
          </ScrollView>
        </View>
      );
    }


    if (navigation.view === 'school-directory') {
      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setNavigation({ view: 'home', data: null })}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('manage_schools')}</Text>
            </View>
          </View>

          <View style={styles.searchBarContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              placeholder={t('search_placeholder')}
              style={styles.searchBarInput}
              value={settingsSearchQuery}
              onChangeText={setSettingsSearchQuery}
            />
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {(isSuperAdmin ? schools : schools.filter(s => s.id === user.school_id))
              .filter(s => (s.name || '').toLowerCase().includes(settingsSearchQuery.toLowerCase()) || (s.code || '').toLowerCase().includes(settingsSearchQuery.toLowerCase()))
              .map(school => {
                const schoolAdmin = (schoolAdmins || []).find(a => a.schoolId === school.id);
                return (
                  <View key={school.id} style={[styles.card, { padding: 20, flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 4 }]}>{school.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Building2 size={13} color="#64748b" />
                        <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>{school.city || '---'}</Text>
                      </View>

                      <View style={{
                        marginTop: 4,
                        backgroundColor: '#f8fafc',
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        gap: 8
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Users size={14} color="#6366f1" />
                          <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '700' }}>
                            {school.admin_email || schoolAdmin?.username || '---'}
                          </Text>
                        </View>

                        {school.admin_password && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ShieldCheck size={14} color="#10b981" />
                            <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '800' }}>
                              PW: {school.admin_password}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* School Code Badge */}
                    <View style={{
                      backgroundColor: '#eff6ff',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: '#dbeafe',
                      marginLeft: 16,
                      minWidth: 80
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', marginBottom: 2 }}>
                        {t('code')}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', letterSpacing: 1 }}>
                        {school.code}
                      </Text>
                    </View>
                  </View>
                );
              })}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      );
    }
    return null;
  };

  const toggleTeacherSelection = (id) => {
    setSelectedTeacherIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteTeachers = () => {
    if (selectedTeacherIds.length === 0) return;
    showConfirm(t('confirm_bulk_delete_teachers'), async () => {
      for (const id of selectedTeacherIds) {
        if (onDeleteTeacher) await onDeleteTeacher(id);
      }
      setSelectedTeacherIds([]);
      setIsTeacherSelectionMode(false);
    });
  };

  const handleDeleteAllTeachers = () => {
    showConfirm(t('confirm_delete_all_teachers'), async () => {
      // Loop through all teachers in current view (or all)
      for (const teacher of teachers) {
        if (onDeleteTeacher) await onDeleteTeacher(teacher.id);
      }
      setSelectedTeacherIds([]);
      setIsTeacherSelectionMode(false);
    });
  };

  const renderTeachers = () => {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  setNavigation({ view: 'home', data: null });
                  setIsTeacherSelectionMode(false);
                  setSelectedTeacherIds([]);
                }}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('teachers_count')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {teachers.length > 0 && (
                <TouchableOpacity
                  style={[styles.smallAddButton, { backgroundColor: isTeacherSelectionMode ? '#ef4444' : '#f1f5f9' }]}
                  onPress={() => {
                    setIsTeacherSelectionMode(!isTeacherSelectionMode);
                    setSelectedTeacherIds([]);
                  }}
                >
                  {isTeacherSelectionMode ? (
                    <X size={18} color="white" />
                  ) : (
                    <Users size={18} color="#64748b" />
                  )}
                  <Text style={[styles.smallAddButtonText, { color: isTeacherSelectionMode ? 'white' : '#64748b' }]}>
                    {isTeacherSelectionMode ? t('cancel') : t('select')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.smallAddButton} onPress={() => setIsTeacherModalVisible(true)}>
                <Plus size={18} color="white" />
                <Text style={styles.smallAddButtonText}>{t('add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {teachers.map(teacher => {
            const isSelected = selectedTeacherIds.includes(teacher.id);
            return (
              <TouchableOpacity
                key={teacher.id}
                style={[styles.card, isSelected && { borderColor: '#6366f1', backgroundColor: '#f5f3ff' }]}
                onPress={() => isTeacherSelectionMode ? toggleTeacherSelection(teacher.id) : null}
                activeOpacity={isTeacherSelectionMode ? 0.7 : 1}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    {isTeacherSelectionMode ? (
                      <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#6366f1' : '#cbd5e1',
                        backgroundColor: isSelected ? '#6366f1' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={14} color="white" />}
                      </View>
                    ) : (
                      <View style={[styles.actionIconContainer, { backgroundColor: '#f0fdf4', width: 40, height: 40 }]}>
                        <UserCheck size={20} color="#10b981" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.cardTitle}>{teacher.name}</Text>
                      <Text style={styles.cardSubtitle}>{(teacher.subjects || []).join(', ')}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    {t('school_label')}: {schools.find(s => s.id === teacher.schoolId)?.name || t('no_school')}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {t('classes_label')}: {classes.filter(c => (c.teacherIds || []).includes(teacher.id)).map(c => formatClassName(c)).join(', ') || t('none')}
                  </Text>
                </View>

                {!isTeacherSelectionMode && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.smallAddButton, { backgroundColor: '#f0fdf4', paddingHorizontal: 10 }]}
                      onPress={() => {
                        setTeacherFirstName(teacher.first_name || '');
                        setTeacherLastName(teacher.last_name || '');
                        setTeacherUsername(teacher.email || '');
                        setTeacherPassword('********'); // Placeholder for edit
                        setTeacherSubjects(teacher.subjects || []);
                        setTeacherIsKujdestar(teacher.is_kujdestar || false);
                        setEditingTeacherId(teacher.id);
                        setIsTeacherModalVisible(true);
                      }}
                    >
                      <Edit size={16} color="#10b981" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallAddButton, { backgroundColor: '#eff6ff', paddingHorizontal: 10 }]}
                      onPress={() => setNavigation({ view: 'teachers', data: teacher, mode: 'link' })}
                    >
                      <Plus size={16} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => showConfirm(`${t('confirm_delete_teacher')}: ${teacher.name}?`, async () => {
                      if (onDeleteTeacher) await onDeleteTeacher(teacher.id);
                    })}>
                      <Trash2 size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {teachers.length === 0 && (
            <Text style={styles.emptyText}>{t('no_teachers_registered')}</Text>
          )}
        </ScrollView>

        {isTeacherSelectionMode && (
          <View style={{
            flexDirection: 'row',
            gap: 12,
            padding: 16,
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9'
          }}>
            <TouchableOpacity
              style={[styles.submitButton, { flex: 1, backgroundColor: '#f1f5f9', shadowColor: 'transparent' }]}
              onPress={handleDeleteAllTeachers}
            >
              <Text style={[styles.submitButtonText, { color: '#ef4444' }]}>{t('delete_all')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { flex: 2, backgroundColor: selectedTeacherIds.length > 0 ? '#ef4444' : '#cbd5e1', shadowColor: selectedTeacherIds.length > 0 ? '#ef4444' : 'transparent' }]}
              onPress={handleBulkDeleteTeachers}
              disabled={selectedTeacherIds.length === 0}
            >
              <Text style={styles.submitButtonText}>{t('delete_selected')} ({selectedTeacherIds.length})</Text>
            </TouchableOpacity>
          </View>
        )}

        {navigation.view === 'teachers' && navigation.mode === 'link' && (
          <View style={[styles.modalOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }]}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('link_teacher_class').replace('{name}', navigation.data.name)}</Text>
              <Text style={styles.label}>{t('select_class_school')} ({t('school_label')}: {schools.find(s => s.id === navigation.data.schoolId)?.name})</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {classes
                  .filter(c => c.schoolId === navigation.data.schoolId)
                  .map(cls => {
                    const isAlreadyIn = (cls.teacherIds || []).includes(navigation.data.id);
                    return (
                      <TouchableOpacity
                        key={cls.id}
                        style={[styles.schoolSelectItem, isAlreadyIn && styles.activeSchoolSelect]}
                        onPress={async () => {
                          if (isAlreadyIn) return;
                          const newTeacherIds = [...(cls.teacherIds || []), navigation.data.id];
                          await onUpdateClassTeachers(cls.id, newTeacherIds);
                          setNavigation({ view: 'teachers', data: null });
                        }}
                      >
                        <Text style={[styles.schoolSelectText, isAlreadyIn && styles.activeSchoolSelectText]}>
                          {formatClassName(cls)} {isAlreadyIn ? `(${t('already_linked')})` : ''}
                        </Text>
                        {isAlreadyIn ? <Check size={16} color="#6366f1" /> : <ChevronRight size={16} color="#94a3b8" />}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.cancelButton, { marginTop: 20 }]}
                onPress={() => setNavigation({ view: 'teachers', data: null })}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    showConfirm(t('confirm_bulk_delete_students'), async () => {
      for (const id of selectedStudentIds) {
        if (onDeleteStudent) await onDeleteStudent(id);
      }
      setSelectedStudentIds([]);
      setIsStudentSelectionMode(false);
    });
  };

  const handleDeleteAllStudents = () => {
    showConfirm(t('confirm_delete_all_students'), async () => {
      for (const student of students) {
        if (onDeleteStudent) await onDeleteStudent(student.id);
      }
      setSelectedStudentIds([]);
      setIsStudentSelectionMode(false);
    });
  };

  const renderStudents = () => {
    const unassignedStudents = students.filter(s => !s.classId);

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  setNavigation({ view: 'home', data: null });
                  setIsStudentSelectionMode(false);
                  setSelectedStudentIds([]);
                }}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('students_label')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {students.length > 0 && (
                <TouchableOpacity
                  style={[styles.smallAddButton, { backgroundColor: isStudentSelectionMode ? '#ef4444' : '#f1f5f9' }]}
                  onPress={() => {
                    setIsStudentSelectionMode(!isStudentSelectionMode);
                    setSelectedStudentIds([]);
                  }}
                >
                  {isStudentSelectionMode ? (
                    <X size={18} color="white" />
                  ) : (
                    <Users size={18} color="#64748b" />
                  )}
                  <Text style={[styles.smallAddButtonText, { color: isStudentSelectionMode ? 'white' : '#64748b' }]}>
                    {isStudentSelectionMode ? t('cancel') : t('select')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.smallAddButton} onPress={() => setIsStudentModalVisible(true)}>
                <Plus size={18} color="#fff" />
                <Text style={styles.smallAddButtonText}>{t('add')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isStudentSelectionMode && (
          <View style={styles.searchBarContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              placeholder={t('search_students')}
              style={styles.searchBarInput}
              value={settingsSearchQuery}
              onChangeText={setSettingsSearchQuery}
            />
          </View>
        )}

        <ScrollView
          style={styles.scrollContent}
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
          alwaysBounceVertical={true}
        >
          {!isStudentSelectionMode && unassignedStudents.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={styles.sectionTitle}>{t('unassigned')} ({unassignedStudents.length})</Text>
              {unassignedStudents.map(student => (
                <View key={student.id} style={styles.card}>
                  <View>
                    <Text style={styles.cardTitle}>{student.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {schools.find(s => s.id === student.schoolId)?.name || t('no_school')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallAddButton, { backgroundColor: '#eff6ff' }]}
                    onPress={() => setNavigation({ view: 'students', data: student, mode: 'assign' })}
                  >
                    <Text style={[styles.smallAddButtonText, { color: '#6366f1' }]}>{t('assign')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {!isStudentSelectionMode && <Text style={styles.sectionTitle}>{t('all_students')}</Text>}

          {(isStudentSelectionMode ? students : students.filter(s => s.name.toLowerCase().includes(settingsSearchQuery.toLowerCase()))).map(student => {
            const isSelected = selectedStudentIds.includes(student.id);
            return (
              <TouchableOpacity
                key={student.id}
                style={[styles.card, isSelected && { borderColor: '#6366f1', backgroundColor: '#f5f3ff' }]}
                onPress={() => isStudentSelectionMode ? toggleStudentSelection(student.id) : null}
                activeOpacity={isStudentSelectionMode ? 0.7 : 1}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  {isStudentSelectionMode && (
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? '#6366f1' : '#cbd5e1',
                      backgroundColor: isSelected ? '#6366f1' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected && <Check size={14} color="white" />}
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{student.name}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      {formatClassName(classes.find(c => c.id === student.classId)) || t('no_class')} • {schools.find(s => s.id === student.schoolId)?.name || t('no_school')}
                    </Text>
                  </View>
                </View>
                {!isStudentSelectionMode && (
                  <TouchableOpacity onPress={() => showConfirm(`${t('confirm_delete_student')}: ${student.name}?`, async () => {
                    if (onDeleteStudent) await onDeleteStudent(student.id);
                  })}>
                    <Trash2 size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
          {students.length === 0 && (
            <Text style={styles.emptyText}>{t('no_students_registered')}</Text>
          )}
        </ScrollView>

        {isStudentSelectionMode && (
          <View style={{ flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
            <TouchableOpacity
              style={[styles.submitButton, { flex: 1, backgroundColor: '#f1f5f9', shadowColor: 'transparent' }]}
              onPress={handleDeleteAllStudents}
            >
              <Text style={[styles.submitButtonText, { color: '#ef4444' }]}>{t('delete_all')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { flex: 2, backgroundColor: selectedStudentIds.length > 0 ? '#ef4444' : '#cbd5e1', shadowColor: selectedStudentIds.length > 0 ? '#ef4444' : 'transparent' }]}
              onPress={handleBulkDeleteStudents}
              disabled={selectedStudentIds.length === 0}
            >
              <Text style={styles.submitButtonText}>{t('delete_selected')} ({selectedStudentIds.length})</Text>
            </TouchableOpacity>
          </View>
        )}

        {navigation.view === 'students' && navigation.mode === 'assign' && (
          <View style={[styles.modalOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('assign')}: {navigation.data.name}</Text>
              <Text style={styles.label}>{t('select_class')}</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {classes
                  .filter(c => c.schoolId === navigation.data.schoolId)
                  .map(cls => (
                    <TouchableOpacity
                      key={cls.id}
                      style={styles.schoolSelectItem}
                      onPress={async () => {
                        await onAssignStudentToClass(navigation.data.id, cls.id);
                        setNavigation({ view: 'students', data: null });
                      }}
                    >
                      <Text style={styles.schoolSelectText}>{formatClassName(cls)}</Text>
                      <ChevronRight size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.cancelButton, { marginTop: 20 }]}
                onPress={() => setNavigation({ view: 'students', data: null })}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCalendarMgmt = () => {
    const activeSchoolId = isSuperAdmin ? selectedCalendarSchool : user.school_id;
    const currentSchool = schools.find(s => s.id === activeSchoolId);
    const calendarEvents = (schoolCalendar || []).filter(e => e.school_id === activeSchoolId);

    const { firstDay, daysInMonth, year, month } = getDaysInMonth(viewDate);
    const monthIndex = viewDate.getMonth();
    const monthsArr = language === 'sq'
      ? ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nntor', 'Dhjetor']
      : language === 'sr'
        ? ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
        : ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const monthName = monthsArr[monthIndex];
    const dayLabels = language === 'sq'
      ? ['Hn', 'Mar', 'Mr', 'Enj', 'Pre', 'Sht', 'Die']
      : language === 'sr'
        ? ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']
        : ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    // 1. School Selection Screen (Super Admin Only)
    if (isSuperAdmin && !selectedCalendarSchool) {
      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setNavigation({ view: 'home', data: null })}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('manage_calendar')}</Text>
            </View>
          </View>
          <View style={styles.searchBarContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              placeholder={t('search_school_placeholder')}
              style={styles.searchBarInput}
              value={settingsSearchQuery}
              onChangeText={setSettingsSearchQuery}
            />
          </View>
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
            <View style={{ gap: 12 }}>
              {schools
                .filter(s => (s.name || '').toLowerCase().includes(settingsSearchQuery.toLowerCase()))
                .map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.card, { padding: 16, marginBottom: 0, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' }]}
                    onPress={() => {
                      setSelectedCalendarSchool(s.id);
                      setCalendarSubTab('calendar');
                      setSettingsSearchQuery('');
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                      <School size={22} color="#64748b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>{s.name}</Text>
                      {s.city ? <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' }}>{s.city}</Text> : null}
                    </View>
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => isSuperAdmin ? setSelectedCalendarSchool(null) : setNavigation({ view: 'home', data: null })}
            >
              <ArrowLeft size={18} color="#1e293b" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('manage_calendar')}</Text>
              {currentSchool && (
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>{currentSchool.name}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Premium Stats Banner + Pill Tab Switcher (Light Theme) */}
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
          {/* Stats Row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {[
              { label: t('total'), value: calendarEvents.length, accent: '#6366f1', bg: '#eef2ff' },
              { label: t('holiday'), value: calendarEvents.filter(e => e.type === 'holiday').length, accent: '#ef4444', bg: '#fef2f2' },
              { label: t('work_day'), value: calendarEvents.filter(e => e.type === 'work_day').length, accent: '#10b981', bg: '#ecfdf5' },
            ].map(stat => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: stat.bg, borderRadius: 18, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 26, fontWeight: '900', color: stat.accent }}>{stat.value}</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
          {/* Pill Tabs — only 2 tabs */}
          <View style={{ flexDirection: 'row', padding: 5, backgroundColor: '#f1f5f9', borderRadius: 22, height: 52, alignItems: 'center', marginBottom: 0 }}>
            {[
              { id: 'calendar', label: t('calendar_tab'), icon: Calendar },
              { id: 'history', label: t('history_tab'), icon: List },
            ].map(tab => {
              const isActive = calendarSubTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={{ flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 18, backgroundColor: isActive ? 'white' : 'transparent', shadowColor: isActive ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isActive ? 0.08 : 0, shadowRadius: 4, elevation: isActive ? 1 : 0 }}
                  onPress={() => { setCalendarSubTab(tab.id); setCalendarStep(1); }}
                >
                  <tab.icon size={14} color={isActive ? '#2563eb' : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                  <Text style={{ fontSize: 11, fontWeight: '900', color: isActive ? '#2563eb' : '#64748b' }}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <ScrollView style={[styles.scrollContent, { backgroundColor: '#f8fafc' }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100 }}>
          {calendarSubTab === 'calendar' && (
            <View style={{ width: '100%' }}>
              {calendarStep === 1 ? (
                <View style={{ gap: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                      <Text style={{ fontSize: 32, fontWeight: '900', color: '#1e293b', textTransform: 'capitalize', letterSpacing: -1 }}>{monthName} <Text style={{ color: '#94a3b8', fontWeight: '400' }}>{year}</Text></Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
                          <ChevronRight size={20} color="#64748b" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
                          <ChevronRight size={20} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {selectedDates.size > 0 && (
                      <TouchableOpacity 
                        style={{ paddingHorizontal: 20, height: 48, borderRadius: 16, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fee2e2' }}
                        onPress={() => setSelectedDates(new Set())}
                      >
                        <Text style={{ color: '#ef4444', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }}>{t('clear_selection').toUpperCase()}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={[
                    styles.card, 
                    { 
                      padding: 0, borderRadius: 32, overflow: 'hidden', borderBottomWidth: 0, 
                      shadowColor: '#94a3b8', shadowRadius: 30, shadowOpacity: 0.15,
                      backgroundColor: 'white'
                    }
                  ]}>
                    <View style={{ padding: 24, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                      <View style={{ flexDirection: 'row', padding: 6, backgroundColor: '#f1f5f9', borderRadius: 18 }}>
                        {[
                          { id: 'single', label: t('single'), icon: Search },
                          { id: 'multi', label: t('multi'), icon: Plus },
                          { id: 'range', label: t('range'), icon: Calendar }
                        ].map(mode => {
                          const active = selectionMode === mode.id;
                          return (
                            <TouchableOpacity
                              key={mode.id}
                              onPress={() => { setSelectionMode(mode.id); setSelectedDates(new Set()); }}
                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, backgroundColor: active ? 'white' : 'transparent', shadowColor: active ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 5, elevation: active ? 2 : 0 }}
                            >
                              <mode.icon size={14} color={active ? '#6366f1' : '#64748b'} strokeWidth={active ? 2.5 : 2} />
                              <Text style={{ fontSize: 12, fontWeight: '800', color: active ? '#6366f1' : '#64748b' }}>{mode.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ padding: 32 }}>
                      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                        {dayLabels.map(label => (
                          <Text key={label} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>{label}</Text>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {Array.from({ length: firstDay }).map((_, i) => <View key={`e-${i}`} style={{ width: `${100 / 7}%`, height: 80 }} />)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isSelected = selectedDates.has(dateStr);
                          const isToday = dateStr === new Date().toISOString().split('T')[0];
                          const event = calendarEvents.find(e => e.date === dateStr);
                          return (
                            <TouchableOpacity
                              key={day}
                              style={{ width: `${100 / 7}%`, height: 80, alignItems: 'center', justifyContent: 'center' }}
                              onPress={() => toggleDateSelection(dateStr)}
                            >
                              <View style={{ 
                                width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: isSelected ? '#6366f1' : (event ? (event.type === 'holiday' ? '#fef2f2' : '#ecfdf5') : 'transparent'),
                                borderWidth: isToday ? 2 : 0, borderColor: '#6366f1'
                              }}>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: isSelected ? 'white' : (event ? (event.type === 'holiday' ? '#ef4444' : '#10b981') : '#1e293b') }}>{day}</Text>
                              </View>
                              {event && !isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: event.type === 'holiday' ? '#ef4444' : '#10b981', marginTop: 6 }} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {selectedDates.size > 0 && (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={{ 
                            marginTop: 32, height: 64, borderRadius: 22, backgroundColor: '#2563eb', 
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
                            shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8
                          }}
                          onPress={() => setCalendarStep(2)}
                        >
                          <Text style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>{t('continue')} ({selectedDates.size} {t('dates')})</Text>
                          <ArrowLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[
                  styles.card, 
                  { 
                    padding: 40, borderRadius: 32, backgroundColor: 'white',
                    shadowColor: '#94a3b8', shadowRadius: 30, shadowOpacity: 0.15,
                  }
                ]}>
                  <View style={{ gap: 32 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b' }}>{t('configure_events')}</Text>
                        <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600', marginTop: 4 }}>{selectedDates.size} {t('selected_dates')}</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => setCalendarStep(1)}
                        style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ArrowLeft size={22} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -40, paddingHorizontal: 40 }}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        {Array.from(selectedDates).sort().map(date => (
                          <View key={date} style={{ backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>{date.split('-').reverse().join('/')}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>

                    <View style={{ gap: 16 }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginLeft: 4 }}>{t('select_event_type')}:</Text>
                      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                        {[
                          { id: 'holiday', label: t('holiday'), icon: XCircle, color: '#ef4444', desc: t('holiday_desc') || 'Dita pushimi pa mësim' },
                          { id: 'work_day', label: t('work_day'), icon: CheckCircle, color: '#10b981', desc: t('work_day_desc') || 'Dita e rregullt mësimi' }
                        ].map(opt => {
                          const active = calendarType === opt.id;
                          return (
                            <TouchableOpacity
                              key={opt.id}
                              onPress={() => setCalendarType(opt.id)}
                              style={{ 
                                flex: 1, padding: 24, borderRadius: 24, backgroundColor: active ? opt.color : '#f8fafc',
                                borderWidth: 2, borderColor: active ? opt.color : '#f1f5f9',
                                shadowColor: active ? opt.color : '#000', shadowOpacity: active ? 0.2 : 0, shadowRadius: 10, elevation: active ? 6 : 0
                              }}
                            >
                              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <opt.icon size={28} color={opt.color} />
                              </View>
                              <Text style={{ fontSize: 18, fontWeight: '900', color: active ? 'white' : '#1e293b' }}>{opt.label}</Text>
                              <Text style={{ fontSize: 13, color: active ? '#ffffff90' : '#64748b', fontWeight: '600', marginTop: 4 }}>{opt.desc}</Text>
                              {active && <View style={{ position: 'absolute', top: 20, right: 20 }}><Check size={24} color="white" strokeWidth={3} /></View>}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', marginLeft: 4, marginBottom: 12 }}>{t('optional_description')}</Text>
                      <TextInput
                        style={[styles.input, { height: 120, borderRadius: 24, padding: 20, textAlignVertical: 'top', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', fontSize: 15 }]}
                        placeholder={t('write_description_placeholder')}
                        multiline
                        value={calendarDescription}
                        onChangeText={setCalendarDescription}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <TouchableOpacity
                        style={{ flex: 1, height: 64, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => setCalendarStep(1)}
                      >
                        <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 16 }}>{t('cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 2, height: 64, borderRadius: 22, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                        onPress={async () => {
                          setIsProcessing(true);
                          const datesArr = Array.from(selectedDates).map(date => ({ date, type: calendarType, description: calendarDescription, school_id: activeSchoolId }));
                          await onAddCalendarEvents(datesArr);
                          setIsProcessing(false);
                          setSelectedDates(new Set());
                          setCalendarStep(1);
                          setCalendarDescription('');
                          showAlert(t('success'), 'success');
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>{t('confirm_and_save')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {calendarSubTab === 'history' && (
            <View style={{ gap: 16 }}>
              {calendarEvents.length === 0 ? (
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Calendar size={40} color="#94a3b8" />
                  </View>
                  <Text style={{ fontSize: 16, color: '#94a3b8', fontWeight: '700' }}>{t('no_events')}</Text>
                  <Text style={{ fontSize: 13, color: '#cbd5e1', marginTop: 4, textAlign: 'center' }}>{t('no_events_desc') || 'Nuk ka ngjarje të regjistruara për këtë shkollë.'}</Text>
                </View>
              ) : (
                calendarEvents
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(event => (
                    <View key={event.id} style={{
                      backgroundColor: 'white',
                      borderRadius: 24, padding: 18,
                      borderWidth: 1, borderColor: '#f1f5f9',
                      shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={{ 
                          width: 48, height: 48, borderRadius: 16, 
                          backgroundColor: event.type === 'holiday' ? '#fef2f2' : '#ecfdf5',
                          alignItems: 'center', justifyContent: 'center'
                        }}>
                          {event.type === 'holiday' ? <XCircle size={24} color="#ef4444" /> : <CheckCircle size={24} color="#10b981" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                              <Text style={{ fontSize: 15, fontWeight: '800', color: event.type === 'holiday' ? '#dc2626' : '#059669' }}>
                                {event.type === 'holiday' ? t('holiday') : t('work_day')}
                              </Text>
                              <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '700', marginTop: 2 }}>
                                {event.date.split('-').reverse().join('/')}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => showConfirm(t('confirm_delete') + '?', () => onDeleteCalendarEvent(event.id))}
                              style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                          {event.description ? (
                            <View style={{ marginTop: 10, padding: 10, backgroundColor: '#f8fafc', borderRadius: 12 }}>
                              <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500', lineHeight: 16 }}>{event.description}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))
              )}
            </View>
          )}

        </ScrollView>
      </View>
    );
  };

  const renderSchoolYearMgmt = () => {
    const activeSchoolId = isSuperAdmin ? selectedCalendarSchool : user.school_id;
    const currentSchool = schools.find(s => s.id === activeSchoolId);
    const archivedYear = selectedGlobalAcademicYear ? academicYearHistory?.find(h => h.academic_year === selectedGlobalAcademicYear) : null;

    if (isSuperAdmin && !selectedCalendarSchool) {
      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setNavigation({ view: 'home', data: null })}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('school_year_mgmt')}</Text>
            </View>
          </View>
          <View style={styles.searchBarContainer}>
            <Search size={20} color="#94a3b8" />
            <TextInput
              placeholder={t('search_school_placeholder')}
              style={styles.searchBarInput}
              value={settingsSearchQuery}
              onChangeText={setSettingsSearchQuery}
            />
          </View>
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16, paddingTop: 8 }}>
            <View style={{ gap: 12 }}>
              {schools
                .filter(s => (s.name || '').toLowerCase().includes(settingsSearchQuery.toLowerCase()))
                .map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.card, { padding: 16, marginBottom: 0, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' }]}
                    onPress={() => {
                      setSelectedCalendarSchool(s.id);
                      setSettingsSearchQuery('');
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                      <School size={22} color="#64748b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>{s.name}</Text>
                      {s.city ? <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' }}>{s.city}</Text> : null}
                    </View>
                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      );
    }

    if (schoolYearSubTab === 'end' && selectedPromotionClassId !== null && selectedPromotionClassId !== -1) {
      const filteredClasses = (classes || []).filter(c => c.school_id === activeSchoolId);
      const selectedClass = filteredClasses.find(c => c.id === selectedPromotionClassId);
      const classStudents = (students || []).filter(s => s.classId === selectedPromotionClassId);
      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setSelectedPromotionClassId(-1)}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('manage_promotions')}</Text>
            </View>
          </View>
          <View style={{ padding: 24, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>{t('select_students_promotion')}</Text>
              <Text style={{ fontSize: 13.5, color: '#64748b', fontWeight: '600', marginTop: 4 }}>{t('click_to_promote_desc')}</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' }}
              onPress={() => {
                const allInClassPromoted = classStudents.every(s => promotedStudentIds.has(s.id));
                const newSet = new Set(promotedStudentIds);
                if (allInClassPromoted) classStudents.forEach(s => newSet.delete(s.id));
                else classStudents.forEach(s => newSet.add(s.id));
                setPromotedStudentIds(newSet);
              }}
            >
              <Text style={{ color: '#475569', fontWeight: '800', fontSize: 13 }}>{classStudents.every(s => promotedStudentIds.has(s.id)) ? t('deselect_all') : t('select_all_students')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
            {classStudents.map(student => {
              const isSelected = promotedStudentIds.has(student.id);
              return (
                <TouchableOpacity
                  key={student.id}
                  style={{ backgroundColor: isSelected ? '#ecfdf5' : '#fff', borderRadius: 20, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: isSelected ? '#10b981' : '#f1f5f9' }}
                  onPress={() => {
                    const newSet = new Set(promotedStudentIds);
                    if (isSelected) newSet.delete(student.id);
                    else newSet.add(student.id);
                    setPromotedStudentIds(newSet);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isSelected ? '#10b981' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected ? <Check size={20} color="#fff" /> : <User size={20} color="#94a3b8" />}
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: isSelected ? '#065f46' : '#1e293b' }}>{student.name}</Text>
                      <Text style={{ fontSize: 12, color: isSelected ? '#059669' : '#94a3b8', fontWeight: '600' }}>{isSelected ? t('will_receive_certificate') : t('not_selected')}</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={{ backgroundColor: '#10b981', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ position: 'absolute', bottom: 30, left: 24, right: 24 }}>
            <TouchableOpacity
              style={{ height: 64, borderRadius: 24, backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 }}
              onPress={() => setSelectedPromotionClassId(-1)}
            >
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 17, letterSpacing: 0.5 }}>{t('continue_other_classes')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const tabs = [
      { id: 'start', label: t('school_year_start_tab'), icon: Calendar, color: '#2563eb', bg: '#eff6ff' },
      { id: 'semester', label: t('school_year_semester_tab'), icon: BookOpen, color: '#4f46e5', bg: '#eef2ff' },
      { id: 'end', label: t('school_year_end_tab'), icon: Archive, color: '#a21caf', bg: '#fdf4ff' },
    ];

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => isSuperAdmin ? setSelectedCalendarSchool(null) : setNavigation({ view: 'home', data: null })}
            >
              <ArrowLeft size={18} color="#1e293b" />
            </TouchableOpacity>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('school_year_mgmt')}</Text>
              {currentSchool && (
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>{currentSchool.name}</Text>
              )}
            </View>
          </View>
        </View>


        {/* 3-tab pill switcher */}
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', padding: 5, backgroundColor: '#f1f5f9', borderRadius: 22, alignItems: 'center' }}>
            {tabs.map(tab => {
              const isActive = schoolYearSubTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={{ flex: 1, paddingVertical: 10, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 18, backgroundColor: isActive ? 'white' : 'transparent', shadowColor: isActive ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: isActive ? 0.08 : 0, shadowRadius: 4, elevation: isActive ? 1 : 0 }}
                  onPress={() => setSchoolYearSubTab(tab.id)}
                >
                  <tab.icon size={14} color={isActive ? tab.color : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: isActive ? tab.color : '#64748b', textAlign: 'center' }}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ScrollView style={[styles.scrollContent, { backgroundColor: '#f8fafc' }]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}>

          {/* TAB: Fillimi i vitit shkollor */}
          {schoolYearSubTab === 'start' && (
            <View>
              {(currentSchool?.school_year_start || currentSchool?.school_year_end) && (
                <View style={{ backgroundColor: '#eff6ff', borderRadius: 24, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#dbeafe' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
                    <Info size={22} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{t('current_school_year')}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>
                      {(currentSchool?.school_year_start ? currentSchool.school_year_start.split('-').reverse().join('/') : '—')} {'→'} {(currentSchool?.school_year_end ? currentSchool.school_year_end.split('-').reverse().join('/') : '—')}
                    </Text>
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: 'white', borderRadius: 28, overflow: 'hidden', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 4 }}>
                <View style={{ position: 'relative', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                  <PremiumDatePicker
                    label={t('start_date')}
                    value={schoolYearStart || archivedYear?.school_year_start || currentSchool?.school_year_start}
                    onChange={(date) => setSchoolYearStart(date)}
                    disabled={isReadOnly}
                    placeholder="DD/MM/YYYY"
                  />
                </View>

                {/* END DATE PICKER ADDED HERE */}
                <View style={{ position: 'relative', padding: 20 }}>
                  <PremiumDatePicker
                    label={t('end_date')}
                    value={schoolYearEnd || archivedYear?.school_year_end || currentSchool?.school_year_end}
                    onChange={(date) => setSchoolYearEnd(date)}
                    disabled={isReadOnly}
                    placeholder="DD/MM/YYYY"
                  />
                </View>
              </View>
              {!isReadOnly && (
                <TouchableOpacity
                  style={{ height: 60, borderRadius: 22, marginTop: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8, flexDirection: 'row', gap: 10 }}
                  onPress={async () => {
                    const start = schoolYearStart || currentSchool?.school_year_start;
                    const end = schoolYearEnd || currentSchool?.school_year_end;
                    if (!start || !end) { showAlert(t('fill_all_fields'), 'error'); return; }
                    const res = await onUpdateSchoolDates(activeSchoolId, start, end);
                    if (res?.error) showAlert(res.error.message, 'error');
                    else showAlert(t('success'), 'success');
                  }}
                >
                  <Check size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>{t('save')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TAB: Gjysemvjetori */}
          {schoolYearSubTab === 'semester' && (
            <View style={{ gap: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 32, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 }}>
                <View
                  style={{ padding: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#f8faff' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}>
                      <Calendar size={28} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>{t('term_two_transition_date')}</Text>
                      <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: '700', marginTop: 2 }}>{t('term_two_date_info')}</Text>
                    </View>
                  </View>
                </View>

                <View style={{ padding: 24 }}>
                  <View style={{ backgroundColor: '#f8fafc', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 24 }}>
                    <PremiumDatePicker
                      label={t('select_new_date') || 'Zgjidh Datn e Re'}
                      value={termTwoDate || archivedYear?.term_two_start_date || currentSchool?.term_two_start_date}
                      onChange={(date) => setTermTwoDate(date)}
                      disabled={isReadOnly}
                      placeholder="DD/MM/YYYY"
                    />

                    {/* Timeline Visualizer */}
                    <View style={{ marginTop: 32, paddingHorizontal: 4 }}>
                      <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, flexDirection: 'row', alignItems: 'center', position: 'relative' }}>
                        <View style={{ flex: 1, height: 6, backgroundColor: '#fbbf24', borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }} />
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#4f46e5', borderWidth: 4, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, zIndex: 10 }} />
                        <View style={{ flex: 1, height: 6, backgroundColor: '#60a5fa', borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                        <View style={{ alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('term_1')}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#b45309', marginTop: 2 }}>
                            {(() => {
                              const months = t('months_short');

                              const start = schoolYearStart || currentSchool?.school_year_start;
                              const mid = termTwoDate || currentSchool?.term_two_start_date;

                              const startMonth = start ? months[new Date(start).getMonth()] : months[8];
                              const midMonth = mid ? months[new Date(mid).getMonth()] : months[0];

                              return `${startMonth} - ${midMonth}`;
                            })()}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('term_2')}</Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563eb', marginTop: 2 }}>
                            {(() => {
                              const months = t('months_short');

                              const mid = termTwoDate || currentSchool?.term_two_start_date;
                              const end = schoolYearEnd || currentSchool?.school_year_end;

                              const midMonth = mid ? months[new Date(mid).getMonth()] : months[1];
                              const endMonth = end ? months[new Date(end).getMonth()] : months[5];

                              return `${midMonth} - ${endMonth}`;
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {!isReadOnly && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{ height: 60, borderRadius: 20, backgroundColor: '#4f46e5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 15, elevation: 6 }}
                      onPress={async () => {
                        const dateToSave = termTwoDate || currentSchool?.term_two_start_date;
                        if (!dateToSave) { showAlert(t('fill_all_fields'), 'error'); return; }
                        setIsProcessing(true);
                        const res = await onUpdateTermStartDate(activeSchoolId, dateToSave);
                        setIsProcessing(false);
                        if (res?.error) showAlert(res.error.message, 'error');
                        else showAlert(`${t('success')}!`, 'success');
                      }}
                    >
                      <Check size={20} color="#fff" strokeWidth={3} />
                      <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>{t('save_date_btn')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* TAB: Mbyllja e vitit shkollor */}
          {schoolYearSubTab === 'end' && (
            <View style={{ gap: 24 }}>
              {(selectedPromotionClassId === -1 || isClosingYearProcess) ? (
                <View style={{ gap: 16 }}>
                  {isClosingYearProcess && (
                    <View style={{ backgroundColor: '#fef2f2', padding: 20, borderRadius: 24, borderLeftWidth: 6, borderLeftColor: '#ef4444', marginBottom: 8, shadowColor: '#ef4444', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <AlertTriangle size={20} color="#ef4444" />
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#991b1b' }}>{t('closure_active_warning')}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#b91c1c', fontWeight: '600', lineHeight: 18 }}>
                        {t('closure_step_desc')}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('select_class_to_promote')}</Text>
                      <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>{t('select_class_instruction')}</Text>
                    </View>
                    {!isClosingYearProcess && (
                      <TouchableOpacity
                        style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 10 }}
                        onPress={() => setSelectedPromotionClassId(null)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569' }}>{t('cancel')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ gap: 12 }}>
                    {(classes || []).filter(c => c.school_id === activeSchoolId).map(cls => {
                      const classStudents = (students || []).filter(s => s.classId === cls.id);
                      const promotedCount = classStudents.filter(s => promotedStudentIds.has(s.id)).length;
                      return (
                        <TouchableOpacity
                          key={cls.id}
                          activeOpacity={0.7}
                          style={{
                            backgroundColor: '#fff',
                            padding: 20,
                            borderRadius: 24,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderWidth: 1.5,
                            borderColor: promotedCount > 0 ? '#10b981' : '#f1f5f9',
                            shadowColor: '#000',
                            shadowOpacity: 0.02,
                            shadowRadius: 10,
                            elevation: 1
                          }}
                          onPress={() => setSelectedPromotionClassId(cls.id)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: promotedCount > 0 ? '#ecfdf5' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                              <LayoutGrid size={22} color={promotedCount > 0 ? '#10b981' : '#64748b'} />
                            </View>
                            <View>
                              <Text style={{ fontSize: 17, fontWeight: '800', color: '#1e293b' }}>{cls.name}</Text>
                              <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>
                                {classStudents.length} {t('student')} • {t('promoted_count').replace('{count}', promotedCount)}
                              </Text>
                            </View>
                          </View>
                          <ChevronRight size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {isClosingYearProcess && (
                    <View style={{ marginTop: 24, gap: 12 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={{ height: 64, borderRadius: 24, backgroundColor: '#ef4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#ef4444', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 }}
                        onPress={async () => {
                          const now = new Date();
                          const currentYear = now.getFullYear();
                          const currentMonth = now.getMonth();
                          const calculateYear = () => {
                            if (currentSchool?.current_year) return currentSchool.current_year;
                            if (availableAcademicYears && availableAcademicYears.length > 0) {
                              const latest = availableAcademicYears[0];
                              const parts = latest.split('/');
                              if (parts.length === 2) {
                                const endYear = parseInt(parts[1]);
                                if (!isNaN(endYear)) return `${endYear}/${endYear + 1}`;
                              }
                            }
                            return (currentMonth < 7 ? `${currentYear - 1}/${currentYear}` : `${currentYear}/${currentYear + 1}`);
                          };
                          const yearToArchive = calculateYear();

                          showConfirm(`${t('confirm_closure_final')} (${yearToArchive})\n\n${t('confirm_closure_desc')}`, async () => {
                            setIsProcessing(true);
                            // 1. Archive
                            const arcRes = await onArchiveYear(activeSchoolId, yearToArchive);
                            if (arcRes?.error) {
                              setIsProcessing(false);
                              showAlert(arcRes.error.message, 'error');
                              return;
                            }
                            // 2. Promote
                            const promRes = await onPromoteStudents(activeSchoolId, Array.from(promotedStudentIds));
                            setIsProcessing(false);
                            setIsClosingYearProcess(false);
                            setSelectedPromotionClassId(null);
                            setNavigation({ view: 'home', data: null });
                            if (promRes?.error) showAlert(t('year_archived_promotion_error') + promRes.error.message, 'warning');
                            else showAlert(t('year_closure_success'), "success");
                          });
                        }}
                      >
                        <Archive size={20} color="#fff" />
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 17 }}>{t('complete_closure')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => {
                          showConfirm("A jeni të sigurt që dëshironi të anuloni procesin e mbylljes? Të dhënat nuk do të ndryshohen.", () => {
                            setIsClosingYearProcess(false);
                            setSelectedPromotionClassId(null);
                          });
                        }}
                      >
                        <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 14 }}>{t('cancel_closure')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ gap: 24 }}>
                  <View style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>{t('closure_process')}</Text>
                    <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 }}>{t('select_action')}</Text>
                  </View>

                  {/* Combined Process Start */}
                  <View style={{ backgroundColor: '#fff', borderRadius: 32, borderWidth: 1, borderColor: '#fee2e2', overflow: 'hidden', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5 }}>
                    <View style={{ padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }}>
                        <Archive size={28} color="#ef4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#991b1b' }}>{t('archive_year')}</Text>
                        <Text style={{ fontSize: 12.5, color: '#dc2626', fontWeight: '600', marginTop: 2 }}>
                          {t('archive_desc')}
                        </Text>
                      </View>
                    </View>
                    <View style={{ padding: 24, paddingTop: 0 }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={{ height: 60, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }}
                        onPress={() => {
                          showConfirm(t('start_closure_confirm'), () => {
                            setIsClosingYearProcess(true);
                            setSelectedPromotionClassId(-1);
                            setPromotedStudentIds(new Set());
                          });
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>{t('start_closure')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </View>
    );
  };

  const renderCodes = () => (
    <View style={styles.viewContainer}>
      <View style={styles.navigationHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setNavigation({ view: 'home', data: null })}
          >
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('school_code')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 16 }}>
          {schools.map(school => (
            <View key={school.id} style={[styles.card, {
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 0
            }]}>
              <View style={{ flex: 1 }}>
                {/* School Name */}
                <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '800', marginBottom: 6 }}>
                  {school.name}
                </Text>

                {/* City/Municipality */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Building2 size={13} color="#64748b" />
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                    {school.city}
                  </Text>
                </View>

                {/* Admin Credentials (Super Admin only) */}
                {isSuperAdmin && (
                  <View style={{
                    backgroundColor: '#f8fafc',
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#f1f5f9',
                    gap: 8
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Users size={14} color="#6366f1" />
                      <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '700' }}>
                        {school.admin_email || 'n/a'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={14} color="#10b981" />
                      <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '800' }}>
                        PW: {school.admin_password || 'n/a'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* School Code Badge */}
              <View style={{
                backgroundColor: '#eff6ff',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: '#dbeafe',
                marginLeft: 16,
                minWidth: 90
              }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 }}>
                  {t('school_code')}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b', letterSpacing: 1 }}>
                  {school.code}
                </Text>
              </View>
            </View>
          ))}
        </View>
        {schools.length === 0 && (
          <Text style={styles.emptyText}>{t('no_schools_registered')}</Text>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );

  const resetNoticeForm = () => {
    setNoticeTitle('');
    setNoticeMessage('');
    setNoticeAttachments([]);
    setSelectedFileName('');
    setNoticeSchoolId(null);
    setSelectedNoticeSchools([]);
    setSelectedNoticeClasses([]);
    setSearchNoticeSchools('');
    setSearchNoticeClasses('');
    setIsNoticeSchoolDropdownVisible(false);
    setIsNoticeClassDropdownVisible(false);
    setNoticeModalStep(1);
    setIsNoticeModalVisible(false);
    setEditingNoticeId(null);
    setIsAllSchools(false);
    setIsAllClasses(true);
  };

  const handleAddNotice = async () => {
    if (!noticeTitle || !noticeMessage) return;

    // Join multiple attachments with |
    const attachmentUrl = noticeAttachments.map(a => a.url).join('|');

    const result = await onAddNotice({
      title: noticeTitle,
      message: noticeMessage,
      attachmentUrl: attachmentUrl,
      schoolIds: isSuperAdmin ? (isAllSchools ? schools.map(s => s.id) : selectedNoticeSchools) : null,
      classIds: !isSuperAdmin ? (isAllClasses ? null : selectedNoticeClasses) : null,
      schoolId: !isSuperAdmin ? user.school_id : null
    });

    if (!result?.error) {
      resetNoticeForm();
      showAlert(t('notice_sent'), 'success');
    } else {
      showAlert(result.error.message || 'Gabim gjatë dërgimit', 'error');
    }
  };

  const renderNotices = () => {
    // Aggregated notices by batch_id or unique content
    const aggregatedNotices = new Map();

    (notices || []).forEach(notice => {
      const key = notice.batch_id || `${notice.title}-${notice.message}-${notice.attachment_url || ''}`;
      if (!aggregatedNotices.has(key)) {
        aggregatedNotices.set(key, {
          ...notice,
          recipient_school_ids: new Set(),
          recipient_class_ids: new Set(),
          is_all_schools: (notice.is_super_admin && !notice.school_id),
          is_all_classes: (!!notice.school_id && !notice.class_id)
        });
      }
      const agg = aggregatedNotices.get(key);
      if (notice.school_id) agg.recipient_school_ids.add(notice.school_id);
      if (notice.class_id) agg.recipient_class_ids.add(notice.class_id);
    });

    const uniqueNotices = Array.from(aggregatedNotices.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setNavigation({ view: 'home', data: null })}
            >
              <ArrowLeft size={18} color="#1e293b" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a' }}>{t('notices')}</Text>
          </View>
        </View>

        <FlatList
          data={uniqueNotices}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 120 }}
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
          ListEmptyComponent={() => (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
                <Bell size={36} color="#cbd5e1" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#94a3b8', textAlign: 'center' }}>{t('no_notices')}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 24,
              marginBottom: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#f1f5f9',
              shadowColor: '#6366f1',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
              flexDirection: 'row',
            }}>
              {/* Left accent bar */}
              <View style={{ width: 5, backgroundColor: '#db2777', borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }} />

              <View style={{ flex: 1, padding: 18 }}>
                {/* Header row: icon + title + delete */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  {/* Icon */}
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fce7f3', flexShrink: 0 }}>
                    <Bell size={22} color="#db2777" />
                  </View>

                  {/* Title + date */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', lineHeight: 22, marginBottom: 4 }} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 0.3 }}>
                          {(() => {
                            const d = new Date(item.created_at);
                            const day = String(d.getDate()).padStart(2, '0');
                            const m = d.getMonth();
                            const year = d.getFullYear();
                            const monthsArr = t('months');

                            return `${day} ${monthsArr[m]} ${year}`;
                          })()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  {(!item.is_super_admin || isSuperAdmin) && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{ width: 36, height: 36, backgroundColor: '#fef2f2', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        onPress={() => showConfirm(`${t('confirm_delete')} ${t('notice_title')}?`, () => onDeleteNotice(item.id))}
                      >
                        <Trash size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Message body */}
                <Text style={{ fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: item.attachment_url ? 14 : 0 }} numberOfLines={4}>
                  {item.message}
                </Text>

                {/* Attachment chip */}
                {item.attachment_url && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf2f8', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#fce7f3' }}
                    onPress={() => {
                      const extension = item.attachment_url.split('.').pop().split('?')[0] || 'pdf';
                      const fileName = `${item.title.replace(/[^a-z0-9]/gi, '_')}.${extension}`;
                      downloadFile(item.attachment_url, fileName);
                    }}
                  >
                    <Paperclip size={14} color="#db2777" />
                    <Text style={{ color: '#db2777', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                      {t('download_attachment')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />

        <TouchableOpacity style={styles.actionFab} onPress={() => { setEditingNoticeId(null); setIsNoticeModalVisible(true); }}>
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderModals = () => (
    <>
      <Modal visible={isNoticeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { marginBottom: 4 }]}>
                  {editingNoticeId ? t('edit_notice') : t('new_notice')} - {noticeModalStep === 1 ? t('step_1') : t('step_2')}
                </Text>
              </View>
              <TouchableOpacity onPress={resetNoticeForm} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              {noticeModalStep === 1 && (
                <View style={{ paddingBottom: 20 }}>
                  {isSuperAdmin && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>{t('select_schools')} *</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setIsAllSchools(!isAllSchools);
                            if (!isAllSchools) {
                              setSelectedNoticeSchools([]);
                              setIsNoticeSchoolDropdownVisible(false);
                            }
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: isAllSchools ? '#6366f1' : '#cbd5e1', backgroundColor: isAllSchools ? '#6366f1' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {isAllSchools && <Check size={14} color="white" />}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isAllSchools ? '#6366f1' : '#64748b' }}>{t('all_schools')}</Text>
                        </TouchableOpacity>
                      </View>

                      {!isAllSchools && (
                        <>
                          <TouchableOpacity
                            style={[
                              styles.input,
                              { justifyContent: 'center' },
                              isNoticeSchoolDropdownVisible && { borderColor: '#6366f1', backgroundColor: '#f8fafc' }
                            ]}
                            onPress={() => setIsNoticeSchoolDropdownVisible(!isNoticeSchoolDropdownVisible)}
                          >
                            <Text style={{ color: selectedNoticeSchools.length > 0 ? '#1e293b' : '#94a3b8', fontWeight: '700' }}>
                              {selectedNoticeSchools.length > 0
                                ? `${selectedNoticeSchools.length} ${t('schools_selected') || 'Shkolla t przgjedhura'}`
                                : t('select_schools_placeholder')}
                            </Text>
                            <ChevronDown
                              size={18}
                              color={isNoticeSchoolDropdownVisible ? '#6366f1' : '#94a3b8'}
                              style={{ position: 'absolute', right: 12, transform: [{ rotate: isNoticeSchoolDropdownVisible ? '180deg' : '0deg' }] }}
                            />
                          </TouchableOpacity>

                          {isNoticeSchoolDropdownVisible && (
                            <View style={[styles.dropdownContainer, { position: 'relative', marginTop: 8, width: '100%' }]}>
                              <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 12, height: 44, backgroundColor: '#f1f5f9' }]}>
                                <Search size={18} color="#64748b" />
                                <TextInput
                                  placeholder={t('search_school_placeholder')}
                                  style={[styles.searchBarInput, { fontSize: 14, height: 44 }]}
                                  value={searchNoticeSchools}
                                  onChangeText={setSearchNoticeSchools}
                                />
                              </View>
                              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                {schools.filter(s => s.name.toLowerCase().includes(searchNoticeSchools.toLowerCase())).map(school => {
                                  const isSelected = selectedNoticeSchools.includes(school.id);
                                  return (
                                    <TouchableOpacity
                                      key={school.id}
                                      style={[styles.dropdownItem, isSelected && styles.activeDropdownItem]}
                                      onPress={() => {
                                        if (isSelected) setSelectedNoticeSchools(prev => prev.filter(id => id !== school.id));
                                        else setSelectedNoticeSchools(prev => [...prev, school.id]);
                                      }}
                                    >
                                      <Text style={[styles.dropdownItemText, isSelected && styles.activeDropdownItemText]}>{school.name}</Text>
                                      {isSelected && <Check size={16} color="#6366f1" />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}

                  {!isSuperAdmin && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>{t('select_classes')} *</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setIsAllClasses(!isAllClasses);
                            if (!isAllClasses) {
                              setSelectedNoticeClasses([]);
                              setIsNoticeClassDropdownVisible(false);
                            }
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: isAllClasses ? '#6366f1' : '#cbd5e1', backgroundColor: isAllClasses ? '#6366f1' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                            {isAllClasses && <Check size={14} color="white" />}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isAllClasses ? '#6366f1' : '#64748b' }}>{t('all_classes')}</Text>
                        </TouchableOpacity>
                      </View>

                      {!isAllClasses && (
                        <>
                          <TouchableOpacity
                            style={[
                              styles.input,
                              { justifyContent: 'center' },
                              isNoticeClassDropdownVisible && { borderColor: '#6366f1', backgroundColor: '#f8fafc' }
                            ]}
                            onPress={() => setIsNoticeClassDropdownVisible(!isNoticeClassDropdownVisible)}
                          >
                            <Text style={{ color: selectedNoticeClasses.length > 0 ? '#1e293b' : '#94a3b8', fontWeight: '700' }}>
                              {selectedNoticeClasses.length > 0
                                ? `${selectedNoticeClasses.length} ${t('classes_selected') || 'Klasa t przgjedhura'}`
                                : t('select_classes_placeholder')}
                            </Text>
                            <ChevronDown
                              size={18}
                              color={isNoticeClassDropdownVisible ? '#6366f1' : '#94a3b8'}
                              style={{ position: 'absolute', right: 12, transform: [{ rotate: isNoticeClassDropdownVisible ? '180deg' : '0deg' }] }}
                            />
                          </TouchableOpacity>

                          {isNoticeClassDropdownVisible && (
                            <View style={[styles.dropdownContainer, { position: 'relative', marginTop: 8, width: '100%' }]}>
                              <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 12, height: 44, backgroundColor: '#f1f5f9' }]}>
                                <Search size={18} color="#64748b" />
                                <TextInput
                                  placeholder={t('search_class_placeholder')}
                                  style={[styles.searchBarInput, { fontSize: 14, height: 44 }]}
                                  value={searchNoticeClasses}
                                  onChangeText={setSearchNoticeClasses}
                                />
                              </View>
                              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                                {(classes || []).filter(c => c.school_id === user?.school_id && formatClassName(c).toLowerCase().includes(searchNoticeClasses.toLowerCase())).map(cls => {
                                  const isSelected = selectedNoticeClasses.includes(cls.id);
                                  return (
                                    <TouchableOpacity
                                      key={cls.id}
                                      style={[styles.dropdownItem, isSelected && styles.activeDropdownItem]}
                                      onPress={() => {
                                        if (isSelected) setSelectedNoticeClasses(prev => prev.filter(id => id !== cls.id));
                                        else setSelectedNoticeClasses(prev => [...prev, cls.id]);
                                      }}
                                    >
                                      <Text style={[styles.dropdownItemText, isSelected && styles.activeDropdownItemText]}>{formatClassName(cls)}</Text>
                                      {isSelected && <Check size={16} color="#6366f1" />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.submitButton, {
                      marginTop: 20,
                      opacity: (
                        (isSuperAdmin && (isAllSchools || selectedNoticeSchools.length > 0)) ||
                        (!isSuperAdmin && (isAllClasses || selectedNoticeClasses.length > 0))
                      ) ? 1 : 0.5
                    }]}
                    onPress={() => setNoticeModalStep(2)}
                    disabled={
                      (isSuperAdmin && !isAllSchools && selectedNoticeSchools.length === 0) ||
                      (!isSuperAdmin && !isAllClasses && selectedNoticeClasses.length === 0)
                    }
                  >
                    <Text style={styles.submitButtonText}>{t('next')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {noticeModalStep === 2 && (
                <View>
                  <Text style={styles.label}>{t('notice_title')} *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('notice_title')}
                    value={noticeTitle}
                    onChangeText={setNoticeTitle}
                  />

                  <Text style={styles.label}>{t('notice_message')} *</Text>
                  <TextInput
                    style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 16 }]}
                    placeholder={t('notice_message')}
                    value={noticeMessage}
                    onChangeText={setNoticeMessage}
                    multiline
                  />

                  <Text style={styles.label}>{t('attachments')}</Text>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8', marginBottom: 12, opacity: isUploading ? 0.6 : 1 }]}
                    onPress={handleFilePick}
                    disabled={isUploading}
                  >
                    <Upload size={20} color="#db2777" />
                    <Text style={[styles.actionButtonText, { color: '#db2777' }]}>
                      {isUploading ? t('uploading') : t('upload_file')}
                    </Text>
                  </TouchableOpacity>

                  {noticeAttachments.map((att, index) => (
                    <View key={index} style={[styles.card, { padding: 12, marginBottom: 8, borderColor: '#db2777', borderWidth: 1, backgroundColor: '#fdf2f8' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <FileText size={20} color="#db2777" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
                            {att.name || 'Dokumenti i ngarkuar'}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#db2777' }}>{t('file_selected')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setNoticeAttachments(prev => prev.filter((_, i) => i !== index)); }}>
                          <X size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={{ marginBottom: 12 }} />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setNoticeModalStep(1)}>
                      <Text style={styles.cancelButtonText}>{t('back')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, (!noticeTitle || !noticeMessage) && { opacity: 0.5 }]}
                      onPress={handleAddNotice}
                      disabled={!noticeTitle || !noticeMessage}
                    >
                      <Text style={styles.submitButtonText}>{editingNoticeId ? t('save_changes') : t('send_notice')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isSchoolModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('add_new_school')}</Text>
              <TouchableOpacity onPress={resetSchoolForm} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('select_city')}</Text>
            <TouchableOpacity
              style={[
                styles.input,
                { justifyContent: 'center' },
                isCityDropdownVisible && { borderColor: '#6366f1', backgroundColor: '#f8fafc' }
              ]}
              onPress={() => {
                setIsCityDropdownVisible(!isCityDropdownVisible);
                setIsSchoolDropdownVisible(false);
              }}
            >
              <Text style={{ color: newSchoolCity ? '#1e293b' : '#94a3b8', fontWeight: '700' }}>
                {newSchoolCity || t('select_municipality_placeholder')}
              </Text>
              <ChevronDown
                size={18}
                color={isCityDropdownVisible ? '#6366f1' : '#94a3b8'}
                style={{ position: 'absolute', right: 12, transform: [{ rotate: isCityDropdownVisible ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {isCityDropdownVisible && (
              <View style={styles.dropdownContainer}>
                <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 12, height: 44, backgroundColor: '#f1f5f9' }]}>
                  <Search size={18} color="#64748b" />
                  <TextInput
                    placeholder={t('search_municipality_placeholder')}
                    style={[styles.searchBarInput, { fontSize: 14, height: 44 }]}
                    value={citySearchQuery}
                    onChangeText={setCitySearchQuery}
                    autoFocus
                  />
                </View>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {Object.keys(KOSOVO_DATA)
                    .filter(city => city.toLowerCase().includes(citySearchQuery.toLowerCase()))
                    .map(city => (
                      <TouchableOpacity
                        key={city}
                        style={[styles.dropdownItem, newSchoolCity === city && styles.activeDropdownItem]}
                        onPress={() => {
                          setNewSchoolCity(city);
                          setIsCityDropdownVisible(false);
                          setCitySearchQuery('');
                          setNewSchoolName('');
                        }}
                      >
                        <Text style={[styles.dropdownItemText, newSchoolCity === city && styles.activeDropdownItemText]}>{city}</Text>
                        {newSchoolCity === city && <Check size={16} color="#6366f1" />}
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            {newSchoolCity && !isCityDropdownVisible ? (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.label}>{t('select_school')}</Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    { justifyContent: 'center' },
                    isSchoolDropdownVisible && { borderColor: '#6366f1', backgroundColor: '#f8fafc' }
                  ]}
                  onPress={() => setIsSchoolDropdownVisible(!isSchoolDropdownVisible)}
                >
                  <Text style={{ color: newSchoolName ? '#1e293b' : '#94a3b8', fontWeight: '700' }}>
                    {newSchoolName || t('select_school_placeholder')}
                  </Text>
                  <ChevronDown
                    size={18}
                    color={isSchoolDropdownVisible ? '#6366f1' : '#94a3b8'}
                    style={{ position: 'absolute', right: 12, transform: [{ rotate: isSchoolDropdownVisible ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {isSchoolDropdownVisible && (
                  <View style={styles.dropdownContainer}>
                    <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 12, height: 44, backgroundColor: '#f1f5f9' }]}>
                      <Search size={18} color="#64748b" />
                      <TextInput
                        placeholder={t('search_school_placeholder')}
                        style={[styles.searchBarInput, { fontSize: 14, height: 44 }]}
                        value={schoolSearchQuery}
                        onChangeText={setSchoolSearchQuery}
                        autoFocus
                      />
                    </View>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {KOSOVO_DATA[newSchoolCity]
                        .filter(school => school.toLowerCase().includes(schoolSearchQuery.toLowerCase()))
                        .map(school => (
                          <TouchableOpacity
                            key={school}
                            style={[styles.dropdownItem, newSchoolName === school && styles.activeDropdownItem]}
                            onPress={() => {
                              setNewSchoolName(school);
                              setIsSchoolDropdownVisible(false);
                              setSchoolSearchQuery('');
                            }}
                          >
                            <Text style={[styles.dropdownItemText, newSchoolName === school && styles.activeDropdownItemText]}>{school}</Text>
                            {newSchoolName === school && <Check size={16} color="#6366f1" />}
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 16 }}>
              <TouchableOpacity
                style={{
                  width: 24, height: 24, borderRadius: 6, borderWidth: 2,
                  borderColor: newSchoolHasParalele ? '#6366f1' : '#cbd5e1',
                  backgroundColor: newSchoolHasParalele ? '#6366f1' : 'transparent',
                  alignItems: 'center', justifyContent: 'center', marginRight: 12
                }}
                onPress={() => setNewSchoolHasParalele(!newSchoolHasParalele)}
              >
                {newSchoolHasParalele && <Check size={16} color="white" />}
              </TouchableOpacity>
              <Text style={{ fontSize: 15, color: '#1e293b', fontWeight: '500' }}>{t('has_paralele_q')}</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetSchoolForm}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!newSchoolCity || !newSchoolName) && { opacity: 0.5 }]}
                onPress={handleAddSchoolLocal}
                disabled={!newSchoolCity || !newSchoolName}
              >
                <Text style={styles.submitButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isTeacherModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTeacherId ? t('edit_teacher') : t('add_teacher')}</Text>
              <TouchableOpacity onPress={resetTeacherForm} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} placeholder={t('first_name')} value={teacherFirstName} onChangeText={setTeacherFirstName} />
              <TextInput style={styles.input} placeholder={t('last_name')} value={teacherLastName} onChangeText={setTeacherLastName} />
              <TextInput style={styles.input} placeholder={t('email')} value={teacherUsername} onChangeText={setTeacherUsername} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} placeholder={t('password')} value={teacherPassword} onChangeText={setTeacherPassword} secureTextEntry />

              <View style={{ marginTop: 10, marginBottom: 15, padding: 12, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  onPress={() => setTeacherIsKujdestar(!teacherIsKujdestar)}
                >
                  <View style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: teacherIsKujdestar ? '#2563eb' : '#cbd5e1',
                    backgroundColor: teacherIsKujdestar ? '#2563eb' : 'white',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {teacherIsKujdestar && <Check size={18} color="white" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '800' }}>{t('coordinator_label')}</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>{t('coordinator_desc')}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('select_subjects')}</Text>
              <View style={styles.subjectsGrid}>
                {KOSOVO_SUBJECTS.map(subject => (
                  <TouchableOpacity
                    key={subject}
                    style={[styles.subjectChip, teacherSubjects.includes(subject) && styles.activeSubjectChip]}
                    onPress={() => toggleSubject(subject)}
                  >
                    <Text style={[styles.subjectChipText, teacherSubjects.includes(subject) && styles.activeSubjectChipText]}>{t(subject)}</Text>
                  </TouchableOpacity>
                ))}
              </View>


            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetTeacherForm}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!teacherFirstName || !teacherLastName || !teacherUsername || !teacherPassword || teacherSubjects.length === 0) && { opacity: 0.5 }]}
                onPress={() => handleAddTeacherLocal()}
                disabled={!teacherFirstName || !teacherLastName || !teacherUsername || !teacherPassword || teacherSubjects.length === 0}
              >
                <Text style={styles.submitButtonText}>{editingTeacherId ? t('save_changes') : t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isClassModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('add_class')}</Text>
              <TouchableOpacity onPress={() => setIsClassModalVisible(false)} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={schools.find(s => s.id === (navigation.data?.id || navigation.data?.schoolId))?.has_paralele ? t('class_number_placeholder') : t('class_name')}
              value={newClassName}
              onChangeText={setNewClassName}
            />

            {schools.find(s => s.id === (navigation.data?.id || navigation.data?.schoolId))?.has_paralele && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder={t('paralele_placeholder')}
                value={newClassParalele}
                onChangeText={setNewClassParalele}
                keyboardType="numeric"
              />
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>{t('select_teacher')}</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              <TouchableOpacity
                style={[styles.schoolSelectItem, !selectedTeacherId && styles.activeSchoolSelect]}
                onPress={() => setSelectedTeacherId('')}
              >
                <Text style={[styles.schoolSelectText, !selectedTeacherId && styles.activeSchoolSelectText]}>{t('no_teachers_assigned')}</Text>
              </TouchableOpacity>
              {teachers.filter(t => t.schoolId === (navigation.data?.id || navigation.data?.schoolId)).map(teacher => (
                <TouchableOpacity
                  key={teacher.id}
                  style={[styles.schoolSelectItem, selectedTeacherId === teacher.id && styles.activeSchoolSelect]}
                  onPress={() => setSelectedTeacherId(teacher.id)}
                >
                  <Text style={[styles.schoolSelectText, selectedTeacherId === teacher.id && styles.activeSchoolSelectText]}>
                    {t('teacher')}: {teacher.name}
                  </Text>
                  {selectedTeacherId === teacher.id && <Check size={16} color="#6366f1" />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsClassModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={() => handleAddClassLocal(navigation.data?.id)}>
                <Text style={styles.submitButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isStudentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { marginBottom: 4 }]}>{t('add_student')}</Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>
                  {t('class_prefix')} {navigation.data?.name || ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsStudentModalVisible(false)} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              {/* Existing Unassigned Students FROM SAME SCHOOL */}
              {(() => {
                const schoolId = navigation.data?.schoolId || navigation.data?.id;
                const unassignedStudents = students.filter(s => !s.classId && s.schoolId === schoolId);

                if (unassignedStudents.length > 0) {
                  return (
                    <View style={{ marginBottom: 24 }}>
                      <Text style={[styles.label, { color: '#2563eb', marginTop: 0 }]}>
                        {t('add_existing_unassigned')}:
                      </Text>
                      <View style={{ gap: 8, marginTop: 10 }}>
                        {unassignedStudents.map(student => (
                          <TouchableOpacity
                            key={student.id}
                            style={[styles.schoolSelectItem, { borderColor: '#bfdbfe', backgroundColor: '#f0f9ff' }]}
                            onPress={() => handleAssignStudentLocal(student.id, navigation.data.id)}
                          >
                            <View>
                              <Text style={styles.schoolSelectText}>{student.name}</Text>
                              <Text style={{ fontSize: 11, color: '#64748b' }}>{student.username}</Text>
                            </View>
                            <View style={{ backgroundColor: '#2563eb', padding: 6, borderRadius: 8 }}>
                              <Plus size={16} color="white" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ height: 1, backgroundColor: '#f1f5f9', marginTop: 20 }} />
                    </View>
                  );
                }
                return null;
              })()}

              <Text style={[styles.label, { marginTop: 0 }]}>{t('or_create_new')}:</Text>
              <TextInput
                style={styles.input}
                placeholder={t('student_name')}
                value={studentName}
                onChangeText={setStudentName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('username')}
                value={studentUsername}
                onChangeText={setStudentUsername}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password')}
                value={studentPassword}
                onChangeText={setStudentPassword}
                secureTextEntry
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsStudentModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => handleAddStudent(navigation.data?.id)}
                >
                  <Text style={styles.submitButtonText}>{t('confirm')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isAddTeacherToClassModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { marginBottom: 4 }]}>{t('add_teacher')}</Text>
                <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '500' }}>
                  {t('class_prefix')} {navigation.data?.name || ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setIsAddTeacherToClassModalVisible(false);
                setTeacherUsername(''); setTeacherPassword('');
                setTeacherSubjects([]);
                setTeacherIsKujdestar(false);
              }} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>

              {/* Pick existing teacher */}
              {teachers.filter(t => t.schoolId === (navigation.data?.schoolId || navigation.data?.id) && !(navigation.data?.teacherIds || []).includes(t.id)).length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.label, { marginTop: 0, color: '#2563eb' }]}>{t('select_teacher')}:</Text>
                  <View style={{ gap: 8, marginTop: 10 }}>
                    {teachers
                      .filter(t => t.schoolId === (navigation.data?.schoolId || navigation.data?.id) && !(navigation.data?.teacherIds || []).includes(t.id))
                      .map(teacher => (
                        <TouchableOpacity
                          key={teacher.id}
                          style={[styles.schoolSelectItem, { borderColor: '#e2e8f0' }]}
                          onPress={() => handleAddTeacherToClass(teacher.id)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
                              <GraduationCap size={20} color="#2563eb" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.schoolSelectText}>{teacher.name}</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                {(teacher.subjects || []).map(subject => (
                                  <View key={subject} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, color: '#475569', fontWeight: 'bold' }}>{subject}</Text>
                                  </View>
                                ))}
                                {(teacher.subjects || []).length === 0 && (
                                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>{t('no_subjects') || 'Pa lnd'}</Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <View style={{ backgroundColor: '#f8fafc', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                            <Plus size={16} color="#2563eb" />
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>
                  <View style={{ height: 1, backgroundColor: '#f1f5f9', marginTop: 20 }} />
                </View>
              )}

              {/* Create new teacher and link */}
              <Text style={[styles.label, { marginTop: 0, color: '#2563eb' }]}>{t('or_create_new')} {t('teacher')}:</Text>

              <TextInput
                style={styles.input}
                placeholder={t('first_name')}
                value={teacherFirstName}
                onChangeText={setTeacherFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('last_name')}
                value={teacherLastName}
                onChangeText={setTeacherLastName}
              />
              <TextInput
                style={styles.input}
                placeholder={t('username')}
                value={teacherUsername}
                onChangeText={setTeacherUsername}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder={t('password')}
                value={teacherPassword}
                onChangeText={setTeacherPassword}
                secureTextEntry
              />

              <View style={{ marginTop: 15, marginBottom: 15, padding: 12, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  onPress={() => setTeacherIsKujdestar(!teacherIsKujdestar)}
                >
                  <View style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: teacherIsKujdestar ? '#2563eb' : '#cbd5e1',
                    backgroundColor: teacherIsKujdestar ? '#2563eb' : 'white',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {teacherIsKujdestar && <Check size={18} color="white" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: '#1e293b', fontWeight: '800' }}>Kujdestar / Koordinatori</Text>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Vetm koordinatori mund t arsyetoj mungesat ditore.</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('select_subjects')}:</Text>
              <View style={styles.subjectsGrid}>
                {(KOSOVO_SUBJECTS || []).map(subject => (
                  <TouchableOpacity
                    key={subject}
                    style={[styles.subjectChip, teacherSubjects.includes(subject) && styles.activeSubjectChip]}
                    onPress={() => toggleSubject(subject)}
                  >
                    <Text style={[styles.subjectChipText, teacherSubjects.includes(subject) && styles.activeSubjectChipText]}>
                      {t(subject)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>



              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => {
                  setIsAddTeacherToClassModalVisible(false);
                  setTeacherFirstName(''); setTeacherLastName('');
                  setTeacherUsername(''); setTeacherPassword('');
                  setTeacherSubjects([]);
                  setTeacherIsKujdestar(false);
                }}>
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={async () => {
                    const schoolId = navigation.data?.schoolId || navigation.data?.id;
                    if (!teacherFirstName || !teacherLastName || !teacherUsername || !teacherPassword || teacherSubjects.length === 0) return;
                    const result = await onAddTeacher({
                      firstName: teacherFirstName,
                      lastName: teacherLastName,
                      name: `${teacherFirstName} ${teacherLastName}`,
                      username: teacherUsername,
                      password: teacherPassword,
                      subjects: teacherSubjects,
                      schoolId: schoolId,
                      email: teacherUsername,
                      isKujdestar: teacherIsKujdestar
                    });
                    if (!result?.error && result?.data) {
                      // Also link to the class
                      const currentTeacherIds = navigation.data?.teacherIds || [];
                      await onUpdateClassTeachers(navigation.data.id, [...currentTeacherIds, result.data.id]);
                    }
                    setTeacherFirstName(''); setTeacherLastName('');
                    setTeacherUsername(''); setTeacherPassword('');
                    setTeacherSubjects([]);
                    setTeacherIsKujdestar(false);
                    setIsAddTeacherToClassModalVisible(false);
                  }}
                >
                  <Text style={styles.submitButtonText}>{t('confirm')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </>
  );

  const isReadOnly = !!selectedGlobalAcademicYear;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.headerTopBar, isDesktop && { paddingHorizontal: 20 }]}>
          <View style={styles.headerLogo}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: 220, height: 60 }}
              resizeMode="contain"
            />
          </View>

          {isDesktop && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, flex: 1, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => setNavigation({ view: 'home', data: null })} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: navigation.view === 'home' ? '#eef2ff' : 'transparent' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: navigation.view === 'home' ? '#6366f1' : '#64748b' }}>{t('home') || 'Ballina'}</Text>
              </TouchableOpacity>
              {isSuperAdmin && (
                <TouchableOpacity onPress={() => setNavigation({ view: 'settings', data: null })} style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: navigation.view === 'settings' ? '#eef2ff' : 'transparent' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: navigation.view === 'settings' ? '#6366f1' : '#64748b' }}>{t('settings') || 'Cilsimet'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <ProfileDropdown
            user={user}
            t={t}
            onLogout={onLogout}
            onChangePassword={!isSuperAdmin ? () => setIsPasswordModalVisible(true) : undefined}
            onHelp={() => Linking.openURL('mailto:info@ditari-elektronik.com')}
            availableAcademicYears={availableAcademicYears}
            selectedGlobalAcademicYear={selectedGlobalAcademicYear}
            changeAcademicYear={onChangeAcademicYear}
            schoolCurrentYear={schools.find(s => s.id === (isSuperAdmin ? selectedCalendarSchool : user.school_id))?.current_year}
          />
        </View>
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

      <View style={{ flex: 1, paddingHorizontal: isDesktop ? 20 : 0 }}>
        {navigation.view === 'home' && renderMain()}
        {(navigation.view === 'schools' || navigation.view === 'school-detail' || navigation.view === 'class-detail' || navigation.view === 'classes' || navigation.view === 'academic-year') && renderSchools()}
        {navigation.view === 'teachers' && renderTeachers()}
        {navigation.view === 'students' && renderStudents()}
        {navigation.view === 'codes' && renderCodes()}
        {navigation.view === 'settings' && renderSettings()}
        {navigation.view === 'notices' && renderNotices()}
        {navigation.view === 'school_year_mgmt' && renderSchoolYearMgmt()}
        {navigation.view === 'calendar_mgmt' && renderCalendarMgmt()}
      </View>

      {renderModals()}

      <PasswordChangeModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        onUpdate={handleUpdatePassword}
        t={t}
      />



      {!isDesktop && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setNavigation({ view: 'home', data: null })}
          >
            <View style={[styles.navIconContainer, navigation.view === 'home' && styles.activeNavIcon]}>
              <Home size={22} color={navigation.view === 'home' ? '#6366f1' : '#94a3b8'} strokeWidth={navigation.view === 'home' ? 2.5 : 2} />
            </View>
            <Text style={[styles.navText, navigation.view === 'home' && styles.activeNavText]}>{t('home')}</Text>
          </TouchableOpacity>

          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setNavigation({ view: 'settings', data: null })}
            >
              <View style={[styles.navIconContainer, navigation.view === 'settings' && styles.activeNavIcon]}>
                <Settings size={22} color={navigation.view === 'settings' ? '#6366f1' : '#94a3b8'} strokeWidth={navigation.view === 'settings' ? 2.5 : 2} />
              </View>
              <Text style={[styles.navText, navigation.view === 'settings' && styles.activeNavText]}>{t('settings')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Slightly cooler background
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
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
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#6366f1', // Indigo Primary
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutBtn: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scrollContent: {
    flex: 1,
  },
  viewContainer: {
    flex: 1,
    padding: 24,
  },
  navigationHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  viewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  viewTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -1,
  },
  viewSubtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#fff', // White border for subtle depth
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  quickActions: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 32,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '700',
    marginTop: 4,
  },
  backButton: {

    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
    flexShrink: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  smallAddButton: {
    backgroundColor: '#6366f1', // Secondary action also Indigo for now
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  smallAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  teacherListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  teacherNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  inlineAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
    padding: 8,
  },
  inlineAddButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 60,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyTextSmall: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  navIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavIcon: {
    backgroundColor: '#eff6ff',
  },
  navText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  activeNavText: {
    color: '#2563eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  schoolSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activeSchoolSelect: {
    backgroundColor: '#eff6ff',
    borderColor: '#6366f1',
  },
  schoolSelectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  activeSchoolSelectText: {
    color: '#6366f1',
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeSubjectChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#6366f1',
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  activeSubjectChipText: {
    color: '#6366f1',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    width: '92%',
    maxWidth: 500, // Responsive for web
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 0,
    letterSpacing: -0.5,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeModalBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 10,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  chipScroll: {
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
  },
  activeChipText: {
    color: '#fff',
  },
  schoolSelectItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activeSchoolSelect: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  schoolSelectText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  activeSchoolSelectText: {
    color: '#2563eb',
    fontWeight: '800',
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  subjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activeSubjectChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  subjectChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  activeSubjectChipText: {
    color: '#2563eb',
    fontWeight: '800',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '800',
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  settingsMenu: {
    gap: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  settingsItemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  entityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  selectedEntityItem: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  entityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  entitySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  actionFab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#ef4444', // Keep Red for Delete, but refine it
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
});

export default AdminDashboard;
