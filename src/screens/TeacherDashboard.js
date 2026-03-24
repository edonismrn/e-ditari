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
  TextInput
} from 'react-native';
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
  Pencil
} from 'lucide-react-native';
import CalendarStrip from '../components/CalendarStrip';
import { formatDate } from '../utils/dateUtils';
import { useLanguage } from '../context/LanguageContext';
import { useAlert } from '../context/AlertContext';

const { width } = Dimensions.get('window');

const TeacherDashboard = ({
  user, onLogout, classes, students, grades, lessons, attendance, homework, notes,
  onAddGrade, onUpdateGrade, onAddLesson, onToggleAttendance, onAddHomework, onAddNote
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const [activeView, setActiveView] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [navigation, setNavigation] = useState({ view: 'home', data: null });

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
  const [isLessonModalVisible, setIsLessonModalVisible] = useState(false);
  const [isGradeModalVisible, setIsGradeModalVisible] = useState(false);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [selectedActionStudent, setSelectedActionStudent] = useState(null);
  const [activeActionTab, setActiveActionTab] = useState('grade'); // grade, attendance, note
  const [attendanceTime, setAttendanceTime] = useState('');
  const [absenceType, setAbsenceType] = useState('unjustified');
  const [noteText, setNoteText] = useState('');
  const [isClassNote, setIsClassNote] = useState(false);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);

  // New Menu States
  const [selectedNotatStudent, setSelectedNotatStudent] = useState(null);
  const [selectedNotatSubject, setSelectedNotatSubject] = useState(null);
  const [lessonDate, setLessonDate] = useState(new Date());
  const [selectedHomeClassId, setSelectedHomeClassId] = useState(null);

  // Edit Grade State
  const [editingGrade, setEditingGrade] = useState(null);
  const [editGradeValue, setEditGradeValue] = useState('');
  const [editGradeComment, setEditGradeComment] = useState('');
  const [editGradeType, setEditGradeType] = useState('Me Shkrim');

  const teacherClasses = classes.filter(c => (c.teacherIds || []).includes(user.id));

  const renderHome = () => {
    const dateStr = formatDate(selectedDate);

    if (!selectedHomeClassId) {
      return (
        <View style={styles.viewContainer}>
          <FlatList
            data={teacherClasses}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedHomeClassId(item.id)}
              >
                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
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
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
      <FlatList
        data={teacherClasses}
        keyExtractor={item => item.id}
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
            <View>
              <Text style={styles.cardTitle}>{item.name}</Text>
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
    const tabs = [
      { id: 'grade', label: t('student_grades'), icon: ClipboardList },
      { id: 'attendance', label: t('attendance'), icon: UserCheck },
      { id: 'note', label: t('disciplinary_note'), icon: ShieldCheck },
    ];


    return (
      <Modal visible={isActionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.premiumActionModal, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{selectedActionStudent.name}</Text>
                <Text style={styles.modalSubtitle}>{dateStr}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsActionModalVisible(false)} style={styles.closeModalBtn}>
                <Plus size={24} color="#64748b" style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            </View>

            {/* Date selection - apply to all actions */}
            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
              <Text style={styles.label}>{t('date_of_grade')}</Text>
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
                    {gradeCustomDate || formatDate(selectedDate)}
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

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {activeActionTab === 'grade' && (
                <View style={styles.tabContent}>
                  <Text style={styles.label}>{t('lesson_subject')}</Text>
                  <ScrollView horizontal style={styles.chipScroll} showsHorizontalScrollIndicator={false}>
                    {(navigation.data?.subjects || user.subjects || []).map(subject => (
                      <TouchableOpacity
                        key={subject}
                        style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip]}
                        onPress={() => setSelectedSubject(subject)}
                      >
                        <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

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
                    {[
                      { id: 'present', label: t('present'), icon: CheckCircle, color: '#22c55e' },
                      { id: 'absent', label: t('absent'), icon: XCircle, color: '#ef4444' },
                      { id: 'late', label: t('late'), icon: Clock, color: '#f59e0b' },
                      { id: 'early_exit', label: t('early_exit'), icon: LogOut, color: '#3b82f6' },
                    ].map(status => {
                      const Icon = status.icon;
                      const attRecord = attendance.find(a => a.student_id === selectedActionStudent.id && a.date === dateStr);
                      const isActive = (attRecord?.status || 'present') === status.id;

                      return (
                        <TouchableOpacity
                          key={status.id}
                          style={[styles.squareAttTile, isActive && { borderColor: status.color, backgroundColor: status.color + '15' }]}
                          onPress={() => onToggleAttendance(selectedActionStudent.id, dateStr, status.id)}
                        >
                          <Icon size={26} color={isActive ? status.color : '#94a3b8'} />
                          <Text style={[styles.squareAttTileText, isActive && { color: status.color, fontWeight: '700' }]}>{status.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

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
                          subject: user.subjects?.[0] || 'Sjellja',
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
                    <Text style={styles.premiumSubmitButtonText}>{t('ruaj_njoftimin')}</Text>
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
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.viewTitleHeader}>{t('register_lesson')}: {currentClass.name}</Text>
            <Text style={styles.dateTextHeader}>{formatDate(selectedDate)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.premiumCard}>
            <ScrollView horizontal style={styles.chipScroll} showsHorizontalScrollIndicator={false}>
              {(currentClass.subjects || user.subjects || []).map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip]}
                  onPress={() => setSelectedSubject(subject)}
                >
                  <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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
          </TouchableOpacity>
          <Text style={styles.viewTitleHeader}>{currentClass.name}</Text>
        </View>

        <FlatList
          data={classStudents}
          keyExtractor={item => item.id}
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
    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'notat-students', data: data.class })}>
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.viewTitleHeader}>{data.student.name}</Text>
        </View>

        <Text style={styles.label}>Zgjidh Lëndën</Text>
        <FlatList
          data={data.class.subjects || user.subjects || []}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setNavigation({ view: 'notat-history', data: { ...data, subject: item } })}
            >
              <Text style={styles.cardTitle}>{item}</Text>
              <ChevronRight size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const handleEditGradeClick = (grade) => {
    if ((grade.modification_count || 0) >= 1) {
      showAlert("Keni shfrytëzuar mundësinë tuaj të vetme për të ndryshuar këtë notë. Për ndryshime të tjera, kontaktoni administratorin e shkollës.", "info");
      return;
    }
    
    // Parse grade type from description if necessary
    const legacyParts = grade.description?.match(/^\[(.*?)\] (.*)/);
    const rawType = grade.grade_type || (legacyParts ? legacyParts[1] : 'Me Shkrim');
    const cleanComment = legacyParts ? legacyParts[2] : (grade.description || '');

    setEditingGrade(grade);
    setEditGradeValue(grade.grade.toString());
    setEditGradeComment(cleanComment);
    setEditGradeType(rawType);
  };

  const renderEditGradeModal = () => {
    if (!editingGrade) return null;

    return (
      <Modal visible={!!editingGrade} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.premiumActionModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitleEmphasized}>{t('edit_grade') || 'Ndrysho Notën'}</Text>
                <Text style={styles.modalSubtitle}>{editingGrade.date}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingGrade(null)} style={styles.closeModalBtn}>
                <Plus size={24} color="#64748b" style={{ transform: [{ rotate: '45deg' }] }} />
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
                      editGradeType
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

    const getGradeColor = (val) => {
      const num = parseFloat(val);
      if (num >= 3) return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
      if (num >= 2) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
    };

    return (
      <View style={styles.viewContainer}>
        <View style={styles.navigationHeader}>
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'notat-subjects', data: data })}>
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.viewTitleHeader}>{data.subject}</Text>
            <Text style={styles.dateTextHeader}>{data.student.name}</Text>
          </View>
        </View>

        <FlatList
          data={history.reverse()}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const gradeColors = getGradeColor(item.grade);
            return (
              <View style={[styles.gradeCard, { borderColor: gradeColors.border }]}>
                <View style={[styles.gradeCircle, { backgroundColor: gradeColors.bg, borderColor: gradeColors.border }]}>
                  <Text style={[styles.gradeValue, { color: gradeColors.text }]}>{item.grade}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.gradeHeaderRow}>
                    <Text style={styles.gradeDate}>{item.date}</Text>
                    <TouchableOpacity onPress={() => handleEditGradeClick(item)}>
                      <Pencil size={16} color={(item.modification_count || 0) >= 1 ? '#cbd5e1' : '#64748b'} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.gradeComment}>{item.comment}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Asnjë notë për këtë lëndë.</Text>}
        />
      </View>
    );
  };

  const renderGradeModal = () => (
    <Modal visible={isGradeModalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Vendos Notën: {selectedStudentForGrade?.name}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('grade_value')}
            keyboardType="numeric"
            value={gradeValue}
            onChangeText={setGradeValue}
          />
          <Text style={styles.label}>{t('grade_type')}</Text>
          <ScrollView horizontal style={styles.chipScroll}>
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
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder={t('comment_placeholder')}
            value={gradeComment}
            onChangeText={setGradeComment}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsGradeModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Anulo</Text>
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
              <Text style={styles.submitButtonText}>Ruaj</Text>
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
              <Text style={styles.modalTitleEmphasized}>
                {selectedActionStudent.name}
              </Text>
              <Text style={styles.modalSubtitleCenter}>
                {t('select_action')}
              </Text>

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
                  <Text style={styles.squareActionText}>Regjistro Notën</Text>
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
                  <Text style={styles.squareActionText}>Regjistro Prezencën</Text>
                </TouchableOpacity>

                {/* Disciplinary Note Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#fff7ed' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    setIsActionModalVisible(true);
                    setActiveActionTab('note');
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#ffedd5' }]}>
                    <ShieldCheck size={26} color="#f59e0b" />
                  </View>
                  <Text style={styles.squareActionText}>Regjistro Njoftim Disiplinor</Text>
                </TouchableOpacity>

                {/* Lesson Registration Button */}
                <TouchableOpacity
                  style={[styles.squareActionCard, { backgroundColor: '#f5f3ff' }]}
                  onPress={() => {
                    setIsSelectionModalVisible(false);
                    const classId = selectedActionStudent.classId;
                    const studentClass = classes.find(c => c.id === classId);
                    setNavigation({ view: 'lesson-form', data: studentClass });
                    if (studentClass?.subjects && studentClass.subjects.length > 0) {
                      setSelectedSubject(studentClass.subjects[0]);
                    }
                  }}
                >
                  <View style={[styles.squareIconContainer, { backgroundColor: '#ede9fe' }]}>
                    <BookIcon size={26} color="#7c3aed" />
                  </View>
                  <Text style={styles.squareActionText}>Regjistro Orën</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.premiumCancelButton}
                onPress={() => setIsSelectionModalVisible(false)}
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
          </TouchableOpacity>
          <View>
            <Text style={styles.viewTitleHeader}>{currentClass.name}</Text>
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
          <TouchableOpacity style={styles.glassBackButton} onPress={() => setNavigation({ view: 'home', data: null })}>
            <ArrowLeft size={18} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text style={styles.viewTitleHeader}>{currentClass?.name}</Text>
            <Text style={styles.dateTextHeader}>{dateStr}</Text>
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
            <Text style={styles.modalTitle}>Regjistro Orën: {navigation.data?.name}</Text>

            <Text style={styles.label}>Lënda</Text>
            <ScrollView horizontal style={styles.chipScroll}>
              {(navigation.data?.subjects || user.subjects || []).map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.subjectChip, selectedSubject === subject && styles.activeSubjectChip]}
                  onPress={() => setSelectedSubject(subject)}
                >
                  <Text style={[styles.subjectChipText, selectedSubject === subject && styles.activeSubjectChipText]}>{subject}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Ora e Mësimit</Text>
            <ScrollView horizontal style={styles.chipScroll}>
              {['1', '2', '3', '4', '5', '6', '7'].map(hour => (
                <TouchableOpacity
                  key={hour}
                  style={[styles.subjectChip, lessonHour === hour && styles.activeSubjectChip]}
                  onPress={() => setLessonHour(hour)}
                >
                  <Text style={[styles.subjectChipText, lessonHour === hour && styles.activeSubjectChipText]}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

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
                <Text style={styles.cancelButtonText}>Anulo</Text>
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
                <Text style={styles.submitButtonText}>Ruaj</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveView('home'); setNavigation({ view: 'home', data: null }); }}>
          <Home size={24} color={activeView === 'home' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'home' && styles.activeNavText]}>{t('home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveView('registry'); setNavigation({ view: 'home', data: null }); }}>
          <ClipboardList size={24} color={activeView === 'registry' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'registry' && styles.activeNavText]}>{t('class_registry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { setActiveView('notat'); setNavigation({ view: 'home', data: null }); }}>
          <ShieldCheck size={24} color={activeView === 'notat' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeView === 'notat' && styles.activeNavText]}>{t('student_grades')}</Text>
        </TouchableOpacity>
      </View>
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
    color: '#2563eb',
    fontWeight: '600',
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
    aspectRatio: 1.2,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attTileText: {
    fontSize: 13,
    color: '#64748b',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    marginTop: Platform.OS === 'ios' ? 0 : 12,
  },
  glassBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'white',
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
  viewTitleHeader: {
    fontSize: 18,
    fontWeight: '800',
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
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
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
    width: '45%',
    aspectRatio: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 12,
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
    aspectRatio: 1.3,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
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
});


export default TeacherDashboard;

