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
  Bell,
  Plus,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen as BookIcon,
  Save,
  Trash2,
  ClipboardList,
  UserCheck,
  Calendar,
  Home,
  LogOut,
  ShieldCheck,
  Pencil,
  X,
  Award,
  TrendingUp,
  GraduationCap,
  Globe,
  Activity,
  FlaskConical,
  Palette,
  Music,
  Divide,
  FileText,
  Paperclip,
  Download
} from 'lucide-react-native';
import CalendarStrip from '../components/CalendarStrip';
import { formatDate, formatDisplayDate } from '../utils/dateUtils';
import { formatClassName } from '../utils/stringUtils';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';

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
  user, onLogout, classes, students, grades, lessons, attendance, homework, notes, notices,
  onAddGrade, onUpdateGrade, onAddLesson, onToggleAttendance, onJustifyAttendance,
  onInitializeAttendance, onAddHomework, onAddNote, onRefresh
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const [activeView, setActiveView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [navigation, setNavigation] = useState({ view: 'home', data: null });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    setRefreshing(false);
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
  const [isGradeModalVisible, setIsGradeModalVisible] = useState(false);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [selectedActionStudent, setSelectedActionStudent] = useState(null);
  const [activeActionTab, setActiveActionTab] = useState('grade'); // grade, attendance, note
  const [attendanceTime, setAttendanceTime] = useState('');
  const [absenceType, setAbsenceType] = useState('unjustified');
  const [justifyReason, setJustifyReason] = useState('');
  const [selectedAttendanceToJustify, setSelectedAttendanceToJustify] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [isClassNote, setIsClassNote] = useState(false);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);
  const [tempAttendanceStatus, setTempAttendanceStatus] = useState(null);
  const [isAttendanceSaving, setIsAttendanceSaving] = useState(false);

  // New Menu States
  const [selectedNotatStudent, setSelectedNotatStudent] = useState(null);
  const [selectedNotatSubject, setSelectedNotatSubject] = useState(null);
  const [lessonDate, setLessonDate] = useState(new Date());

  // Auto-initialize attendance for today when viewing class detail
  React.useEffect(() => {
    if (navigation.view === 'class-detail' && navigation.data?.id) {
      const todayStr = new Date().toISOString().split('T')[0];
      const selectedDateStr = formatDate(selectedDate);

      // Only auto-initialize for today's date
      if (selectedDateStr === todayStr) {
        onInitializeAttendance(navigation.data.id, selectedDateStr);
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
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  const renderHome = () => {
    const dateStr = formatDate(selectedDate);

    if (!selectedHomeClassId) {
      return (
        <View style={styles.viewContainer}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 15 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b' }}>{t('agenda') || 'Agenda'}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{t('select_class_instruction') || 'Zgjidh klasën për të parë agjendën'}</Text>
          </View>
          <FlatList
            data={teacherClasses}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedHomeClassId(item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{formatClassName(item)}</Text>
                  <Text style={styles.cardSubtitle}>{students.filter(s => s.classId === item.id).length} {t('students_count')}</Text>
                </View>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          />
        </View>
      );
    }

    const currentLessons = lessons.filter(l =>
      l.class_id === selectedHomeClassId && l.date === dateStr
    );

    const selectedClassName = classes.find(c => c.id === selectedHomeClassId)?.name || '';

    return (
      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.homeContent}>
          <TouchableOpacity
            style={styles.changeClassLink}
            onPress={() => setSelectedHomeClassId(null)}
          >
            <ArrowLeft size={16} color="#2563eb" />
            <Text style={styles.changeClassText}>{selectedClassName}</Text>
          </TouchableOpacity>

          {currentLessons.length > 0 ? (
            currentLessons.map((lesson, idx) => {
              const topicParts = lesson.topic?.match(/^\[Ora (\d+)\] (.*)/);
              const cleanTopic = topicParts ? topicParts[2] : lesson.topic;

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

                    {lesson.homework && (
                      <View style={styles.homeworkContainer}>
                        <Clock size={12} color="#64748b" />
                        <Text style={styles.homeworkText}>{lesson.homework}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyAgendaCard}>
              <BookIcon size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>{t('no_lessons_today')}</Text>
            </View>
          )}

          {/* Highlights for Today */}
          {currentLessons.filter(l => l.is_test).length > 0 && (
            <View style={{ marginTop: 24 }}>
              {currentLessons.filter(l => l.is_test).map(l => (
                <View key={`test-${l.id}`} style={styles.alertCard}>
                  <View style={[styles.alertIndicator, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.alertText}><Text style={{ fontWeight: 'bold' }}>TEST:</Text> {l.subject} - {l.topic}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderClassList = (targetView, title) => (
    <View style={styles.viewContainer}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 15 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b' }}>{title || t('class_register')}</Text>
        <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{t('select_class_instruction') || 'Zgjidh klasën'}</Text>
      </View>
      <FlatList
        data={teacherClasses}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              setNavigation({ view: targetView, data: item });
              if (item.subjects && item.subjects.length > 0) {
                setSelectedSubject(item.subjects[0]);
              }
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{formatClassName(item)}</Text>
              <Text style={styles.cardSubtitle}>{students.filter(s => s.classId === item.id).length} {t('students_count')}</Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderActionModal = () => {
    if (!selectedActionStudent) return null;

    const dateStr = gradeCustomDate || formatDate(selectedDate);
    const isWeekendDate = isWeekend(dateStr);
    const displayDateStr = formatDisplayDate(gradeCustomDate || selectedDate);
    const tabs = [
      { id: 'grade', label: t('student_grades'), icon: ClipboardList },
      { id: 'attendance', label: t('attendance'), icon: UserCheck },
      { id: 'justify', label: t('giustifica'), icon: Pencil },
      { id: 'note', label: t('disciplinary_note'), icon: ShieldCheck },
      { id: 'lesson', label: t('register_lesson'), icon: BookIcon },
    ];


    return (
      <Modal visible={isActionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{selectedActionStudent.name}</Text>
                <Text style={styles.modalSubtitle}>{displayDateStr}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setIsActionModalVisible(false);
                setTempAttendanceStatus(null);
              }} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
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
                        showAlert("Data nuk mund të jetë në të ardhmen!", 'error');
                        setGradeCustomDate(formatDate(new Date()));
                      }
                    }}
                  />
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {activeActionTab === 'grade' && (
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
                      setGradeCustomDate(null);
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>{t('save_grade')}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeActionTab === 'attendance' && (
                <View style={styles.tabContent}>
                  <Text style={styles.label}>{t('select_status')}</Text>
                  <View style={styles.attendanceGrid}>
                    {isWeekendDate ? (
                      <View style={styles.weekendEmptyState}>
                        <Clock size={40} color="#94a3b8" />
                        <Text style={styles.weekendEmptyText}>{t('weekend_no_attendance')}</Text>
                      </View>
                    ) : (
                      [
                        { id: 'present', label: t('present'), icon: CheckCircle, color: '#22c55e' },
                        { id: 'absent', label: t('absent'), icon: XCircle, color: '#ef4444' },
                        { id: 'late', label: t('late'), icon: Clock, color: '#f59e0b' },
                        { id: 'early_exit', label: t('early_exit'), icon: LogOut, color: '#3b82f6' },
                      ].map(status => {
                        const Icon = status.icon;
                        const attRecord = attendance.find(a => a.student_id === selectedActionStudent.id && a.date === dateStr);
                        const defaultStatus = 'absent';
                        const currentStatus = tempAttendanceStatus || attRecord?.status || defaultStatus;
                        const isActive = currentStatus === status.id;

                        return (
                          <TouchableOpacity
                            key={status.id}
                            style={[styles.squareAttTile, isActive && { borderColor: status.color, backgroundColor: status.color + '15' }]}
                            onPress={() => {
                              setTempAttendanceStatus(status.id);
                            }}
                          >
                            <Icon size={26} color={isActive ? status.color : '#94a3b8'} />
                            <Text style={[styles.squareAttTileText, isActive && { color: status.color, fontWeight: '700' }]}>{status.label}</Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, { marginTop: 20 }, isAttendanceSaving && { opacity: 0.7 }]}
                    disabled={isAttendanceSaving}
                    onPress={async () => {
                      setIsAttendanceSaving(true);
                      const statusToSave = tempAttendanceStatus ||
                        attendance.find(a => a.student_id === selectedActionStudent.id && a.date === dateStr)?.status ||
                        'absent';

                      await onToggleAttendance(selectedActionStudent.id, dateStr, statusToSave, attendanceTime);
                      setIsAttendanceSaving(false);
                      showAlert(t('attendance_saved_success') || "Prezenca u ruajt me sukses!", 'success');
                    }}
                  >
                    <Text style={styles.premiumSubmitButtonText}>{isWeekendDate ? t('weekend_no_attendance') || 'Fundjavë - S’ka prezencë' : t('save')}</Text>
                  </TouchableOpacity>

                  {/* Absence type toggle */}
                  {attendance.find(a => a.student_id === selectedActionStudent.id && a.date === dateStr)?.status === 'absent' && (
                    <View style={{ marginTop: 8, marginBottom: 16 }}>
                      <Text style={styles.label}>{t('absence_type')}</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {[{ id: 'justified', key: 'justified' }, { id: 'unjustified', key: 'unjustified' }].map(opt => (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.subjectChip, { flex: 1, alignItems: 'center' }, absenceType === opt.id && styles.activeSubjectChip]}
                            onPress={() => setAbsenceType(opt.id)}
                          >
                            <Text style={[styles.subjectChipText, absenceType === opt.id && styles.activeSubjectChipText]}>{t(opt.key)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {(attendance.find(a => a.student_id === selectedActionStudent.id && a.date === dateStr)?.status === 'late' ||
                    attendance.find(a => a.student_id === selectedActionStudent.id && a.date === dateStr)?.status === 'early_exit') && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.label}>{t('entry_exit_time')}</Text>
                        <TextInput
                          style={styles.premiumInput}
                          placeholder="HH:MM"
                          value={attendanceTime}
                          onChangeText={setAttendanceTime}
                          keyboardType="numeric"
                        />
                      </View>
                    )}
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
                    style={styles.checkboxContainer}
                    onPress={() => setIsClassNote(!isClassNote)}
                  >
                    <View style={[styles.checkbox, isClassNote && styles.checkedBox]}>
                      {isClassNote && <CheckCircle size={14} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>{t('vlen_per_klase')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, { backgroundColor: '#dc2626' }, !noteText && { opacity: 0.5 }]}
                    disabled={!noteText}
                    onPress={() => {
                      if (onAddNote) {
                        onAddNote({
                          studentId: isClassNote ? null : selectedActionStudent.id,
                          classId: selectedActionStudent.classId,
                          content: noteText,
                          isClassNote: isClassNote,
                          date: dateStr
                        });
                      } else {
                        // Fallback: use lesson hack
                        const marker = isClassNote ? '[CLASS_NOTE]' : '[NOTE]';
                        onAddLesson({
                          classId: selectedActionStudent.classId,
                          subject: getAvailableSubjects(navigation.data)[0] || 'Sjellja',
                          topic: `${marker} ${noteText}`,
                          date: dateStr,
                          teacherId: user.id
                        });
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

                  {attendance
                    .filter(a => a.student_id === selectedActionStudent.id && !a.status.includes('present') && !a.status.includes('justified'))
                    .reverse()
                    .slice(0, 10) // Limit to last 10 for performance in modal
                    .map(att => {
                      const isSelected = selectedAttendanceToJustify?.id === att.id;
                      return (
                        <TouchableOpacity
                          key={att.id}
                          style={[
                            styles.premiumActionCard,
                            { paddingVertical: 12, marginBottom: 8, borderColor: isSelected ? '#2563eb' : '#f1f5f9', backgroundColor: isSelected ? '#eff6ff' : 'white' }
                          ]}
                          onPress={() => {
                            setSelectedAttendanceToJustify(att);
                            setJustifyReason('');
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{reformatDate(att.date)}</Text>
                              <View style={[styles.statusInitialCircle, { width: 24, height: 24, backgroundColor: att.status.startsWith('absent') ? '#ef444410' : '#f59e0b10' }]}>
                                <Text style={{ fontSize: 12, fontWeight: '800', color: att.status.startsWith('absent') ? '#ef4444' : '#f59e0b' }}>
                                  {att.status.startsWith('absent') ? 'M' : att.status.startsWith('late') ? 'V' : 'D'}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                              {t(att.status.split(':')[0]) || att.status.split(':')[0]}
                              {att.status.includes(':') && att.status.split(':').length > 2 ? ` (${att.status.split(':')[2]})` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                  {selectedAttendanceToJustify && (
                    <View style={{ marginTop: 20, padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                        <Pencil size={18} color="#2563eb" />
                        <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>{t('justification_reason')}</Text>
                      </View>
                      <TextInput
                        style={[styles.premiumInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                        placeholder={t('enter_reason_placeholder')}
                        value={justifyReason}
                        onChangeText={setJustifyReason}
                        multiline
                      />
                      <TouchableOpacity
                        style={[styles.premiumSubmitButton, !justifyReason && { opacity: 0.5 }, { marginTop: 16 }]}
                        disabled={!justifyReason}
                        onPress={async () => {
                          const result = await onJustifyAttendance(selectedAttendanceToJustify.id, justifyReason);
                          if (!result.error) {
                            showAlert(t('attendance_justified_success') + " ✔", 'success');
                            setSelectedAttendanceToJustify(null);
                            setJustifyReason('');
                          }
                        }}
                      >
                        <Text style={styles.premiumSubmitButtonText}>{t('confirm')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {attendance.filter(a => a.student_id === selectedActionStudent.id && !a.status.includes('present') && !a.status.includes('justified')).length === 0 && (
                    <View style={{ alignItems: 'center', paddingVertical: 40, opacity: 0.5 }}>
                      <CheckCircle size={48} color="#10b981" />
                      <Text style={{ color: '#64748b', marginTop: 16, fontWeight: '600' }}>{t('no_unjustified_absences')}</Text>
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
                        style={[styles.gradeButton, { width: 40 }, lessonHour === hour && styles.activeGradeButton]}
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
                    style={styles.checkboxContainer}
                    onPress={() => setIsTest(!isTest)}
                  >
                    <View style={[styles.checkbox, isTest && styles.checkedBox]}>
                      {isTest && <CheckCircle size={14} color="white" />}
                    </View>
                    <Text style={styles.checkboxLabel}>{t('test_exam')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.premiumSubmitButton, !lessonTopic && { opacity: 0.5 }]}
                    disabled={!lessonTopic}
                    onPress={() => {
                      onAddLesson({
                        classId: selectedActionStudent.classId,
                        subject: selectedSubject,
                        topic: `[Ora ${lessonHour}] ${lessonTopic}`.trim(),
                        homework: lessonHomework,
                        isTest: isTest,
                        date: gradeCustomDate || dateStr,
                        teacherId: user.id
                      });
                      setIsActionModalVisible(false);
                      setLessonTopic('');
                      setLessonHomework('');
                      setIsTest(false);
                      setGradeCustomDate(null);
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
    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'class-detail', data: currentClass })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{formatClassName(currentClass)}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewTitleHeader}>{t('register_lesson')}: {formatClassName(currentClass)}</Text>
            <Text style={styles.dateTextHeader}>{formatDisplayDate(selectedDate)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.premiumCard}>
            <View style={styles.chipGrid}>
              {getAvailableSubjects(currentClass).map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip, { marginBottom: 8 }]}
                  onPress={() => setSelectedSubject(subject)}
                >
                  <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.gradeButtonGrid}>
              {['1', '2', '3', '4', '5', '6', '7'].map(hour => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.gradeButton, { width: 40 }, lessonHour === hour && styles.activeGradeButton]}
                  onPress={() => setLessonHour(hour)}
                >
                  <Text style={[styles.gradeButtonText, lessonHour === hour && styles.activeGradeButtonText]}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('lesson_topic_placeholder')}
              value={lessonTopic}
              onChangeText={setLessonTopic}
            />

            <TextInput
              style={styles.input}
              placeholder={t('homework_placeholder')}
              value={lessonHomework}
              onChangeText={setLessonHomework}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => {
                onAddLesson({
                  classId: currentClass.id,
                  subject: selectedSubject,
                  topic: `[Ora ${lessonHour}] ${lessonTopic}`,
                  homework: lessonHomework,
                  date: formatDate(selectedDate),
                  teacherId: user.id
                });
                setActiveView('home');
                setNavigation({ view: 'home', data: null });
                setLessonTopic('');
                setLessonHomework('');
              }}
            >
              <Text style={styles.submitButtonText}>{t('save_lesson')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderStudentSelection = (currentClass) => {
    const classStudents = students.filter(s => s.classId === currentClass.id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{t('back') || 'Mbrapsht'}</Text>
          </TouchableOpacity>
          <Text style={styles.viewTitleHeader}>{formatClassName(currentClass)}</Text>
        </View>

        <FlatList
          data={classStudents}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.studentListItem}
              onPress={() => setNavigation({ view: 'notat-subjects', data: { student: item, class: currentClass } })}
            >
              <View style={styles.studentNumberContainer}>
                <Text style={styles.studentNumberText}>{index + 1}.</Text>
              </View>
              <Text style={styles.studentNameText}>{item.name}</Text>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        />
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
      <Modal visible={!!editingGrade} animationType="slide" transparent>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
    <Modal visible={isGradeModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('register_grade')}: {selectedStudentForGrade?.name}</Text>
            <TouchableOpacity onPress={() => setIsGradeModalVisible(false)} style={styles.closeModalBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('grade_value')}
            keyboardType="numeric"
            value={gradeValue}
            onChangeText={setGradeValue}
          />
          <Text style={styles.label}>{t('grade_type')}</Text>
          <View style={styles.chipGrid}>
            {[
              { id: 'Me Shkrim', label: t('written') },
              { id: 'Me Gojë', label: t('oral') },
              { id: 'Praktikë', label: t('practical') }
            ].map(type => (
              <TouchableOpacity
                key={type.id}
                style={[styles.chip, gradeType === type.id && styles.activeChip]}
                onPress={() => setGradeType(type.id)}
              >
                <Text style={[styles.chipText, gradeType === type.id && styles.activeChipText]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder={t('comment_placeholder')}
            value={gradeComment}
            onChangeText={setGradeComment}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsGradeModalVisible(false)}>
              <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => {
                onAddGrade({
                  studentId: selectedStudentForGrade.id,
                  subject: selectedSubject,
                  value: parseInt(gradeValue),
                  type: gradeType,
                  comment: gradeComment,
                  date: formatDate(selectedDate)
                });
                setIsGradeModalVisible(false);
                setGradeValue('');
                setGradeComment('');
                setGradeType('Me Shkrim');
              }}
            >
              <Text style={styles.submitButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSelectionModal = () => {
    if (!selectedActionStudent) return null;

    return (
      <Modal visible={isSelectionModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsSelectionModalVisible(false)}
        >
          <View style={[styles.premiumSelectionModal, { maxHeight: '85%', width: '95%' }]}>
            <View style={styles.pixelHeader}>
              <View style={styles.pixelLine} />
            </View>

            <ScrollView
              style={{ width: '100%' }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitleEmphasized}>
                    {selectedActionStudent.name}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {t('select_action')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsSelectionModalVisible(false)} style={styles.closeModalBtn}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.squareGrid}>
                {/* Grades Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#eff6ff' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    setIsActionModalVisible(true);
                    setActiveActionTab('grade');
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#dbeafe' }]}>
                    <ClipboardList size={26} color="#2563eb" />
                  </View>
                  <Text style={styles.squareActionText}>{t('register_grade')}</Text>
                </TouchableOpacity>

                {/* Attendance Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#f0fdf4' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    setIsActionModalVisible(true);
                    setActiveActionTab('attendance');
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#dcfce7' }]}>
                    <UserCheck size={26} color="#22c55e" />
                  </View>
                  <Text style={styles.squareActionText}>{t('register_attendance')}</Text>
                </TouchableOpacity>

                {/* Justification Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#fff7ed' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    setIsActionModalVisible(true);
                    setActiveActionTab('justify');
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#ffedd5' }]}>
                    <Pencil size={26} color="#f59e0b" />
                  </View>
                  <Text style={styles.squareActionText}>{t('register_justification')}</Text>
                </TouchableOpacity>

                {/* Disciplinary Note Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#fef2f2' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    setIsActionModalVisible(true);
                    setActiveActionTab('note');
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#fee2e2' }]}>
                    <ShieldCheck size={26} color="#dc2626" />
                  </View>
                  <Text style={styles.squareActionText}>{t('register_disciplinary_note')}</Text>
                </TouchableOpacity>

                {/* Lesson Registration Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#f5f3ff' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    setIsActionModalVisible(true);
                    setActiveActionTab('lesson');
                    if (navigation.data?.subjects && navigation.data.subjects.length > 0) {
                      setSelectedSubject(navigation.data.subjects[0]);
                    }
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#ede9fe' }]}>
                    <BookIcon size={26} color="#7c3aed" />
                  </View>
                  <Text style={styles.squareActionText}>{t('register_lesson')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.premiumCancelButton}
                onPress={() => {
                  setIsSelectionModalVisible(false);
                  setTempAttendanceStatus(null);
                }}
              >
                <Text style={styles.premiumCancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderClassDetail = (currentClass) => {
    const classStudents = [...students]
      .filter(s => s.classId === currentClass.id)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
            <Text style={styles.backButtonText}>{t('back') || 'Mbrapsht'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.viewTitleHeader}>{formatClassName(currentClass)}</Text>
            <Text style={styles.dateTextHeader}>{classStudents.length} {t('students_count')} • {formatDate(selectedDate)}</Text>
          </View>
        </View>

        <FlatList
          data={classStudents}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.studentListItem}
              onPress={() => {
                setSelectedActionStudent(item);
                setIsSelectionModalVisible(true);
                setTempAttendanceStatus(null);
                if (navigation.data?.subjects && navigation.data.subjects.length > 0) {
                  setSelectedSubject(navigation.data.subjects[0]);
                }
              }}
            >
              <View style={styles.studentNumberContainer}>
                <Text style={styles.studentNumberText}>{index + 1}.</Text>
              </View>
              <View style={styles.studentInfoMain}>
                <Text style={styles.studentNameText}>{item.name}</Text>
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const renderAgenda = (currentClass) => {
    const dateStr = formatDate(selectedDate);
    const dayLessons = lessons.filter(l => l.class_id === currentClass?.id && l.date === dateStr);

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
                  {lesson.homework && (
                    <View style={styles.homeworkContainer}>
                      <Clock size={12} color="#64748b" />
                      <Text style={styles.homeworkText}>{lesson.homework}</Text>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
        <CalendarStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />
      </View>

      {activeView === 'home' && navigation.view === 'home' && renderHome()}
      {activeView === 'registry' && navigation.view === 'home' && renderClassList('class-detail', t('class_registry'))}

      {activeView === 'lessons' && navigation.view === 'home' && renderClassList('lesson-form', t('select_class_lesson'))}
      {activeView === 'notat' && navigation.view === 'home' && renderClassList('notat-students', t('select_class_grades'))}
      {activeView === 'lajmerimet' && navigation.view === 'home' && renderNotices()}

      {navigation.view === 'class-detail' && renderClassDetail(navigation.data)}
      {navigation.view === 'lesson-form' && renderLessonForm(navigation.data)}
      {navigation.view === 'notat-students' && renderStudentSelection(navigation.data)}
      {navigation.view === 'notat-subjects' && renderSubjectSelection(navigation.data)}
      {navigation.view === 'notat-history' && renderGradeHistory(navigation.data)}

      {renderGradeModal()}
      {renderActionModal()}
      {renderSelectionModal()}
      {renderEditGradeModal()}
      <Modal visible={isLessonModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('register_lesson')}: {formatClassName(navigation.data)}</Text>
              <TouchableOpacity onPress={() => setIsLessonModalVisible(false)} style={styles.closeModalBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('lesson_subject')}</Text>
            <View style={styles.chipGrid}>
              {getAvailableSubjects(navigation.data).map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip, { marginBottom: 8 }]}
                  onPress={() => setSelectedSubject(subject)}
                >
                  <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('lesson_hour')}</Text>
            <View style={styles.chipGrid}>
              {['1', '2', '3', '4', '5', '6', '7'].map(hour => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.subjectChip, lessonHour === hour && styles.activeSubjectChip]}
                  onPress={() => setLessonHour(hour)}
                >
                  <Text style={[styles.subjectChipText, lessonHour === hour && styles.activeSubjectChipText]}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder={t('lesson_topic_placeholder')}
              multiline
              numberOfLines={3}
              value={lessonTopic}
              onChangeText={setLessonTopic}
            />
            <TextInput
              style={styles.input}
              placeholder={t('homework_placeholder')}
              value={lessonHomework}
              onChangeText={setLessonHomework}
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsTest(!isTest)}
            >
              <View style={[styles.checkbox, isTest && styles.checkedBox]}>
                {isTest && <CheckCircle size={14} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Test / Provim</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsLessonModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  onAddLesson({
                    classId: navigation.data.id,
                    subject: selectedSubject,
                    topic: `[Ora ${lessonHour}] ${lessonTopic}`.trim(),
                    homework: lessonHomework,
                    isTest: isTest,
                    date: formatDate(selectedDate),
                    teacherId: user.id
                  });
                  setIsLessonModalVisible(false);
                  setLessonTopic('');
                  setLessonHomework('');
                  setIsTest(false);
                }}
              >
                <Text style={styles.submitButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveView('home'); setNavigation({ view: 'home', data: null }); }}>
          <Home size={24} color={activeView === 'home' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'home' && styles.activeNavText]}>{t('agenda')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveView('registry'); setNavigation({ view: 'home', data: null }); }}>
          <ClipboardList size={24} color={activeView === 'registry' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'registry' && styles.activeNavText]}>{t('class_registry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveView('notat'); setNavigation({ view: 'home', data: null }); }}>
          <ShieldCheck size={24} color={activeView === 'notat' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'notat' && styles.activeNavText]}>{t('student_grades')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => { setActiveView('lajmerimet'); setNavigation({ view: 'home', data: null }); }}
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

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  scrollContent: {
    flex: 1,
    padding: 24,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tile: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    width: (width - 64) / 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  tileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingTop: 12,
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
    fontWeight: '600',
    color: '#94a3b8',
  },
  viewContainer: {
    flex: 1,
    padding: 24,
  },
  viewTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#1e40af', // Darker blue
    fontWeight: '800',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
    fontSize: 14,
  },
  activeNavText: {
    color: '#2563eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    marginTop: -20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  attendanceToggle: {
    padding: 8,
    borderRadius: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  actionCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: '#1e293b',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  chipScroll: {
    marginBottom: 16,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  activeSubjectChip: {
    backgroundColor: '#2563eb',
  },
  subjectChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  activeSubjectChipText: {
    color: 'white',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '700',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  homeContent: {
    padding: 20,
  },
  nuvolaLessonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  lessonColorBar: {
    width: 6,
  },
  lessonContent: {
    flex: 1,
    padding: 16,
  },
  lessonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  lessonProfessor: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  lessonTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lessonTopic: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  homeworkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  homeworkText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  emptyAgendaCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#fff1f2',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  alertIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 10,
  },
  alertText: {
    color: '#9f1239',
    fontSize: 14,
  },
  studentListItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  studentNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  studentInfoMain: {
    flex: 1,
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  studentAttendanceText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  closeModalBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  modalTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 4,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    gap: 4,
  },
  activeModalTab: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeModalTabText: {
    color: '#2563eb',
  },
  modalScroll: {
    flex: 1,
  },
  tabContent: {
    paddingBottom: 20,
  },
  gradeButtonGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  gradeButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeGradeButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  gradeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748b',
  },
  activeGradeButtonText: {
    color: '#2563eb',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  attendanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  attTile: {
    width: '47%',
    minHeight: 80,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 8,
  },
  attTileText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  hourBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hourBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  weekendEmptyState: {
    flex: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    width: '100%',
    gap: 12,
  },
  weekendEmptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  historySubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  historyTopic: {
    fontSize: 12,
    color: '#64748b',
  },
  // Nuvola Style Additions
  navigationHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
  },
  glassBackButton: {
    flexDirection: 'row',
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  dateTextHeader: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500'
  },
  premiumCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  nuvolaLessonCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  premiumHourContainer: {
    width: 60,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#64748b',
    textTransform: 'uppercase',
  },
  lessonColorBar: {
    width: 4,
    height: '100%',
  },
  lessonContent: {
    flex: 1,
    padding: 16,
  },
  lessonHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  lessonTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  lessonTopic: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  homeworkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  homeworkText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  selectionCard: {
    width: '46%',
    minHeight: 110,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  selectionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  premiumSelectionModal: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    paddingBottom: 16,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  pixelHeader: {
    width: 40,
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginBottom: 20,
  },
  pixelLine: {
    width: '100%',
    height: '100%',
  },
  modalTitleEmphasized: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  modalSubtitleCenter: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  squareGrid: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  squareActionCard: {
    width: '100%',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    minHeight: 80,
  },
  squareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
    flexWrap: 'wrap',
  },
  premiumCancelButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  premiumCancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
  },
  premiumActionModal: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
  },
  premiumInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  premiumSubmitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  premiumSubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  squareAttTile: {
    width: '48%',
    minHeight: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    padding: 8,
  },
  squareAttTileText: {
    fontSize: 12,
    color: '#64748b',
  },
  changeClassLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  changeClassText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  professorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  lessonSubjectEmphasized: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  lessonTopicValue: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeDateChip: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  dateChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  activeDateChipText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyTextSmall: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  premiumDatePickerField: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  premiumDatePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumDatePickerText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
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
  typeLabelText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  gradeCardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  dateColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
    marginRight: 10,
  },
  gradeDateSmall: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  gradeCircleContainer: {
    marginRight: 12,
  },
  gradeInfoMain: {
    flex: 1,
    justifyContent: 'center',
  },
  typeLabelSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  gradeCommentSmall: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 18,
  },
  editIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  premiumActionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statusInitialCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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

