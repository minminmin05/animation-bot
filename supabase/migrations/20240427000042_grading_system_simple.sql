-- ========================================
-- GRADING SYSTEM (Compatible with existing schema)
-- ========================================
-- Migration: 20240427000042_grading_system_simple
-- Description: Grading system that works with existing tables

-- Note: This version works with your existing 'classes' table
-- Run after: 20240427000038_academic_year_system.sql (if using new system)

-- ========================================
-- Check if academic_years table exists, create placeholder if not
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academic_years') THEN
    -- Create simple placeholder if academic_years doesn't exist
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
  END IF;
END $$;

-- ========================================
-- GRADING SCALES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  scale_type TEXT NOT NULL DEFAULT 'percentage' CHECK (scale_type IN ('percentage', 'gpa', 'points')),
  is_default BOOLEAN DEFAULT false,
  min_gpa NUMERIC(3, 2) DEFAULT 0.00,
  max_gpa NUMERIC(3, 2) DEFAULT 4.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- GRADE LETTER DEFINITIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS grade_letter_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  name TEXT,
  min_percentage NUMERIC(5, 2) NOT NULL,
  max_percentage NUMERIC(5, 2) NOT NULL,
  gpa_value NUMERIC(3, 2),
  is_passing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_percentage_range CHECK (max_percentage > min_percentage),
  CONSTRAINT unique_letter_in_scale UNIQUE(grading_scale_id, letter)
);

-- ========================================
-- GRADE CATEGORIES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  drop_lowest INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 100)
);

-- ========================================
-- ASSIGNMENTS (NEW VERSION)
-- ========================================
CREATE TABLE IF NOT EXISTS assignments_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

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
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_max_points CHECK (max_points > 0),
  CONSTRAINT valid_late_penalty CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100)
);

-- Migrate existing assignments if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments' AND table_schema = 'public') THEN
    -- Check if assignments_new has data, if not migrate
    IF (SELECT COUNT(*) FROM assignments_new) = 0 THEN
      -- Check if old table has total_points or max_points column
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'total_points') THEN
        INSERT INTO assignments_new (id, class_id, teacher_id, title, description, due_date, max_points, assignment_type, created_at)
        SELECT id, class_id, teacher_id, title, description, due_date, total_points, assignment_type, created_at
        FROM assignments
        ON CONFLICT (id) DO NOTHING;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'max_points') THEN
        INSERT INTO assignments_new (id, class_id, teacher_id, title, description, due_date, max_points, assignment_type, created_at)
        SELECT id, class_id, teacher_id, title, description, due_date, max_points, assignment_type, created_at
        FROM assignments
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;

-- Drop old assignments table and rename new one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments' AND table_schema = 'public') THEN
    -- Backup existing assignments references
    ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_assignment_id_fkey;
    DROP TABLE IF EXISTS assignments;
  END IF;
END $$;

ALTER TABLE assignments_new RENAME TO assignments;

-- ========================================
-- STUDENT GRADES (NEW VERSION)
-- ========================================
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  points_earned NUMERIC(6, 2),
  percentage NUMERIC(5, 2),
  letter_grade TEXT,

  submitted_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,

  graded_by UUID REFERENCES teachers(id),
  graded_at TIMESTAMPTZ,
  feedback TEXT,

  is_excused BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'excused', 'missing')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_assignment UNIQUE(student_id, assignment_id)
);

-- Migrate existing grades
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades' AND table_schema = 'public') THEN
    INSERT INTO student_grades (assignment_id, student_id, class_id, points_earned, letter_grade, feedback, created_at)
    SELECT assignment_id, student_id, class_id, grade, NULL, comments, created_at
    FROM grades
    ON CONFLICT (student_id, assignment_id) DO NOTHING;
  END IF;
END $$;

-- ========================================
-- SEMESTER GRADES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS semester_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,

  final_percentage NUMERIC(5, 2),
  letter_grade TEXT,
  grade_points NUMERIC(5, 2),

  teacher_comments TEXT,

  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'incomplete')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_category ON assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_assignment ON student_grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_class ON student_grades(class_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_student ON semester_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_class ON semester_grades(class_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Calculate GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(
  p_student_id UUID,
  p_academic_year_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_gpa NUMERIC(3, 2) := 0.00;
  v_total_points NUMERIC(8, 2) := 0;
  v_total_classes NUMERIC(8, 2) := 0;
BEGIN
  SELECT
    COALESCE(SUM(grade_points), 0),
    COUNT(*)
  INTO v_total_points, v_total_classes
  FROM semester_grades
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND grade_points IS NOT NULL;

  IF v_total_classes > 0 THEN
    v_gpa := v_total_points / v_total_classes;
  END IF;

  RETURN v_gpa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column_grading()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_grading();

CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON student_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_grading();

CREATE TRIGGER update_semester_grades_updated_at BEFORE UPDATE ON semester_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_grading();

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_letter_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_grades ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access grading_scales" ON grading_scales
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access grade_categories" ON grade_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access assignments" ON assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access student_grades" ON student_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Teachers can read their assignments
CREATE POLICY "Teachers read their assignments" ON assignments
  FOR SELECT USING (
    teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
  );

-- Teachers can manage grades for their classes
CREATE POLICY "Teachers manage student_grades" ON student_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = student_grades.class_id
        AND c.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
    )
  );

-- Students can read their own grades
CREATE POLICY "Students read own grades" ON student_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_grades.student_id AND s.user_id = auth.uid()
    )
  );

-- Students can read assignments for their classes
CREATE POLICY "Students read class assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_enrollments sce
      WHERE sce.class_id = assignments.class_id
        AND sce.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
        AND sce.status = 'active'
    )
  );

-- ========================================
-- GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_student_gpa TO authenticated;
