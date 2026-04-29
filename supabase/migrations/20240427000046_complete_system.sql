-- ========================================
-- COMPLETE ACADEMIC & GRADING SYSTEM - SIMPLE VERSION
-- ========================================
-- Run this AFTER running 00045_cleanup.sql
-- This creates everything fresh without complex migrations

-- ========================================
-- 1. ACADEMIC YEARS (update if exists)
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academic_years') THEN
    CREATE TABLE academic_years (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_current BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_date_range CHECK (end_date > start_date)
    );

    INSERT INTO academic_years (name, start_date, end_date, is_current)
    VALUES (
      EXTRACT(YEAR FROM CURRENT_DATE)::text || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text,
      DATE_TRUNC('year', CURRENT_DATE)::date,
      (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::date,
      true
    );
  END IF;
END $$;

-- ========================================
-- 2. SEMESTERS
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
-- 3. GRADE LEVELS
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

-- Insert default grade levels if empty
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM grade_levels) = 0 THEN
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
      (12, 'มัธยมศึกษาปีที่ 6');
  END IF;
END $$;

-- ========================================
-- 4. CLASS SECTIONS
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

-- ========================================
-- 5. TEACHER CLASS ASSIGNMENTS
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

-- ========================================
-- 6. STUDENT ACADEMIC RECORDS
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

-- ========================================
-- 7. STUDENT CLASS ENROLLMENTS
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

-- ========================================
-- 8. GRADING SCALES
-- ========================================
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  scale_type TEXT NOT NULL DEFAULT 'percentage',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM grading_scales) = 0 THEN
    INSERT INTO grading_scales (name, description, is_default)
    VALUES ('Standard 4.0', 'Standard US 4.0 GPA scale', true);
  END IF;
END $$;

-- ========================================
-- 9. GRADE LETTER DEFINITIONS
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

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM grade_letter_definitions) = 0 THEN
    INSERT INTO grade_letter_definitions (grading_scale_id, letter, min_percentage, max_percentage, gpa_value, is_passing)
    SELECT
      gs.id,
      g.letter,
      g.min_pct,
      g.max_pct,
      g.gpa_val,
      g.passing
    FROM grading_scales gs,
    (VALUES
      ('A', 90.00, 100.00, 4.00, true),
      ('B', 80.00, 89.99, 3.00, true),
      ('C', 70.00, 79.99, 2.00, true),
      ('D', 60.00, 69.99, 1.00, true),
      ('F', 0.00, 59.99, 0.00, false)
    ) AS g(letter, min_pct, max_pct, gpa_val, passing)
    WHERE gs.name = 'Standard 4.0';
  END IF;
END $$;

-- ========================================
-- 10. GRADE CATEGORIES
-- ========================================
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID REFERENCES class_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  drop_lowest INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 11. ASSIGNMENTS
-- ========================================
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

-- ========================================
-- 12. STUDENT GRADES
-- ========================================
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

-- ========================================
-- 13. SEMESTER GRADES
-- ========================================
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
-- 14. INDEXES
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
-- 15. FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION get_current_academic_year()
RETURNS UUID AS $$
  SELECT id FROM academic_years WHERE is_current = true LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_current_semester()
RETURNS UUID AS $$
  SELECT id FROM semesters WHERE is_current = true LIMIT 1;
$$ LANGUAGE sql STABLE;

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

DROP FUNCTION IF EXISTS calculate_student_gpa CASCADE;

CREATE FUNCTION calculate_student_gpa(
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
-- 16. TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_academic_years_updated_at ON academic_years;
DROP TRIGGER IF EXISTS update_semesters_updated_at ON semesters;
DROP TRIGGER IF EXISTS update_class_sections_updated_at ON class_sections;
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
DROP TRIGGER IF EXISTS update_student_grades_updated_at ON student_grades;

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
-- 17. RLS POLICIES
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
DROP POLICY IF EXISTS "Admins full access academic_years" ON academic_years;
CREATE POLICY "Admins full access academic_years" ON academic_years
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access semesters" ON semesters;
CREATE POLICY "Admins full access semesters" ON semesters
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access class_sections" ON class_sections;
CREATE POLICY "Admins full access class_sections" ON class_sections
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access assignments" ON assignments;
CREATE POLICY "Admins full access assignments" ON assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access student_grades" ON student_grades;
CREATE POLICY "Admins full access student_grades" ON student_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access semester_grades" ON semester_grades;
CREATE POLICY "Admins full access semester_grades" ON semester_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access student_academic_records" ON student_academic_records;
CREATE POLICY "Admins full access student_academic_records" ON student_academic_records
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access student_class_enrollments" ON student_class_enrollments;
CREATE POLICY "Admins full access student_class_enrollments" ON student_class_enrollments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access grade_categories" ON grade_categories;
CREATE POLICY "Admins full access grade_categories" ON grade_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Teachers
DROP POLICY IF EXISTS "Teachers read their assignments" ON assignments;
CREATE POLICY "Teachers read their assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      WHERE tca.class_section_id = assignments.class_section_id
        AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
        AND tca.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Teachers manage student_grades" ON student_grades;
CREATE POLICY "Teachers manage student_grades" ON student_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      WHERE tca.class_section_id = student_grades.class_section_id
        AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
        AND tca.status = 'active'
    )
  );

-- Students
DROP POLICY IF EXISTS "Students read own academic_records" ON student_academic_records;
CREATE POLICY "Students read own academic_records" ON student_academic_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_academic_records.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students read own enrollments" ON student_class_enrollments;
CREATE POLICY "Students read own enrollments" ON student_class_enrollments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_class_enrollments.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students read own grades" ON student_grades;
CREATE POLICY "Students read own grades" ON student_grades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_grades.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students read own semester_grades" ON semester_grades;
CREATE POLICY "Students read own semester_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = semester_grades.student_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students read class assignments" ON assignments;
CREATE POLICY "Students read class assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_class_enrollments sce
      WHERE sce.class_section_id = assignments.class_section_id
        AND sce.student_id = (SELECT id FROM students WHERE user_id = auth.uid())
        AND sce.status = 'active'
    )
  );

-- Everyone can read some tables
DROP POLICY IF EXISTS "All read grading_scales" ON grading_scales;
CREATE POLICY "All read grading_scales" ON grading_scales
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "All read grade_levels" ON grade_levels;
CREATE POLICY "All read grade_levels" ON grade_levels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "All read semesters" ON semesters;
CREATE POLICY "All read semesters" ON semesters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "All read class_sections" ON class_sections;
CREATE POLICY "All read class_sections" ON class_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "All read academic_years" ON academic_years;
CREATE POLICY "All read academic_years" ON academic_years
  FOR SELECT USING (true);

-- ========================================
-- 18. GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_academic_year TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_semester TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_academic_period TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_student_gpa TO authenticated;

SELECT 'Setup completed successfully!' as result;
