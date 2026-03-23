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
  Platform
} from 'react-native';
import { 
  Home, 
  Book, 
  ClipboardCheck, 
  Calendar, 
  LogOut, 
  Bell,
  GraduationCap,
  Award,
  BookOpen as BookIcon,
  Clock
} from 'lucide-react-native';
import CalendarStrip from '../components/CalendarStrip';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const StudentDashboard = ({ user, onLogout, grades, lessons, attendance, homework }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const formatDateString = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDayName = (dateObj) => {
    const days = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];
    return days[dateObj.getDay()];
  };

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const userGrades = grades.filter(g => g.student_id === user.id && g.grade > 0);
  const averageGrade = userGrades.length > 0 
    ? (userGrades.reduce((acc, curr) => acc + curr.grade, 0) / userGrades.length).toFixed(1)
    : '5.0';

  const getGradeColor = (val) => {
    const num = parseFloat(val);
    if (num >= 3) return { bg: '#dcfce7', text: '#166534', border: '#22c55e' };
    if (num >= 2) return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
  };

  const subjectAverages = React.useMemo(() => {
    const subjects = {};
    userGrades.forEach(g => {
      if (!subjects[g.subject]) subjects[g.subject] = { total: 0, count: 0 };
      subjects[g.subject].total += g.grade;
      subjects[g.subject].count += 1;
    });
    return Object.keys(subjects).map(sub => ({
      subject: sub,
      average: (subjects[sub].total / subjects[sub].count).toFixed(1)
    })).sort((a,b) => b.average - a.average);
  }, [userGrades]);
  
  const userAttendance = attendance.filter(a => a.student_id === user.id);
  const totalAbsences = userAttendance.filter(a => a.status.startsWith('absent')).length;

  const personalNotes = grades.filter(g => g.student_id === user.id && g.comment?.includes('[NOTE]'));
  const classNotes = lessons.filter(l => l.class_id === user.classId && l.topic?.includes('[CLASS_NOTE]'));
  const userNotes = [...personalNotes, ...classNotes];

  const renderOverview = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={{ marginTop: 10 }}>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Axhenda e Sotme</Text>
          <Book size={20} color="#2563eb" />
        </View>
        
        <FlatList
          data={lessons.filter(l => l.class_id === user.classId && l.date === formatDateString(selectedDate))}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const topicParts = item.topic?.match(/^\[Ora (\d+)\] (.*)/);
            const hourText = topicParts ? `Ora ${topicParts[1]}` : '';
            const cleanTopic = topicParts ? topicParts[2] : item.topic;
            
            return (
            <View style={styles.premiumCard}>
              <View style={styles.cardAccent} />
              <View style={styles.cardContent}>
                <View style={styles.lessonHeader}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <Text style={styles.lessonSubject}>{item.subject}</Text>
                    {hourText ? (
                      <View style={styles.hourBadge}>
                        <Text style={styles.hourBadgeText}>{hourText}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.lessonDate}>{item.date}</Text>
                </View>
                <Text style={styles.lessonTopic}>{cleanTopic}</Text>
                {item.homework ? (
                  <View style={styles.homeworkContainer}>
                    <Calendar size={14} color="#2563eb" />
                    <Text style={styles.homeworkText}><Text style={{fontWeight: '800'}}>Detyrë:</Text> {item.homework}</Text>
                  </View>
                ) : null}
                {item.is_test && (
                  <View style={styles.testBadge}>
                    <Text style={styles.testBadgeText}>TEST / PROVIM</Text>
                  </View>
                )}
              </View>
            </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>Nuk ka orë mësimore apo axhendë për këtë ditë.</Text>
            </View>
          )}
        />

        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Notat e Fundit</Text>
          <ClipboardCheck size={20} color="#2563eb" />
        </View>
        

        <FlatList
          data={userGrades.filter(g => g.grade > 0).reverse().slice(0, 5)}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const descParts = item.comment?.match(/^\[(.*?)\] (.*)/);
            const gradeType = descParts ? descParts[1] : '';
            const cleanDesc = descParts ? descParts[2] : item.comment;

            const gradeColors = getGradeColor(item.grade);

            return (
            <View style={[styles.gradeCard, { borderColor: gradeColors.border }]}>
              <View style={[styles.gradeCircle, { backgroundColor: gradeColors.bg, borderColor: gradeColors.border }]}>
                <Text style={[styles.gradeValue, { color: gradeColors.text }]}>{item.grade}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.gradeHeaderRow}>
                  <Text style={styles.gradeSubject}>{item.subject}</Text>
                  <Text style={styles.gradeDate}>{item.date}</Text>
                </View>
                {gradeType ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{gradeType}</Text>
                  </View>
                ) : null}
                <Text style={styles.gradeComment} numberOfLines={2}>
                  {cleanDesc || t('no_comment')}
                </Text>
              </View>
            </View>
          );}}
          ListEmptyComponent={() => (
             <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>{t('no_grades_recorded')}</Text>
            </View>
          )}
        />

        {userNotes.length > 0 && (
          <View>
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>{t('disciplinary_notifications')}</Text>
              <Bell size={20} color="#ef4444" />
            </View>
            {userNotes.map((note, idx) => {
              const isClassNote = (note.comment || note.topic || '').includes('[CLASS_NOTE]');
              const cleanNote = (note.comment || note.topic || '').replace('[NOTE]', '').replace('[CLASS_NOTE]', '').trim();

              return (
                <View key={idx} style={[styles.premiumCard, { borderColor: '#fecdd3', backgroundColor: '#fff1f2' }]}>
                  <View style={[styles.cardAccent, { backgroundColor: '#ef4444' }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.lessonHeader}>
                      <Text style={[styles.lessonSubject, { color: '#991b1b' }]}>
                        Njoftim Disiplinor
                      </Text>
                      <Text style={styles.lessonDate}>{note.date}</Text>
                    </View>
                    <Text style={styles.lessonTopic}>{cleanNote}</Text>
                    <Text style={[styles.lessonDate, { marginTop: 4, fontStyle: 'italic' }]}>
                      {t('subject_label')}: {note.subject || t('behavior')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderGrades = () => (
    <View style={styles.content}>
      <View style={[styles.sectionHeaderRow, { marginTop: 16, marginHorizontal: 24, justifyContent: 'flex-end' }]}>
        <View style={[styles.statItem, { backgroundColor: '#eff6ff', padding: 12, paddingVertical: 8, borderRadius: 12, flex: 0, shadowOpacity: 0 }]}>
          <Text style={[styles.statLabel, { color: '#2563eb', marginBottom: 2 }]}>{t('average_grade')}</Text>
          <Text style={[styles.statValue, { color: '#1d4ed8', fontSize: 20 }]}>{averageGrade}</Text>
        </View>
      </View>

      {subjectAverages.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitleSmall, { marginHorizontal: 24 }]}>Mesatarja sipas Lëndëve</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 8, gap: 12 }}>
            {subjectAverages.map((sub, idx) => {
              const colors = getGradeColor(sub.average);
              return (
                <View key={idx} style={[styles.statItem, { backgroundColor: colors.bg, borderColor: colors.border, padding: 12, paddingVertical: 12, borderRadius: 16, width: 120, alignItems: 'flex-start' }]}>
                  <Text style={[styles.statLabel, { color: colors.text, marginBottom: 4, letterSpacing: 0, fontSize: 11 }]}>{sub.subject}</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontSize: 22 }]}>{sub.average}</Text>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 24 }}
        data={userGrades.reverse()} // Use userGrades for student-specific grades
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const descParts = item.comment?.match(/^\[(.*?)\] (.*)/);
          const gradeType = descParts ? descParts[1] : '';
          const cleanDesc = descParts ? descParts[2] : item.comment;

          const gradeColors = getGradeColor(item.grade);

          return (
            <View style={[styles.gradeCard, { borderColor: gradeColors.border }]}>
              <View style={[styles.gradeCircle, { backgroundColor: gradeColors.bg, borderColor: gradeColors.border }]}>
                <Text style={[styles.gradeValue, { color: gradeColors.text }]}>{item.grade}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.gradeHeaderRow}>
                  <Text style={styles.gradeSubject}>{item.subject}</Text>
                  <Text style={styles.gradeDate}>{item.date}</Text>
                </View>
                {gradeType ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{gradeType}</Text>
                  </View>
                ) : null}
                <Text style={styles.gradeComment} numberOfLines={2}>
                  {cleanDesc || t('no_comment')}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyText}>{t('no_grades_recorded')}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderLessons = () => (
    <View style={[styles.content, { paddingTop: 16 }]}>
      <FlatList
        data={lessons.filter(l => l.class_id === user.classId).reverse()}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const topicParts = item.topic?.match(/^\[Ora (\d+)\] (.*)/);
          const hourText = topicParts ? `${t('hour')} ${topicParts[1]}` : '';
          const cleanTopic = topicParts ? topicParts[2] : item.topic;

          return (
            <View style={styles.premiumCard}>
              <View style={styles.cardAccent} />
              <View style={styles.cardContent}>
                <View style={styles.lessonHeader}>
                  <Text style={styles.lessonSubject}>{item.subject} {hourText ? `(${hourText})` : ''}</Text>
                  <Text style={styles.lessonDate}>{item.date}</Text>
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
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyText}>{t('no_lessons')}</Text>
          </View>
        )}
      />
    </View>
  );

  const renderAttendance = () => (
    <View style={[styles.content, { paddingTop: 16 }]}>
      <View style={styles.statsGrid}>
        <View style={[styles.statItem, { backgroundColor: '#fef2f2', padding: 12, paddingVertical: 8, borderRadius: 12, flex: 0, shadowOpacity: 0 }]}>
          <Text style={[styles.statLabel, { color: '#991b1b', marginBottom: 2 }]}>{t('absences')}</Text>
          <Text style={[styles.statValue, { color: '#b91c1c', fontSize: 20 }]}>{totalAbsences}</Text>
        </View>
      </View>

      {userAttendance.filter(a => a.status.includes(':')).length > 0 && (
        <View style={{ marginBottom: 16, marginHorizontal: 24 }}>
          <Text style={styles.sectionTitleSmall}>{t('attendance_details')}</Text>
          {userAttendance.filter(a => a.status.includes(':')).map((att, idx) => {
            const [status, time] = att.status.split(':');
            const statusLabels = { late: t('late_entry'), early_exit: t('early_exit') };
            return (
              <View key={idx} style={styles.miniDetailRow}>
                <Text style={styles.miniDetailDate}>{att.date}</Text>
                <Text style={styles.miniDetailStatus}>{statusLabels[status] || status}</Text>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 24 }}
        data={userAttendance.reverse()}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const statusLabels = {
            present: t('present'),
            absent: t('absent'),
            'absent:unjustified': t('absent_unjustified'),
            'absent:justified': t('absent_justified'),
            'late': t('late_entry'),
            'early_exit': t('early_exit'),
          };
          const displayStatus = statusLabels[item.status] || item.status;
          const statusColor = item.status.startsWith('absent') || item.status.includes('late') || item.status.includes('early_exit') ? '#ef4444' : '#22c55e';

          return (
            <View style={styles.attendanceCard}>
              <View style={styles.attendanceInfo}>
                <Text style={styles.attendanceDate}>{item.date}</Text>
                <Text style={styles.attendanceSubject}>{item.subject}</Text>
              </View>
              <View style={[styles.attendanceStatusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.attendanceStatusText}>{displayStatus}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyText}>{t('no_attendance_recorded')}</Text>
          </View>
        )}
      />
    </View>
  );


  const renderBacheca = () => (
    <View style={[styles.content, { paddingTop: 16 }]}>
      <View style={[styles.emptyStateContainer, { marginHorizontal: 24 }]}>
        <Text style={styles.emptyText}>Muri është bosh.</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopBar}>
          <View style={styles.headerLogo}>
            <View style={styles.logoIcon}>
              <Book size={20} color="white" />
            </View>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
        {activeTab === 'overview' && (
          <CalendarStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        )}
      </View>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'grades' && renderGrades()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'bacheca' && renderBacheca()}

      {/* New bottom navigation structure */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('overview')}
        >
          <Home size={24} color={activeTab === 'overview' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'overview' && styles.activeNavText]}>Ballina</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('grades')}
        >
          <Award size={24} color={activeTab === 'grades' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'grades' && styles.activeNavText]}>Notat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('attendance')}
        >
          <Calendar size={24} color={activeTab === 'attendance' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'attendance' && styles.activeNavText]}>Assenze</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('bacheca')}
        >
          <BookIcon size={24} color={activeTab === 'bacheca' ? '#2563eb' : '#94a3b8'} />
          <Text style={[styles.navText, activeTab === 'bacheca' && styles.activeNavText]}>Bacheca</Text>
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
    fontSize: 20,
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
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
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
  cardAccent: {
    width: 6,
    backgroundColor: '#2563eb',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  lessonDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  lessonTopic: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  homeworkContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
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
  testBadge: {
    marginTop: 12,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  testBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  gradeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  gradeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  gradeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2563eb',
  },
  gradeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  gradeSubject: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  gradeDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  gradeComment: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  emptyStateContainer: {
    padding: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
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
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  viewTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 20,
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 14,
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
});

export default StudentDashboard;
