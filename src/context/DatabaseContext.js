import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { formatDate } from '../utils/dateUtils';

const DatabaseContext = createContext({});

export const DatabaseProvider = ({ children }) => {
  const { user } = useAuth();

  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schoolAdmins, setSchoolAdmins] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [homework, setHomework] = useState([]);
  const [notes, setNotes] = useState([]);
  const [notices, setNotices] = useState([]);
  const [noticeReads, setNoticeReads] = useState([]);
  const [schoolCalendar, setSchoolCalendar] = useState([]);
  const [tests, setTests] = useState([]);
  const [migrationRun, setMigrationRun] = useState(false);

  const [loading, setLoading] = useState(true);
  const [currentTerm, setCurrentTerm] = useState(1);
  const [selectedGlobalAcademicYear, setSelectedGlobalAcademicYear] = useState(null);
  const [availableAcademicYears, setAvailableAcademicYears] = useState([]);

  const changeAcademicYear = (year) => {
    if (year !== selectedGlobalAcademicYear) {
      setSelectedGlobalAcademicYear(year);
    }
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      if (!user) return;

      // Identify available past academic years, filtered per role so each user only sees their own history
      let yearsQuery = supabase.from('grades').select('academic_year').not('academic_year', 'is', null).limit(1000);
      if (user.role === 'nxenes') {
        yearsQuery = yearsQuery.eq('student_id', user.id);
      }
      const { data: yearsData } = await yearsQuery;

      // Also check student_classes for years to ensure history visibility even without grades
      let classYearsQuery = supabase.from('student_classes').select('academic_year').not('academic_year', 'is', null).limit(1000);
      if (user.role === 'nxenes') {
        classYearsQuery = classYearsQuery.eq('student_id', user.id);
      }
      const { data: classYearsData } = await classYearsQuery;

      const combinedYears = [
        ...(yearsData || []).map(d => d.academic_year),
        ...(classYearsData || []).map(d => d.academic_year)
      ];

      if (combinedYears.length > 0) {
        setAvailableAcademicYears([...new Set(combinedYears)].sort().reverse());
      }

      const applyYearFilter = (query) =>
        selectedGlobalAcademicYear
          ? query.eq('academic_year', selectedGlobalAcademicYear)
          : query.is('academic_year', null);

      if (user.role === 'admin') {
        const isSuperAdmin = user.email === 'admin@ditari-elektronik.com';
        // Admin needs everything
        const [schoolsRes, profilesRes, classesRes, teacherClassesRes, studentClassesRes, noticesRes] = await Promise.all([
          supabase.from('schools').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('classes').select('*'),
          applyYearFilter(supabase.from('teacher_classes').select('*')),
          applyYearFilter(supabase.from('student_classes').select('*')),
          supabase.from('notices').select('*').order('created_at', { ascending: false })
        ]);

        if (!isSuperAdmin && user.school_id) {
          if (schoolsRes.data) schoolsRes.data = schoolsRes.data.filter(s => s.id === user.school_id);
          if (profilesRes.data) profilesRes.data = profilesRes.data.filter(p => p.school_id === user.school_id || p.id === user.id);
          if (classesRes.data) classesRes.data = classesRes.data.filter(c => c.school_id === user.school_id);
          if (noticesRes.data) noticesRes.data = noticesRes.data.filter(n => n.school_id === user.school_id);
        }

        if (schoolsRes.data) {
          setSchools(schoolsRes.data);
          // Set current school details for dashboard
          const mySchool = schoolsRes.data.find(s => s.id === user.school_id);
          if (mySchool) {
            setCurrentTerm(mySchool.current_term || 1);
          }
        }

        if (profilesRes.data) {
          // Map Teachers
          const mappedTeachers = profilesRes.data
            .filter(p => p.role === 'mesues')
            .map(p => ({
              ...p,
              schoolId: p.school_id,
              firstName: p.first_name,
              lastName: p.last_name,
              name: `${p.first_name} ${p.last_name}`,
              username: p.email,
              is_active: p.is_active
            }));
          setTeachers(mappedTeachers);

          // Map School Admins (for Super Admin overview)
          const mappedAdmins = profilesRes.data
            .filter(p => p.role === 'admin')
            .map(p => ({
              ...p,
              schoolId: p.school_id,
              name: `${p.first_name} ${p.last_name}`,
              username: p.email
            }));
          setSchoolAdmins(mappedAdmins);

          // Map Students
          const mappedStudents = profilesRes.data
            .filter(p => p.role === 'nxenes')
            .map(p => ({
              ...p,
              schoolId: p.school_id,
              firstName: p.first_name,
              lastName: p.last_name,
              name: `${p.first_name} ${p.last_name}`,
              username: p.email,
              classId: studentClassesRes.data?.find(sc => sc.student_id === p.id)?.class_id
            }));
          setStudents(mappedStudents);
          runAttendanceMigration(mappedStudents);
        }

        if (classesRes.data) {
          const mappedClasses = classesRes.data.map(c => ({
            ...c,
            schoolId: c.school_id,
            teacherIds: [...new Set((teacherClassesRes.data || [])
              .filter(tc => tc.class_id === c.id)
              .map(tc => tc.teacher_id))]
          }));
          setClasses(mappedClasses);
        }
        if (noticesRes.data) setNotices(noticesRes.data);

      } else if (user.role === 'mesues') {
        // Teacher data: Fetch classes the teacher belongs to (historical or current)
        const { data: tcData } = await applyYearFilter(supabase.from('teacher_classes').select('*, classes(*)').eq('teacher_id', user.id));

        let classIds = [];

        if (tcData) {
          const uniqueClassIds = [...new Set(tcData.map(tc => tc.class_id))];
          const mappedClasses = uniqueClassIds.map(cid => {
            const tcItems = tcData.filter(item => item.class_id === cid);
            return {
              ...tcItems[0].classes,
              teacherIds: [tcItems[0].teacher_id],
              subjects: tcItems.map(tc => tc.subject)
            };
          });
          setClasses(mappedClasses);

          // Get teacher's subjects for the dashboard
          const uniqueSubjects = [...new Set(tcData.map(tc => tc.subject))];
          user.teachingSubjects = uniqueSubjects; // Use teachingSubjects instead of overwriting subjects

          classIds = mappedClasses.map(c => c.id);
          if (classIds.length > 0) {
            const { data: scData } = await applyYearFilter(supabase.from('student_classes').select('student_id, class_id').in('class_id', classIds));
            if (scData) {
              const studentIds = scData.map(sc => sc.student_id);
              // Also get ALL teachers for these classes
              const { data: allTcData } = await applyYearFilter(supabase.from('teacher_classes').select('teacher_id, class_id').in('class_id', classIds));
              const profIds = [...new Set([...studentIds, ...(allTcData || []).map(tc => tc.teacher_id)])];

              if (allTcData) {
                setClasses(prev => prev.map(c => ({
                  ...c,
                  teacherIds: [...new Set(allTcData.filter(tc => tc.class_id === c.id).map(tc => tc.teacher_id))]
                })));
              }

              const { data: profilesData } = await supabase.from('profiles').select('*').in('id', profIds);
              if (profilesData) {
                setStudents(profilesData.filter(p => studentIds.includes(p.id)).map(s => ({
                  ...s,
                  name: `${s.first_name} ${s.last_name}`,
                  classId: scData.find(sc => sc.student_id === s.id)?.class_id
                })));

                // Store teacher profiles globally to show co-teacher names
                user.teacherProfiles = profilesData.filter(p => p.role === 'mesues');
              }
            }
          }
        }

        const [testsRes, gradesRes, lessonsRes, attendanceRes, homeworkRes, notesRes, noticesRes] = await Promise.all([
          classIds.length > 0 ? applyYearFilter(supabase.from('tests').select('*').in('class_id', classIds)) : { data: [] },
          classIds.length > 0 ? applyYearFilter(supabase.from('grades').select('*').in('class_id', classIds)) : { data: [] },
          classIds.length > 0 ? applyYearFilter(supabase.from('lessons').select('*').in('class_id', classIds)) : { data: [] },
          classIds.length > 0 ? applyYearFilter(supabase.from('attendance').select('*').in('class_id', classIds)) : { data: [] },
          classIds.length > 0 ? applyYearFilter(supabase.from('homework').select('*').in('class_id', classIds)) : { data: [] },
          classIds.length > 0 ? applyYearFilter(supabase.from('notes').select('*').in('class_id', classIds)) : { data: [] },
          supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false })
        ]);

        if (testsRes.data) setTests(testsRes.data);
        if (gradesRes.data) setGrades(gradesRes.data);
        if (lessonsRes.data) setLessons(lessonsRes.data);
        if (attendanceRes.data) setAttendance(attendanceRes.data);
        if (homeworkRes.data) setHomework(homeworkRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (noticesRes.data) setNotices(noticesRes.data);

      } else if (user.role === 'nxenes') {
        // Student data: find which class they belong to
        // Now using academic_year in student_classes for clean lookup
        const { data: scData } = await applyYearFilter(supabase.from('student_classes').select('*, classes(*)').eq('student_id', user.id)).maybeSingle();

        let studentClassId = null;
        let studentClasses = [];

        if (scData) {
          studentClassId = scData.class_id;
          studentClasses = [{ ...scData.classes, schoolId: scData.classes.school_id }];
        }

        user.classId = studentClassId;
        setClasses(studentClasses);

        const classIds = studentClassId ? [studentClassId] : [];

        const [gradesRes, lessonsRes, attendanceRes, homeworkRes, notesRes, noticesRes, noticeReadsRes, testsRes] = await Promise.all([
          applyYearFilter(supabase.from('grades').select('*, profiles!teacher_id(first_name, last_name)').eq('student_id', user.id)),
          classIds.length > 0 ? applyYearFilter(supabase.from('lessons').select('*, profiles(first_name, last_name)').in('class_id', classIds)) : { data: [] },
          applyYearFilter(supabase.from('attendance').select('*').eq('student_id', user.id)),
          classIds.length > 0 ? applyYearFilter(supabase.from('homework').select('*, profiles(first_name, last_name)').in('class_id', classIds)) : { data: [] },
          applyYearFilter(supabase.from('notes').select('*, profiles!teacher_id(first_name, last_name)').or(`student_id.eq.${user.id}${classIds.length > 0 ? `,class_id.in.(${classIds.join(',')})` : ''}`)),
          supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false }),
          supabase.from('notice_reads').select('notice_id').eq('student_id', user.id),
          classIds.length > 0 ? applyYearFilter(supabase.from('tests').select('*, profiles(first_name, last_name)').in('class_id', classIds)) : { data: [] }
        ]);

        if (testsRes.data) setTests(testsRes.data);
        if (gradesRes.data) setGrades(gradesRes.data);
        if (lessonsRes.data) setLessons(lessonsRes.data);
        if (attendanceRes.data) setAttendance(attendanceRes.data);
        if (homeworkRes.data) setHomework(homeworkRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (noticesRes.data) setNotices(noticesRes.data);
        if (noticeReadsRes.data) setNoticeReads(noticeReadsRes.data.map(r => r.notice_id));
        if (!selectedGlobalAcademicYear) runAttendanceMigration([{ ...user, id: user.id, classId: user.classId }]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshData = () => fetchData(false);

  // Fetch initial data based on role (and re-fetch when academic year changes)
  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setAvailableAcademicYears([]);
      setSelectedGlobalAcademicYear(null);
    }
  }, [user, selectedGlobalAcademicYear]);

  // Migration logic consolidated within a separate function called after data fetch
  const runAttendanceMigration = async (currentStudents) => {
    if (migrationRun || !user) return;
    try {
      setMigrationRun(true);
    } catch (err) {
      console.error("Migration failed:", err);
    }
  };

  // Management Actions
  const generateRandomPassword = (length = 10) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const addSchool = async (school) => {
    // Auto-generate School Admin Credentials
    const adminEmail = `admin@${school.code.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
    const adminPassword = generateRandomPassword(10);

    // map city to address
    const newSchool = {
      name: school.name,
      address: school.city,
      code: school.code,
      has_paralele: school.has_paralele || false,
      admin_email: adminEmail,
      admin_password: adminPassword
    };

    const { data, error } = await supabase.from('schools').insert([newSchool]).select().single();
    if (!error && data) {
      setSchools([...schools, data]);

      const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            full_name: 'School Admin',
            role: 'admin'
          }
        }
      });

      if (!authError && authData.user) {
        const newAdminProfile = {
          id: authData.user.id,
          email: adminEmail,
          first_name: 'Admin',
          last_name: data.name,
          role: 'admin',
          school_id: data.id,
          is_active: true
        };
        await supabase.from('profiles').insert([newAdminProfile]);

        const mappedAdmin = {
          ...newAdminProfile,
          schoolId: data.id,
          name: `Admin ${data.name}`,
          username: adminEmail
        };
        setSchoolAdmins(prev => [...prev, mappedAdmin]);
      }

      return { data, error, credentials: { email: adminEmail, password: adminPassword } };
    }
    if (error) console.error("Error adding school:", error);
    return { data, error };
  };

  const addClass = async (cls) => {
    const { data, error } = await supabase.from('classes').insert([{ name: cls.name, grade_level: 'Panjohur', school_id: cls.schoolId }]).select().single();
    if (!error && data) {
      const mappedClass = {
        ...data,
        schoolId: data.school_id,
        teacherIds: cls.teacherIds || []
      };
      setClasses([...classes, mappedClass]);
      // Also insert teacher_classes if teacherIds provided
      if (cls.teacherIds && cls.teacherIds.length > 0) {
        // Fetch latest teacher data to avoid state sync issues
        const { data: latestTeachers } = await supabase.from('profiles').select('id, subjects').in('id', cls.teacherIds);

        const newLinks = [];
        cls.teacherIds.forEach(tid => {
          const teacher = latestTeachers?.find(t => t.id === tid);
          const subjects = (teacher?.subjects && teacher.subjects.length > 0) ? teacher.subjects : ['Mësues'];
          subjects.forEach(subject => {
            newLinks.push({ teacher_id: tid, class_id: data.id, subject: subject });
          });
        });
        await supabase.from('teacher_classes').insert(newLinks);
      }
    }
    if (error) console.error("Error adding class:", error);
    return { data, error };
  };

  const addTeacher = async (teacher) => {
    const validEmail = (teacher.email || teacher.username || '').trim().toLowerCase();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: validEmail,
      password: teacher.password,
      options: {
        data: {
          full_name: `${teacher.firstName} ${teacher.lastName}`,
          role: 'mesues'
        }
      }
    });
    if (authError) {
      console.error("Auth error adding teacher", authError);
      if (authError.message.includes("already registered")) {
        console.log("Ky email (" + validEmail + ") është regjistruar tashmë në Supabase Auth.");
      } else {
        console.log("Gabim gjatë krijimit të mësuesit: " + authError.message);
      }
      return { error: authError };
    }
    // 2. Create profile
    const newTeacher = {
      id: authData.user.id,
      email: validEmail,
      first_name: teacher.firstName,
      last_name: teacher.lastName,
      role: 'mesues',
      school_id: teacher.schoolId,
      subjects: teacher.subjects,
      is_active: true
    };
    const { data, error } = await supabase.from('profiles').insert([newTeacher]).select().single();
    if (!error && data) {
      const mappedTeacher = {
        ...data,
        schoolId: data.school_id,
        firstName: data.first_name,
        lastName: data.last_name,
        name: `${data.first_name} ${data.last_name}`,
        username: validEmail,
        is_active: data.is_active
      };
      setTeachers([...teachers, mappedTeacher]);
      // console.log("Mësuesi u krijua me sukses!");
    }
    if (error) {
      console.error("Profile error adding teacher", error);
      // console.log("Gabim gjatë krijimit të profilit: " + error.message);
    }
    return { data, error };
  };

  const addStudent = async (student) => {
    const validEmail = (student.email || student.username || '').trim().toLowerCase();

    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: validEmail,
      password: student.password,
      options: {
        data: {
          full_name: student.name,
          role: 'nxenes'
        }
      }
    });
    if (authError) {
      console.error("Auth error adding student", authError);
      if (authError.message.includes("already registered")) {
        console.log("Ky email (" + validEmail + ") është regjistruar tashmë.");
      } else {
        console.log("Gabim gjatë krijimit të nxënësit: " + authError.message);
      }
      return { error: authError };
    }

    // Create profile
    const nameParts = (student.name || '').split(' ');
    const firstName = nameParts[0] || 'Nxënës';
    const lastNames = nameParts.slice(1).join(' ');

    const newStudent = {
      id: authData.user.id,
      email: validEmail,
      first_name: firstName,
      last_name: lastNames,
      role: 'nxenes',
      school_id: student.schoolId
    };
    const { data, error } = await supabase.from('profiles').insert([newStudent]).select().single();

    // Assign to class
    if (!error && data) {
      await supabase.from('student_classes').insert([{ student_id: data.id, class_id: student.classId, academic_year: selectedGlobalAcademicYear }]);
      const mappedStudent = {
        ...data,
        schoolId: data.school_id,
        firstName: data.first_name,
        lastName: data.last_name,
        name: `${data.first_name} ${data.last_name}`,
        username: validEmail,
        classId: student.classId
      };
      setStudents([...students, mappedStudent]);
      // console.log("Nxënësi u krijua me sukses!");
    }
    if (error) {
      console.error("Profile error adding student", error);
      // console.log("Gabim gjatë krijimit të profilit të nxënësit: " + error.message);
    }
    return { data, error };
  };
  const resolveTermForDate = (dateStr) => {
    const school = schools.find(s => s.id === user?.school_id || s.id === user?.schoolId);
    if (school?.term_two_start_date && dateStr) {
      const boundaryDateStr = school.term_two_start_date.split('T')[0].split(' ')[0];
      const selected = new Date(dateStr);
      selected.setHours(0, 0, 0, 0);
      const boundary = new Date(boundaryDateStr);
      boundary.setHours(0, 0, 0, 0);
      return selected >= boundary ? 2 : 1;
    }
    return currentTerm || 1;
  };

  const addGrade = async (grade) => {
    const { data, error } = await supabase.from('grades').insert([{
      student_id: grade.studentId,
      teacher_id: user.id,
      class_id: grade.classId || classes.find(c => students.find(s => s.id === grade.studentId)?.classId === c.id)?.id,
      subject: grade.subject,
      grade: grade.value,
      date: grade.date,
      description: grade.comment,
      grade_type: grade.type || 'Me Shkrim',
      term: resolveTermForDate(grade.date),
      academic_year: selectedGlobalAcademicYear,
      modification_count: 0
    }]).select().single();

    if (!error && data) setGrades([...grades, data]);
    if (error) {
      console.error("Error adding grade:", error);
    }
    return { data, error };
  };

  const updateGrade = async (gradeId, newValue, newComment, newType, newDate) => {
    // 1. Get current grade to check modification_count
    const currentGrade = (grades || []).find(g => g.id === gradeId);
    if (!currentGrade) return { error: { message: "Grade not found" } };

    // Safety check: teachers can only edit once
    if (user.role === 'mesues' && (currentGrade.modification_count || 0) >= 1) {
      return { error: { message: t('edit_grade_limit_reached') || "Nuk është më e mundur të ndryshohet nota, e keni ndryshuar tashmë një herë." } };
    }

    const { data, error } = await supabase.from('grades')
      .update({
        grade: newValue,
        description: newComment,
        grade_type: newType,
        date: newDate || currentGrade.date,
        term: resolveTermForDate(newDate || currentGrade.date),
        modification_count: (currentGrade.modification_count || 0) + 1
      })
      .eq('id', gradeId)
      .select()
      .single();

    if (!error && data) {
      setGrades(prev => prev.map(g => g.id === gradeId ? data : g));
    }
    return { data, error };
  };

  const addLesson = async (lesson) => {
    const { data, error } = await supabase.from('lessons').insert([{
      teacher_id: user.id,
      class_id: lesson.classId,
      subject: lesson.subject,
      topic: lesson.topic,
      date: lesson.date,
      term: resolveTermForDate(lesson.date),
      academic_year: selectedGlobalAcademicYear
    }]).select().single();

    if (!error && data) {
      setLessons([...lessons, data]);
      if (lesson.homework) {
        await addHomework({
          classId: lesson.classId,
          subject: lesson.subject,
          description: lesson.homework,
          dueDate: lesson.date,
          teacherId: user.id
        });
      }
    }
    if (error) console.error("Error adding lesson:", error);
    return { data, error };
  };

  const updateLesson = async (lessonId, lessonData, oldHour) => {
    try {
      const { data, error } = await supabase.from('lessons')
        .update({
          subject: lessonData.subject,
          topic: lessonData.topic,
          date: lessonData.date,
          term: resolveTermForDate(lessonData.date)
        })
        .eq('id', lessonId)
        .select()
        .single();

      if (error) throw error;

      // ATTENDANCE MIGRATION: If hour changed, move records
      const match = lessonData.topic.match(/\[Ora (\d+)\]/);
      const newHour = match ? parseInt(match[1]) : null;

      if (newHour && oldHour && newHour !== oldHour) {
        console.log(`[updateLesson] Migrating attendance: Hour ${oldHour} -> ${newHour}`);
        await supabase.from('attendance')
          .update({ hour: newHour })
          .match({
            class_id: lessonData.classId,
            date: lessonData.date,
            hour: oldHour
          });
      }

      setLessons(prev => prev.map(l => l.id === lessonId ? data : l));
      await fetchData(false); // Force reload to ensure everything is synced
      return { data };
    } catch (error) {
      console.error("Error updating lesson:", error);
      return { error };
    }
  };

  const deleteLesson = async (lessonId, date, classId, hour) => {
    try {
      const numericHour = parseInt(hour);
      console.log(`[deleteLesson] START DB: Deleting hour ${numericHour} for class ${classId} on ${date}`);

      // 1. Delete associated attendance entries from DB first
      const { error: attError } = await supabase.from('attendance').delete().match({
        class_id: classId,
        date: date,
        hour: numericHour
      });
      if (attError) console.warn("[deleteLesson] Attendance cleanup error:", attError);

      // 2. Delete the lesson record itself from DB
      const { error: lessonError } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (lessonError) throw lessonError;

      // 3. Immediately clear local states to reflect deletion without waiting for re-fetch
      setLessons(prev => prev.filter(l => l.id !== lessonId));
      setAttendance(prev => prev.filter(a =>
        !((a.class_id === classId || a.classId === classId) && a.date === date && parseInt(a.hour) === numericHour)
      ));

      // 4. Force synchronization of Daily Status (Hour 0) for all students in the class
      // This will set them to 'absent' if no other hours are recorded
      const updatedAttendance = attendance.filter(a =>
        !((a.class_id === classId || a.classId === classId) && a.date === date && parseInt(a.hour) === numericHour)
      );

      const classStudents = students.filter(s => s.classId === classId || s.class_id === classId);
      const syncPromises = classStudents.map(student => syncDailyStatus(student.id, date, updatedAttendance));
      await Promise.allSettled(syncPromises);

      // 5. Final full data re-fetch to ensure local state is 100% accurate with DB
      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error("Error in DB deleteLesson operation:", error);
      return { error };
    }
  };
  const addNote = async (noteData) => {
    const dbNote = {
      student_id: noteData.studentId || null,
      class_id: noteData.classId || null,
      content: noteData.content,
      is_class_note: noteData.isClassNote || false,
      date: noteData.date,
      term: resolveTermForDate(noteData.date),
      academic_year: selectedGlobalAcademicYear,
      teacher_id: user.id
    };
    const { data, error } = await supabase.from('notes').insert([dbNote]).select();
    if (error) console.error('Error adding note:', error);
    if (data) setNotes(prev => [data[0], ...prev]);
    return { data: data?.[0], error };
  };

  const addHomework = async (hw) => {
    const { data, error } = await supabase.from('homework').insert([{
      teacher_id: user.id,
      class_id: hw.classId,
      subject: hw.subject,
      description: hw.description,
      due_date: hw.dueDate,
      term: resolveTermForDate(hw.dueDate),
      academic_year: selectedGlobalAcademicYear
    }]).select().single();

    if (!error && data) setHomework([...homework, data]);
    return { data, error };
  };

  const updateClassTeachers = async (classId, teacherIds) => {
    try {
      // 1. Delete existing links
      const { error: delError } = await supabase.from('teacher_classes').delete().eq('class_id', classId);
      if (delError) throw delError;

      // 2. Insert new links
      // Each teacher should be linked with ALL their subjects
      // Fetch latest teacher data to avoid state sync issues
      const { data: latestTeachers } = await supabase.from('profiles').select('id, subjects').in('id', teacherIds);

      const newLinks = [];
      teacherIds.forEach(tId => {
        const teacher = latestTeachers?.find(t => t.id === tId);
        const subjects = (teacher?.subjects && teacher.subjects.length > 0) ? teacher.subjects : ['Mësues'];
        subjects.forEach(subject => {
          newLinks.push({ class_id: classId, teacher_id: tId, subject: subject });
        });
      });

      const { error: insError } = await supabase.from('teacher_classes').insert(newLinks);
      if (insError) throw insError;

      setClasses(prev => prev.map(c => c.id === classId ? { ...c, teacherIds: teacherIds } : c));
      return { success: true };
    } catch (error) {
      console.error("Error updating class teachers:", error);
      return { error };
    }
  };

  const syncDailyStatus = async (studentId, date, updatedAttendance) => {
    // 1. Get all records for this student/date for hours 1-7
    const dayRecords = updatedAttendance.filter(a =>
      (a.student_id === studentId || a.studentId === studentId) &&
      a.date === date &&
      a.hour > 0 && a.hour <= 7
    );

    // 2. Map statuses for all 7 hours (default to 'absent' for today, 'none' for history)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const defaultStatus = (date === todayStr) ? 'absent' : 'none';

    const statuses = {};
    for (let i = 1; i <= 7; i++) {
      const rec = dayRecords.find(r => r.hour === i);
      if (rec) {
        statuses[i] = rec.status.split(':')[0]; // 'present', 'absent', etc.
      } else {
        statuses[i] = 'none'; // Unrecorded
      }
    }

    // 3. Determine new daily status
    let newDailyStatus = defaultStatus;

    const presentHours = Object.keys(statuses).filter(h => statuses[h] === 'present').map(Number);
    const absentHours = Object.keys(statuses).filter(h => statuses[h] === 'absent' || statuses[h].startsWith('absent')).map(Number);

    if (presentHours.length > 0) {
      const firstPresent = Math.min(...presentHours);
      const lastPresent = Math.max(...presentHours);

      // 1. Late: Only if there's an EXPLICIT 'absent' mark BEFORE the first 'present'
      const isLate = absentHours.some(h => h < firstPresent);

      // 2. Early Exit: Only if there's an EXPLICIT 'absent' mark AFTER the first 'present'
      const isEarlyExit = absentHours.some(h => h > firstPresent);

      if (isLate) {
        newDailyStatus = 'late';
      } else if (isEarlyExit) {
        newDailyStatus = 'early_exit';
      } else {
        newDailyStatus = 'present';
      }
    } else if (absentHours.length > 0) {
      newDailyStatus = 'absent';
    } else {
      // No records at all for hours 1-7, keep defaultStatus (which is 'absent' for today)
      newDailyStatus = defaultStatus;
    }

    // 4. Update Database for hour 0
    const student = students.find(s => s.id === studentId);
    const { data: syncData, error: syncError } = await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: student?.classId || student?.class_id,
      date: date,
      hour: 0,
      term: resolveTermForDate(date),
      status: newDailyStatus
    }, { onConflict: 'student_id, class_id, date, hour' }).select().single();

    if (!syncError && syncData) {
      setAttendance(prev => {
        const filtered = prev.filter(a =>
          !((a.student_id === studentId || a.studentId === studentId) && a.date === date && a.hour === 0)
        );
        return [...filtered, syncData];
      });
    }
  };

  const toggleAttendance = async (studentId, date, status, hour, time = '') => {
    // Permission Check: Only the teacher of that specific hour's lesson can edit attendance
    // EXCEPTION: Hour 0 (Daily Summary) can be edited without a registered lesson
    if (user.role === 'mesues' && hour !== 0) {
      const student = students.find(s => s.id === studentId);
      const studentClassId = student?.classId || student?.class_id;

      const lesson = lessons.find(l =>
        (l.class_id === studentClassId) &&
        l.date === date &&
        l.topic?.includes(`[Ora ${hour}]`)
      );

      if (!lesson) {
        return { error: { message: `Nuk ka asnjë orë të regjistruar për orën ${hour}. Ju lutem regjistroni orën në axhendë më parë.` } };
      }

      if (lesson.teacher_id !== user.id) {
        return { error: { message: "Nuk keni leje të ndryshoni prezencën për këtë orë, pasi nuk jeni profesori i kësaj lënde." } };
      }
    }

    const finalStatus = time ? `${status}:${time}` : status;
    // Upsert attendance including hour in conflict resolution
    const student = students.find(s => s.id === studentId);
    const { data, error } = await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: student?.classId || student?.class_id,
      date: date,
      hour: hour,
      term: resolveTermForDate(date),
      status: finalStatus,
      academic_year: selectedGlobalAcademicYear
    }, { onConflict: 'student_id, class_id, date, hour' }).select().single();

    if (!error && data) {
      const currentFiltered = attendance.filter(a =>
        !((a.student_id === studentId || a.studentId === studentId) && a.date === date && a.hour === hour)
      );
      const updatedList = [...currentFiltered, data];
      setAttendance(updatedList);

      // Trigger automatic Daily Summary (hour 0) sync if updating an hourly lesson
      if (hour !== 0) {
        await syncDailyStatus(studentId, date, updatedList);
      }
    }
    return { data, error };
  };

  const justifyAttendance = async (studentId, date, reason) => {
    // Find all unjustified non-present records for this student on this date
    const recordsToUpdate = attendance.filter(a =>
      (a.student_id === studentId || a.studentId === studentId) &&
      a.date === date &&
      !a.status.includes('present') &&
      !a.status.includes('justified')
    );

    if (recordsToUpdate.length === 0) return { error: { message: "Nessuna assenza trovata per questa data." } };

    const updates = recordsToUpdate.map(record => {
      const currentStatus = record.status || 'absent';
      const typePart = currentStatus.split(':')[0];
      const timePart = (currentStatus.includes(':') && !['justified', 'unjustified'].includes(currentStatus.split(':')[1]))
        ? currentStatus.split(':')[1]
        : '';

      let newStatus = `${typePart}:justified:${reason}`;
      if (timePart) newStatus = `${typePart}:${timePart}:justified:${reason}`;

      return { id: record.id, status: newStatus };
    });

    const updatePromises = updates.map(u =>
      supabase.from('attendance').update({ status: u.status }).eq('id', u.id).select().single()
    );

    const results = await Promise.allSettled(updatePromises);
    const hasError = results.some(r => r.status === 'rejected' || (r.value && r.value.error));

    if (hasError) {
      console.error("Some records failed to update in backend:", results);
      return { error: { message: "Errore durante la giustificazione." } };
    }

    // Update local state
    setAttendance(prev => prev.map(a => {
      const updateObj = updates.find(u => u.id === a.id);
      if (updateObj) return { ...a, status: updateObj.status };
      return a;
    }));

    return { success: true };
  };

  const assignStudentToClass = async (studentId, classId) => {
    try {
      const { data, error } = await supabase.from('student_classes').insert({
        student_id: studentId,
        class_id: classId
      }).select().single();

      if (error) throw error;

      if (data) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, classId: classId } : s));
      }
      return { success: true };
    } catch (error) {
      console.error("Error assigning student to class:", error);
      return { error };
    }
  };

  const promoteStudentToClass = async (studentId, classId) => {
    try {
      const { data, error } = await supabase.from('student_classes').upsert({
        student_id: studentId,
        class_id: classId
      }, { onConflict: 'student_id' }).select().single();

      if (error) throw error;
      if (data) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, classId: classId } : s));
      }
      return { success: true };
    } catch (error) {
      console.error("Error promoting student:", error);
      return { error };
    }
  };

  const bulkPromoteStudents = async (schoolId, studentIds, targetClassId) => {
    try {
      const upserts = studentIds.map(sid => ({ student_id: sid, class_id: targetClassId }));
      const { error } = await supabase.from('student_classes').upsert(upserts, { onConflict: 'student_id' });
      if (error) throw error;

      setStudents(prev => prev.map(s => studentIds.includes(s.id) ? { ...s, classId: targetClassId } : s));
      return { success: true };
    } catch (error) {
      console.error("Error bulk promoting students:", error);
      return { error };
    }
  };

  const activateProfile = async (profileId) => {
    const { data, error } = await supabase.from('profiles').update({ is_active: true }).eq('id', profileId).select().single();
    if (!error && data) {
      setTeachers(prev => prev.map(t => t.id === profileId ? { ...t, is_active: true } : t));
    }
    return { data, error };
  };

  const deleteSchool = async (schoolId) => {
    try {
      // 1. Delete all classes logic (this will handle students if we call deleteClass or rely on cascade)
      // For safety, let's be explicit if cascade is not set.
      const schoolClasses = classes.filter(c => c.schoolId === schoolId);
      for (const cls of schoolClasses) {
        await deleteClass(cls.id);
      }

      // 2. Delete all profiles (teachers and students) belonging to this school
      const schoolProfiles = [...teachers, ...students].filter(p => p.schoolId === schoolId);
      for (const profile of schoolProfiles) {
        // Delete from Supabase Auth
        await supabaseAdmin.auth.admin.deleteUser(profile.id);
        // Delete from profiles table
        await supabase.from('profiles').delete().eq('id', profile.id);
      }

      // 3. Delete the school
      const { error } = await supabase.from('schools').delete().eq('id', schoolId);
      if (error) throw error;

      setSchools(prev => prev.filter(s => s.id !== schoolId));
      setTeachers(prev => prev.filter(t => t.schoolId !== schoolId));
      setStudents(prev => prev.filter(s => s.schoolId !== schoolId));
      setClasses(prev => prev.filter(c => c.schoolId !== schoolId));
      setSchoolAdmins(prev => prev.filter(a => a.schoolId !== schoolId));

      return { success: true };
    } catch (error) {
      console.error("Error deleting school:", error);
      return { error };
    }
  };

  const deleteClass = async (classId) => {
    try {
      // 1. Delete all students in this class
      const classStudents = students.filter(s => s.classId === classId);
      for (const student of classStudents) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(student.id);
        } catch (e) {
          console.warn('Could not delete auth user:', e);
        }
        await supabase.from('profiles').delete().eq('id', student.id);
      }

      // 2. Delete the class (teacher associations should cascade if set, otherwise delete manually)
      await supabase.from('teacher_classes').delete().eq('class_id', classId);
      await supabase.from('student_classes').delete().eq('class_id', classId);

      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;

      setClasses(prev => prev.filter(c => c.id !== classId));
      setStudents(prev => prev.filter(s => s.classId !== classId));

      return { success: true };
    } catch (error) {
      console.error("Error deleting class:", error);
      return { error };
    }
  };

  const deleteTeacher = async (teacherId) => {
    try {
      try {
        await supabaseAdmin.auth.admin.deleteUser(teacherId);
      } catch (e) {
        console.warn('Could not delete auth user:', e);
      }
      await supabase.from('teacher_classes').delete().eq('teacher_id', teacherId);
      await supabase.from('profiles').delete().eq('id', teacherId);

      setTeachers(prev => prev.filter(t => t.id !== teacherId));
      setClasses(prev => prev.map(c =>
        c.teacherIds?.includes(teacherId)
          ? { ...c, teacherIds: c.teacherIds.filter(id => id !== teacherId) }
          : c
      ));
      return { success: true };
    } catch (error) {
      console.error("Error deleting teacher:", error);
      return { error };
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      try {
        await supabaseAdmin.auth.admin.deleteUser(studentId);
      } catch (e) {
        console.warn('Could not delete auth user:', e);
      }
      await supabase.from('student_classes').delete().eq('student_id', studentId);
      await supabase.from('profiles').delete().eq('id', studentId);

      setStudents(prev => prev.filter(s => s.id !== studentId));
      return { success: true };
    } catch (error) {
      console.error("Error deleting student:", error);
      return { error };
    }
  };

  const removeTeacherFromClass = async (teacherId, classId) => {
    const { error } = await supabase.from('teacher_classes').delete().match({ teacher_id: teacherId, class_id: classId });
    if (!error) {
      setClasses(prev => prev.map(c =>
        c.id === classId
          ? { ...c, teacherIds: (c.teacherIds || []).filter(tid => tid !== teacherId) }
          : c
      ));
    }
    return { error };
  };

  const removeStudentFromClass = async (studentId, classId) => {
    const { error } = await supabase.from('student_classes').delete().match({ student_id: studentId, class_id: classId });
    if (!error) {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, classId: null } : s));
    }
    return { error };
  };

  const getNextYearName = (yearStr) => {
    if (!yearStr) return "";
    const separator = yearStr.includes('/') ? '/' : (yearStr.includes('-') ? '-' : null);
    if (separator) {
      const parts = yearStr.split(separator);
      if (parts.length === 2) {
        const y1 = parseInt(parts[0]);
        const y2 = parseInt(parts[1]);
        if (!isNaN(y1) && !isNaN(y2)) return `${y1 + 1}${separator}${y2 + 1}`;
      }
    }
    const match = yearStr.match(/\d+/g);
    if (match && match.length > 0) {
      let replaced = yearStr;
      match.forEach(m => {
        const next = parseInt(m) + 1;
        replaced = replaced.replace(m, next.toString());
      });
      return replaced;
    }
    return yearStr;
  };

  const archiveCurrentYear = async (schoolId, yearName) => {
    try {
      console.log(`[archiveCurrentYear] schoolId=${schoolId}, closingYear=${yearName}`);
      const schoolClassIds = classes.filter(c => c.school_id === schoolId).map(c => c.id);

      if (schoolClassIds.length > 0) {
        // 1. Move distinct records to the archive by tagging them with the school year
        await Promise.all([
          supabase.from('grades').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('attendance').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('lessons').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('homework').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('notes').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
        ]);

        // 2. Snapshot memberships: Copy CURRENT associations to the archive
        // We COPY them instead of MOVING them so the teacher still has their classes in the NEW year,
        // but the historical view still knows who was in which class.
        const [{ data: tcData }, { data: scData }] = await Promise.all([
          supabase.from('teacher_classes').select('*').in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('student_classes').select('*').in('class_id', schoolClassIds).is('academic_year', null)
        ]);

        const archivePromises = [];
        if (tcData?.length > 0) {
          const tcArchive = tcData.map(({ id, created_at, ...rest }) => ({ ...rest, academic_year: yearName }));
          archivePromises.push(supabase.from('teacher_classes').insert(tcArchive));
        }
        if (scData?.length > 0) {
          const scArchive = scData.map(({ id, created_at, ...rest }) => ({ ...rest, academic_year: yearName }));
          archivePromises.push(supabase.from('student_classes').insert(scArchive));
        }

        if (archivePromises.length > 0) {
          await Promise.all(archivePromises);
        }
      }

      // Update local state by filtering out archived items
      setGrades(prev => prev.filter(g => !schoolClassIds.includes(g.class_id)));
      setAttendance(prev => prev.filter(a => !schoolClassIds.includes(a.class_id)));
      setLessons(prev => prev.filter(l => !schoolClassIds.includes(l.class_id)));
      setHomework(prev => prev.filter(h => !schoolClassIds.includes(h.class_id)));
      setNotes(prev => prev.filter(n => !schoolClassIds.includes(n.class_id)));

      // Generate next year name AND update school
      const nextYearName = getNextYearName(yearName);
      const { error: schoolError } = await supabase.from('schools').update({
        current_year: nextYearName,
        current_term: 1,
        term_two_start_date: null
      }).eq('id', schoolId);

      if (schoolError) throw schoolError;

      await fetchData(false);
      return { success: true, nextYear: nextYearName };
    } catch (error) {
      console.error("Error archiving year:", error);
      return { error };
    }
  };

  const promoteStudents = async (schoolId, promotedStudentIds = []) => {
    try {
      console.log('[promoteStudents] Starting with IDs:', promotedStudentIds);
      const schoolClasses = classes.filter(c => c.school_id === schoolId);
      const schoolStudents = students.filter(s => s.schoolId === schoolId || s.school_id === schoolId);

      const romanToNext = {
        'I': 'II', 'II': 'III', 'III': 'IV', 'IV': 'V', 'V': 'VI',
        'VI': 'VII', 'VII': 'VIII', 'VIII': 'IX', 'IX': 'X', 'X': 'XI', 'XI': 'XII'
      };

      const progressionMap = {};
      for (const cls of schoolClasses) {
        const parts = cls.name.split(' ');
        const currentGrade = parts[0];
        const nextGrade = romanToNext[currentGrade];

        if (nextGrade) {
          const nextClassName = cls.name.replace(currentGrade, nextGrade);
          const targetClass = schoolClasses.find(c => c.name === nextClassName);
          progressionMap[cls.id] = targetClass ? targetClass.id : null;
        } else {
          progressionMap[cls.id] = null;
        }
      }

      const studentsToUnlink = [];
      const studentsToUpdate = [];
      const activeStudents = schoolStudents.filter(s => s.classId || s.class_id);

      for (const student of activeStudents) {
        const currentClassId = student.classId || student.class_id;

        if (promotedStudentIds.includes(student.id)) {
          // Student promoted: move to next class
          const targetClassId = progressionMap[currentClassId];
          if (targetClassId) {
            studentsToUpdate.push({ student_id: student.id, class_id: targetClassId });
          } else {
            studentsToUnlink.push(student.id);
          }
        } else {
          // Student NOT promoted: re-assign to original class for the new year
          studentsToUpdate.push({ student_id: student.id, class_id: currentClassId });
        }
      }

      // 3. Database Execution
      console.log(`[promoteStudents] DB Phase: Update=${studentsToUpdate.length}, Unlink=${studentsToUnlink.length}`);
      const allAffectedIds = [...studentsToUpdate.map(s => s.student_id), ...studentsToUnlink];

      if (allAffectedIds.length > 0) {
        // Clear existing associations
        const { error: delErr } = await supabase.from('student_classes').delete().in('student_id', allAffectedIds).is('academic_year', null);
        if (delErr) throw delErr;

        // Insert new ones for those moving up
        if (studentsToUpdate.length > 0) {
          const { error: insErr } = await supabase.from('student_classes').insert(studentsToUpdate);
          if (insErr) throw insErr;
        }
      }

      console.log('[promoteStudents] Success. Re-fetching data...');
      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error("CRITICAL error promoting students:", error);
      return { error };
    }
  };

  // ─── Notice Board Functions ───
  const uploadFile = async (uri, name, type) => {
    try {
      console.log('Starting upload for:', name, 'type:', type, 'uri:', uri);

      let fileToUpload;

      try {
        const response = await fetch(uri);
        fileToUpload = await response.blob();
      } catch (fetchErr) {
        console.error('Fetch error during upload:', fetchErr);
        // Fallback for some native cases if fetch fails
        if (Platform.OS !== 'web') {
          // We could try XMLHttpRequest or other methods here if needed
          throw new Error('Failed to fetch local file for upload: ' + fetchErr.message);
        }
        throw fetchErr;
      }

      const fileExt = name.split('.').pop() || 'bin';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `notices/${fileName}`;

      const { data, error } = await supabase.storage
        .from('notices')
        .upload(filePath, fileToUpload, {
          contentType: type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('notices')
        .getPublicUrl(filePath);

      console.log('Upload successful! Public URL:', publicUrl);
      return { publicUrl };
    } catch (error) {
      console.error('Final upload catch:', error);
      return { error };
    }
  };

  const addNotice = async ({ title, message, attachmentUrl, schoolIds, classIds, schoolId }) => {
    try {
      const records = [];
      const batchId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });

      const isSuperAdmin = user?.email === 'admin@ditari-elektronik.com';

      if (schoolIds && schoolIds.length > 0) {
        // Multi-school notice (Super Admin)
        schoolIds.forEach(sid => {
          records.push({
            title,
            message,
            attachment_url: attachmentUrl || null,
            school_id: sid,
            is_super_admin: isSuperAdmin,
            batch_id: batchId
          });
        });
      } else if (classIds && classIds.length > 0) {
        // Multi-class notice (School Admin)
        classIds.forEach(cid => {
          records.push({
            title,
            message,
            attachment_url: attachmentUrl || null,
            school_id: user.school_id,
            class_id: cid,
            is_super_admin: isSuperAdmin,
            batch_id: batchId
          });
        });
      } else {
        // Single target or default
        records.push({
          title,
          message,
          attachment_url: attachmentUrl || null,
          school_id: schoolId || user.school_id,
          is_super_admin: isSuperAdmin,
          batch_id: batchId
        });
      }

      console.log('Inserting notices with batch_id:', batchId, records);
      let { data, error } = await supabase
        .from('notices')
        .insert(records)
        .select();

      if (error) {
        // Fallback: If batch_id or class_id column is missing
        if (error.message?.includes('batch_id') || error.message?.includes('class_id') || error.code === '42703') {
          console.warn('notices table might be missing batch_id or class_id columns. Falling back...');
          const fallbackRecords = records.map(r => {
            const { batch_id, class_id, ...rest } = r;
            // Only remove class_id if it was the error, but for simplicity we remove both if this broad error matches
            // Actually, let's be slightly more precise if possible
            let cleaned = { ...rest };
            if (error.message?.includes('batch_id')) delete cleaned.batch_id;
            if (error.message?.includes('class_id')) delete cleaned.class_id;
            return cleaned;
          });
          const retry = await supabase.from('notices').insert(fallbackRecords).select();
          if (retry.error) throw retry.error;
          data = retry.data;
        } else {
          throw error;
        }
      };

      if (data) setNotices(prev => [...data, ...prev]);
      return { data };
    } catch (error) {
      console.error('Error adding notice:', error);
      return { error };
    }
  };

  const deleteNotice = async (id) => {
    try {
      // Find the notice first to get its details for batch deletion
      const noticeToDelete = notices.find(n => n.id === id);
      if (!noticeToDelete) return { error: { message: "Notice not found" } };

      const { batch_id, title, message, attachment_url, created_at } = noticeToDelete;

      let query = supabase.from('notices').delete();

      if (batch_id) {
        // Best way: Delete everything in the same batch
        query = query.eq('batch_id', batch_id);
      } else {
        // Legacy fallback: Match exactly what we can
        query = query.match({
          title,
          message,
          attachment_url,
          created_at
        });
      }

      const { error } = await query;
      if (error) throw error;

      // Update local state: remove all matches
      setNotices(prev => prev.filter(n => {
        if (batch_id && n.batch_id === batch_id) return false;
        if (!batch_id && n.title === title && n.message === message && n.attachment_url === attachment_url && n.created_at === created_at) return false;
        return n.id !== id; // Extra safety
      }));

      return { success: true };
    } catch (error) {
      console.error('Error deleting notice:', error);
      return { error };
    }
  };

  const markNoticeRead = async (noticeId) => {
    if (noticeReads.includes(noticeId)) return;
    try {
      await supabase.from('notice_reads').upsert({ notice_id: noticeId, student_id: user.id }, { onConflict: 'notice_id,student_id' });
      setNoticeReads(prev => [...prev, noticeId]);
    } catch (error) {
      console.error('Error marking notice read:', error);
    }
  };

  const updateCurrentTerm = async (schoolId, term) => {
    try {
      const { error } = await supabase.from('schools').update({ current_term: term }).eq('id', schoolId);
      if (!error) {
        await fetchData(false);
        return { success: true };
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateSchoolDates = async (schoolId, start, end) => {
    try {
      const { error } = await supabase.from('schools').update({ school_year_start: start, school_year_end: end }).eq('id', schoolId);
      if (error) throw error;
      await fetchData(false);
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const updateTermStartDate = async (schoolId, date) => {
    try {
      const { error } = await supabase.from('schools').update({ term_two_start_date: date }).eq('id', schoolId);
      if (error) throw error;

      // Automatically recalculate and apply terms for all existing records
      const { data: schoolClasses } = await supabase.from('classes').select('id').eq('school_id', schoolId);
      const classIds = schoolClasses ? schoolClasses.map(c => c.id) : [];

      if (classIds.length > 0) {
        const updatePromises = [];
        // All tables that utilize term and class_id
        const tables = ['grades', 'lessons', 'attendance', 'homework', 'notes'];

        for (const table of tables) {
          const dateColumn = table === 'homework' ? 'due_date' : 'date';
          updatePromises.push(
            supabase.from(table).update({ term: 1 }).in('class_id', classIds).lt(dateColumn, date).select('id').limit(1)
          );
          updatePromises.push(
            supabase.from(table).update({ term: 2 }).in('class_id', classIds).gte(dateColumn, date).select('id').limit(1)
          );
        }

        await Promise.allSettled(updatePromises);
      }

      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error("Error bulk updating terms:", error);
      return { error };
    }
  };

  const addCalendarEvent = async (event) => {
    try {
      const { data, error } = await supabase.from('school_calendar').insert([{ ...event, academic_year: selectedGlobalAcademicYear }]).select();
      if (error) throw error;
      if (data) setSchoolCalendar(prev => [...prev, ...data]);
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const addCalendarEvents = async (events) => {
    try {
      const eventList = events.map(e => ({ ...e, academic_year: selectedGlobalAcademicYear }));
      const { data, error } = await supabase.from('school_calendar').insert(eventList).select();
      if (error) throw error;
      if (data) setSchoolCalendar(prev => [...prev, ...data]);
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const deleteCalendarEvent = async (id) => {
    try {
      const { error } = await supabase.from('school_calendar').delete().eq('id', id);
      if (error) throw error;
      setSchoolCalendar(prev => prev.filter(e => e.id !== id));
      return { success: true };
    } catch (error) {
      return { error };
    }
  };

  const initializeDailyAttendance = async (classId, dateStr) => {
    try {
      const classStudents = students.filter(s => s.classId === classId);
      if (classStudents.length === 0) return { success: true };

      // Determine default status: 'absent' for today, 'none' for history (safety)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const defaultStatus = (dateStr === todayStr) ? 'absent' : 'none';

      // 2. Check which students ALREADY have ANY record for this date
      const existingAtt = attendance.filter(a => a.class_id === classId && a.date === dateStr);
      const studentIdsWithAnyRecord = new Set(existingAtt.map(a => a.student_id || a.studentId));

      const missingStudents = classStudents.filter(s => !studentIdsWithAnyRecord.has(s.id));

      if (missingStudents.length === 0) return { success: true };

      // 3. Create records ONLY for Daily Summary (hour 0) using defaultStatus
      const newRecords = [];
      missingStudents.forEach(s => {
        newRecords.push({
          student_id: s.id,
          class_id: classId,
          date: dateStr,
          hour: 0,
          status: defaultStatus,
          term: resolveTermForDate(dateStr)
        });
      });

      console.log(`[initializeDailyAttendance] Registering default absence for ${newRecords.length} students at hour 0`);
      const { data, error } = await supabase.from('attendance').insert(newRecords).select();

      if (error) throw error;

      if (data) {
        setAttendance(prev => [...prev, ...data]);
      }
      return { success: true };
    } catch (error) {
      console.error("Error initializing attendance:", error);
      return { error };
    }
  };

  const addTest = async (test) => {
    try {
      const { data, error } = await supabase.from('tests').insert([{
        teacher_id: user.id,
        class_id: test.classId,
        subject: test.subject,
        date: test.date,
        description: test.description,
        term: resolveTermForDate(test.date),
        academic_year: selectedGlobalAcademicYear
      }]).select().single();

      if (!error && data) setTests(prev => [...prev, data]);
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const deleteTest = async (testId) => {
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (!error) setTests(prev => prev.filter(t => t.id !== testId));
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const updateSchoolStatus = async (schoolId, isActive) => {
    try {
      const { data, error } = await supabase.from('schools').update({ is_active: isActive }).eq('id', schoolId).select().single();
      if (!error && data) {
        setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, is_active: isActive } : s));
      }
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const deleteAllData = async () => {
    try {
      console.log(`[deleteAllData] STARTING Global System Reset by SuperAdmin=${user?.id}`);

      // 1. Attempt to use the high-performance RPC function (Created via SQL script)
      const { error: rpcError } = await supabase.rpc('nuke_all_data', { 
        admin_id_to_keep: user.id 
      });

      if (!rpcError) {
        console.log('[deleteAllData] RPC nuke_all_data executed successfully.');
        await fetchData(false);
        return { success: true };
      }

      console.warn('[deleteAllData] RPC nuke_all_data failed or not found. Falling back to multi-step recursive deletion...', rpcError);

      // 2. FALLBACK: Manual sequential clearing (Hyper-Aggressive strategy)
      const forceClearTable = async (tableName, idCol = 'id') => {
        try {
          console.log(`[deleteAllData] Fallback: clearing ${tableName}...`);
          const { data, error } = await supabase.from(tableName).select(idCol).limit(5000);
          if (error) {
            await supabase.from(tableName).delete().neq(idCol, '00000000-0000-0000-0000-000000000000');
            return;
          }
          const ids = data.map(item => item[idCol]).filter(id => id !== null);
          if (ids.length > 0) {
            await supabase.from(tableName).delete().in(idCol, ids);
          }
        } catch (e) {
          console.error(`[deleteAllData] Error in fallback for ${tableName}:`, e);
        }
      };

      // Dependencies order
      await forceClearTable('notes');
      await forceClearTable('notice_reads', 'student_id');
      await forceClearTable('attendance', 'student_id');
      await forceClearTable('grades');
      await forceClearTable('lessons');
      await forceClearTable('homework');
      await forceClearTable('tests');
      await forceClearTable('notices');
      await forceClearTable('school_calendar');
      await forceClearTable('student_classes', 'student_id');
      await forceClearTable('teacher_classes', 'teacher_id');

      if (user?.id) {
        const { data: profs } = await supabase.from('profiles').select('id').neq('id', user.id);
        if (profs?.length > 0) {
          await supabase.from('profiles').delete().in('id', profs.map(p => p.id));
        }
      }

      await forceClearTable('classes');
      await forceClearTable('schools');

      console.log('[deleteAllData] System reset complete via fallback.');
      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error("CRITICAL Error during global system reset:", error);
      return { error };
    }
  };

      console.log('[deleteAllData] System reset attempt finished.');
      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error("CRITICAL Error during global system reset:", error);
      return { error };
    }
  };

      console.log('[deleteAllData] System reset attempt complete. Re-fetching local data...');
      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error("CRITICAL Error during global system reset:", error);
      return { error };
    }
  };

  const value = {
    schools, teachers, schoolAdmins, classes, students, grades, lessons, attendance, homework, notes, notices, noticeReads, tests, loading,
    currentTerm, selectedGlobalAcademicYear, availableAcademicYears, changeAcademicYear,
    addSchool, addClass, addTeacher, addStudent, addGrade, addLesson, updateLesson, deleteLesson, addHomework, addNote, addNotice, addTest, deleteTest, toggleAttendance, justifyAttendance,
    activateProfile, updateClassTeachers, assignStudentToClass, initializeDailyAttendance,
    deleteSchool, deleteClass, removeTeacherFromClass, removeStudentFromClass,
    deleteTeacher, deleteStudent, archiveCurrentYear, promoteStudents, promoteStudentToClass, bulkPromoteStudents, deleteNotice, markNoticeRead, updateGrade,
    uploadFile, updateCurrentTerm, updateSchoolDates, updateTermStartDate, updateSchoolStatus, deleteAllData,
    schoolCalendar, addCalendarEvent, addCalendarEvents, deleteCalendarEvent,
    refreshData
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);