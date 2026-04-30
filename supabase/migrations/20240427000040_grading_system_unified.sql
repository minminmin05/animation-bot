-- ========================================
-- UNIFIED ACADEMIC & GRADING SYSTEM
-- ========================================

-- Safely backup old tables instead of DROP IF EXISTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grades') THEN
    ALTER TABLE grades RENAME TO legacy_grades;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments') THEN
    ALTER TABLE assignments RENAME TO legacy_assignments;
  END IF;
END $$;

-- 1. GRADING SCALES
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

-- 2. GRADE LETTER DEFINITIONS
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
      gs.id, g.letter, g.min_pct, g.max_pct, g.gpa_val, g.passing
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

-- 3. GRADE CATEGORIES
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID REFERENCES class_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  drop_lowest INTEGER DEFAULT 0,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NEW ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grade_categories(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  max_points NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
  passing_score NUMERIC(6, 2) DEFAULT 60.00,
  assignment_type TEXT DEFAULT 'homework' CHECK (assignment_type IN ('homework', 'quiz', 'test', 'exam', 'project', 'presentation', 'participation')),
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  allow_late_submission BOOLEAN DEFAULT true,
  late_penalty_percent NUMERIC(5, 2) DEFAULT 10.00,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NEW STUDENT GRADES
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
-- DATA MIGRATION (SAFE FALLBACKS)
-- ========================================
DO $$
DECLARE
  v_dummy_year_id UUID := '00000000-0000-0000-0000-000000000001';
  v_dummy_grade_id UUID := '00000000-0000-0000-0000-000000000002';
  v_dummy_class_id UUID := '00000000-0000-0000-0000-000000000003';
  v_teacher_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'legacy_grades') THEN
    
    -- Provide NOT NULL dummy relationships
    INSERT INTO academic_years (id, name, start_date, end_date, status)
    VALUES (v_dummy_year_id, 'Migrated Year', '2000-01-01', '2000-12-31', 'archived')
    ON CONFLICT (name) DO NOTHING;
    SELECT id INTO v_dummy_year_id FROM academic_years WHERE name = 'Migrated Year' LIMIT 1;

    INSERT INTO grade_levels (id, level, name)
    VALUES (v_dummy_grade_id, 0, 'Migrated Grade')
    ON CONFLICT (level) DO NOTHING;
    SELECT id INTO v_dummy_grade_id FROM grade_levels WHERE level = 0 LIMIT 1;

    INSERT INTO class_sections (id, academic_year_id, grade_level_id, name, code, status)
    VALUES (v_dummy_class_id, v_dummy_year_id, v_dummy_grade_id, 'Migrated Class', 'MIG01', 'completed')
    ON CONFLICT DO NOTHING;
    
    SELECT id INTO v_teacher_id FROM teachers LIMIT 1;
    
    IF v_teacher_id IS NOT NULL THEN
      -- Migrate assignments
      INSERT INTO assignments (id, class_section_id, teacher_id, title, description, max_points, due_date)
      SELECT id, v_dummy_class_id, teacher_id, title, description, total_points, due_date
      FROM legacy_assignments
      ON CONFLICT DO NOTHING;

      -- Migrate grades
      INSERT INTO student_grades (
        student_id, assignment_id, class_section_id, academic_year_id, points_earned, feedback, created_at, status
      )
      SELECT 
        student_id, assignment_id, v_dummy_class_id, v_dummy_year_id, grade, comments, created_at, 'graded'
      FROM legacy_grades
      WHERE assignment_id IS NOT NULL
      ON CONFLICT (student_id, assignment_id) DO NOTHING;
    END IF;

    -- Cleanup
    DROP TABLE IF EXISTS legacy_grades CASCADE;
    DROP TABLE IF EXISTS legacy_assignments CASCADE;
  END IF;
END $$;

-- ========================================
-- INDEXES & TRIGGERS
-- ========================================
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_semester_grades_student ON semester_grades(student_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_grades_updated_at ON student_grades;
CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON student_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_scales ENABLE ROW LEVEL SECURITY;

-- Admin policies
DROP POLICY IF EXISTS "Admins full access assignments" ON assignments;
CREATE POLICY "Admins full access assignments" ON assignments FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins full access student_grades" ON student_grades;
CREATE POLICY "Admins full access student_grades" ON student_grades FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Teachers
DROP POLICY IF EXISTS "Teachers read their assignments" ON assignments;
CREATE POLICY "Teachers read their assignments" ON assignments
  FOR SELECT USING (EXISTS (SELECT 1 FROM teacher_class_assignments tca WHERE tca.class_section_id = assignments.class_section_id AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) AND tca.status = 'active'));

DROP POLICY IF EXISTS "Teachers manage student_grades" ON student_grades;
CREATE POLICY "Teachers manage student_grades" ON student_grades
  FOR ALL USING (EXISTS (SELECT 1 FROM teacher_class_assignments tca WHERE tca.class_section_id = student_grades.class_section_id AND tca.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid()) AND tca.status = 'active'));

-- Students
DROP POLICY IF EXISTS "Students read own grades" ON student_grades;
CREATE POLICY "Students read own grades" ON student_grades
  FOR SELECT USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_grades.student_id AND s.user_id = auth.uid()));

-- Everyone
DROP POLICY IF EXISTS "All read grading_scales" ON grading_scales;
CREATE POLICY "All read grading_scales" ON grading_scales FOR SELECT USING (true);
