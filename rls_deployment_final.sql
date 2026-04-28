-- =====================================================
-- FINAL OPTIMIZED RLS DEPLOYMENT SCRIPT
-- School Management System - Production Ready
-- =====================================================
-- This script fixes all production issues:
-- 1. Migrates class_name → class_id (UUID-based)
-- 2. Optimizes policies with centralized helpers
-- 3. Removes FOR ALL conflicts
-- 4. Adds performance indexes
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 2: CREATE SECURITY HELPER FUNCTIONS
-- =====================================================

-- Get current user auth data (cached, single call)
CREATE OR REPLACE FUNCTION current_auth()
RETURNS TABLE (
  user_id uuid,
  user_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid(), (SELECT role FROM users WHERE id = auth.uid())
$$;

-- Get current user's student ID (NULL if not student)
CREATE OR REPLACE FUNCTION current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM students WHERE user_id = auth.uid() LIMIT 1
$$;

-- Get current user's teacher ID (NULL if not teacher)
CREATE OR REPLACE FUNCTION current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid() LIMIT 1
$$;

-- Get current user's parent ID (NULL if not parent)
CREATE OR REPLACE FUNCTION current_parent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM parents WHERE user_id = auth.uid() LIMIT 1
$$;

-- Get accessible student IDs (single call for all access logic)
CREATE OR REPLACE FUNCTION accessible_student_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin: all students
  SELECT s.id FROM students s
  JOIN current_auth() ca ON true WHERE ca.user_role = 'admin'
  UNION ALL
  -- Student: only self
  SELECT s.id FROM students s WHERE s.user_id = auth.uid()
  UNION ALL
  -- Teacher: students in assigned classes (uses class_id)
  SELECT DISTINCT se.student_id
  FROM student_enrollments se
  JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
  WHERE tca.teacher_id = current_teacher_id()
  UNION ALL
  -- Parent: linked children
  SELECT spr.student_id
  FROM student_parent_relations spr
  WHERE spr.parent_id = current_parent_id()
$$;

-- =====================================================
-- STEP 3: MIGRATE CLASS_NAME → CLASS_ID
-- =====================================================

-- Add class_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teacher_class_assignments'
    AND column_name = 'class_id'
  ) THEN
    ALTER TABLE teacher_class_assignments
    ADD COLUMN class_id uuid REFERENCES classes(id) ON DELETE CASCADE;

    -- Migrate existing data
    UPDATE teacher_class_assignments tca
    SET class_id = (SELECT id FROM classes WHERE name = tca.class_name LIMIT 1)
    WHERE class_id IS NULL AND class_name IS NOT NULL;

    RAISE NOTICE 'Migrated class_name to class_id';
  END IF;
END $$;

-- Create index on class_id
CREATE INDEX IF NOT EXISTS idx_tca_class_id
  ON teacher_class_assignments(class_id);

-- =====================================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- =====================================================

-- RLS optimization indexes (partial indexes are smaller/faster)
CREATE INDEX IF NOT EXISTS idx_students_user_id_rls
  ON students(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tca_teacher_class
  ON teacher_class_assignments(teacher_id, class_id)
  WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spr_parent_student
  ON student_parent_relations(parent_id, student_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_student_class
  ON student_enrollments(student_id, class_id)
  WHERE student_id IS NOT NULL;

-- =====================================================
-- STEP 5: DROP ALL EXISTING POLICIES
-- =====================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
  RAISE NOTICE 'Dropped all existing policies';
END $$;

-- =====================================================
-- STEP 6: ENABLE RLS ON ALL TABLES
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
-- STEP 7: CREATE OPTIMIZED POLICIES
-- =====================================================

-- ═══════════════════════════════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "users_select" ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR id = auth.uid()
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- STUDENTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "students_select" ON students
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT accessible_student_ids()));

CREATE POLICY "students_insert_admin" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

CREATE POLICY "students_update" ON students
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      user_id = auth.uid()
      AND class = (SELECT class FROM students WHERE id = students.id)
      AND grade_level = (SELECT grade_level FROM students WHERE id = students.id)
    )
  );

CREATE POLICY "students_delete_admin" ON students
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- TEACHERS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "teachers_select_all" ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teachers_update" ON teachers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "teachers_insert_admin" ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

CREATE POLICY "teachers_delete_admin" ON teachers
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- PARENTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "parents_select" ON parents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "parents_update" ON parents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "parents_insert_admin" ON parents
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

CREATE POLICY "parents_delete_admin" ON parents
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- TEACHER_CLASS_ASSIGNMENTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "tca_select" ON teacher_class_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR teacher_id = current_teacher_id()
  );

CREATE POLICY "tca_modify_admin" ON teacher_class_assignments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- CLASSES TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "classes_select" ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR id IN (
      SELECT tca.class_id FROM teacher_class_assignments
      WHERE teacher_id = current_teacher_id()
    )
    OR id IN (
      SELECT class_id FROM student_enrollments
      WHERE student_id = current_student_id()
    )
    OR id IN (
      SELECT se.class_id FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      WHERE spr.parent_id = current_parent_id()
    )
  );

CREATE POLICY "classes_modify_admin" ON classes
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- STUDENT_ENROLLMENTS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "enrollments_select" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR student_id = current_student_id()
    OR class_id IN (
      SELECT tca.class_id FROM teacher_class_assignments tca
      WHERE tca.teacher_id = current_teacher_id()
    )
    OR student_id IN (
      SELECT spr.student_id FROM student_parent_relations spr
      WHERE spr.parent_id = current_parent_id()
    )
  );

CREATE POLICY "enrollments_modify_admin" ON student_enrollments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- GRADES TABLE (HIGH SECURITY)
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "grades_select" ON grades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR student_id = current_student_id()
    OR student_id IN (
      SELECT se.student_id FROM student_enrollments se
      JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
      WHERE tca.teacher_id = current_teacher_id()
    )
    OR student_id IN (
      SELECT spr.student_id FROM student_parent_relations spr
      WHERE spr.parent_id = current_parent_id()
    )
  );

CREATE POLICY "grades_insert" ON grades
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
        WHERE se.student_id = grades.student_id
        AND tca.teacher_id = current_teacher_id()
      )
    )
  );

CREATE POLICY "grades_update" ON grades
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
        WHERE se.student_id = grades.student_id
        AND tca.teacher_id = current_teacher_id()
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
        WHERE se.student_id = grades.student_id
        AND tca.teacher_id = current_teacher_id()
      )
    )
  );

CREATE POLICY "grades_delete_admin" ON grades
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- ATTENDANCE TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "attendance_select" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR student_id = current_student_id()
    OR student_id IN (
      SELECT se.student_id FROM student_enrollments se
      JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
      WHERE tca.teacher_id = current_teacher_id()
    )
    OR student_id IN (
      SELECT spr.student_id FROM student_parent_relations spr
      WHERE spr.parent_id = current_parent_id()
    )
  );

CREATE POLICY "attendance_insert" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
        WHERE se.student_id = attendance.student_id
        AND tca.teacher_id = current_teacher_id()
      )
    )
  );

CREATE POLICY "attendance_update" ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
        WHERE se.student_id = attendance.student_id
        AND tca.teacher_id = current_teacher_id()
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM student_enrollments se
        JOIN teacher_class_assignments tca ON tca.class_id = se.class_id
        WHERE se.student_id = attendance.student_id
        AND tca.teacher_id = current_teacher_id()
      )
    )
  );

CREATE POLICY "attendance_delete_admin" ON attendance
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

-- ═══════════════════════════════════════════════════════════
-- STUDENT_PARENT_RELATIONS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "spr_select" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR parent_id = current_parent_id()
    OR student_id = current_student_id()
  );

CREATE POLICY "spr_insert" ON student_parent_relations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR (
      EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'parent')
      AND parent_id = current_parent_id()
    )
  );

CREATE POLICY "spr_update_admin" ON student_parent_relations
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin'));

CREATE POLICY "spr_delete" ON student_parent_relations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR parent_id = current_parent_id()
  );

-- ═══════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE
-- ═══════════════════════════════════════════════════════════
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM current_auth() WHERE user_role = 'admin')
    OR user_id = auth.uid()
  );

-- =====================================================
-- STEP 8: UPDATE STATISTICS
-- =====================================================
ANALYZE;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

SELECT
  'RLS DEPLOYMENT COMPLETE' as status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls;
