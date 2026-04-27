-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================
-- Migration: 20240427000002_rls_policies
-- Description: Enable RLS and create security policies for all tables

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USERS TABLE POLICIES
-- ========================================
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Allow user insert during signup"
  ON users FOR INSERT
  WITH CHECK (true);

-- ========================================
-- STUDENTS TABLE POLICIES
-- ========================================
CREATE POLICY "Students can view own data"
  ON students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view their students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN student_enrollments se ON se.class_id = c.id
      WHERE c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND se.student_id = students.id
    )
  );

CREATE POLICY "Parents can view children data"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      JOIN parents p ON p.id = spr.parent_id
      WHERE p.user_id = auth.uid() AND spr.student_id = students.id
    )
  );

CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- TEACHERS TABLE POLICIES
-- ========================================
CREATE POLICY "Teachers can view own profile"
  ON teachers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view teachers"
  ON teachers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ========================================
-- PARENTS TABLE POLICIES
-- ========================================
CREATE POLICY "Parents can view own profile"
  ON parents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can view own parents"
  ON parents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.parent_id = parents.id
      AND spr.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- ========================================
-- CLASSES TABLE POLICIES
-- ========================================
CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT
  USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "Students can view enrolled classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = classes.id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      JOIN parents p ON p.id = spr.parent_id
      WHERE se.class_id = classes.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can update own classes"
  ON classes FOR UPDATE
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- ASSIGNMENTS TABLE POLICIES
-- ========================================
CREATE POLICY "Teachers can view own assignments"
  ON assignments FOR SELECT
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can view class assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = assignments.class_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children assignments"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      JOIN parents p ON p.id = spr.parent_id
      WHERE se.class_id = assignments.class_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can update own assignments"
  ON assignments FOR UPDATE
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- GRADES TABLE POLICIES
-- ========================================
CREATE POLICY "Students can view own grades"
  ON grades FOR SELECT
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Parents can view children grades"
  ON grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.student_id = grades.student_id
      AND spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Teachers can view class grades"
  ON grades FOR SELECT
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can manage grades"
  ON grades FOR ALL
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- ATTENDANCE TABLE POLICIES
-- ========================================
CREATE POLICY "Students can view own attendance"
  ON attendance FOR SELECT
  USING (
    student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Parents can view children attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.student_id = attendance.student_id
      AND spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Teachers can manage attendance"
  ON attendance FOR ALL
  USING (
    marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- ========================================
-- NOTIFICATIONS TABLE POLICIES
-- ========================================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
