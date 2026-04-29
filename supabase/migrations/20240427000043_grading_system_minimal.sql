-- ========================================
-- GRADING SYSTEM - MINIMAL VERSION
-- ========================================
-- Run this in Supabase SQL Editor
-- This creates fresh tables without migrating old data

-- ========================================
-- ACADEMIC YEARS (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert current year
INSERT INTO academic_years (name, start_date, end_date, is_current)
VALUES (
  EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text,
  DATE_TRUNC('year', CURRENT_DATE)::date,
  (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::date,
  true
) ON CONFLICT (name) DO NOTHING;

-- ========================================
-- GRADING SCALES
-- ========================================
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  scale_type TEXT NOT NULL DEFAULT 'percentage',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scale
INSERT INTO grading_scales (name, description, is_default)
VALUES ('Standard 4.0', 'Standard US 4.0 GPA scale', true)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- GRADE LETTER DEFINITIONS
-- ========================================
CREATE TABLE IF NOT EXISTS grade_letter_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  min_percentage NUMERIC(5, 2) NOT NULL,
  max_percentage NUMERIC(5, 2) NOT NULL,
  gpa_value NUMERIC(3, 2),
  is_passing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grading_scale_id, letter)
);

-- Insert default grades
INSERT INTO grade_letter_definitions (grading_scale_id, letter, min_percentage, max_percentage, gpa_value, is_passing)
SELECT
  gs.id,
  g.letter,
  g.min_pct,
  g.max_pct,
  g.gpa_val,
  g.passing
FROM grading_scales gs
CROSS JOIN (VALUES
  ('A', 90.00, 100.00, 4.00, true),
  ('B', 80.00, 89.99, 3.00, true),
  ('C', 70.00, 79.99, 2.00, true),
  ('D', 60.00, 69.99, 1.00, true),
  ('F', 0.00, 59.99, 0.00, false)
) AS g(letter, min_pct, max_pct, gpa_val, passing)
WHERE gs.name = 'Standard 4.0'
ON CONFLICT (grading_scale_id, letter) DO NOTHING;

-- ========================================
-- GRADE CATEGORIES
-- ========================================
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID,
  name TEXT NOT NULL,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  drop_lowest INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ASSIGNMENTS (New clean table)
-- ========================================
CREATE TABLE IF NOT EXISTS assignments_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  max_points NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
  passing_score NUMERIC(6, 2) DEFAULT 60.00,

  assignment_type TEXT DEFAULT 'homework' CHECK (assignment_type IN (
    'homework', 'quiz', 'test', 'exam', 'project', 'presentation', 'participation'
  )),

  due_date DATE NOT NULL,
  allow_late_submission BOOLEAN DEFAULT true,
  late_penalty_percent NUMERIC(5, 2) DEFAULT 10.00,

  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- STUDENT GRADES
-- ========================================
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments_v2(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,

  points_earned NUMERIC(6, 2),
  percentage NUMERIC(5, 2),
  letter_grade TEXT,

  submitted_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,

  feedback TEXT,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'excused')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, assignment_id)
);

-- ========================================
-- SEMESTER GRADES
-- ========================================
CREATE TABLE IF NOT EXISTS semester_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,

  final_percentage NUMERIC(5, 2),
  letter_grade TEXT,
  grade_points NUMERIC(5, 2),

  teacher_comments TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_assignments_v2_class ON assignments_v2(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_v2_teacher ON assignments_v2(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_assignment ON student_grades(assignment_id);

-- ========================================
-- FUNCTION: Calculate GPA
-- ========================================
CREATE OR REPLACE FUNCTION calculate_student_gpa(p_student_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_gpa NUMERIC(3, 2) := 0.00;
BEGIN
  SELECT COALESCE(AVG(grade_points), 0)
  INTO v_gpa
  FROM semester_grades
  WHERE student_id = p_student_id
    AND grade_points IS NOT NULL;

  RETURN v_gpa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access grading_scales" ON grading_scales
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access assignments_v2" ON assignments_v2
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access student_grades" ON student_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Everyone can read grading scales
CREATE POLICY "All read grading_scales" ON grading_scales
  FOR SELECT USING (true);

-- Teachers can manage their assignments
CREATE POLICY "Teachers manage assignments_v2" ON assignments_v2
  FOR ALL USING (teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()));

-- Students can read their grades
CREATE POLICY "Students read own grades" ON student_grades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_grades.student_id AND s.user_id = auth.uid())
  );

-- ========================================
-- GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_student_gpa TO authenticated;
