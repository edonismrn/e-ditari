import React, { useEffect } from 'react';
import { StyleSheet, View, Text, StatusBar, SafeAreaView, LogBox, Platform } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DatabaseProvider, useDatabase } from './src/context/DatabaseContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { AlertProvider, useAlert } from './src/context/AlertContext';
import StylishAlert from './src/components/StylishAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import TeacherDashboard from './src/screens/TeacherDashboard';
import StudentDashboard from './src/screens/StudentDashboard';

LogBox.ignoreLogs([
  'AuthApiError: Invalid Refresh Token: Refresh Token Not Found',
  'Refresh Token Not Found'
]);

function AppContent() {
  const { user, loading: authLoading, login, logout, isPasswordRecovery } = useAuth();
  const {
    schools, teachers, schoolAdmins, classes, students, grades, lessons, attendance, homework, notes, notices,
    addSchool, addClass, addTeacher, addStudent,
    addGrade, addLesson, updateLesson, deleteLesson, toggleAttendance, addHomework, addNote, addNotice,
    activateProfile, updateClassTeachers, assignStudentToClass,
    deleteSchool, deleteClass, removeTeacherFromClass, removeStudentFromClass,
    deleteTeacher, deleteStudent, archiveCurrentYear, promoteStudents, promoteStudentToClass, deleteNotice, updateGrade,
    initializeDailyAttendance,
    justifyAttendance,
    markNoticeRead, noticeReads, uploadFile, deleteAllData, updateSchoolStatus, addTest, deleteTest, tests, updateCurrentTerm, updateTermStartDate,
    schoolCalendar, updateSchoolDates, addCalendarEvent, addCalendarEvents, deleteCalendarEvent,
    markDayAsRest, undoRestDay,
    updateAttendanceHour,
    loading: dataLoading,
    refreshData, bulkPromoteStudents, currentTerm,
    availableAcademicYears, selectedGlobalAcademicYear, changeAcademicYear,
    updateTeacherKujdestar, updateTeacher
  } = useDatabase();
  const { t } = useLanguage();
  const { showAlert } = useAlert();

  // Handle URL routing for Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    if (!authLoading) {
      const path = window.location.pathname;
      if (!user && path !== '/login') {
        window.history.pushState({}, '', '/login');
      } else if (user && path === '/login') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [user, authLoading]);

  const handleLogin = async (data) => {
    try {
      // In Supabase, email is the primary identifier.
      const email = data.email || data.username;
      const res = await login(email, data.password);

      // Verify role matches the selected tab
      const userRole = res.profile?.role;
      const requestedRole = data.role; // 'mesues' or 'nxenes'

      let roleMatch = false;
      if (requestedRole === 'mesues') {
        // Teacher tab accepts both admin and mesues
        roleMatch = (userRole === 'admin' || userRole === 'mesues');
      } else if (requestedRole === 'nxenes') {
        // Student tab only accepts nxenes
        roleMatch = (userRole === 'nxenes');
      }

      if (!roleMatch) {
        await logout();
        throw new Error('invalid_credentials');
      }
    } catch (err) {
      // Standardize all login errors to "invalid_credentials"
      showAlert(t('invalid_credentials'), 'error');
      console.error("Login error:", err);
    }
  };

  const handleLogout = async () => {
    try {
      if (user) {
        await AsyncStorage.removeItem(`nav_state_${user.id}`);
      }
      await logout();
    } catch (err) {
      console.error(err);
    }
  };


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
          availableAcademicYears={availableAcademicYears}
          selectedGlobalAcademicYear={selectedGlobalAcademicYear}
          onChangeAcademicYear={changeAcademicYear}
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
          onPromoteStudentToClass={promoteStudentToClass}
          notices={notices}
          onAddNotice={addNotice}
          onDeleteNotice={deleteNotice}
          schoolAdmins={schoolAdmins}
          onRefresh={refreshData}
          onUploadFile={uploadFile}
          onDeleteAllData={deleteAllData}
          onUpdateSchoolStatus={updateSchoolStatus}
          onUpdateCurrentTerm={updateCurrentTerm}
          onUpdateTermStartDate={updateTermStartDate}
          onBulkPromoteStudents={bulkPromoteStudents}
          schoolCalendar={schoolCalendar}
          onUpdateSchoolDates={updateSchoolDates}
          onAddCalendarEvent={addCalendarEvent}
          onAddCalendarEvents={addCalendarEvents}
          onDeleteCalendarEvent={deleteCalendarEvent}
          onUpdateTeacherKujdestar={updateTeacherKujdestar}
          onUpdateTeacher={updateTeacher}
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
          availableAcademicYears={availableAcademicYears}
          selectedGlobalAcademicYear={selectedGlobalAcademicYear}
          onChangeAcademicYear={changeAcademicYear}
          classes={classes}
          students={students}
          grades={grades}
          lessons={lessons}
          attendance={attendance}
          homework={homework}
          notes={notes}
          notices={notices}
          tests={tests}
          onAddGrade={addGrade}
          onUpdateGrade={updateGrade}
          onAddLesson={addLesson}
          onUpdateLesson={updateLesson}
          onDeleteLesson={deleteLesson}
          onUpdateAttendanceHour={updateAttendanceHour}
          onToggleAttendance={toggleAttendance}
          onJustifyAttendance={justifyAttendance}
          onInitializeAttendance={initializeDailyAttendance}
          onAddHomework={addHomework}
          onAddNote={addNote}
          onAddTest={addTest}
          onDeleteTest={deleteTest}
          onRefresh={refreshData}
          schoolCalendar={schoolCalendar}
          onMarkDayAsRest={markDayAsRest}
          onUndoRestDay={undoRestDay}
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
          availableAcademicYears={availableAcademicYears}
          selectedGlobalAcademicYear={selectedGlobalAcademicYear}
          onChangeAcademicYear={changeAcademicYear}
          grades={grades}
          classes={classes}
          schools={schools}
          lessons={lessons}
          attendance={attendance}
          homework={homework}
          notes={notes}
          notices={notices}
          tests={tests}
          noticeReads={noticeReads}
          onMarkNoticeRead={markNoticeRead}
          onRefresh={refreshData}
          currentTerm={currentTerm}
          schoolCalendar={schoolCalendar}
          onInitializeAttendance={initializeDailyAttendance}
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
      <AlertProvider>
        <AuthProvider>
          <DatabaseProvider>
            <AppWrapper />
          </DatabaseProvider>
        </AuthProvider>
      </AlertProvider>
    </LanguageProvider>
  );
}

function AppWrapper() {
  return (
    <>
      <AppContent />
      <StylishAlert />
    </>
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
