-- =====================================================
-- PRODUCTION RLS DEPLOYMENT SCRIPT
-- School Management System
-- =====================================================
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Copy and paste this entire script
-- 3. Review the "PREREQUISITES" section first
-- 4. Execute the script
-- 5. Verify using the verification query at the end
-- =====================================================

-- =====================================================
-- PREREQUISITES: Verify your schema
-- =====================================================
-- Ensure these tables exist with these columns:
-- users: id (uuid, references auth.users), email, role
-- students: id, user_id (references users), name, class
-- teachers: id, user_id (references users), name
-- parents: id, user_id (references users), name
-- student_parent_relations: id, student_id, parent_id
-- teacher_class_assignments: id, teacher_id, class_name
-- classes: id, name
-- student_enrollments: id, student_id, class_id
-- grades: id, student_id, grade, etc.
-- attendance: id, student_id, status, etc.
-- notifications: id, user_id, etc.

-- =====================================================
-- STEP 1: Create Security Helper Functions
-- =====================================================

-- Helper: Check if current user has a specific role
CREATE OR REPLACE FUNCTION auth_has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = required_role
  );
$$;

-- Helper: Get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- =====================================================
-- STEP 2: Enable RLS on All Tables
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parent_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Drop Any Existing Policies
-- =====================================================

DROP POLICY IF EXISTS "users_" ON users;
DROP POLICY IF EXISTS "students_" ON students;
DROP POLICY IF EXISTS "teachers_" ON teachers;
DROP POLICY IF EXISTS "parents_" ON parents;
DROP POLICY IF EXISTS "spr_" ON student_parent_relations;
DROP POLICY IF EXISTS "tca_" ON teacher_class_assignments;
DROP POLICY IF EXISTS "classes_" ON classes;
DROP POLICY IF EXISTS "enrollments_" ON student_enrollments;
DROP POLICY IF EXISTS "grades_" ON grades;
DROP POLICY IF EXISTS "attendance_" ON attendance;
DROP POLICY IF EXISTS "notifications_" ON notifications;

-- Also drop common policy names
DROP POLICY IF EXISTS "allow_all" ON users;
DROP POLICY IF EXISTS "allow_all" ON students;
DROP POLICY IF EXISTS "allow_authenticated" ON students;
DROP POLICY IF EXISTS "dev_allow_all" ON students;

-- =====================================================
-- STEP 4: USERS TABLE POLICIES
-- =====================================================

-- Admin: Full access to all users
CREATE POLICY "users_admin_all" ON users
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- All users: Read own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- All users: Update own profile (restricted)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 5: STUDENTS TABLE POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "students_admin_all" ON students
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Student: Read own record only
CREATE POLICY "students_student_read_own" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND user_id = auth.uid()
  );

-- Student: Update own limited fields
CREATE POLICY "students_student_update_own" ON students
  FOR UPDATE
  TO authenticated
  USING (
    auth_has_role('student')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('student')
    AND user_id = auth.uid()
    AND class = (SELECT class FROM students WHERE id = students.id)
    AND grade_level = (SELECT grade_level FROM students WHERE id = students.id)
  );

-- Teacher: Read students in assigned classes
CREATE POLICY "students_teacher_read_assigned" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM teacher_class_assignments
      WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND class_name = students.class
    )
  );

-- Parent: Read own children
CREATE POLICY "students_parent_read_children" ON students
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- STEP 6: TEACHERS TABLE POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "teachers_admin_all" ON teachers
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Teacher: Read/update own record
CREATE POLICY "teachers_teacher_own" ON teachers
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND user_id = auth.uid()
  );

-- Student/Parent: Read all teachers (directory)
CREATE POLICY "teachers_read_all" ON teachers
  FOR SELECT
  TO authenticated
  USING (auth_has_role('student') OR auth_has_role('parent'));

-- =====================================================
-- STEP 7: PARENTS TABLE POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "parents_admin_all" ON parents
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Parent: Read/update own record
CREATE POLICY "parents_parent_own" ON parents
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('parent')
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth_has_role('parent')
    AND user_id = auth.uid()
  );

-- =====================================================
-- STEP 8: STUDENT_PARENT_RELATIONS POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "spr_admin_all" ON student_parent_relations
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Parent: Read own relations
CREATE POLICY "spr_parent_read_own" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
  );

-- Parent: Create new relation
CREATE POLICY "spr_parent_create" ON student_parent_relations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_has_role('parent')
    AND parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
  );

-- Student: Read own relations
CREATE POLICY "spr_student_read_own" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- =====================================================
-- STEP 9: TEACHER_CLASS_ASSIGNMENTS POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "tca_admin_all" ON teacher_class_assignments
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Teacher: Read own assignments
CREATE POLICY "tca_teacher_read_own" ON teacher_class_assignments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- =====================================================
-- STEP 10: CLASSES TABLE POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "classes_admin_all" ON classes
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Teacher: Read assigned classes
CREATE POLICY "classes_teacher_read_assigned" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND name IN (
      SELECT class_name FROM teacher_class_assignments
      WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Student: Read enrolled classes
CREATE POLICY "classes_student_read_enrolled" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND id IN (
      SELECT class_id FROM student_enrollments
      WHERE student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

-- Parent: Read children's enrolled classes
CREATE POLICY "classes_parent_read_children" ON classes
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND id IN (
      SELECT class_id FROM student_enrollments
      WHERE student_id IN (
        SELECT student_id FROM student_parent_relations
        WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
      )
    )
  );

-- =====================================================
-- STEP 11: STUDENT_ENROLLMENTS POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "enrollments_admin_all" ON student_enrollments
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Student: Read own enrollments
CREATE POLICY "enrollments_student_read_own" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Teacher: Read enrollments for assigned classes
CREATE POLICY "enrollments_teacher_read_assigned" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND class_id IN (
      SELECT id FROM classes WHERE name IN (
        SELECT class_name FROM teacher_class_assignments
        WHERE teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      )
    )
  );

-- Parent: Read children's enrollments
CREATE POLICY "enrollments_parent_read_children" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND student_id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- STEP 12: GRADES TABLE POLICIES (HIGH SECURITY)
-- =====================================================

-- Admin: Full access
CREATE POLICY "grades_admin_all" ON grades
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Student: Read own grades only
CREATE POLICY "grades_student_read_own" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Teacher: Read grades for assigned class students
CREATE POLICY "grades_teacher_read_assigned" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = grades.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Teacher: Create/Update grades for assigned class students
CREATE POLICY "grades_teacher_manage_assigned" ON grades
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = grades.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = grades.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Parent: Read children's grades
CREATE POLICY "grades_parent_read_children" ON grades
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND student_id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- STEP 13: ATTENDANCE TABLE POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "attendance_admin_all" ON attendance
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- Student: Read own attendance
CREATE POLICY "attendance_student_read_own" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('student')
    AND student_id = (SELECT id FROM students WHERE user_id = auth.uid())
  );

-- Teacher: Read/Update attendance for assigned classes
CREATE POLICY "attendance_teacher_manage_assigned" ON attendance
  FOR ALL
  TO authenticated
  USING (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = attendance.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    auth_has_role('teacher')
    AND EXISTS (
      SELECT 1 FROM students s
      JOIN teacher_class_assignments tca ON tca.class_name = s.class
      WHERE s.id = attendance.student_id
      AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Parent: Read children's attendance
CREATE POLICY "attendance_parent_read_children" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    auth_has_role('parent')
    AND student_id IN (
      SELECT student_id FROM student_parent_relations
      WHERE parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- STEP 14: NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Admin: Full access
CREATE POLICY "notifications_admin_all" ON notifications
  FOR ALL
  TO authenticated
  USING (auth_has_role('admin'))
  WITH CHECK (auth_has_role('admin'));

-- All users: Full access to own notifications
CREATE POLICY "notifications_own" ON notifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- View all policies
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN 'filtered'
    ELSE 'all'
  END as scope
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Summary
SELECT
  'RLS DEPLOYMENT SUMMARY' as title,
  COUNT(DISTINCT tablename) as tables_with_policies,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';
