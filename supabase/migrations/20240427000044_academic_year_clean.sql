-- ========================================
-- ACADEMIC YEAR SYSTEM - CLEAN INSTALL
-- ========================================
-- Run this AFTER 00043 to complete the academic year system
-- This handles tables that may already exist

-- ========================================
-- Drop existing simple tables if they exist
-- ========================================
DROP TABLE IF EXISTS semester_grades CASCADE;
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS assignments_v2 CASCADE;
DROP TABLE IF EXISTS grade_categories CASCADE;
DROP TABLE IF EXISTS grade_letter_definitions CASCADE;
DROP TABLE IF EXISTS grading_scales CASCADE;

-- Note: Keep academic_years but add missing columns if needed
DO $$
BEGIN
  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academic_years' AND column_name = 'status') THEN
    ALTER TABLE academic_years ADD COLUMN status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived'));
  END IF;

  -- Add constraint if missing (check with schema name)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_date_range'
    AND conrelid = 'academic_years'::regclass
  ) THEN
    ALTER TABLE academic_years ADD CONSTRAINT valid_date_range CHECK (end_date > start_date);
  END IF;
END $$;

-- ========================================
-- SEMESTERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_semester_dates CHECK (end_date > start_date),
  CONSTRAINT unique_semester_name_per_year UNIQUE(academic_year_id, name),
  CONSTRAINT unique_semester_sequence_per_year UNIQUE(academic_year_id, sequence)
);

-- ========================================
-- GRADE LEVELS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  section TEXT,
  min_age INTEGER,
  max_age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default grade levels
INSERT INTO grade_levels (level, name) VALUES
  (1, 'ประถมศึกษาปีที่ 1'),
  (2, 'ประถมศึกษาปีที่ 2'),
  (3, 'ประถมศึกษาปีที่ 3'),
  (4, 'ประถมศึกษาปีที่ 4'),
  (5, 'ประถมศึกษาปีที่ 5'),
  (6, 'ประถมศึกษาปีที่ 6'),
  (7, 'มัธยมศึกษาปีที่ 1'),
  (8, 'มัธยมศึกษาปีที่ 2'),
  (9, 'มัธยมศึกษาปีที่ 3'),
  (10, 'มัธยมศึกษาปีที่ 4'),
  (11, 'มัธยมศึกษาปีที่ 5'),
  (12, 'มัธยมศึกษาปีที่ 6')
ON CONFLICT (level) DO NOTHING;

-- ========================================
-- CLASS SECTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  grade_level_id UUID REFERENCES grade_levels(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  section TEXT,
  room_number TEXT,
  schedule JSONB,
  max_students INTEGER DEFAULT 30,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_class_section UNIQUE(academic_year_id, semester_id, code, section)
);

-- Migrate existing classes to class_sections
DO $$
BEGIN
  -- Try to migrate, skip if errors
  BEGIN
    INSERT INTO class_sections (academic_year_id, name, code, grade_level_id, section, room_number, schedule, created_at)
    SELECT
      (SELECT id FROM academic_years WHERE is_current = true LIMIT 1),
      c.name,
      c.name,
      (SELECT id FROM grade_levels WHERE level = c.grade_level LIMIT 1),
      c.section,
      c.room_number,
      NULLIF(c.schedule, '')::jsonb,
      c.created_at
    FROM classes c
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- If migration fails due to JSON issues, insert without schedule
    INSERT INTO class_sections (academic_year_id, name, code, grade_level_id, section, room_number, created_at)
    SELECT
      (SELECT id FROM academic_years WHERE is_current = true LIMIT 1),
      c.name,
      c.name,
      (SELECT id FROM grade_levels WHERE level = c.grade_level LIMIT 1),
      c.section,
      c.room_number,
      c.created_at
    FROM classes c
    ON CONFLICT DO NOTHING;
  END;
END $$;

-- ========================================
-- TEACHER CLASS ASSIGNMENTS
-- ========================================
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'primary' CHECK (role IN ('primary', 'assistant', 'substitute')),
  assigned_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_teacher_class UNIQUE(class_section_id, teacher_id, status)
);

-- Migrate existing teacher assignments
INSERT INTO teacher_class_assignments (class_section_id, teacher_id, created_at)
SELECT cs.id, c.teacher_id, NOW()
FROM classes c
JOIN class_sections cs ON cs.code = c.name
ON CONFLICT DO NOTHING;

-- ========================================
-- STUDENT ACADEMIC RECORDS
-- ========================================
CREATE TABLE IF NOT EXISTS student_academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
  section TEXT,
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'promoted', 'retained', 'withdrawn', 'transferred', 'graduated')),
  gpa NUMERIC(3, 2),
  class_rank INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_year UNIQUE(student_id, academic_year_id)
);

-- Migrate existing students
DO $$
BEGIN
  -- First, try to migrate students with valid grade_level
  INSERT INTO student_academic_records (student_id, academic_year_id, grade_level_id, section, created_at)
  SELECT
    s.id,
    (SELECT id FROM academic_years WHERE is_current = true LIMIT 1),
    (SELECT id FROM grade_levels WHERE level = s.grade_level LIMIT 1),
    s.class,
    s.created_at
  FROM students s
  WHERE s.grade_level IS NOT NULL
    AND EXISTS (SELECT 1 FROM grade_levels WHERE level = s.grade_level LIMIT 1)
  ON CONFLICT DO NOTHING;

  -- For students without grade_level, assign to grade 1 as default
  INSERT INTO student_academic_records (student_id, academic_year_id, grade_level_id, section, created_at)
  SELECT
    s.id,
    (SELECT id FROM academic_years WHERE is_current = true LIMIT 1),
    (SELECT id FROM grade_levels WHERE level = 1 LIMIT 1),
    COALESCE(s.class, 'Unassigned'),
    s.created_at
  FROM students s
  WHERE s.grade_level IS NULL
    OR NOT EXISTS (SELECT 1 FROM grade_levels WHERE level = s.grade_level LIMIT 1)
  ON CONFLICT DO NOTHING;
END $$;

-- ========================================
-- STUDENT CLASS ENROLLMENTS
-- ========================================
CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed', 'auditing')),
  final_grade NUMERIC(5, 2),
  letter_grade TEXT,
  credits_earned NUMERIC(4, 2) DEFAULT 1.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_class_enrollment UNIQUE(student_id, class_section_id, semester_id)
);

-- Migrate existing enrollments
DO $$
BEGIN
  -- Try to migrate enrollments where class matches
  BEGIN
    INSERT INTO student_class_enrollments (student_id, class_section_id, academic_year_id, enrollment_date, created_at)
    SELECT
      se.student_id,
      cs.id,
      (SELECT id FROM academic_years WHERE is_current = true LIMIT 1),
      se.enrollment_date,
      se.created_at
    FROM student_enrollments se
    JOIN classes c ON se.class_id = c.id
    JOIN class_sections cs ON cs.name = c.name
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not migrate all enrollments: %', SQLERRM;
  END;
END $$;

-- ========================================
-- RECREATE GRADING TABLES (from 00043 but with proper references)
-- ========================================

-- Grading Scales
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  scale_type TEXT NOT NULL DEFAULT 'percentage',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO grading_scales (name, description, is_default)
VALUES ('Standard 4.0', 'Standard US 4.0 GPA scale', true)
ON CONFLICT (name) DO NOTHING;

-- Grade Letter Definitions
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

INSERT INTO grade_letter_definitions (grading_scale_id, letter, min_percentage, max_percentage, gpa_value, is_passing)
SELECT gs.id, g.letter, g.min_pct, g.max_pct, g.gpa_val, g.passing
FROM grading_scales gs, (VALUES
  ('A', 90.00, 100.00, 4.00, true),
  ('B', 80.00, 89.99, 3.00, true),
  ('C', 70.00, 79.99, 2.00, true),
  ('D', 60.00, 69.99, 1.00, true),
  ('F', 0.00, 59.99, 0.00, false)
) AS g(letter, min_pct, max_pct, gpa_val, passing)
WHERE gs.name = 'Standard 4.0'
ON CONFLICT (grading_scale_id, letter) DO NOTHING;

-- Grade Categories (now references class_sections)
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID REFERENCES class_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  drop_lowest INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments (now references class_sections)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Grades
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,

  points_earned NUMERIC(6, 2),
  percentage NUMERIC(5, 2),
  letter_grade TEXT,

  submitted_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,

  feedback TEXT,
  is_excused BOOLEAN DEFAULT false,

  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'excused')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, assignment_id)
);

-- Semester Grades
CREATE TABLE IF NOT EXISTS semester_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,

  final_percentage NUMERIC(5, 2),
  letter_grade TEXT,
  grade_points NUMERIC(5, 2),
  credits_earned NUMERIC(4, 2) DEFAULT 1.00,

  teacher_comments TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_semesters_year ON semesters(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_year ON class_sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_grade ON class_sections(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_class_assignments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_student ON student_academic_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_student ON semester_grades(student_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Get current academic year
CREATE OR REPLACE FUNCTION get_current_academic_year()
RETURNS UUID AS $$
  SELECT id FROM academic_years WHERE is_current = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Get current semester
CREATE OR REPLACE FUNCTION get_current_semester()
RETURNS UUID AS $$
  SELECT id FROM semesters WHERE is_current = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Set current academic period (with lock)
CREATE OR REPLACE FUNCTION set_current_academic_period(
  p_academic_year_id UUID DEFAULT NULL,
  p_semester_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(123456789);

  IF p_academic_year_id IS NOT NULL THEN
    UPDATE academic_years SET is_current = false WHERE is_current = true;
    UPDATE academic_years SET is_current = true, status = 'active' WHERE id = p_academic_year_id;
  END IF;

  IF p_semester_id IS NOT NULL THEN
    UPDATE semesters SET is_current = false WHERE is_current = true;
    UPDATE semesters SET is_current = true, status = 'active' WHERE id = p_semester_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate student GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(
  p_student_id UUID,
  p_academic_year_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_gpa NUMERIC(3, 2) := 0.00;
BEGIN
  SELECT COALESCE(AVG(grade_points), 0)
  INTO v_gpa
  FROM semester_grades
  WHERE student_id = p_student_id
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND grade_points IS NOT NULL;

  RETURN v_gpa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_academic_years_updated_at ON academic_years;
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sections_updated_at BEFORE UPDATE ON class_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON student_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins full access academic_years" ON academic_years
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access semesters" ON semesters
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access class_sections" ON class_sections
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access assignments" ON assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access student_grades" ON student_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Teachers can read their assignments
CREATE POLICY "Teachers read their assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      WHERE tca.class_section_id = assignments.class_section_id
        AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
        AND tca.status = 'active'
    )
  );

-- Teachers can manage grades for their classes
CREATE POLICY "Teachers manage student_grades" ON student_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      WHERE tca.class_section_id = student_grades.class_section_id
        AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
        AND tca.status = 'active'
    )
  );

-- Students can read their own data
CREATE POLICY "Students read own academic_records" ON student_academic_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_academic_records.student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Students read own enrollments" ON student_class_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_class_enrollments.student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Students read own grades" ON student_grades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_grades.student_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Students read own semester_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = semester_grades.student_id AND s.user_id = auth.uid())
  );

-- Everyone can read grading scales
CREATE POLICY "All read grading_scales" ON grading_scales
  FOR SELECT USING (true);

-- Students can read assignments for their classes
CREATE POLICY "Students read class assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.class_section_id = assignments.class_section_id
        AND sce.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
        AND sce.status = 'active'
    )
  );

-- ========================================
-- GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_academic_year TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_semester TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_academic_period TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_student_gpa TO authenticated;
