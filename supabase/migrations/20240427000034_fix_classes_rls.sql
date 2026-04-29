-- ========================================
-- FIX CLASSES RLS - ADD ADMIN INSERT POLICY
-- ========================================
-- Admins were unable to create classes due to missing INSERT policy

-- Drop existing INSERT policies if they exist
DROP POLICY IF EXISTS "classes_admin_insert" ON classes;
DROP POLICY IF EXISTS "classes_teacher_insert_own" ON classes;
DROP POLICY IF EXISTS "Teachers can insert own classes" ON classes;

-- Admin can insert any class
CREATE POLICY "classes_admin_insert"
  ON classes
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Teachers can insert classes for themselves only
CREATE POLICY "classes_teacher_insert_own"
  ON classes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );
