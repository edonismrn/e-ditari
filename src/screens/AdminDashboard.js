import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  TextInput,
  FlatList,
  RefreshControl,
  Linking,
  Platform
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
  Trash,
  Upload,
  Paperclip,
  Download,
  AlertCircle,
  AlertTriangle,
  User
} from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';
import { KOSOVO_DATA } from '../data/kosovoSchools';
import { KOSOVO_SUBJECTS } from '../data/kosovoSubjects';
import { formatClassName } from '../utils/stringUtils';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from '../components/ProfileDropdown';
import PasswordChangeModal from '../components/PasswordChangeModal';
import { downloadFile } from '../utils/fileUtils';
import { Modal, Alert } from 'react-native';

const { width } = Dimensions.get('window');

const AdminDashboard = ({
  user, onLogout, schools, teachers, classes, students,
  onAddSchool, onAddTeacher, onAddClass, onAddStudent,
  onActivateProfile, onRemoveTeacher, onAssignStudentToClass, onUpdateClassTeachers,
  onDeleteSchool, onDeleteClass, onRemoveTeacherFromClass, onRemoveStudentFromClass,
  onDeleteTeacher, onDeleteStudent, onArchiveYear, onPromoteStudents,
  notices, onAddNotice, onDeleteNotice,
  schoolAdmins, onRefresh, onUploadFile, onDeleteAllData, onUpdateSchoolStatus, onUpdateCurrentTerm,
  onPromoteStudentToClass, onUpdateTermStartDate, onBulkPromoteStudents
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const { updatePassword, login } = useAuth();
  const [navigation, setNavigation] = useState({ view: 'home', data: null });
  const [academicYearName, setAcademicYearName] = useState(() => {
    const cy = schools?.find(s => s.id === user.school_id)?.current_year;
    if (cy && cy.includes('-')) {
      const parts = cy.split('-');
      const start = parseInt(parts[0]);
      if (!isNaN(start)) return `${start + 1}-${start + 2}`;
    }
    return '2026-2027';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [academicSubTab, setAcademicSubTab] = useState('terms'); // 'terms', 'archive'
  const [hasArchived, setHasArchived] = useState(false); // unlocks promotion after archive
  const [promoClassId, setPromoClassId] = useState(null); // currently selected class for promotion
  const [promoSourceClass, setPromoSourceClass] = useState(null);
  const [promoTargetingStudent, setPromoTargetingStudent] = useState(null);
  const [isPromoModalVisible, setIsPromoModalVisible] = useState(false);
  // promoMap: { classId: { studentId: toClassId | null (=clear) | 'skip' } }
  const [promoMap, setPromoMap] = useState({});

  const [selectedAcademicSchoolId, setSelectedAcademicSchoolId] = useState(null);

  const ROMAN_ORDER = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12 };
  const ROMAN_LIST = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const getRomanIndex = (name) => {
    const prefix = (name || '').split(/[- ]/)[0].trim().toUpperCase();
    return ROMAN_LIST.indexOf(prefix); // -1 if not found
  };
  const sortClassesByRoman = (a, b) => {
    const rankA = ROMAN_ORDER[(a.name || '').split(/[- ]/)[0].trim().toUpperCase()] || 99;
    const rankB = ROMAN_ORDER[(b.name || '').split(/[- ]/)[0].trim().toUpperCase()] || 99;
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || '').localeCompare(b.name || '');
  };

  const [termTwoDate, setTermTwoDate] = useState('');
  const [termAcademicYear, setTermAcademicYear] = useState('');

  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

  const handleUpdatePassword = async (currentPass, newPass) => {
    try {
      // Verify current password by re-authenticating
      await login(user.email, currentPass);
      // If successful, update to new password
      await updatePassword(newPass);
      showAlert(t('password_updated_success') || 'Fjalëkalimi u ndryshua me sukses!', 'success');
    } catch (err) {
      const errorMsg = err.message === 'Invalid login credentials'
        ? (t('invalid_current_password') || 'Fjalëkalimi aktual nuk është i saktë')
        : err.message;
      showAlert(errorMsg, 'error');
      throw err; // Let modal handle specific error display
    }
  };

  // Notice Form State
  const [isNoticeModalVisible, setIsNoticeModalVisible] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeAttachment, setNoticeAttachment] = useState('');
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

  const [refreshing, setRefreshing] = useState(false);
  const isSuperAdmin = user?.email === 'admin@ditari-elektronik.com';

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFileName(file.name);
        setIsUploading(true);

        const uploadResult = await onUploadFile(file.uri, file.name, file.mimeType);

        setIsUploading(false);

        if (uploadResult.publicUrl) {
          setNoticeAttachment(uploadResult.publicUrl);
        } else {
          const errorMsg = uploadResult.error?.message || t('upload_failed') || 'Ngarkimi dështoi';
          showAlert(errorMsg, 'error');
          setSelectedFileName('');
        }
      }
    } catch (err) {
      console.error('Pick error:', err);
      setIsUploading(false);
      const errorMsg = err.message || t('pick_error') || 'Gabim gjatë zgjedhjes së fajllit';
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

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState({
    visible: false,
    message: '',
    onConfirm: null
  });

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
    // Extract text inside single quotes if available (e.g. SHML Gjimnazi 'Sami Frashëri' -> Sami Frashëri)
    const match = name.match(/'([^']+)'/);
    if (match && match[1]) return match[1];

    // Otherwise, just remove common prefixes
    return name.replace(/^(SHML|SHMFU|SHMU|SHM|SHFMU|Gjimnazi|Shkolla e Mesme|Shkolla e Mesme Teknike|Shkolla e Mesme Ekonomike|Shkolla e Mesme e Muzikës)\s+/i, '').trim();
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
      // console.log('Gabim', 'Asnjë shkollë e përzgjedhur.');
      return;
    }

    if (!teacherFirstName || !teacherLastName || !teacherUsername || !teacherPassword || teacherSubjects.length === 0) {
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
      email: teacherUsername
    });

    if (!result?.error) {
      resetTeacherForm();
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

  const handleAddStudent = (classId) => {
    if (!studentName || !studentUsername || !studentPassword) {
      // console.log('Gabim', 'Ju lutem plotësoni të gjitha fushat.');
      return;
    }
    onAddStudent({
      name: studentName,
      username: studentUsername,
      password: studentPassword,
      classId: classId,
      schoolId: navigation.data?.schoolId || navigation.data?.id
    });
    setStudentName('');
    setStudentUsername('');
    setStudentPassword('');
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
          confirmDelete(`${t('confirm_delete_school')}: ${entity.name}? ${t('cascade_warning_school')}`, async () => {
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
              (isSuperAdmin || user.role === 'admin') && { id: 'academic_year', label: t('academic_year_mgmt'), icon: Calendar, color: '#6366f1' },
              isSuperAdmin && { id: 'manage_school_status', label: t('manage_school_status') || 'Statuset e Shkollave', icon: Lock, color: '#f59e0b' },
              isSuperAdmin && { id: 'delete_all_data', label: t('delete_all_data') || 'Fshi të gjitha të dhënat', icon: Trash2, color: '#dc2626' },
              { id: 'delete_school', label: t('delete_school'), icon: School, color: '#ef4444' },
            ].filter(Boolean).map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.settingsItem}
                onPress={() => {
                  if (item.id === 'delete_all_data') {
                    confirmDelete(t('delete_all_data_confirm') || 'Je i sigurt?', async () => {
                      setIsProcessing(true);
                      const res = await onDeleteAllData();
                      setIsProcessing(false);
                      if (res?.error) {
                        showAlert(res.error.message, 'error');
                      } else {
                        showAlert(t('delete_all_data_success') || 'Sukses', 'success');
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
              <Text style={styles.backButtonText}>{t('back')}</Text>
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
                      const actionLabel = !currentStatus ? (t('activate') || 'Aktivizo') : (t('deactivate') || 'Çaktivizo');
                      confirmDelete(`${actionLabel} ${item.name}?`, async () => {
                        setIsProcessing(true);
                        const res = await onUpdateSchoolStatus(item.id, !currentStatus);
                        setIsProcessing(false);
                        if (res?.error) showAlert(res.error.message, 'error');
                        else showAlert(t('school_status_updated') || 'Statusi u përditësua!', 'success');
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
                        {item.is_active === false ? (t('school_status_inactive') || 'Jo-Aktive') : (t('school_status_active') || 'Aktive')}
                      </Text>
                    </View>
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
      setIsStudentModalVisible(false);
    }
  };

  const handleAddTeacherToClass = (teacherId) => {
    const currentClass = navigation.data;
    if (currentClass.teacherIds.includes(teacherId)) {
      // console.log('Njoftim', 'Ky mësues është tashmë në këtë klasë.');
      return;
    }
    const updatedTeachers = [...currentClass.teacherIds, teacherId];
    onUpdateClassTeachers(currentClass.id, updatedTeachers);
    setNavigation({ ...navigation, data: { ...currentClass, teacherIds: updatedTeachers } });
    setIsAddTeacherToClassModalVisible(false);
  };

  const handleRemoveTeacherLocal = (teacherId) => {
    const currentClass = navigation.data;
    const updatedTeachers = currentClass.teacherIds.filter(id => id !== teacherId);
    onUpdateClassTeachers(currentClass.id, updatedTeachers);
    setNavigation({ ...navigation, data: { ...currentClass, teacherIds: updatedTeachers } });
  };

  const confirmDelete = (msg, callback) => {
    setConfirmState({
      visible: true,
      message: msg,
      onConfirm: callback
    });
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
          <Text style={styles.statLabel}>{t('manage_teachers')}</Text>
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

        {isSuperAdmin && (
          <TouchableOpacity style={styles.actionTile} onPress={() => setNavigation({ view: 'academic-year', data: null })}>
            <View style={[styles.actionIconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Calendar size={24} color="#0284c7" />
            </View>
            <Text style={styles.actionTileTitle}>{t('academic_year_mgmt')}</Text>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionTile} onPress={() => setNavigation({ view: 'notices', data: null })}>
          <View style={[styles.actionIconContainer, { backgroundColor: '#fdf2f8' }]}>
            <Bell size={24} color="#db2777" />
          </View>
          <Text style={styles.actionTileTitle}>{t('notices')}</Text>
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
            <TouchableOpacity style={styles.backButton} onPress={() => setNavigation({ view: 'home', data: null })}>
              <ArrowLeft size={18} color="#1e293b" />
              <Text style={styles.backButtonText}>{t('back')}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Text style={styles.viewTitle}>{isClassesOnly ? t('classes_label') : t('schools')}</Text>
              {!isClassesOnly && isSuperAdmin && (
                <TouchableOpacity style={styles.smallAddButton} onPress={() => setIsSchoolModalVisible(true)}>
                  <Plus size={18} color="#fff" />
                  <Text style={styles.smallAddButtonText}>{t('add')}</Text>
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
      const school = navigation.data;
      const schoolClasses = classes.filter(c => c.schoolId === school.id);
      const schoolTeachers = teachers.filter(t => t.schoolId === school.id);

      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setNavigation({ view: 'schools', data: null })}>
              <ArrowLeft size={18} color="#1e293b" />
              <Text style={styles.backButtonText}>{t('manage_schools')}</Text>
            </TouchableOpacity>
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
                    {(cls.teacherIds || []).length} {t('teachers_count')} • {students.filter(s => s.classId === cls.id).length} {t('students_count')}
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
      const currentClass = navigation.data;
      const classStudents = students.filter(s => s.classId === currentClass.id);
      const school = schools.find(s => s.id === currentClass.schoolId);

      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setNavigation({ view: 'school-detail', data: school })}
            >
              <ArrowLeft size={18} color="#1e293b" />
              <Text style={styles.backButtonText}>{school?.name || 'Detajet'}</Text>
            </TouchableOpacity>
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
                <TouchableOpacity onPress={() => confirmDelete(`${t('confirm_delete_class')}: ${formatClassName(currentClass)}?`, async () => {
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
                        <TouchableOpacity onPress={() => handleRemoveTeacherLocal(tId)}>
                          <View style={{ padding: 8, borderRadius: 8, backgroundColor: '#fef2f2' }}>
                            <Trash2 size={16} color="#ef4444" />
                          </View>
                        </TouchableOpacity>
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
                <TouchableOpacity onPress={() => onRemoveStudentFromClass(student.id, currentClass.id)}>
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
    if (navigation.view === 'academic-year') {
      const activeSchoolId = isSuperAdmin ? selectedAcademicSchoolId : user.school_id;
      const activeSchool = schools.find(s => s.id === activeSchoolId);

      if (isSuperAdmin && !selectedAcademicSchoolId) {
        return (
          <View style={styles.viewContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => setNavigation({ view: 'home', data: null })}>
              <ArrowLeft size={18} color="#1e293b" />
              <Text style={styles.backButtonText}>{t('back')}</Text>
            </TouchableOpacity>
            <Text style={styles.viewTitle}>{t('academic_year_mgmt')}</Text>
            <Text style={styles.entitySub}>Zgjidhni një shkollë për të vazhduar</Text>

            <ScrollView style={{ marginTop: 20 }}>
              {schools.map(school => (
                <TouchableOpacity
                  key={school.id}
                  style={[styles.card, { padding: 20, flexDirection: 'row', alignItems: 'center' }]}
                  onPress={() => {
                    setSelectedAcademicSchoolId(school.id);
                    setTermTwoDate(school.term_two_start_date || '');
                    setTermAcademicYear(school.current_year || '2025/2026');
                    setAcademicYearName(school.current_year || '2025/2026');
                  }}
                >
                  <View style={[styles.actionIconContainer, { backgroundColor: '#f1f5f9', marginRight: 15 }]}>
                    <School size={20} color="#64748b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { fontSize: 16, marginBottom: 2 }]}>{school.name}</Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>{school.city || '---'}</Text>
                  </View>
                  <ChevronRight size={20} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      }

      return (
        <View style={styles.viewContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => isSuperAdmin ? setSelectedAcademicSchoolId(null) : setNavigation({ view: 'home', data: null })}
          >
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{t('back')}</Text>
          </TouchableOpacity>

          <Text style={styles.viewTitle}>{t('academic_year_mgmt')}</Text>
          <Text style={styles.entitySub}>
            Shkolla: <Text style={{ fontWeight: '800', color: '#1e293b' }}>{activeSchool?.name}</Text>
          </Text>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Viti aktual: <Text style={{ fontWeight: '800', color: '#6366f1' }}>{activeSchool?.current_year || '2025/2026'}</Text>
          </Text>

          {/* Tab Selection */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 6,
            marginTop: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2
          }}>
            {[
              { id: 'terms', label: t('terms_tab'), icon: Hash, color: '#0284c7' },
              { id: 'archive', label: t('archive_tab'), icon: Archive, color: '#d97706' }
            ].map(tab => {
              const isActive = academicSubTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: isActive ? '#f8fafc' : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? '#e2e8f0' : 'transparent',
                  }}
                  onPress={() => setAcademicSubTab(tab.id)}
                >
                  <tab.icon size={16} color={isActive ? tab.color : '#94a3b8'} />
                  <Text style={{
                    fontSize: 13,
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#1e293b' : '#94a3b8'
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* TAB: Terms Management */}
            {academicSubTab === 'terms' && (
              <View style={[styles.card, { flexDirection: 'column', padding: 24, borderRadius: 32 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <View style={[styles.actionIconContainer, { backgroundColor: '#e0f2fe', width: 48, height: 48, borderRadius: 16 }]}>
                    <Hash size={24} color="#0284c7" />
                  </View>
                  <View>
                    <Text style={[styles.cardTitle, { fontSize: 18 }]}>{t('active_term')}</Text>
                  </View>
                </View>

                {/* Term Transition Date */}
                <View style={{ backgroundColor: '#f8fafc', padding: 22, borderRadius: 28, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Viti Akademik (p.sh. 2025/2026)
                    </Text>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'white',
                      padding: 16,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: '#f1f5f9',
                      gap: 12
                    }}>
                      <BookOpen size={20} color="#0284c7" />
                      <TextInput
                        style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', padding: 0, flex: 1 }}
                        placeholder="2025/2026"
                        value={termAcademicYear}
                        onChangeText={setTermAcademicYear}
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Data (Fundi i Gjysmëvjetorit I)
                    </Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        padding: 16,
                        borderRadius: 18,
                        borderWidth: 1.5,
                        borderColor: '#f1f5f9',
                        gap: 12,
                        position: 'relative'
                      }}
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          const el = document.getElementById('term-date-input');
                          if (el && el.showPicker) {
                            try { el.showPicker(); } catch (e) { }
                          }
                        }
                      }}
                    >
                      <Calendar size={20} color="#0284c7" />
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1 }}>
                        {termTwoDate ? termTwoDate.split('-').reverse().join('/') : 'VVVV-MM-DD'}
                      </Text>

                      {Platform.OS === 'web' ? (
                        <input
                          id="term-date-input"
                          type="date"
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            top: 0, left: 0, right: 0, bottom: 0,
                            width: '100%',
                            height: '100%',
                            cursor: 'pointer'
                          }}
                          value={termTwoDate}
                          onChange={(e) => setTermTwoDate(e.target.value)}
                        />
                      ) : (
                        <TextInput
                          style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%' }}
                          value={termTwoDate}
                          onChangeText={setTermTwoDate}
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: '#0284c7', borderColor: '#0284c7', height: 56, borderRadius: 18, shadowColor: '#0284c7' }]}
                    onPress={async () => {
                      const activeSchoolId = isSuperAdmin ? selectedAcademicSchoolId : user.school_id;
                      if (!activeSchoolId) {
                        showAlert("Nuk u gjet shkolla aktive!", "error");
                        return;
                      }
                      if (!termTwoDate || !termAcademicYear) {
                        showAlert("Ju lutem plotësoni vitin akademik dhe datën!", "error");
                        return;
                      }

                      setIsProcessing(true);
                      const result = await onUpdateTermStartDate(activeSchoolId, termTwoDate, termAcademicYear);
                      setIsProcessing(false);
                      if (result?.error) {
                        showAlert("Gabim gjatë ruajtjes: " + (result.error.message || JSON.stringify(result.error)), "error");
                      } else {
                        showAlert("Konfigurimi i gjysmëvjetorit u ruajt me sukses! Të gjitha të dhënat u sinkronizuan.", "success");
                      }
                    }}
                  >
                    <Text style={[styles.submitButtonText, { fontSize: 16 }]}>Përditëso Konfigurimin</Text>
                  </TouchableOpacity>
                </View>

                <View style={{
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: '#fff9eb',
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#fef3c7',
                  flexDirection: 'row',
                  gap: 12
                }}>
                  <AlertCircle size={20} color="#d97706" />
                  <Text style={{ fontSize: 13, color: '#92400e', lineHeight: 20, flex: 1, fontWeight: '500' }}>
                    Ndryshimi i gjysmëvjetorit do të ndikojë në llogaritjen e notave për mësuesit dhe nxënësit e kësaj shkolle.
                  </Text>
                </View>
              </View>
            )}

            {/* TAB: Archive & Promotion */}
            {academicSubTab === 'archive' && (
              <View style={[styles.card, { flexDirection: 'column', padding: 24, borderRadius: 32 }]}>
                {/* 1. Archive Phase */}
                <View style={{ marginBottom: hasArchived ? 24 : 0, opacity: hasArchived ? 0.6 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <View style={[styles.actionIconContainer, { backgroundColor: '#fff7ed', width: 48, height: 48, borderRadius: 16 }]}>
                      <Archive size={24} color="#d97706" />
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { fontSize: 18 }]}>Faza 1: Arkivimi i Vitit</Text>
                      <Text style={{ fontSize: 13, color: '#64748b' }}>Mbyll vitin shkollor aktual përpara promovimit</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: '#f8fafc', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 }}>
                      Emri i vitit që po mbyllet (p.sh. 2025/2026)
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      Viti i ri do të fillojë automatikisht (1 Shtator - 31 Korrik).
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'white', marginBottom: 0, height: 56, fontSize: 16, fontWeight: '700' }]}
                      placeholder="2025/2026"
                      value={academicYearName}
                      onChangeText={setAcademicYearName}
                      editable={!hasArchived}
                    />
                  </View>

                  {!hasArchived ? (
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: '#d97706', borderColor: '#d97706', borderRadius: 24, height: 60 }]}
                      onPress={() => {
                        confirmDelete(`Ju po arkivoni vitin ${academicYearName}. Të gjitha të dhënat aktuale do të ruhen në arkiv dhe do të fillojë viti i ri akademik (1 Shtator - 31 Korrik). Vazhdoni?`, async () => {
                          setIsProcessing(true);
                          const res = await onArchiveYear(activeSchoolId, academicYearName);
                          setIsProcessing(false);

                          if (res?.error) {
                            showAlert("Gabim gjatë arkivimit: " + res.error.message, "error");
                            return;
                          }

                          // Pre-fill promoMap based on roman numerals
                          const activeClasses = classes.filter(c => c.school_id === activeSchoolId).sort(sortClassesByRoman);
                          const newPromoMap = {};

                          activeClasses.forEach((cls, idx) => {
                            newPromoMap[cls.id] = {};
                            const clsStudents = students.filter(s => s.classId === cls.id);

                            // Last class -> everyone graduates/clears
                            if (idx === activeClasses.length - 1) {
                              clsStudents.forEach(s => newPromoMap[cls.id][s.id] = null);
                            }
                            // First class -> clear, waiting for new students
                            else if (idx === 0) {
                              clsStudents.forEach(s => newPromoMap[cls.id][s.id] = null);
                            }
                            // Middle classes -> promote to next (idx + 1)
                            else {
                              const nextClass = activeClasses[idx + 1];
                              clsStudents.forEach(s => newPromoMap[cls.id][s.id] = nextClass.id);
                            }
                          });

                          setPromoMap(newPromoMap);
                          // Select the first class by default for the UI
                          if (activeClasses.length > 0) setPromoClassId(activeClasses[0].id);

                          setHasArchived(true);
                          const nextYearMsg = res.nextYear ? `\nViti i ri akademik: ${res.nextYear}` : "";
                          showAlert(`${academicYearName} u arkivua! ${nextYearMsg}\nTani vazhdoni me Faza 2 (Promovimi).`, "success");
                        });
                      }}
                      disabled={isProcessing}
                    >
                      <Text style={[styles.submitButtonText, { fontSize: 17 }]}>Arkivo & Fillo Promovimin</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ padding: 16, backgroundColor: '#f0fdf4', borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Check size={20} color="#16a34a" />
                      <Text style={{ fontSize: 14, color: '#15803d', fontWeight: '700' }}>Viti u arkivua. Vazhdoni poshtë.</Text>
                    </View>
                  )}
                </View>

                {/* 2. Promotion Phase (Visible only after archive) */}
                {hasArchived && (
                  <View style={{ borderTopWidth: 2, borderTopColor: '#f1f5f9', paddingTop: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                      <View style={[styles.actionIconContainer, { backgroundColor: '#dcfce7', width: 48, height: 48, borderRadius: 16 }]}>
                        <ArrowUpCircle size={24} color="#16a34a" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { fontSize: 18 }]}>Faza 2: Promovimi i Nxënësve</Text>
                        <Text style={{ fontSize: 13, color: '#64748b' }}>Sistemi ka sugjeruar kalimet sipas klasave.</Text>
                      </View>
                    </View>

                    {/* Class Selector Scroll */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
                      {classes.filter(c => c.school_id === activeSchoolId).sort(sortClassesByRoman).map((cls, idx, arr) => {
                        const isFirst = idx === 0;
                        const isLast = idx === arr.length - 1;
                        let badgeText = '';
                        let badgeColor = '';
                        if (isFirst) { badgeText = 'HYRJA E RE'; badgeColor = '#3b82f6'; }
                        else if (isLast) { badgeText = 'DIPLOMIMI'; badgeColor = '#d946ef'; }
                        else { badgeText = 'KALIM'; badgeColor = '#16a34a'; }

                        return (
                          <TouchableOpacity
                            key={cls.id}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              borderRadius: 14,
                              backgroundColor: promoClassId === cls.id ? '#f0fdf4' : '#fff',
                              borderWidth: 1.5,
                              borderColor: promoClassId === cls.id ? '#16a34a' : '#f1f5f9',
                              alignItems: 'center'
                            }}
                            onPress={() => setPromoClassId(cls.id)}
                          >
                            <Text style={{ fontSize: 14, fontWeight: '800', color: promoClassId === cls.id ? '#16a34a' : '#475569', marginBottom: 4 }}>
                              {cls.name}
                            </Text>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: badgeColor }}>{badgeText}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Class Content */}
                    {promoClassId && classes.find(c => c.id === promoClassId) && (() => {
                      const activeClasses = classes.filter(c => c.school_id === activeSchoolId).sort(sortClassesByRoman);
                      const currentClass = classes.find(c => c.id === promoClassId);
                      const clsIdx = activeClasses.findIndex(c => c.id === promoClassId);
                      const isFirst = clsIdx === 0;
                      const isLast = clsIdx === activeClasses.length - 1;
                      const nextClass = (!isFirst && !isLast) ? activeClasses[clsIdx + 1] : null;

                      const classStudents = students.filter(s => s.classId === promoClassId);

                      const allPromoting = classStudents.every(s => promoMap[promoClassId]?.[s.id] !== 'skip');

                      return (
                        <View style={{ backgroundColor: '#f8fafc', borderRadius: 20, padding: 16 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1e293b' }}>
                              Nxënësit ({classStudents.length})
                            </Text>

                            {/* Only show 'Select All / None' for middle classes */}
                            {!isFirst && !isLast && classStudents.length > 0 && (
                              <TouchableOpacity
                                style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' }}
                                onPress={() => {
                                  const newMap = { ...promoMap };
                                  if (!newMap[promoClassId]) newMap[promoClassId] = {};

                                  if (allPromoting) {
                                    // Deselect all
                                    classStudents.forEach(s => newMap[promoClassId][s.id] = 'skip');
                                  } else {
                                    // Select all
                                    classStudents.forEach(s => newMap[promoClassId][s.id] = nextClass.id);
                                  }
                                  setPromoMap(newMap);
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>
                                  {allPromoting ? 'Hiq Të Gjithë' : 'Zgjidh Të Gjithë'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {(isFirst || isLast) && (
                            <View style={{ padding: 12, backgroundColor: '#eff6ff', borderRadius: 12, marginBottom: 16 }}>
                              <Text style={{ fontSize: 13, color: '#1d4ed8', fontWeight: '500' }}>
                                {isFirst
                                  ? 'Kjo është klasa e parë. Do të zbrazet plotësisht për të pritur nxënësit e rinj manualisht.'
                                  : 'Kjo është klasa e fundit. Të gjithë nxënësit këtu quhen të diplomuar dhe hiqen nga klasa.'}
                              </Text>
                            </View>
                          )}

                          {classStudents.map(student => {
                            const isPromote = promoMap[promoClassId]?.[student.id] !== 'skip';

                            return (
                              <View key={student.id} style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#f1f5f9'
                              }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 14, fontWeight: '700', color: isPromote || isFirst || isLast ? '#1e293b' : '#94a3b8' }}>
                                    {student.name}
                                  </Text>
                                  <Text style={{ fontSize: 12, color: isPromote || isFirst || isLast ? '#16a34a' : '#64748b', marginTop: 2 }}>
                                    {isFirst ? 'Hiqet (Zbrazje)' : isLast ? 'Diplomohet (Hiqet)' : (isPromote ? `Kalon në ${nextClass?.name}` : 'Mbetet / Nuk kalon')}
                                  </Text>
                                </View>

                                {!isFirst && !isLast && (
                                  <TouchableOpacity
                                    onPress={() => {
                                      const newMap = { ...promoMap };
                                      if (!newMap[promoClassId]) newMap[promoClassId] = {};

                                      if (isPromote) {
                                        newMap[promoClassId][student.id] = 'skip';
                                      } else {
                                        newMap[promoClassId][student.id] = nextClass.id;
                                      }
                                      setPromoMap(newMap);
                                    }}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: 6,
                                      borderWidth: 2,
                                      borderColor: isPromote ? '#16a34a' : '#cbd5e1',
                                      backgroundColor: isPromote ? '#16a34a' : 'transparent',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {isPromote && <Check size={14} color="white" />}
                                  </TouchableOpacity>
                                )}
                                {(isFirst || isLast) && (
                                  <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={12} color="#94a3b8" />
                                  </View>
                                )}
                              </View>
                            );
                          })}
                          {classStudents.length === 0 && (
                            <Text style={{ padding: 12, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Klasa është bosh.</Text>
                          )}
                        </View>
                      );
                    })()}

                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: '#16a34a', borderColor: '#16a34a', marginTop: 24, borderRadius: 24, height: 60 }]}
                      onPress={async () => {
                        // Build the final flat map for bulkPromoteStudents
                        const finalMap = {};
                        Object.keys(promoMap).forEach(cId => {
                          Object.entries(promoMap[cId]).forEach(([sId, toClassId]) => {
                            if (toClassId !== 'skip') {
                              // null means remove from class (graduation / first class clear)
                              finalMap[sId] = toClassId;
                            }
                          });
                        });

                        setIsProcessing(true);
                        const res = await onBulkPromoteStudents(finalMap);
                        setIsProcessing(false);

                        if (res?.error) {
                          showAlert("Gabim gjatë promovimit: " + res.error.message, "error");
                        } else {
                          showAlert("Promovimi u regjistrua me sukses në bazën e të dhënave!", "success");
                          setHasArchived(false); // reset flow
                          setAcademicSubTab('terms');
                        }
                      }}
                      disabled={isProcessing}
                    >
                      <Text style={[styles.submitButtonText, { fontSize: 17 }]}>Përfundo & Ruaj Promovimet</Text>
                    </TouchableOpacity>

                  </View>
                )}
              </View>
            )}
          </ScrollView>


          {/* Student Promotion Selection Modal */}
          <Modal visible={isPromoModalVisible} animationType="fade" transparent>
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setIsPromoModalVisible(false)}
            >
              <View style={[styles.modalContent, { padding: 0, overflow: 'hidden', width: '85%', maxHeight: '70%' }]}>
                <View style={{ padding: 22, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { fontSize: 18 }]}>Promovo {promoTargetingStudent?.name}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Zgjidhni klasën destinacion</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsPromoModalVisible(false)} style={styles.closeModalBtn}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 10 }}>
                  <TouchableOpacity
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      marginBottom: 8,
                      backgroundColor: promoMap[promoTargetingStudent?.id] === 'graduated' ? '#eff6ff' : '#f8fafc',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: promoMap[promoTargetingStudent?.id] === 'graduated' ? '#0284c7' : '#f1f5f9'
                    }}
                    onPress={() => {
                      setPromoMap(prev => ({ ...prev, [promoTargetingStudent.id]: 'graduated' }));
                      setIsPromoModalVisible(false);
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: promoMap[promoTargetingStudent?.id] === 'graduated' ? '#0284c7' : '#475569' }}>
                      🎓 Diplomuar (Përfunduar shkollën)
                    </Text>
                    {promoMap[promoTargetingStudent?.id] === 'graduated' && <Check size={18} color="#0284c7" />}
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 }} />

                  {classes.filter(c => c.school_id === (isSuperAdmin ? selectedAcademicSchoolId : user.school_id)).sort(sortClassesByRoman).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        marginBottom: 4,
                        backgroundColor: promoMap[promoTargetingStudent?.id] === c.id ? '#f0fdf4' : 'transparent',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderWidth: 1.5,
                        borderColor: promoMap[promoTargetingStudent?.id] === c.id ? '#16a34a' : 'transparent'
                      }}
                      onPress={() => {
                        setPromoMap(prev => ({ ...prev, [promoTargetingStudent.id]: c.id }));
                        setIsPromoModalVisible(false);
                      }}
                    >
                      <Text style={{
                        fontSize: 15,
                        fontWeight: promoMap[promoTargetingStudent?.id] === c.id ? '800' : '600',
                        color: promoMap[promoTargetingStudent?.id] === c.id ? '#16a34a' : '#475569'
                      }}>
                        {c.name} {c.id === promoSourceClass?.id ? '(Përsëritëse)' : ''}
                      </Text>
                      {promoMap[promoTargetingStudent?.id] === c.id && <Check size={18} color="#16a34a" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      );
    }

    if (navigation.view === 'school-directory') {
      return (
        <View style={styles.viewContainer}>
          <View style={styles.navigationHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setNavigation({ view: 'home', data: null })}>
              <ArrowLeft size={18} color="#1e293b" />
              <Text style={styles.backButtonText}>{t('back')}</Text>
            </TouchableOpacity>
            <Text style={styles.viewTitle}>{t('school_directory')}</Text>
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
                        {t('code') || 'KODI'}
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
    confirmDelete(t('confirm_bulk_delete_teachers'), async () => {
      for (const id of selectedTeacherIds) {
        if (onDeleteTeacher) await onDeleteTeacher(id);
      }
      setSelectedTeacherIds([]);
      setIsTeacherSelectionMode(false);
    });
  };

  const handleDeleteAllTeachers = () => {
    confirmDelete(t('confirm_delete_all_teachers'), async () => {
      // Loop through all teachers in current view (or all)
      for (const teacher of teachers) {
        if (onDeleteTeacher) await onDeleteTeacher(teacher.id);
      }
      setSelectedTeacherIds([]);
      setIsTeacherSelectionMode(false);
    });
  };

  const renderTeachers = () => (
    <View style={styles.viewContainer}>
      <View style={styles.navigationHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setNavigation({ view: 'home', data: null });
            setIsTeacherSelectionMode(false);
            setSelectedTeacherIds([]);
          }}
        >
          <ArrowLeft size={18} color="#1e293b" />
          <Text style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewTitle}>{t('manage_teachers')}</Text>
            {isTeacherSelectionMode && (
              <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: '700' }}>
                {selectedTeacherIds.length} {t('selected')}
              </Text>
            )}
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
                  {isTeacherSelectionMode ? t('cancel') : t('select') || 'Zgjidh'}
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
                    style={[styles.smallAddButton, { backgroundColor: '#eff6ff', paddingHorizontal: 10 }]}
                    onPress={() => setNavigation({ view: 'teachers', data: teacher, mode: 'link' })}
                  >
                    <Plus size={16} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(`${t('confirm_delete_teacher')}: ${teacher.name}?`, async () => {
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
            <Text style={[styles.submitButtonText, { color: '#ef4444' }]}>{t('delete_all') || 'Fshij të gjithë'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { flex: 2, backgroundColor: selectedTeacherIds.length > 0 ? '#ef4444' : '#cbd5e1', shadowColor: selectedTeacherIds.length > 0 ? '#ef4444' : 'transparent' }]}
            onPress={handleBulkDeleteTeachers}
            disabled={selectedTeacherIds.length === 0}
          >
            <Text style={styles.submitButtonText}>{t('delete_selected') || 'Fshij të zgjedhurit'} ({selectedTeacherIds.length})</Text>
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

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.length === 0) return;
    confirmDelete(t('confirm_bulk_delete_students'), async () => {
      for (const id of selectedStudentIds) {
        if (onDeleteStudent) await onDeleteStudent(id);
      }
      setSelectedStudentIds([]);
      setIsStudentSelectionMode(false);
    });
  };

  const handleDeleteAllStudents = () => {
    confirmDelete(t('confirm_delete_all_students'), async () => {
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setNavigation({ view: 'home', data: null });
              setIsStudentSelectionMode(false);
              setSelectedStudentIds([]);
            }}
          >
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{t('back')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.viewTitle}>{t('manage_students')}</Text>
              {isStudentSelectionMode && (
                <Text style={{ fontSize: 13, color: '#6366f1', fontWeight: '700' }}>
                  {selectedStudentIds.length} {t('selected')}
                </Text>
              )}
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
                  <TouchableOpacity onPress={() => confirmDelete(`${t('confirm_delete_student') || 'Fshij nxënësin'}: ${student.name}?`, async () => {
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

  const renderCodes = () => (
    <View style={styles.viewContainer}>
      <View style={styles.navigationHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => setNavigation({ view: 'home', data: null })}>
          <ArrowLeft size={18} color="#1e293b" />
          <Text style={styles.backButtonText}>{t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.viewTitle}>{t('school_codes') || 'Kodet e Shkollave'}</Text>
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
                  {t('school_code') || 'KODI'}
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

  const handleAddNotice = async () => {
    if (!noticeTitle || !noticeMessage) return;
    const result = await onAddNotice({
      title: noticeTitle,
      message: noticeMessage,
      attachmentUrl: noticeAttachment,
      schoolIds: isSuperAdmin ? (isAllSchools ? schools.map(s => s.id) : selectedNoticeSchools) : null,
      classIds: !isSuperAdmin ? (isAllClasses ? null : selectedNoticeClasses) : null,
      schoolId: !isSuperAdmin ? user.school_id : null
    });

    if (!result?.error) {
      setNoticeAttachment('');
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
    }
  };

  const renderNotices = () => {
    // Deduplicate notices based on title, message and attachment for a cleaner admin view
    const uniqueNotices = [];
    const seen = new Set();

    (notices || []).forEach(notice => {
      const key = `${notice.title}-${notice.message}-${notice.attachment_url || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNotices.push(notice);
      }
    });

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{t('back')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
            <Text style={styles.viewTitle}>{t('notices')}</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600' }}></Text>
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
                          {new Date(item.created_at).toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Delete button (Hidden for School Admins on Super Admin notices) */}
                  {(!item.is_super_admin || isSuperAdmin) && (
                    <TouchableOpacity
                      style={{ width: 36, height: 36, backgroundColor: '#fef2f2', borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onPress={() => confirmDelete(`${t('confirm_delete')} ${t('notice_title')}?`, () => onDeleteNotice(item.id))}
                    >
                      <Trash size={16} color="#ef4444" />
                    </TouchableOpacity>
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
                      {t('download_attachment') || 'Shkarko bashkëngjitjen'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />

        <TouchableOpacity style={styles.actionFab} onPress={() => setIsNoticeModalVisible(true)}>
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderModals = () => (
    <>
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
              <Text style={styles.modalTitle}>{t('add_teacher')}</Text>
              <TouchableOpacity onPress={resetTeacherForm} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} placeholder={t('first_name')} value={teacherFirstName} onChangeText={setTeacherFirstName} />
              <TextInput style={styles.input} placeholder={t('last_name')} value={teacherLastName} onChangeText={setTeacherLastName} />
              <TextInput style={styles.input} placeholder={t('email')} value={teacherUsername} onChangeText={setTeacherUsername} autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={styles.input} placeholder={t('password')} value={teacherPassword} onChangeText={setTeacherPassword} secureTextEntry />

              <Text style={styles.label}>{t('select_subjects')}</Text>
              <View style={styles.subjectsGrid}>
                {KOSOVO_SUBJECTS.map(subject => (
                  <TouchableOpacity
                    key={subject}
                    style={[styles.subjectChip, teacherSubjects.includes(subject) && styles.activeSubjectChip]}
                    onPress={() => toggleSubject(subject)}
                  >
                    <Text style={[styles.subjectChipText, teacherSubjects.includes(subject) && styles.activeSubjectChipText]}>{subject}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsTeacherModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={() => handleAddTeacherLocal(navigation.data?.id)}>
                <Text style={styles.submitButtonText}>{t('confirm')}</Text>
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
                setTeacherFirstName(''); setTeacherLastName('');
                setTeacherUsername(''); setTeacherPassword('');
                setTeacherSubjects([]);
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
                                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>{t('no_subjects') || 'Pa lëndë'}</Text>
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

              <Text style={styles.label}>{t('select_subjects')}:</Text>
              <View style={styles.subjectsGrid}>
                {(KOSOVO_SUBJECTS || []).map(subject => (
                  <TouchableOpacity
                    key={subject}
                    style={[styles.subjectChip, teacherSubjects.includes(subject) && styles.activeSubjectChip]}
                    onPress={() => toggleSubject(subject)}
                  >
                    <Text style={[styles.subjectChipText, teacherSubjects.includes(subject) && styles.activeSubjectChipText]}>
                      {subject}
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
                      email: teacherUsername
                    });
                    if (!result?.error && result?.data) {
                      // Also link to the class
                      const currentTeacherIds = navigation.data?.teacherIds || [];
                      await onUpdateClassTeachers(navigation.data.id, [...currentTeacherIds, result.data.id]);
                    }
                    setTeacherFirstName(''); setTeacherLastName('');
                    setTeacherUsername(''); setTeacherPassword('');
                    setTeacherSubjects([]);
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

      {/* Notice Modal */}
      <Modal visible={isNoticeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { marginBottom: 4 }]}>
                  {t('new_notice')} - {noticeModalStep === 1 ? (t('step_1') || 'Hapi 1') : (t('step_2') || 'Hapi 2')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setIsNoticeModalVisible(false);
                setNoticeTitle('');
                setNoticeMessage('');
                setNoticeAttachment('');
                setSelectedFileName('');
                setNoticeSchoolId(null);
                setSelectedNoticeSchools([]);
                setSelectedNoticeClasses([]);
                setSearchNoticeSchools('');
                setSearchNoticeClasses('');
                setIsNoticeSchoolDropdownVisible(false);
                setIsNoticeClassDropdownVisible(false);
                setNoticeModalStep(1);
                setIsAllSchools(false);
                setIsAllClasses(true);
              }} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false}>
              {noticeModalStep === 1 && (
                <View style={{ paddingBottom: 20 }}>
                  {isSuperAdmin && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>{t('select_schools') || 'Zgjidh Shkollat'} *</Text>
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
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isAllSchools ? '#6366f1' : '#64748b' }}>{t('all_schools') || 'Të gjitha'}</Text>
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
                                ? `${selectedNoticeSchools.length} ${t('schools_selected') || 'Shkolla të përzgjedhura'}`
                                : t('select_schools_placeholder') || 'Zgjidh shkollat...'}
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
                                  placeholder={t('search_school_placeholder') || 'Kërko shkollën...'}
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
                        <Text style={[styles.label, { marginBottom: 0 }]}>{t('select_classes') || 'Zgjidh Klasat'} *</Text>
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
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isAllClasses ? '#6366f1' : '#64748b' }}>{t('all_classes') || 'Të gjithë shkollën'}</Text>
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
                                ? `${selectedNoticeClasses.length} ${t('classes_selected') || 'Klasa të përzgjedhura'}`
                                : t('select_classes_placeholder') || 'Zgjidh klasat...'}
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
                                  placeholder={t('search_class_placeholder') || 'Kërko klasën...'}
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
                    <Text style={styles.submitButtonText}>{t('next') || 'Vazhdo'}</Text>
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

                  <Text style={styles.label}>{t('attachment')}</Text>

                  {!noticeAttachment ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8', marginBottom: 20, opacity: isUploading ? 0.6 : 1 }]}
                      onPress={handleFilePick}
                      disabled={isUploading}
                    >
                      <Upload size={20} color="#db2777" />
                      <Text style={[styles.actionButtonText, { color: '#db2777' }]}>
                        {isUploading ? (t('uploading') || 'Duke u ngarkuar...') : (t('upload_file') || 'Ngarko Dokumentin')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.card, { padding: 12, marginBottom: 20, borderColor: '#db2777', borderWidth: 1, backgroundColor: '#fdf2f8' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <FileText size={20} color="#db2777" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }} numberOfLines={1}>
                            {selectedFileName || 'Dokumenti i ngarkuar'}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#db2777' }}>{t('file_selected') || 'Fajlli u përzgjodh'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setNoticeAttachment(''); setSelectedFileName(''); }}>
                          <X size={18} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setNoticeModalStep(1)}>
                      <Text style={styles.cancelButtonText}>{t('back') || 'Mbrapsht'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, {
                        opacity: (noticeTitle && noticeMessage) ? 1 : 0.5
                      }]}
                      onPress={handleAddNotice}
                      disabled={!noticeTitle || !noticeMessage}
                    >
                      <Text style={styles.submitButtonText}>{t('confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopBar}>
          <View style={styles.headerLogo}>
            <View style={styles.logoIcon}>
              <School size={18} color="white" />
            </View>
          </View>
          <ProfileDropdown
            user={user}
            t={t}
            onLogout={onLogout}
            onChangePassword={!isSuperAdmin ? () => setIsPasswordModalVisible(true) : undefined}
            onHelp={() => Linking.openURL('mailto:info@ditari-elektronik.com')}
          />
        </View>
      </View>

      {navigation.view === 'home' && renderMain()}
      {(navigation.view === 'schools' || navigation.view === 'school-detail' || navigation.view === 'class-detail' || navigation.view === 'classes' || navigation.view === 'academic-year') && renderSchools()}
      {navigation.view === 'teachers' && renderTeachers()}
      {navigation.view === 'students' && renderStudents()}
      {navigation.view === 'codes' && renderCodes()}
      {navigation.view === 'settings' && renderSettings()}
      {navigation.view === 'notices' && renderNotices()}

      {renderModals()}

      <PasswordChangeModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        onUpdate={handleUpdatePassword}
        t={t}
      />

      <Modal visible={confirmState.visible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400, padding: 32 }]}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Trash2 size={32} color="#ef4444" />
              </View>
              <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 8, fontSize: 24, paddingHorizontal: 10 }]}>{t('confirm')}</Text>
              <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, fontWeight: '500' }}>
                {confirmState.message}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1, backgroundColor: '#f1f5f9' }]}
                onPress={() => setConfirmState({ ...confirmState, visible: false })}
              >
                <Text style={[styles.cancelButtonText, { color: '#64748b' }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { flex: 1, backgroundColor: '#ef4444', shadowColor: '#ef4444' }]}
                onPress={() => {
                  setConfirmState({ ...confirmState, visible: false });
                  if (confirmState.onConfirm) confirmState.onConfirm();
                }}
              >
                <Text style={styles.submitButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setNavigation({ view: 'settings', data: null })}
        >
          <View style={[styles.navIconContainer, navigation.view === 'settings' && styles.activeNavIcon]}>
            <Settings size={22} color={navigation.view === 'settings' ? '#6366f1' : '#94a3b8'} strokeWidth={navigation.view === 'settings' ? 2.5 : 2} />
          </View>
          <Text style={[styles.navText, navigation.view === 'settings' && styles.activeNavText]}>{t('settings')}</Text>
        </TouchableOpacity>

      </View>
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
