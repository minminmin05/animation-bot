-- ========================================
-- GRADING SYSTEM MIGRATION
-- ========================================
-- Migration: 20240427000040_grading_system
-- Description: Comprehensive grading system compatible with academic year system

-- ========================================
-- GRADING SCALES TABLE
-- ========================================
-- Defines different grading scales (e.g., Standard, Honors, AP)
CREATE TABLE IF NOT EXISTS grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "Standard 4.0", "Thai 10-point", "Pass/Fail"
  description TEXT,
  scale_type TEXT NOT NULL DEFAULT 'points' CHECK (scale_type IN ('points', 'percentage', 'gpa', 'pass_fail')),
  is_default BOOLEAN DEFAULT false,
  min_gpa NUMERIC(3, 2) DEFAULT 0.00,
  max_gpa NUMERIC(3, 2) DEFAULT 4.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- GRADE LETTER DEFINITIONS TABLE
-- ========================================
-- Defines letter grades and their ranges within a grading scale
CREATE TABLE IF NOT EXISTS grade_letter_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES grading_scales(id) ON DELETE CASCADE,
  letter TEXT NOT NULL, -- e.g., "A", "B+", "F"
  name TEXT, -- e.g., "Excellent", "Good"
  min_percentage NUMERIC(5, 2) NOT NULL, -- e.g., 90.00 for A
  max_percentage NUMERIC(5, 2) NOT NULL, -- e.g., 100.00 for A
  gpa_value NUMERIC(3, 2), -- e.g., 4.00 for A
  grade_points NUMERIC(5, 2), -- Points used in calculations
  is_passing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_percentage_range CHECK (max_percentage > min_percentage),
  CONSTRAINT unique_letter_in_scale UNIQUE(grading_scale_id, letter)
);

-- ========================================
-- GRADE CATEGORIES TABLE
-- ========================================
-- Assignment categories with weights (e.g., Homework 20%, Exams 40%)
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
  class_section_id UUID REFERENCES class_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Homework", "Quiz", "Midterm Exam", "Final Exam"
  description TEXT,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00, -- Percentage weight (e.g., 20.00 for 20%)
  drop_lowest INTEGER DEFAULT 0, -- Number of lowest scores to drop
  sequence INTEGER DEFAULT 0, -- For ordering
  color TEXT, -- Hex color for UI display
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 100),
  CONSTRAINT non_negative_drop CHECK (drop_lowest >= 0)
);

-- ========================================
-- ASSIGNMENTS (ENHANCED)
-- ========================================
-- Enhanced assignments table with academic year integration
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,

  -- Grading
  max_points NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
  passing_score NUMERIC(6, 2) DEFAULT 60.00,
  extra_credit BOOLEAN DEFAULT false,

  -- Assignment Type
  assignment_type TEXT DEFAULT 'homework' CHECK (assignment_type IN (
    'homework', 'quiz', 'test', 'exam', 'project',
    'presentation', 'lab', 'participation', 'extra_credit'
  )),

  -- Dates
  assigned_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  late_submission_deadline DATE,

  -- Policies
  allow_late_submission BOOLEAN DEFAULT true,
  late_penalty_percent NUMERIC(5, 2) DEFAULT 10.00,
  max_attempts INTEGER DEFAULT 1,

  -- Status
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,

  -- Metadata
  attachments JSONB, -- Store file references
  rubric JSONB, -- Store grading rubric

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_max_points CHECK (max_points > 0),
  CONSTRAINT valid_passing_score CHECK (passing_score >= 0 AND passing_score <= max_points),
  CONSTRAINT valid_late_penalty CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100)
);

-- ========================================
-- STUDENT GRADES TABLE
-- ========================================
-- Individual student grades for assignments
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,

  -- Scores
  points_earned NUMERIC(6, 2),
  points_possible NUMERIC(6, 2),
  percentage NUMERIC(5, 2), -- Calculated percentage
  letter_grade TEXT,

  -- Submission
  submitted_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,
  days_late INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,

  -- Grading
  graded_by UUID REFERENCES teachers(id),
  graded_at TIMESTAMPTZ,
  feedback TEXT,
  is_excused BOOLEAN DEFAULT false,
  excuse_reason TEXT,

  -- Extra Credit
  extra_credit_points NUMERIC(6, 2) DEFAULT 0.00,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', -- Not submitted
    'submitted', -- Submitted, not graded
    'graded', -- Graded
    'excused', -- Excused from assignment
    'missing' -- Marked as missing
  )),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_assignment UNIQUE(student_id, assignment_id),
  CONSTRAINT valid_points CHECK (points_earned IS NULL OR points_earned >= 0)
);

-- ========================================
-- SEMESTER GRADES TABLE
-- ========================================
-- Final semester grades for students
CREATE TABLE IF NOT EXISTS semester_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  grading_scale_id UUID REFERENCES grading_scales(id) ON DELETE SET NULL,

  -- Calculated grades
  total_points_earned NUMERIC(10, 2),
  total_points_possible NUMERIC(10, 2),
  final_percentage NUMERIC(5, 2),
  letter_grade TEXT,
  grade_points NUMERIC(5, 2),
  credits_earned NUMERIC(4, 2) DEFAULT 1.00,

  -- Category breakdowns (JSON)
  category_scores JSONB, -- {"homework": {"earned": 85, "possible": 100}, "exams": {...}}

  -- Rank/Position
  class_rank INTEGER,
  class_size INTEGER,

  -- Comments
  teacher_comments TEXT,
  admin_comments TEXT,

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN (
    'in_progress', 'completed', 'incomplete', 'withdrawn'
  )),

  -- Audit
  graded_by UUID REFERENCES teachers(id),
  graded_at TIMESTAMPTZ,
  verified_by UUID REFERENCES teachers(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_class_semester UNIQUE(student_id, class_section_id, semester_id)
);

-- ========================================
-- ATTENDANCE (ENHANCED)
-- ========================================
-- Enhanced attendance with semester tracking
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  date DATE NOT NULL,

  status TEXT NOT NULL CHECK (status IN (
    'present', 'absent', 'late', 'excused', 'early_dismissal'
  )),

  minutes_late INTEGER DEFAULT 0,
  marked_by UUID REFERENCES teachers(id),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_student_class_date UNIQUE(student_id, class_section_id, date)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_grading_scales_default ON grading_scales(is_default);
CREATE INDEX IF NOT EXISTS idx_grade_letter_scale ON grade_letter_definitions(grading_scale_id);
CREATE INDEX IF NOT EXISTS idx_grade_categories_class ON grade_categories(class_section_id);
CREATE INDEX IF NOT EXISTS idx_grade_categories_year ON grade_categories(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_assignments_category ON assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_assignments_year ON assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_assignment ON student_grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_class ON student_grades(class_section_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_student ON semester_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_class ON semester_grades(class_section_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_year ON semester_grades(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(class_section_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function: Calculate student grade for an assignment
CREATE OR REPLACE FUNCTION calculate_student_grade(
  p_student_id UUID,
  p_assignment_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_assignment RECORD;
  v_student_grade RECORD;
  v_penalty NUMERIC(6, 2);
  v_final_score NUMERIC(6, 2);
BEGIN
  -- Get assignment details
  SELECT * INTO v_assignment FROM assignments WHERE id = p_assignment_id;

  -- Get student grade record
  SELECT * INTO v_student_grade FROM student_grades
  WHERE student_id = p_student_id AND assignment_id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculate late penalty if applicable
  v_penalty := 0;
  IF v_student_grade.is_late AND v_assignment.late_submission_deadline IS NOT NULL THEN
    v_penalty := v_assignment.max_points * (v_assignment.late_penalty_percent / 100);
  END IF;

  -- Calculate final score
  v_final_score := GREATEST(0, COALESCE(v_student_grade.points_earned, 0) - v_penalty);

  -- Update the grade record
  UPDATE student_grades
  SET percentage = (v_final_score / v_assignment.max_points) * 100,
      points_possible = v_assignment.max_points
  WHERE student_id = p_student_id AND assignment_id = p_assignment_id;

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate semester grade for a student in a class
CREATE OR REPLACE FUNCTION calculate_semester_grade(
  p_student_id UUID,
  p_class_section_id UUID,
  p_semester_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_class_record RECORD;
  v_total_earned NUMERIC(10, 2) := 0;
  v_total_possible NUMERIC(10, 2) := 0;
  v_category_weights JSONB := '{}';
  v_category_scores JSONB := '{}';
  v_final_percentage NUMERIC(5, 2);
  v_letter_grade TEXT;
  v_grade_points NUMERIC(5, 2);
  v_grading_scale_id UUID;
BEGIN
  -- Get class info
  SELECT cs.id, cs.academic_year_id, ay.grading_scale_id
  INTO v_class_record
  FROM class_sections cs
  JOIN academic_years ay ON cs.academic_year_id = ay.id
  WHERE cs.id = p_class_section_id;

  -- Get categories and their weights
  SELECT json_object_agg(
    'category_' || id,
    jsonb_build_object(
      'weight', weight,
      'drop_lowest', COALESCE(drop_lowest, 0)
    )
  )
  INTO v_category_weights
  FROM grade_categories
  WHERE class_section_id = p_class_section_id
    AND (semester_id IS NULL OR semester_id = p_semester_id);

  -- Calculate total scores by category
  -- (Simplified - full implementation would drop lowest scores)

  SELECT
    COALESCE(SUM(points_earned), 0),
    COALESCE(SUM(points_possible), 0)
  INTO v_total_earned, v_total_possible
  FROM student_grades sg
  JOIN assignments a ON sg.assignment_id = a.id
  WHERE sg.student_id = p_student_id
    AND a.class_section_id = p_class_section_id
    AND (p_semester_id IS NULL OR a.semester_id = p_semester_id)
    AND sg.is_excused = false;

  -- Calculate final percentage
  IF v_total_possible > 0 THEN
    v_final_percentage := (v_total_earned / v_total_possible) * 100;
  ELSE
    v_final_percentage := 0;
  END IF;

  -- Get letter grade from grading scale
  -- (Would use grading scale lookup here)

  RETURN jsonb_build_object(
    'percentage', v_final_percentage,
    'letter_grade', v_letter_grade,
    'total_earned', v_total_earned,
    'total_possible', v_total_possible
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get student GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(
  p_student_id UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_semester_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_gpa NUMERIC(3, 2) := 0.00;
  v_total_points NUMERIC(8, 2) := 0;
  v_total_credits NUMERIC(8, 2) := 0;
BEGIN
  SELECT
    COALESCE(SUM(grade_points * credits_earned), 0),
    COALESCE(SUM(credits_earned), 0)
  INTO v_total_points, v_total_credits
  FROM semester_grades
  WHERE student_id = p_student_id
    AND status = 'completed'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_semester_id IS NULL OR semester_id = p_semester_id)
    AND grade_points IS NOT NULL;

  IF v_total_credits > 0 THEN
    v_gpa := v_total_points / v_total_credits;
  END IF;

  RETURN v_gpa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk insert grades for an assignment
CREATE OR REPLACE FUNCTION bulk_insert_grades(
  p_assignment_id UUID,
  p_grades JSONB -- [{"student_id": "...", "points_earned": 90.5, "feedback": "..."}]
)
RETURNS JSONB AS $$
DECLARE
  v_grade JSONB;
  v_student_id UUID;
  v_points NUMERIC;
  v_feedback TEXT;
  v_count INTEGER := 0;
  v_assignment RECORD;
BEGIN
  -- Get assignment details
  SELECT * INTO v_assignment FROM assignments WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- Loop through grades
  FOR v_grade IN SELECT * FROM jsonb_array_elements(p_grades)
  LOOP
    v_student_id := v_grade->>'student_id';
    v_points := (v_grade->>'points_earned')::NUMERIC;
    v_feedback := v_grade->>'feedback';

    -- Insert or update grade
    INSERT INTO student_grades (
      assignment_id,
      student_id,
      class_section_id,
      academic_year_id,
      points_earned,
      feedback,
      status,
      submitted_at,
      graded_at,
      graded_by
    ) VALUES (
      p_assignment_id,
      v_student_id,
      v_assignment.class_section_id,
      v_assignment.academic_year_id,
      v_points,
      v_feedback,
      'graded',
      NOW(),
      NOW(),
      NULL -- Will be set by trigger
    )
    ON CONFLICT (student_id, assignment_id) DO UPDATE SET
      points_earned = EXCLUDED.points_earned,
      feedback = EXCLUDED.feedback,
      status = 'graded',
      graded_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'grades_inserted', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGERS
-- ========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column_grading()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_grading_scales_updated_at BEFORE UPDATE ON grading_scales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_grading();

CREATE TRIGGER update_grade_categories_updated_at BEFORE UPDATE ON grade_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column_grading();

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
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins full access grading_scales" ON grading_scales
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access grade_letter_definitions" ON grade_letter_definitions
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access grade_categories" ON grade_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access assignments" ON assignments
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access student_grades" ON student_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access semester_grades" ON semester_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins full access attendance_records" ON attendance_records
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Teachers can read assignments for their classes
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
CREATE POLICY "Teachers manage their student_grades" ON student_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teacher_class_assignments tca
      WHERE tca.class_section_id = student_grades.class_section_id
        AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
        AND tca.status = 'active'
    )
  );

-- Students can read their own grades
CREATE POLICY "Students read own grades" ON student_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_grades.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students read own semester_grades" ON semester_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.id = semester_grades.student_id AND s.user_id = auth.uid()
    )
  );

-- Students can read assignments for their enrolled classes
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
GRANT EXECUTE ON FUNCTION calculate_student_grade TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_semester_grade TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_student_gpa TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_insert_grades TO authenticated;
