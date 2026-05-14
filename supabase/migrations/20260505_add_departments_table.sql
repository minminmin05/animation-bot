-- ============================================
-- DEPARTMENT SYSTEM MIGRATION
-- 2026-05-04
-- ============================================
-- This migration creates a proper department system
-- and migrates existing department text data to
-- a relational structure
-- ============================================

-- ============================================
-- STEP 1: Create departments table
-- ============================================

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.departments IS 'School departments for organizing teachers and classes';
COMMENT ON COLUMN public.departments.name IS 'Unique department name (e.g., STEM, Humanities, Arts)';
COMMENT ON COLUMN public.departments.id IS 'Primary key - referenced by teachers.department_id';

-- ============================================
-- STEP 2: Enable RLS and create policies
-- ============================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view departments
CREATE POLICY "All authenticated users can view departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert departments
CREATE POLICY "Admins can create departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update departments
CREATE POLICY "Admins can update departments"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete departments
CREATE POLICY "Admins can delete departments"
  ON public.departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- STEP 3: Add department_id column to teachers table
-- ============================================

-- Add the new column as nullable initially
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.teachers.department_id IS 'Foreign key reference to departments table';
COMMENT ON COLUMN public.teachers.department IS 'Legacy department name - will be deprecated after migration';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON public.teachers(department_id);

-- ============================================
-- STEP 4: Migrate existing department data
-- ============================================

-- Insert existing unique departments from teachers table
INSERT INTO public.departments (name)
SELECT DISTINCT department
FROM public.teachers
WHERE department IS NOT NULL
  AND department != 'Unassigned'
  AND NOT EXISTS (
    SELECT 1 FROM public.departments WHERE departments.name = teachers.department
  );

-- Update teachers to reference the new department_id
UPDATE public.teachers
SET department_id = (
  SELECT id FROM public.departments WHERE departments.name = teachers.department
)
WHERE department IS NOT NULL
  AND department != 'Unassigned'
  AND department_id IS NULL;

-- ============================================
-- STEP 5: Create helper functions for department management
-- ============================================

-- Function to get all departments with teacher count
CREATE OR REPLACE FUNCTION public.get_departments_with_teacher_count()
RETURNS TABLE (
  id UUID,
  name TEXT,
  teacher_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    COUNT(t.id) AS teacher_count,
    d.created_at
  FROM public.departments d
  LEFT JOIN public.teachers t ON t.department_id = d.id
  GROUP BY d.id, d.name, d.created_at
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_departments_with_teacher_count() TO authenticated;

-- Function to get a department by ID with teacher details
CREATE OR REPLACE FUNCTION public.get_department_with_teachers(dept_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  teachers JSONB
) AS $$
DECLARE
  teachers_json JSONB;
BEGIN
  -- Get department info
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.created_at,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'subject', t.subject,
        'email', u.email
      ))
      FROM public.teachers t
      JOIN public.users u ON u.id = t.user_id
      WHERE t.department_id = dept_id
    ) AS teachers
  FROM public.departments d
  WHERE d.id = dept_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_department_with_teachers(UUID) TO authenticated;

-- ============================================
-- STEP 6: Update the admin_get_teachers_with_emails function
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.admin_get_teachers_with_emails() CASCADE;

-- Recreate with department join
CREATE OR REPLACE FUNCTION public.admin_get_teachers_with_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  subject TEXT,
  department TEXT,
  department_id UUID,
  employee_id TEXT,
  phone TEXT,
  qualifications TEXT,
  hire_date DATE,
  email TEXT,
  full_name TEXT,
  class_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.name,
    t.subject,
    COALESCE(d.name, t.department, 'Unassigned') AS department,
    t.department_id,
    t.employee_id,
    t.phone,
    t.qualifications,
    t.hire_date,
    u.email,
    u.full_name,
    COUNT(DISTINCT c.id) AS class_count,
    t.created_at
  FROM public.teachers t
  JOIN public.users u ON u.id = t.user_id
  LEFT JOIN public.departments d ON d.id = t.department_id
  LEFT JOIN public.classes c ON c.teacher_id = t.id
  GROUP BY
    t.id, t.user_id, t.name, t.subject, t.department,
    t.department_id, t.employee_id, t.phone, t.qualifications,
    t.hire_date, u.email, u.full_name, d.name, t.created_at
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_get_teachers_with_emails() TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Verify departments were created correctly
-- 2. Verify teachers.department_id was populated
-- 3. Update frontend to use department_id
-- 4. (Optional) After frontend update, drop the department text column
-- ============================================
