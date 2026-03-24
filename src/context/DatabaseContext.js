import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  
  const [loading, setLoading] = useState(true);

  // Fetch initial data based on role
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        if (user.role === 'admin') {
          const isSuperAdmin = user.email === 'admin@ditari-elektronik.com';
          // Admin needs everything
          const [schoolsRes, profilesRes, classesRes, teacherClassesRes, studentClassesRes, noticesRes] = await Promise.all([
            supabase.from('schools').select('*'),
            supabase.from('profiles').select('*'),
            supabase.from('classes').select('*'),
            supabase.from('teacher_classes').select('*'),
            supabase.from('student_classes').select('*'),
            supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false })
          ]);
          
          if (!isSuperAdmin && user.school_id) {
            if (schoolsRes.data) schoolsRes.data = schoolsRes.data.filter(s => s.id === user.school_id);
            if (profilesRes.data) profilesRes.data = profilesRes.data.filter(p => p.school_id === user.school_id || p.id === user.id);
            if (classesRes.data) classesRes.data = classesRes.data.filter(c => c.school_id === user.school_id);
          }

          if (schoolsRes.data) setSchools(schoolsRes.data);
          
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
            user.subjects = uniqueSubjects;
            
            classIds = mappedClasses.map(c => c.id);
            if (classIds.length > 0) {
              const { data: scData } = await supabase.from('student_classes').select('student_id, class_id').in('class_id', classIds);
              if (scData) {
                const studentIds = scData.map(sc => sc.student_id);
                // Also get ALL teachers for these classes
                const { data: allTcData } = await supabase.from('teacher_classes').select('teacher_id, class_id').in('class_id', classIds);
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

          const [gradesRes, lessonsRes, attendanceRes, homeworkRes, notesRes, noticesRes] = await Promise.all([
            classIds.length > 0 ? supabase.from('grades').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            classIds.length > 0 ? supabase.from('lessons').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            classIds.length > 0 ? supabase.from('attendance').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            classIds.length > 0 ? supabase.from('homework').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            classIds.length > 0 ? supabase.from('notes').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false })
          ]);
          
          if (gradesRes.data) setGrades(gradesRes.data);
          if (lessonsRes.data) setLessons(lessonsRes.data);
          if (attendanceRes.data) setAttendance(attendanceRes.data);
          if (homeworkRes.data) setHomework(homeworkRes.data);
          if (notesRes.data) setNotes(notesRes.data);
          if (noticesRes.data) setNotices(noticesRes.data);
          
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

          const classIds = scData ? [scData.class_id] : [];
          
          const [gradesRes, lessonsRes, attendanceRes, homeworkRes, notesRes, noticesRes] = await Promise.all([
            supabase.from('grades').select('*').eq('student_id', user.id).is('academic_year', null),
            classIds.length > 0 ? supabase.from('lessons').select('*, profiles(first_name, last_name)').in('class_id', classIds).is('academic_year', null) : { data: [] },
            supabase.from('attendance').select('*').eq('student_id', user.id).is('academic_year', null),
            classIds.length > 0 ? supabase.from('homework').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            classIds.length > 0 ? supabase.from('notes').select('*').in('class_id', classIds).is('academic_year', null) : { data: [] },
            supabase.from('notices').select('*').eq('school_id', user.school_id).order('created_at', { ascending: false })
          ]);
          
          if (gradesRes.data) setGrades(gradesRes.data);
          if (lessonsRes.data) setLessons(lessonsRes.data);
          if (attendanceRes.data) setAttendance(attendanceRes.data);
          if (homeworkRes.data) setHomework(homeworkRes.data);
          if (notesRes.data) setNotes(notesRes.data);
          if (noticesRes.data) setNotices(noticesRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
        const newLinks = [];
        cls.teacherIds.forEach(tid => {
          const teacher = teachers.find(t => t.id === tid);
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
      await supabase.from('student_classes').insert([{ student_id: data.id, class_id: student.classId }]);
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
      modification_count: 0
    }]).select().single();
    
    if (!error && data) setGrades([...grades, data]);
    if (error) {
      console.error("Error adding grade:", error);
    }
    return { data, error };
  };

  const updateGrade = async (gradeId, newValue, newComment, newType) => {
    // 1. Get current grade to check modification_count
    const currentGrade = grades.find(g => g.id === gradeId);
    if (!currentGrade) return { error: { message: "Grade not found" } };
    
    // Safety check: teachers can only edit once
    if (user.role === 'mesues' && (currentGrade.modification_count || 0) >= 1) {
      return { error: { message: "Mundësia për ndryshim është përdorur tashmë." } };
    }

    const { data, error } = await supabase.from('grades')
      .update({
        grade: newValue,
        description: newComment,
        grade_type: newType,
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
      date: lesson.date
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
  const addNote = async (noteData) => {
    const { data, error } = await supabase.from('notes').insert([noteData]).select();
    if (data) setNotes(prev => [data[0], ...prev]);
    return { data: data?.[0], error };
  };

  const addNotice = async (noticeData) => {
    const { data, error } = await supabase.from('notices').insert([noticeData]).select();
    if (data) setNotices(prev => [data[0], ...prev]);
    return { data: data?.[0], error };
  };

  const deleteNotice = async (noticeId) => {
    const { error } = await supabase.from('notices').delete().eq('id', noticeId);
    if (!error) setNotices(prev => prev.filter(n => n.id !== noticeId));
    return { error };
  };

  const addHomework = async (hw) => {
    const { data, error } = await supabase.from('homework').insert([{
      teacher_id: user.id,
      class_id: hw.classId,
      subject: hw.subject,
      description: hw.description,
      due_date: hw.dueDate
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
      const newLinks = [];
      teacherIds.forEach(tId => {
        const teacher = teachers.find(t => t.id === tId);
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

  const toggleAttendance = async (studentId, date, status, time = '') => {
    const finalStatus = time ? `${status}:${time}` : status;
    // Upsert attendance
    const { data, error } = await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: students.find(s => s.id === studentId)?.classId,
      date: date,
      status: finalStatus
    }, { onConflict: 'student_id, class_id, date' }).select().single();

    if (!error && data) {
      setAttendance(prev => {
        const filtered = prev.filter(a => !(a.student_id === studentId && a.date === date));
        return [...filtered, data];
      });
    }
    return { data, error };
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

  const archiveCurrentYear = async (schoolId, yearName) => {
    try {
      // 1. Tag all active records for this school with the yearName
      // Note: This assumes we have school_id or can filter by class_id -> school_id
      const schoolClassIds = classes.filter(c => c.school_id === schoolId).map(c => c.id);
      
      if (schoolClassIds.length > 0) {
        await Promise.all([
          supabase.from('grades').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('attendance').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('lessons').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('homework').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
          supabase.from('notes').update({ academic_year: yearName }).in('class_id', schoolClassIds).is('academic_year', null),
        ]);
        
        // Update local state by filtering out archived items (or we re-fetch)
        setGrades(prev => prev.filter(g => !schoolClassIds.includes(g.class_id)));
        setAttendance(prev => prev.filter(a => !schoolClassIds.includes(a.class_id)));
        setLessons(prev => prev.filter(l => !schoolClassIds.includes(l.class_id)));
        setHomework(prev => prev.filter(h => !schoolClassIds.includes(h.class_id)));
        setNotes(prev => prev.filter(n => !schoolClassIds.includes(n.class_id)));
      }
      
      return { success: true };
    } catch (error) {
      console.error("Error archiving year:", error);
      return { error };
    }
  };

  const promoteStudents = async (schoolId) => {
    try {
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

  return (
    <DatabaseContext.Provider value={{ 
      schools, teachers, schoolAdmins, classes, students, grades, lessons, attendance, homework, notes, notices, loading,
      addSchool, addClass, addTeacher, addStudent, addGrade, addLesson, addHomework, addNote, addNotice, toggleAttendance,
      activateProfile, updateClassTeachers, assignStudentToClass,
      deleteSchool, deleteClass, removeTeacherFromClass, removeStudentFromClass,
      deleteTeacher, deleteStudent, archiveCurrentYear, promoteStudents, deleteNotice, updateGrade
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
