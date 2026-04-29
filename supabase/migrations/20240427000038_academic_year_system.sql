-- ========================================
-- ACADEMIC YEAR SYSTEM MIGRATION
-- ========================================
-- Migration: 20240427000038_academic_year_system
-- Description: Create robust academic year and semester system
-- with support for student progression and historical tracking

-- ========================================
-- ACADEMIC YEARS TABLE
-- ========================================
-- Core table for managing academic years (e.g., 2024-2025, 2025-2026)
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "2024-2025", "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- ========================================
-- SEMESTERS TABLE
-- ========================================
-- Semesters within academic years (e.g., Fall, Spring, Summer)
CREATE TABLE IF NOT EXISTS semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Fall", "Spring", "Summer"
  sequence INTEGER NOT NULL, -- 1, 2, 3 for ordering within year
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_semester_dates CHECK (end_date > start_date),
  CONSTRAINT unique_semester_name_per_year UNIQUE(academic_year_id, name),
  CONSTRAINT unique_semester_sequence_per_year UNIQUE(academic_year_id, sequence)
);

-- ========================================
-- GRADE LEVELS TABLE
-- ========================================
-- Standard grade levels offered by the school
CREATE TABLE IF NOT EXISTS grade_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE, -- e.g., 1, 2, 3, ..., 12
  name TEXT NOT NULL, -- e.g., "Grade 1", "Grade 2", "Freshman", "Sophomore"
  section TEXT, -- Optional: "A", "B", "General", "Advanced"
  min_age INTEGER,
  max_age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CLASS SECTIONS TABLE
-- ========================================
-- Replaces/enhances the classes table with proper academic year tracking
CREATE TABLE IF NOT EXISTS class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL, -- NULL if year-long class
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
  name TEXT NOT NULL, -- e.g., "Mathematics 101", "English Literature"
  code TEXT NOT NULL, -- e.g., "MATH101", "ENG201"
  section TEXT, -- e.g., "A", "B", "C"
  room_number TEXT,
  schedule JSONB, -- Flexible schedule storage: {"days": ["Mon", "Wed"], "time": "09:00-10:30"}
  max_students INTEGER DEFAULT 30,
  description TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_class_section UNIQUE(academic_year_id, semester_id, code, section)
);

-- ========================================
-- CLASS ASSIGNMENTS (TEACHERS)
-- ========================================
-- Links teachers to class sections for specific academic years/semesters
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
-- STUDENT ACADEMIC RECORD
-- ========================================
-- Tracks a student's journey through the school system
-- This is the core table for student progression
CREATE TABLE IF NOT EXISTS student_academic_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  grade_level_id UUID NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
  section TEXT, -- e.g., "A", "B", "C" - the student's section for that year
  status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'promoted', 'retained', 'withdrawn', 'transferred', 'graduated')),
  gpa NUMERIC(3, 2),
  class_rank INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_year UNIQUE(student_id, academic_year_id)
);

-- ========================================
-- STUDENT CLASS ENROLLMENTS (ENHANCED)
-- ========================================
-- Replaces the simple student_enrollments with semester-aware tracking
CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'completed', 'auditing')),
  final_grade NUMERIC(5, 2), -- Final grade for the class
  letter_grade TEXT, -- e.g., "A", "B+", "C"
  credits_earned NUMERIC(4, 2) DEFAULT 1.00,
  dropped_date DATE,
  drop_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_class_enrollment UNIQUE(student_id, class_section_id, semester_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_academic_years_dates ON academic_years(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_academic_years_status ON academic_years(status, is_current);
CREATE INDEX IF NOT EXISTS idx_semesters_year ON semesters(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_semesters_dates ON semesters(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_semesters_status ON semesters(status, is_current);
CREATE INDEX IF NOT EXISTS idx_class_sections_year ON class_sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_semester ON class_sections(semester_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_grade ON class_sections(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_class_assignments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_student ON student_academic_records(student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_year ON student_academic_records(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class ON student_class_enrollments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_year ON student_class_enrollments(academic_year_id);

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get current academic year
CREATE OR REPLACE FUNCTION get_current_academic_year()
RETURNS UUID AS $$
  SELECT id FROM academic_years WHERE is_current = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to get current semester
CREATE OR REPLACE FUNCTION get_current_semester()
RETURNS UUID AS $$
  SELECT id FROM semesters WHERE is_current = true LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to promote students to next grade level
CREATE OR REPLACE FUNCTION promote_students(
  p_from_academic_year_id UUID,
  p_to_academic_year_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_from_grade_level_id UUID;
  v_to_grade_level_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Validate academic years exist
  IF NOT EXISTS (SELECT 1 FROM academic_years WHERE id = p_from_academic_year_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source academic year not found');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM academic_years WHERE id = p_to_academic_year_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination academic year not found');
  END IF;

  -- Loop through students and promote them
  FOR v_student_id, v_from_grade_level_id IN
    SELECT student_id, grade_level_id
    FROM student_academic_records
    WHERE academic_year_id = p_from_academic_year_id
      AND status IN ('enrolled', 'promoted')
  LOOP
    -- Find next grade level
    SELECT id INTO v_to_grade_level_id
    FROM grade_levels
    WHERE level = (SELECT level FROM grade_levels WHERE id = v_from_grade_level_id) + 1;

    IF v_to_grade_level_id IS NOT NULL THEN
      -- Create new academic record
      INSERT INTO student_academic_records (
        student_id, academic_year_id, grade_level_id, status
      ) VALUES (
        v_student_id, p_to_academic_year_id, v_to_grade_level_id, 'enrolled'
      );

      -- Update old record status
      UPDATE student_academic_records
      SET status = 'promoted'
      WHERE student_id = v_student_id
        AND academic_year_id = p_from_academic_year_id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'promoted', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enroll student in class (semester-aware)
CREATE OR REPLACE FUNCTION enroll_student_in_class(
  p_student_id UUID,
  p_class_section_id UUID,
  p_semester_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_academic_year_id UUID;
  v_enrollment_count INTEGER;
BEGIN
  -- Get academic year from class
  SELECT academic_year_id INTO v_academic_year_id
  FROM class_sections
  WHERE id = p_class_section_id;

  IF v_academic_year_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class section not found');
  END IF;

  -- Check if already enrolled
  IF EXISTS (
    SELECT 1 FROM student_class_enrollments
    WHERE student_id = p_student_id
      AND class_section_id = p_class_section_id
      AND semester_id = p_semester_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Student already enrolled in this class');
  END IF;

  -- Create enrollment
  INSERT INTO student_class_enrollments (
    student_id, class_section_id, academic_year_id, semester_id, status
  ) VALUES (
    p_student_id, p_class_section_id, v_academic_year_id, p_semester_id, 'active'
  );

  -- Get enrollment count for this class
  SELECT COUNT(*) INTO v_enrollment_count
  FROM student_class_enrollments
  WHERE class_section_id = p_class_section_id AND status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Student enrolled successfully',
    'current_enrollment', v_enrollment_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sections_updated_at BEFORE UPDATE ON class_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_academic_records_updated_at BEFORE UPDATE ON student_academic_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_class_enrollments_updated_at BEFORE UPDATE ON student_class_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins have full access to academic_years" ON academic_years
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to semesters" ON semesters
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to grade_levels" ON grade_levels
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to class_sections" ON class_sections
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to teacher_class_assignments" ON teacher_class_assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to student_academic_records" ON student_academic_records
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have full access to student_class_enrollments" ON student_class_enrollments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Teachers can read academic years, semesters, grade levels
CREATE POLICY "Teachers can read academic_years" ON academic_years
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Teachers can read semesters" ON semesters
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'));

CREATE POLICY "Teachers can read grade_levels" ON grade_levels
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'));

-- Teachers can read their class sections
CREATE POLICY "Teachers can read their class_sections" ON class_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      JOIN teachers t ON t.id = tca.teacher_id
      WHERE tca.class_section_id = class_sections.id
        AND t.user_id = auth.uid()
    )
  );

-- Students can read their own records
CREATE POLICY "Students can read own academic_records" ON student_academic_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_academic_records.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can read own enrollments" ON student_class_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_class_enrollments.student_id AND s.user_id = auth.uid()
    )
  );

-- ========================================
-- GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_academic_year TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_semester TO authenticated;
GRANT EXECUTE ON FUNCTION promote_students TO authenticated;
GRANT EXECUTE ON FUNCTION enroll_student_in_class TO authenticated;
