-- =====================================================
-- WORKING RLS POLICIES - Based on Actual Schema
-- Fixed: INSERT policies only use WITH CHECK
-- =====================================================

-- Drop all existing policies
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
  RAISE NOTICE 'All existing policies dropped';
END $$;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================

CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_admin_read_all" ON users
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE POLICY "users_admin_update" ON users
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_insert_signup" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_admin_insert" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_admin_delete" ON users
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 2. STUDENTS TABLE
-- =====================================================

CREATE POLICY "students_read_own" ON students
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "students_read_teachers_classes" ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      JOIN student_enrollments se ON se.class_id = c.id
      WHERE c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
      AND se.student_id = students.id
    )
  );

CREATE POLICY "students_read_parents_children" ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      JOIN parents p ON p.id = spr.parent_id
      WHERE p.user_id = auth.uid() AND spr.student_id = students.id
    )
  );

CREATE POLICY "students_admin_read_all" ON students
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "students_admin_insert" ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "students_admin_update" ON students
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "students_admin_delete" ON students
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 3. TEACHERS TABLE
-- =====================================================

CREATE POLICY "teachers_read_all" ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teachers_update_own" ON teachers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "teachers_admin_insert" ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "teachers_admin_all" ON teachers
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 4. PARENTS TABLE
-- =====================================================

CREATE POLICY "parents_read_own" ON parents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "parents_read_students_parents" ON parents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.parent_id = parents.id
      AND spr.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "parents_read_all" ON parents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "parents_update_own" ON parents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "parents_admin_all" ON parents
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 5. STUDENT_PARENT_RELATIONS TABLE
-- =====================================================

CREATE POLICY "spr_read_own" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM parents WHERE user_id = auth.uid() AND id = parent_id));

CREATE POLICY "spr_read_students_own" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id));

CREATE POLICY "spr_admin_read" ON student_parent_relations
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "spr_admin_insert" ON student_parent_relations
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "spr_admin_all" ON student_parent_relations
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 6. CLASSES TABLE
-- =====================================================

CREATE POLICY "classes_read_own" ON classes
  FOR SELECT
  TO authenticated
  USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "classes_read_enrolled" ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = classes.id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "classes_read_children" ON classes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      JOIN parents p ON p.id = spr.parent_id
      WHERE se.class_id = classes.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "classes_admin_read" ON classes
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "classes_create_own" ON classes
  FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "classes_update_own" ON classes
  FOR UPDATE
  TO authenticated
  USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "classes_admin_all" ON classes
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 7. STUDENT_ENROLLMENTS TABLE
-- =====================================================

CREATE POLICY "enrollments_read_own" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM students WHERE user_id = auth.uid() AND id = student_id));

CREATE POLICY "enrollments_read_teachers_classes" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "enrollments_read_parents" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT spr.student_id FROM student_parent_relations spr
      JOIN parents p ON p.id = spr.parent_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "enrollments_admin_read" ON student_enrollments
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "enrollments_admin_all" ON student_enrollments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 8. ASSIGNMENTS TABLE
-- =====================================================

CREATE POLICY "assignments_read_own" ON assignments
  FOR SELECT
  TO authenticated
  USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "assignments_read_enrolled" ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = assignments.class_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "assignments_read_parents" ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_enrollments se
      JOIN student_parent_relations spr ON spr.student_id = se.student_id
      JOIN parents p ON p.id = spr.parent_id
      WHERE se.class_id = assignments.class_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "assignments_create_own" ON assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "assignments_update_own" ON assignments
  FOR UPDATE
  TO authenticated
  USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()))
  WITH CHECK (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "assignments_admin_all" ON assignments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 9. GRADES TABLE
-- =====================================================

CREATE POLICY "grades_read_own" ON grades
  FOR SELECT
  TO authenticated
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "grades_read_parents" ON grades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.student_id = grades.student_id
      AND spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "grades_read_teachers_classes" ON grades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = grades.class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "grades_create_teachers_classes" ON grades
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = grades.class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "grades_update_teachers_classes" ON grades
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = grades.class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

CREATE POLICY "grades_admin_read" ON grades
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "grades_admin_all" ON grades
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 10. ATTENDANCE TABLE
-- =====================================================

CREATE POLICY "attendance_read_own" ON attendance
  FOR SELECT
  TO authenticated
  USING (student_id = (SELECT id FROM students WHERE user_id = auth.uid()));

CREATE POLICY "attendance_read_parents" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parent_relations spr
      WHERE spr.student_id = attendance.student_id
      AND spr.parent_id = (SELECT id FROM parents WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "attendance_read_teachers_classes" ON attendance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = attendance.class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "attendance_create_teachers_classes" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = attendance.class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "attendance_update_teachers_classes" ON attendance
  FOR UPDATE
  TO authenticated
  USING (
    marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = attendance.class_id AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (marked_by = (SELECT id FROM teachers WHERE user_id = auth.uid()));

CREATE POLICY "attendance_admin_read" ON attendance
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "attendance_admin_all" ON attendance
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- 11. NOTIFICATIONS TABLE
-- =====================================================

CREATE POLICY "notifications_read_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "notifications_delete_admin" ON notifications
  FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd, ', ' ORDER BY cmd) as operations
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
