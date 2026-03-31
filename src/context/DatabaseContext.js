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
  const [tests, setTests] = useState([]);
  const [schoolCalendar, setSchoolCalendar] = useState([]);
  const [migrationRun, setMigrationRun] = useState(false);
  const [currentTerm, setCurrentTerm] = useState(1); // Default global term

  const calculateTerm = (date, schoolId) => {
    const school = (schools || []).find(s => s.id === schoolId);
    if (!school || !school.term_two_start_date) return 1;

    // date can be a string "YYYY-MM-DD" or a Date object
    let entryDateStr;
    if (typeof date === 'string' && date.includes('-')) {
      entryDateStr = date.split('T')[0];
    } else {
      const d = new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      entryDateStr = `${y}-${m}-${day}`;
    }

    return (entryDateStr > school.term_two_start_date) ? 2 : 1;
  };
  const [loading, setLoading] = useState(true);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      if (!user) return;

      if (user.role === 'admin') {
        const isSuperAdmin = user.email === 'admin@ditari-elektronik.com';
        // Admin needs everything
        const [schoolsRes, profilesRes, classesRes, teacherClassesRes, studentClassesRes, noticesRes, testsRes, homeworkRes, gradesRes, attendanceRes, lessonsRes, notesRes, calendarRes] = await Promise.all([
          supabase.from('schools').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('classes').select('*'),
          supabase.from('teacher_classes').select('*').is('academic_year', null),
          supabase.from('student_classes').select('*').is('academic_year', null),
          supabase.from('notices').select('*').order('created_at', { ascending: false }),
          supabase.from('tests').select('*').is('academic_year', null),
          supabase.from('homework').select('*').is('academic_year', null),
          supabase.from('grades').select('*').is('academic_year', null),
          supabase.from('attendance').select('*').is('academic_year', null),
          supabase.from('lessons').select('*').is('academic_year', null),
          supabase.from('notes').select('*').is('academic_year', null),
          supabase.from('school_calendar').select('*')
        ]);

        if (!isSuperAdmin && user.school_id) {
          if (schoolsRes.data) schoolsRes.data = schoolsRes.data.filter(s => s.id === user.school_id);
          if (profilesRes.data) profilesRes.data = profilesRes.data.filter(p => p.school_id === user.school_id || p.id === user.id);
          if (classesRes.data) classesRes.data = classesRes.data.filter(c => c.school_id === user.school_id);
          if (noticesRes.data) noticesRes.data = noticesRes.data.filter(n => n.school_id === user.school_id);
        }

        if (schoolsRes.data) {
          setSchools(schoolsRes.data);
          // Determine term if for current school
          const mySchool = schoolsRes.data.find(s => s.id === user.school_id);
          if (mySchool) {
            const today = new Date().toISOString().split('T')[0];
            const term = (mySchool.term_two_start_date && today > mySchool.term_two_start_date) ? 2 : 1;
            setCurrentTerm(term);
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
        if (testsRes.data) setTests(testsRes.data);
        if (calendarRes.data) setSchoolCalendar(calendarRes.data);

      } else if (user.role === 'mesues') {
        // Teacher data: Fetch classes the teacher belongs to
        const { data: tcData } = await supabase.from('teacher_classes').select('*, classes(*)').eq('teacher_id', user.id);

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
            const { data: scData } = await supabase.from('student_classes').select('student_id, class_id').in('class_id', classIds);
            if (scData) {
              const studentIds = scData.map(sc => sc.student_id);
              // Also get ALL teachers for these classes
              const { data: allTcData } = await supabase.from('teacher_classes').select('teacher_id, class_id').in('class_id', classIds).is('academic_year', null);
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

        // Fetch school info for term calculation
        const { data: schoolInfo } = await supabase.from('schools').select('*').eq('id', user.school_id).single();
        if (schoolInfo) {
          const today = new Date().toISOString().split('T')[0];
          const term = (schoolInfo.term_two_start_date && today > schoolInfo.term_two_start_date) ? 2 : 1;
          setCurrentTerm(term);
          setSchools([schoolInfo]);
        }

        const [gradesRes, lessonsRes, attendanceRes, homeworkRes, notesRes, noticesRes, testsRes, calendarRes] = await Promise.all([
          classIds.length > 0 ? supabase.from('grades').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          classIds.length > 0 ? supabase.from('lessons').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          classIds.length > 0 ? supabase.from('attendance').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          classIds.length > 0 ? supabase.from('homework').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          classIds.length > 0 ? supabase.from('notes').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false }),
          classIds.length > 0 ? supabase.from('tests').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          supabase.from('school_calendar').select('*').eq('school_id', user.school_id)
        ]);

        if (gradesRes.data) setGrades(gradesRes.data);
        if (lessonsRes.data) setLessons(lessonsRes.data);
        if (attendanceRes.data) setAttendance(attendanceRes.data);
        if (homeworkRes.data) setHomework(homeworkRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (noticesRes.data) setNotices(noticesRes.data);
        if (testsRes.data) setTests(testsRes.data);
        if (calendarRes.data) setSchoolCalendar(calendarRes.data);

      } else if (user.role === 'nxenes') {
        // Student data: find which classes they belong to
        const { data: scData } = await supabase.from('student_classes').select('*, classes(*)').eq('student_id', user.id).single();

        if (scData) {
          user.classId = scData.class_id;
          setClasses([{
            ...scData.classes,
            schoolId: scData.classes.school_id
          }]);
        }

        // Fetch school info for term calculation
        const { data: schoolInfo } = await supabase.from('schools').select('*').eq('id', user.school_id).single();
        if (schoolInfo) {
          const today = new Date().toISOString().split('T')[0];
          const term = (schoolInfo.term_two_start_date && today > schoolInfo.term_two_start_date) ? 2 : 1;
          setCurrentTerm(term);
          setSchools([schoolInfo]);
        }

        const classIds = scData ? [scData.class_id] : [];

        const [gradesRes, lessonsRes, attendanceRes, homeworkRes, notesRes, noticesRes, noticeReadsRes, testsRes, calendarRes] = await Promise.all([
          supabase.from('grades').select('*').eq('student_id', user.id).is('academic_year', null),
          classIds.length > 0 ? supabase.from('lessons').select('*, profiles(first_name, last_name)').in('class_id', classIds).is('academic_year', null) : { data: [] },
          supabase.from('attendance').select('*').eq('student_id', user.id).is('academic_year', null),
          classIds.length > 0 ? supabase.from('homework').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
          classIds.length > 0 ? supabase.from('notes').select('*, profiles(first_name, last_name)').in('class_id', classIds).is('academic_year', null) : { data: [] },
          supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false }),
          supabase.from('notice_reads').select('notice_id').eq('student_id', user.id),
          classIds.length > 0 ? supabase.from('tests').select('*, profiles(first_name, last_name)').in('class_id', classIds).is('academic_year', null) : { data: [] },
          supabase.from('school_calendar').select('*').eq('school_id', user.school_id)
        ]);

        if (gradesRes.data) setGrades(gradesRes.data);
        if (lessonsRes.data) setLessons(lessonsRes.data);
        if (attendanceRes.data) setAttendance(attendanceRes.data);
        if (homeworkRes.data) setHomework(homeworkRes.data);
        if (notesRes.data) setNotes(notesRes.data);
        if (noticesRes.data) setNotices(noticesRes.data);
        if (noticeReadsRes.data) setNoticeReads(noticeReadsRes.data.map(r => r.notice_id));
        if (testsRes.data) setTests(testsRes.data);
        if (calendarRes.data) setSchoolCalendar(calendarRes.data);
        runAttendanceMigration([{ ...user, id: user.id, classId: user.classId }]);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshData = () => fetchData(false);

  // Fetch initial data based on role
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Migration logic consolidated within a separate function called after data fetch
  const runAttendanceMigration = async (currentStudents) => {
    if (migrationRun || !user) return;
    try {
      const migrationThreshold = '2026-03-25';
      const march20 = '2026-03-20';

      /* 
      // LEGACY MIGRATION: 
      // 1. Clear the slate for all past records (set to present)
      await supabase.from('attendance').update({ status: 'present' }).lt('date', migrationThreshold);

      // 2. Exception: Ensure March 20th is recorded as 'absent'
      await supabase.from('attendance').update({ status: 'absent' }).eq('date', march20);
      */

      // 3. Seeding March 20th for everyone if no record exists (Now disabled by user request)
      /*
      if (currentStudents && currentStudents.length > 0) {
        ...
      }
      */

      setMigrationRun(true);
      // Refresh local attendance state
      const { data } = await supabase.from('attendance').select('*').is('academic_year', null);
      if (data) setAttendance(data);
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
    
    // Use upsert to handle cases where profile might have been partially created
    const { data, error } = await supabase.from('profiles').upsert(newTeacher).select().single();
    
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
      
      // Prevent duplicates in local state
      setTeachers(prev => {
        const exists = prev.find(t => t.id === mappedTeacher.id);
        if (exists) return prev;
        return [...prev, mappedTeacher];
      });
    }
    if (error) {
      console.error("Profile error adding teacher", error);
    }
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
    
    // Use upsert to handle cases where profile might have been partially created
    const { data, error } = await supabase.from('profiles').upsert(newStudent).select().single();

    // Assign to class
    if (!error && data) {
      // Use upsert for class assignment to be idempotent
      await supabase.from('student_classes').upsert([{ student_id: data.id, class_id: student.classId }], { onConflict: 'student_id,class_id' });
      
      const mappedStudent = {
        ...data,
        schoolId: data.school_id,
        firstName: data.first_name,
        lastName: data.last_name,
        name: `${data.first_name} ${data.last_name}`,
        username: validEmail,
        classId: student.classId
      };
      
      // Prevent duplicates in local state
      setStudents(prev => {
        const exists = prev.find(s => s.id === mappedStudent.id);
        if (exists) {
          return prev.map(s => s.id === mappedStudent.id ? { ...s, classId: student.classId } : s);
        }
        return [...prev, mappedStudent];
      });
    }
    if (error) {
      console.error("Profile error adding student", error);
    }
  };

  const addGrade = async (grade) => {
    const { data, error } = await supabase.from('grades').insert([{
      student_id: grade.studentId,
      teacher_id: user.id,
      class_id: classes.find(c => students.find(s => s.id === grade.studentId)?.classId === c.id)?.id,
      subject: grade.subject,
      grade: grade.value,
      date: grade.date,
      description: grade.comment,
      grade_type: grade.type,
      modification_count: 0,
      term: calculateTerm(grade.date, user.school_id)
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
      term: calculateTerm(lesson.date, user.school_id)
    }]).select().single();

    if (!error && data) {
      setLessons([...lessons, data]);
      if (lesson.homework) {
        await addHomework({
          classId: lesson.classId,
          subject: lesson.subject,
          description: lesson.homework,
          dueDate: lesson.date, // Default to same day or next lesson
          teacherId: user.id
        });
      }
    }
    if (error) console.error("Error adding lesson:", error);
    return { data, error };
  };

  const updateLesson = async (lessonId, updates) => {
    const { data, error } = await supabase.from('lessons')
      .update(updates)
      .eq('id', lessonId)
      .select()
      .single();

    if (!error && data) {
      setLessons(prev => prev.map(l => l.id === lessonId ? data : l));
    } else if (error) {
      console.error("Error updating lesson:", error);
    }
    return { data, error };
  };

  const deleteLesson = async (lessonId) => {
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (!error) {
      setLessons(prev => prev.filter(l => l.id !== lessonId));
    } else {
      console.error("Error deleting lesson:", error);
    }
    return { error };
  };
  const addNote = async (noteData) => {
    const dbNote = {
      student_id: noteData.studentId || null,
      class_id: noteData.classId || null,
      content: noteData.content,
      is_class_note: noteData.isClassNote || false,
      date: noteData.date,
      teacher_id: user.id,
      term: calculateTerm(noteData.date, user.school_id)
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
      term: calculateTerm(hw.dueDate, user.school_id)
    }]).select().single();

    if (!error && data) setHomework([...homework, data]);
    return { data, error };
  };

  const addTest = async (testData) => {
    const { data, error } = await supabase.from('tests').insert([{
      class_id: testData.classId,
      teacher_id: user.id,
      subject: testData.subject,
      date: testData.date,
      description: testData.description,
      term: calculateTerm(testData.date, user.school_id)
    }]).select().single();

    if (!error && data) setTests(prev => [...prev, data]);
    return { data, error };
  };

  const deleteTest = async (testId) => {
    const { error } = await supabase.from('tests').delete().eq('id', testId);
    if (!error) setTests(prev => prev.filter(t => t.id !== testId));
    return { error };
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

    // 2. Build a map of ONLY hours that have actual records (do NOT default missing hours to 'present')
    const statuses = {};
    for (const rec of dayRecords) {
      statuses[rec.hour] = rec.status.split(':')[0];
    }

    // 3. Determine new daily status based only on recorded hours
    let newDailyStatus = 'present';
    const hourKeys = Object.keys(statuses).map(Number).sort((a, b) => a - b);

    if (hourKeys.length === 0) {
      // No hourly records at all — keep present (initialized default)
      newDailyStatus = 'present';
    } else {
      const allPresent = hourKeys.every(h => statuses[h] === 'present');
      const allAbsent = hourKeys.every(h => statuses[h] !== 'present');

      if (allPresent) {
        newDailyStatus = 'present';
      } else if (allAbsent) {
        newDailyStatus = 'absent';
      } else {
        // Find first and last PRESENT among recorded hours only
        let firstPresent = -1;
        let lastPresent = -1;
        for (const h of hourKeys) {
          if (statuses[h] === 'present') {
            if (firstPresent === -1) firstPresent = h;
            lastPresent = h;
          }
        }

        if (firstPresent === -1) {
          newDailyStatus = 'absent';
        } else if (firstPresent > hourKeys[0]) {
          // First recorded hour is absent, a later hour is present → late
          newDailyStatus = 'late';
        } else if (lastPresent < hourKeys[hourKeys.length - 1]) {
          // Last recorded hour is absent, an earlier hour was present → early exit
          newDailyStatus = 'early_exit';
        } else {
          newDailyStatus = 'present';
        }
      }
    }

    const student = students.find(s => s.id === studentId);
    const calculatedTerm = calculateTerm(date, user.school_id);

    const { data: syncData, error: syncError } = await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: student?.classId || student?.class_id,
      date: date,
      hour: 0,
      status: newDailyStatus,
      term: calculatedTerm
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
    const calculatedTerm = calculateTerm(date, user.school_id);

    const { data, error } = await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: student?.classId || student?.class_id,
      date: date,
      hour: hour,
      status: finalStatus,
      term: calculatedTerm
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

  const updateAttendanceHour = async (classId, date, oldHour, newHour) => {
    try {
      // 1. Update all records for this class/date/hour to the new hour
      const { data, error } = await supabase.from('attendance')
        .update({ hour: newHour })
        .eq('class_id', classId)
        .eq('date', date)
        .eq('hour', oldHour)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // 2. Update local state
        setAttendance(prev => {
          const removedOld = prev.filter(a => 
            !(a.class_id === classId && a.date === date && a.hour === oldHour)
          );
          // Potential overlap: Filter out any existing records in the new hour to avoid duplicates in local state
          // (though DB constraint handles it, local state needs to stay clean)
          const removedNew = removedOld.filter(a =>
            !(a.class_id === classId && a.date === date && a.hour === newHour)
          );
          return [...removedNew, ...data];
        });

        // 3. Re-sync daily summary (Hour 0) for all affected students
        const affectedStudentIds = [...new Set(data.map(a => a.student_id))];
        for (const sId of affectedStudentIds) {
          // We pass the latest attendance state implicitly via closure or wait for state update?
          // Since setAttendance is async, it's better to fetch or calculate from local data
          // But syncDailyStatus uses updatedAttendance argument
        }
        
        // Actually, since we need the FULL updated attendance list for syncDailyStatus,
        // we'll trigger a reload or use a more complex sync.
        // For simplicity, we'll re-run fetch data or just rely on the next interaction.
        // BUT, a proper sync is better:
        // await fetchData(); // Too heavy.
      }

      return { success: true };
    } catch (error) {
      console.error("Error moving attendance:", error);
      return { error };
    }
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
      return { error: { message: "Gabim gjatë arsyetimit." } };
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
      // Use upsert to ensure a student is only in one class (fixes "unassociated" bug)
      const { data, error } = await supabaseAdmin.from('student_classes').upsert({
        student_id: studentId,
        class_id: classId
      }, { onConflict: 'student_id' }).select().single();

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

  const activateProfile = async (profileId) => {
    const { data, error } = await supabase.from('profiles').update({ is_active: true }).eq('id', profileId).select().single();
    if (!error && data) {
      setTeachers(prev => prev.map(t => t.id === profileId ? { ...t, is_active: true } : t));
    }
    return { data, error };
  };

  const deleteSchool = async (schoolId) => {
    try {
      // 1. Fetch all classes directly from DB for this school
      const { data: schoolClasses, error: classQueryError } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('school_id', schoolId);
      if (classQueryError) throw classQueryError;

      // 2. Proactively delete ALL notes for all classes in this school (User requirement)
      if (schoolClasses && schoolClasses.length > 0) {
        const classIds = schoolClasses.map(c => c.id);
        await supabaseAdmin.from('notes').delete().in('class_id', classIds);
        
        // 3. Delete each class (which also handles other academic data cleanup)
        for (const classId of classIds) {
          await deleteClass(classId);
        }
      }

      // 4. Fetch all profiles directly from DB for this school (teachers, students, school_admins)
      const { data: schoolProfiles, error: profileQueryError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('school_id', schoolId);
      if (profileQueryError) throw profileQueryError;

      // 5. Delete each profile and its Auth account
      if (schoolProfiles) {
        for (const profile of schoolProfiles) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(profile.id);
          } catch (e) {
            console.warn(`Could not delete auth user ${profile.id}:`, e);
          }
          await supabaseAdmin.from('profiles').delete().eq('id', profile.id);
        }
      }

      // 6. Delete school-wide academic/admin data (notices, calendar)
      await Promise.all([
        supabaseAdmin.from('notices').delete().eq('school_id', schoolId),
        supabaseAdmin.from('school_calendar').delete().eq('school_id', schoolId)
      ]);

      // 7. Finally, delete the school itself using Admin client
      const { error: schoolDeleteError } = await supabaseAdmin
        .from('schools')
        .delete()
        .eq('id', schoolId);
      if (schoolDeleteError) throw schoolDeleteError;

      // 8. Update local state
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
      // 1. Cascade delete all related academic data using Admin client (to bypass RLS)
      // We do this FIRST to avoid FK violations when deleting students/classes later
      await Promise.all([
        supabaseAdmin.from('notes').delete().eq('class_id', classId),
        supabaseAdmin.from('attendance').delete().eq('class_id', classId),
        supabaseAdmin.from('grades').delete().eq('class_id', classId),
        supabaseAdmin.from('lessons').delete().eq('class_id', classId),
        supabaseAdmin.from('homework').delete().eq('class_id', classId),
        supabaseAdmin.from('tests').delete().eq('class_id', classId),
        supabaseAdmin.from('teacher_classes').delete().eq('class_id', classId),
        supabaseAdmin.from('student_classes').delete().eq('class_id', classId)
      ]);

      // 2. Delete all students in this class
      const classStudents = students.filter(s => s.classId === classId);
      for (const student of classStudents) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(student.id);
        } catch (e) {
          console.warn('Could not delete auth user:', e);
        }
        // Use supabaseAdmin for profiles as well to ensure it works regardless of RLS
        await supabaseAdmin.from('profiles').delete().eq('id', student.id);
      }

      // 3. Delete the class itself
      const { error } = await supabaseAdmin.from('classes').delete().eq('id', classId);
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

  const updateCurrentTerm = async (schoolId, term) => {
    try {
      const { error } = await supabase.from('schools').update({ current_term: term }).eq('id', schoolId);
      if (!error) {
        setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, current_term: term } : s));
        setCurrentTerm(term);
        return { success: true };
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Clear all students from a class (for first class / graduating last class)
  const clearClassStudents = async (classId) => {
    try {
      const { error } = await supabase.from('student_classes').delete().eq('class_id', classId);
      if (error) throw error;
      // Update local state
      setStudents(prev => prev.map(s => s.classId === classId ? { ...s, classId: null } : s));
      return { success: true };
    } catch (error) {
      console.error('[clearClassStudents] Error:', error);
      return { error };
    }
  };

  // Bulk promote students: map of { studentId: toClassId | null }
  // null = remove from class (graduate / first class clear)
  const bulkPromoteStudents = async (promotionMap) => {
    try {
      const ops = Object.entries(promotionMap);
      if (ops.length === 0) return { success: true };

      for (const [studentId, toClassId] of ops) {
        // Remove from current class
        await supabase.from('student_classes').delete().eq('student_id', studentId).is('academic_year', null);

        // If toClassId is set, add to new class
        if (toClassId) {
          await supabase.from('student_classes').insert({
            student_id: studentId,
            class_id: toClassId,
            academic_year: null
          });
        }
      }

      // Refresh local state
      await fetchData(false);
      return { success: true };
    } catch (error) {
      console.error('[bulkPromoteStudents] Error:', error);
      return { error };
    }
  };

  const updateTermStartDate = async (schoolId, date, academicYearName) => {
    try {
      console.log(`[updateTermStartDate] schoolId=${schoolId}, date=${date}, year=${academicYearName}`);
      const school = schools.find(s => s.id === schoolId);

      // 1. Update the school settings
      const { error: schoolError } = await supabase
        .from('schools')
        .update({ term_two_start_date: date })
        .eq('id', schoolId);

      if (schoolError) {
        console.error('[updateTermStartDate] schoolError:', schoolError);
        throw schoolError;
      }
      console.log('[updateTermStartDate] School updated successfully');

      // Upsert into academic_terms for history/tracking
      if (academicYearName) {
        const { error: termError } = await supabase
          .from('academic_terms')
          .upsert({
            school_id: schoolId,
            academic_year: academicYearName,
            term_two_start_date: date
          }, { onConflict: 'school_id, academic_year' });
        if (termError) console.warn('[updateTermStartDate] academic_terms upsert error:', termError);
      }

      // 2. Always do client-side bulk sync (reliable fallback)
      // Use local state (which is already filtered and accurate) instead of re-fetching profiles
      const studentIds = students.filter(s => s.schoolId === schoolId || s.school_id === schoolId).map(s => s.id);
      const classIds = classes.filter(c => c.school_id === schoolId).map(c => c.id);

      console.log(`[updateTermStartDate] Found ${studentIds.length} students locally, ${classIds.length} classes locally`);

      // Update everything by class_id (efficient & universal for all academic tables)
      const syncOps = [];
      if (classIds.length > 0) {
        // Core student data
        syncOps.push(supabase.from('grades').update({ term: 1 }).in('class_id', classIds).lte('date', date).is('academic_year', null));
        syncOps.push(supabase.from('grades').update({ term: 2 }).in('class_id', classIds).gt('date', date).is('academic_year', null));

        syncOps.push(supabase.from('attendance').update({ term: 1 }).in('class_id', classIds).lte('date', date).is('academic_year', null));
        syncOps.push(supabase.from('attendance').update({ term: 2 }).in('class_id', classIds).gt('date', date).is('academic_year', null));

        syncOps.push(supabase.from('notes').update({ term: 1 }).in('class_id', classIds).lte('date', date).is('academic_year', null));
        syncOps.push(supabase.from('notes').update({ term: 2 }).in('class_id', classIds).gt('date', date).is('academic_year', null));

        // Planning data
        syncOps.push(supabase.from('lessons').update({ term: 1 }).in('class_id', classIds).lte('date', date).is('academic_year', null));
        syncOps.push(supabase.from('lessons').update({ term: 2 }).in('class_id', classIds).gt('date', date).is('academic_year', null));

        syncOps.push(supabase.from('homework').update({ term: 1 }).in('class_id', classIds).lte('due_date', date).is('academic_year', null));
        syncOps.push(supabase.from('homework').update({ term: 2 }).in('class_id', classIds).gt('due_date', date).is('academic_year', null));

        syncOps.push(supabase.from('tests').update({ term: 1 }).in('class_id', classIds).lte('date', date).is('academic_year', null));
        syncOps.push(supabase.from('tests').update({ term: 2 }).in('class_id', classIds).gt('date', date).is('academic_year', null));
      }

      const results = await Promise.allSettled(syncOps);
      const errors = results.filter(r => r.status === 'rejected' || r.value?.error);
      if (errors.length > 0) {
        console.error('[updateTermStartDate] Some sync ops failed:', errors.map(e => e.reason || e.value?.error));
      } else {
        console.log('[updateTermStartDate] All sync ops completed successfully');
      }

      // 3. Try the RPC as a bonus (if it's installed)
      const { error: rpcError } = await supabase.rpc('sync_school_terms', {
        p_school_id: schoolId,
        p_academic_year: school?.current_year || '2025/2026',
        p_transition_date: date
      });
      if (rpcError) console.warn('[updateTermStartDate] RPC not available (ok):', rpcError.message);

      // 4. Update local state
      setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, term_two_start_date: date } : s));

      if (schoolId === user.school_id) {
        const today = new Date().toISOString().split('T')[0];
        const term = (date && today > date) ? 2 : 1;
        setCurrentTerm(term);
      }

      // 5. Full local data refresh
      await fetchData(false);

      return { success: true };
    } catch (error) {
      console.error('[updateTermStartDate] Fatal error:', error);
      return { error };
    }
  };

  const getNextYearName = (yearStr) => {
    if (!yearStr) return "";
    // Handles 2024/2025 or 2024-2025
    const separator = yearStr.includes('/') ? '/' : (yearStr.includes('-') ? '-' : null);
    if (separator) {
      const parts = yearStr.split(separator);
      if (parts.length === 2) {
        const y1 = parseInt(parts[0]);
        const y2 = parseInt(parts[1]);
        if (!isNaN(y1) && !isNaN(y2)) {
          return `${y1 + 1}${separator}${y2 + 1}`;
        }
      }
    }
    // Fallback for single year like "2025" or mixed formats
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
        // Tag all current records with the yearName
        await Promise.all([
          supabase.from('grades').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('attendance').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('lessons').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('homework').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('notes').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('tests').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          // Also archive current student/teacher class assignments
          supabase.from('student_classes').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('teacher_classes').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
        ]);

        // Update local state by filtering out archived items
        setGrades(prev => prev.filter(g => !schoolClassIds.includes(g.class_id)));
        setAttendance(prev => prev.filter(a => !schoolClassIds.includes(a.class_id)));
        setLessons(prev => prev.filter(l => !schoolClassIds.includes(l.class_id)));
        setHomework(prev => prev.filter(h => !schoolClassIds.includes(h.class_id)));
        setNotes(prev => prev.filter(n => !schoolClassIds.includes(n.class_id)));
        setTests(prev => prev.filter(t => !schoolClassIds.includes(t.class_id)));
      }

      // Calculate next year name
      const nextYearName = getNextYearName(yearName);
      console.log(`[archiveCurrentYear] nextYear=${nextYearName}`);

      // Update school current_year and reset transition date/term
      const { error: schoolError } = await supabase
        .from('schools')
        .update({
          current_year: nextYearName,
          current_term: 1,
          term_two_start_date: null
        })
        .eq('id', schoolId);

      if (schoolError) throw schoolError;

      setSchools(prev => prev.map(s => s.id === schoolId ? {
        ...s,
        current_year: nextYearName,
        current_term: 1,
        term_two_start_date: null
      } : s));

      // Reset currentTerm globally if it's the current user's school
      if (schoolId === user.school_id) {
        setCurrentTerm(1);
      }

      return { success: true, nextYear: nextYearName };
    } catch (error) {
      console.error("Error archiving year:", error);
      return { error };
    }
  };

  const promoteStudentToClass = async (studentId, classId) => {
    try {
      // 1. Remove any current active assignment for this student (just in case)
      await supabase.from('student_classes').delete().eq('student_id', studentId).is('academic_year', null);

      // 2. Insert new active assignment
      const { data, error } = await supabase.from('student_classes').insert([{
        student_id: studentId,
        class_id: classId,
        academic_year: null
      }]).select().single();

      if (!error) {
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, classId: classId } : s));
        return { success: true };
      }
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const promoteStudents = async (schoolId) => {
    try {
      // Logic for automatic promotion if needed, but the user wants manual choice now.
      // We'll keep this as a simple bulk advanced if they want it later.
      const schoolClasses = classes.filter(c => c.school_id === schoolId);

      const romanToNext = {
        'I': 'II', 'II': 'III', 'III': 'IV', 'IV': 'V', 'V': 'VI',
        'VI': 'VII', 'VII': 'VIII', 'VIII': 'IX', 'IX': 'X', 'X': 'XI', 'XI': 'XII', 'XII': 'Graduated'
      };

      for (const cls of schoolClasses) {
        const parts = cls.name.split(' ');
        const currentGrade = parts[0];
        const nextGrade = romanToNext[currentGrade];

        if (nextGrade) {
          const newName = nextGrade === 'Graduated' ? `Graduated ${cls.name}` : cls.name.replace(currentGrade, nextGrade);
          await supabase.from('classes').update({ name: newName }).eq('id', cls.id);
        }
      }

      // Re-fetch classes to update local state
      const { data } = await supabase.from('classes').select('*').eq('school_id', schoolId);
      if (data) {
        const teacherClassesRes = await supabase.from('teacher_classes').select('*');
        const mappedClasses = data.map(c => ({
          ...c,
          schoolId: c.school_id,
          teacherIds: [...new Set((teacherClassesRes.data || [])
            .filter(tc => tc.class_id === c.id)
            .map(tc => tc.teacher_id))]
        }));
        setClasses(prev => {
          const otherSchools = prev.filter(c => c.school_id !== schoolId);
          return [...otherSchools, ...mappedClasses];
        });
      }

      return { success: true };
    } catch (error) {
      console.error("Error promoting students:", error);
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

  const initializeDailyAttendance = async (classId, dateStr) => {
    try {
      const classStudents = students.filter(s => s.classId === classId);
      if (classStudents.length === 0) return { success: true };

      const allHours = [1, 2, 3, 4, 5, 6, 7];

      // 2. Check which students ALREADY have ANY record for this date
      const existingAtt = attendance.filter(a => a.class_id === classId && a.date === dateStr);
      const studentIdsWithAnyRecord = new Set(existingAtt.map(a => a.student_id || a.studentId));

      const missingStudents = classStudents.filter(s => !studentIdsWithAnyRecord.has(s.id));

      if (missingStudents.length === 0) return { success: true };

      // 3. Create 'absent' records for all 7 hours + Daily Summary (hour 0)
      const newRecords = [];
      const term = calculateTerm(dateStr, user.school_id);
      
      missingStudents.forEach(s => {
        // Daily Summary
        newRecords.push({
          student_id: s.id,
          class_id: classId,
          date: dateStr,
          hour: 0,
          status: 'absent',
          term: term
        });
        // Hourly Lessons
        allHours.forEach(hour => {
          newRecords.push({
            student_id: s.id,
            class_id: classId,
            date: dateStr,
            hour: hour,
            status: 'absent',
            term: term
          });
        });
      });

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

  const markDayAsRest = async (schoolId, classId, dateStr, description) => {
    try {
      // 1. Add to school_calendar
      const newEvent = {
        school_id: schoolId,
        date: dateStr,
        type: 'holiday',
        description: description || 'Riposo / Imprevisto'
      };
      
      const { data: calendarData, error: calendarError } = await supabase.from('school_calendar').insert([newEvent]).select().single();
      if (calendarError) throw calendarError;
      
      if (calendarData) {
        setSchoolCalendar(prev => [...prev, calendarData]);
      }
      
      // 2. Annul all absences for this day and class
      const { error: attError } = await supabase.from('attendance')
        .delete()
        .eq('class_id', classId)
        .eq('date', dateStr)
        .is('academic_year', null);
        
      if (attError) throw attError;
      
      setAttendance(prev => prev.filter(a => !(a.class_id === classId && a.date === dateStr)));
      
      return { success: true };
    } catch (error) {
      console.error("Error marking day as rest:", error);
      return { error };
    }
  };

  const undoRestDay = async (schoolId, classId, dateStr) => {
    try {
      // 1. Remove from school_calendar
      const { error: calendarError } = await supabase.from('school_calendar')
        .delete()
        .eq('school_id', schoolId)
        .eq('date', dateStr)
        .eq('type', 'holiday');
        
      if (calendarError) throw calendarError;
      
      setSchoolCalendar(prev => prev.filter(e => !(e.school_id === schoolId && e.date === dateStr && e.type === 'holiday')));
      
      // 2. Re-initialize attendance
      await initializeDailyAttendance(classId, dateStr);
      
      return { success: true };
    } catch (error) {
      console.error("Error undoing rest day:", error);
      return { error };
    }
  };

  const deleteAllData = async () => {
    try {
      console.log("[deleteAllData] Starting full database wipe...");
      
      // Try RPC first for efficiency and cascade handling
      const { error: rpcError } = await supabase.rpc('delete_all_data');
      
      if (rpcError) {
        console.warn("[deleteAllData] RPC failed, falling back to direct deletes:", rpcError.message);
        
        // List of all user-created tables to wipe
        // Note: We use .neq('id', '00000000-0000-0000-0000-000000000000') to satisfy "DELETE requires a WHERE clause"
        const tables = [
          'grades', 'attendance', 'lessons', 'homework', 'notes', 'tests', 
          'teacher_classes', 'student_classes', 'notices', 'notice_reads',
          'classes', 'profiles', 'schools'
        ];

        for (const table of tables) {
          const { error: delError } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (delError) {
            console.error(`[deleteAllData] Failed to wipe table ${table}:`, delError.message);
            // Some tables might have different PK names or constraints, but 'id' is standard in this project
          }
        }
      }

      // Clear local state
      setSchools([]);
      setTeachers([]);
      setSchoolAdmins([]);
      setClasses([]);
      setStudents([]);
      setGrades([]);
      setLessons([]);
      setAttendance([]);
      setHomework([]);
      setNotes([]);
      setNotices([]);
      setNoticeReads([]);
      setTests([]);

      return { success: true };
    } catch (error) {
      console.error('Error deleting all data:', error);
      return { error };
    }
  };

  const updateSchoolStatus = async (schoolId, isActive) => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .update({ is_active: isActive })
        .eq('id', schoolId)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, is_active: isActive } : s));
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error updating school status:', error);
      return { error };
    }
  };

  const updateSchoolDates = async (schoolId, startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .update({
          school_year_start: startDate,
          school_year_end: endDate
        })
        .eq('id', schoolId)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, school_year_start: startDate, school_year_end: endDate } : s));
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error updating school dates:', error);
      return { error };
    }
  };

  const addCalendarEvents = async (events) => {
    try {
      const { data, error } = await supabase
        .from('school_calendar')
        .upsert(events, { onConflict: 'school_id, date' })
        .select();

      if (error) throw error;
      if (data) {
        setSchoolCalendar(prev => {
          const newDates = events.map(e => e.date);
          const schoolId = events[0].school_id;
          const filtered = prev.filter(e => !(e.school_id === schoolId && newDates.includes(e.date)));
          return [...filtered, ...data];
        });
      }
      return { success: true, data };
    } catch (error) {
      console.error('Error adding calendar events:', error);
      return { error };
    }
  };

  const addCalendarEvent = async ({ schoolId, date, type, description }) => {
    return addCalendarEvents([{ school_id: schoolId, date, type, description }]);
  };

  const deleteCalendarEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('school_calendar')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      setSchoolCalendar(prev => prev.filter(e => e.id !== eventId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { error };
    }
  };

  const value = {
    schools, teachers, schoolAdmins, classes, students, grades, lessons, attendance, homework, notes, notices, noticeReads, tests, schoolCalendar, loading,
    addSchool, addClass, addTeacher, addStudent, addGrade, addLesson, updateLesson, deleteLesson, updateAttendanceHour, addHomework, addNote, addNotice, toggleAttendance, justifyAttendance,
    activateProfile, updateClassTeachers, assignStudentToClass, initializeDailyAttendance, markDayAsRest, undoRestDay,
    deleteSchool, deleteClass, removeTeacherFromClass, removeStudentFromClass,
    deleteTeacher, deleteStudent, archiveCurrentYear, promoteStudents, promoteStudentToClass, deleteNotice, markNoticeRead, updateGrade,
    uploadFile, deleteAllData, updateSchoolStatus, updateSchoolDates, addCalendarEvents, addCalendarEvent, deleteCalendarEvent, addTest, deleteTest, updateCurrentTerm, updateTermStartDate, currentTerm,
    bulkPromoteStudents, clearClassStudents, refreshData
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
