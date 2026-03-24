import React from 'react';
import { StyleSheet, View, Text, StatusBar, SafeAreaView } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DatabaseProvider, useDatabase } from './src/context/DatabaseContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

import LoginScreen from './src/screens/LoginScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import TeacherDashboard from './src/screens/TeacherDashboard';
import StudentDashboard from './src/screens/StudentDashboard';

function AppContent() {
  const { user, loading: authLoading, login, logout, isPasswordRecovery } = useAuth();
  const { 
    schools, teachers, schoolAdmins, classes, students, grades, lessons, attendance, homework, notes, notices,
    addSchool, addClass, addTeacher, addStudent,
    addGrade, addLesson, toggleAttendance, addHomework, addNote, addNotice,
    activateProfile, updateClassTeachers, assignStudentToClass,
    deleteSchool, deleteClass, removeTeacherFromClass, removeStudentFromClass,
    deleteTeacher, deleteStudent, archiveCurrentYear, promoteStudents, deleteNotice,
    loading: dataLoading
  } = useDatabase();

  const handleLogin = async (data) => {
    try {
      // In Supabase, email is the primary identifier.
      const email = data.email || data.username;
      
      await login(email, data.password);
    } catch (err) {
      alert(`Gabim gjatë kyçjes! Arsyeja: ${err.message || err}`);
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  const { t } = useLanguage();

  if (authLoading || (user && dataLoading)) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (!user || isPasswordRecovery) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // user from profiles table has a 'role'
  if (user.role === 'admin') {
    return (
      <View style={styles.container}>
        <AdminDashboard 
          user={user} 
          onLogout={handleLogout} 
          schools={schools}
          teachers={teachers}
          classes={classes}
          students={students}
          onAddSchool={addSchool}
          onAddTeacher={addTeacher}
          onAddClass={addClass}
          onAddStudent={addStudent}
          onActivateProfile={activateProfile}
          onUpdateClassTeachers={updateClassTeachers}
          onAssignStudentToClass={assignStudentToClass}
          onDeleteTeacher={deleteTeacher}
          onDeleteStudent={deleteStudent}
          onDeleteSchool={deleteSchool}
          onDeleteClass={deleteClass}
          onRemoveTeacherFromClass={removeTeacherFromClass}
          onRemoveStudentFromClass={removeStudentFromClass}
          onArchiveYear={archiveCurrentYear}
          onPromoteStudents={promoteStudents}
          notices={notices}
          onAddNotice={addNotice}
          onDeleteNotice={deleteNotice}
          schoolAdmins={schoolAdmins}
        />
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  if (user.role === 'mesues') {
    return (
      <View style={styles.container}>
        <TeacherDashboard 
          user={user} 
          onLogout={handleLogout} 
          classes={classes}
          students={students}
          grades={grades}
          lessons={lessons}
          attendance={attendance}
          homework={homework}
          notes={notes}
          onAddGrade={addGrade}
          onAddLesson={addLesson}
          onToggleAttendance={toggleAttendance}
          onAddHomework={addHomework}
          onAddNote={addNote}
        />
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  if (user.role === 'nxenes') {
    return (
      <View style={styles.container}>
        <StudentDashboard 
          user={user} 
          onLogout={handleLogout} 
          grades={grades}
          classes={classes}
          lessons={lessons}
          attendance={attendance}
          homework={homework}
          notes={notes}
          notices={notices}
        />
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.container}>
      <Text style={styles.centerText}>Mirësevini, {user.first_name} ({user.role})</Text>
      <Text onPress={handleLogout} style={styles.logoutLink}>Dalja</Text>
      <StatusBar barStyle="dark-content" />
    </View>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DatabaseProvider>
          <AppContent />
        </DatabaseProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#eff6ff'
  },
  loadingText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600'
  },
  centerText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutLink: {
    padding: 40,
    color: 'blue',
    textAlign: 'center',
  }
});
