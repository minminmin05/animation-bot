-- ========================================
-- ACADEMIC YEAR VIEWS AND HELPER FUNCTIONS
-- ========================================
-- Migration: 20240427000039_academic_year_views_and_helpers
-- Description: Convenient views and utility functions for the academic year system

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- View: Current academic classes with teacher and enrollment info
CREATE OR REPLACE VIEW v_current_classes AS
SELECT
  cs.id,
  cs.name,
  cs.code,
  cs.section,
  cs.room_number,
  cs.schedule,
  cs.max_students,
  COUNT(DISTINCT sce.student_id) FILTER (WHERE sce.status = 'active') AS enrolled_count,
  ay.name AS academic_year,
  s.name AS semester,
  gl.name AS grade_level,
  json_agg(
    DISTINCT jsonb_build_object(
      'teacher_id', t.id,
      'teacher_name', t.name,
      'role', tca.role
    )
  ) FILTER (WHERE t.id IS NOT NULL) AS teachers
FROM class_sections cs
JOIN academic_years ay ON cs.academic_year_id = ay.id
LEFT JOIN semesters s ON cs.semester_id = s.id
JOIN grade_levels gl ON cs.grade_level_id = gl.id
LEFT JOIN teacher_class_assignments tca ON cs.id = tca.class_section_id AND tca.status = 'active'
LEFT JOIN teachers t ON tca.teacher_id = t.id
LEFT JOIN student_class_enrollments sce ON cs.id = sce.class_section_id
WHERE ay.is_current = true OR s.is_current = true
GROUP BY cs.id, ay.name, s.name, gl.name;

-- View: Student's current academic status
CREATE OR REPLACE VIEW v_student_academic_status AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  s.user_id,
  ay.name AS academic_year,
  ay.id AS academic_year_id,
  gl.name AS grade_level,
  gl.level AS grade_level_number,
  sar.section AS student_section,
  sar.status AS academic_status,
  sar.gpa,
  COUNT(DISTINCT sce.id) FILTER (WHERE sce.status = 'active') AS active_enrollments,
  json_agg(
    DISTINCT jsonb_build_object(
      'class_name', cs.name,
      'class_code', cs.code,
      'section', cs.section,
      'status', sce.status
    )
  ) FILTER (WHERE sce.id IS NOT NULL) AS enrolled_classes
FROM students s
JOIN student_academic_records sar ON s.id = sar.student_id
JOIN academic_years ay ON sar.academic_year_id = ay.id
JOIN grade_levels gl ON sar.grade_level_id = gl.id
LEFT JOIN student_class_enrollments sce ON s.id = sce.student_id AND sce.academic_year_id = ay.id
LEFT JOIN class_sections cs ON sce.class_section_id = cs.id
WHERE ay.is_current = true
GROUP BY s.id, s.name, s.user_id, ay.name, ay.id, gl.name, gl.level, sar.section, sar.status, sar.gpa;

-- View: Academic year calendar (for dashboards)
CREATE OR REPLACE VIEW v_academic_calendar AS
SELECT
  ay.id AS academic_year_id,
  ay.name AS academic_year_name,
  ay.start_date AS year_start,
  ay.end_date AS year_end,
  ay.status AS year_status,
  s.id AS semester_id,
  s.name AS semester_name,
  s.sequence AS semester_sequence,
  s.start_date AS semester_start,
  s.end_date AS semester_end,
  s.status AS semester_status,
  CASE
    WHEN ay.is_current = true THEN 'current_year'
    WHEN s.is_current = true THEN 'current_semester'
    ELSE 'other'
  END AS current_flag
FROM academic_years ay
LEFT JOIN semesters s ON ay.id = s.academic_year_id
ORDER BY ay.start_date DESC, s.sequence;

-- View: Class roster (students in a class)
CREATE OR REPLACE VIEW v_class_roster AS
SELECT
  cs.id AS class_section_id,
  cs.name AS class_name,
  cs.code AS class_code,
  ay.name AS academic_year,
  s.name AS semester,
  gl.name AS grade_level,
  st.id AS student_id,
  st.name AS student_name,
  sce.status AS enrollment_status,
  sce.enrollment_date,
  sce.final_grade,
  sce.letter_grade
FROM class_sections cs
JOIN academic_years ay ON cs.academic_year_id = ay.id
LEFT JOIN semesters s ON cs.semester_id = s.id
JOIN grade_levels gl ON cs.grade_level_id = gl.id
JOIN student_class_enrollments sce ON cs.id = sce.class_section_id
JOIN students st ON sce.student_id = st.id
ORDER BY ay.name DESC, s.sequence DESC, cs.code, st.name;

-- ========================================
-- ADVANCED HELPER FUNCTIONS
-- ========================================

-- Function: Get students eligible for promotion (completed current year)
CREATE OR REPLACE FUNCTION get_students_for_promotion(p_academic_year_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  current_grade_level TEXT,
  current_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    gl.name,
    sar.status
  FROM student_academic_records sar
  JOIN students s ON sar.student_id = s.id
  JOIN grade_levels gl ON sar.grade_level_id = gl.id
  WHERE sar.academic_year_id = p_academic_year_id
    AND sar.status IN ('enrolled', 'promoted')
  ORDER BY gl.level, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create new academic year with semesters
CREATE OR REPLACE FUNCTION create_academic_year(
  p_name TEXT, -- e.g., "2025-2026"
  p_start_date DATE,
  p_end_date DATE,
  p_fall_start DATE,
  p_fall_end DATE,
  p_spring_start DATE,
  p_spring_end DATE
)
RETURNS JSONB AS $$
DECLARE
  v_year_id UUID;
  v_fall_id UUID;
  v_spring_id UUID;
BEGIN
  -- Check if year already exists
  IF EXISTS (SELECT 1 FROM academic_years WHERE name = p_name) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Academic year already exists');
  END IF;

  -- Create academic year
  INSERT INTO academic_years (name, start_date, end_date, status)
  VALUES (p_name, p_start_date, p_end_date, 'upcoming')
  RETURNING id INTO v_year_id;

  -- Create Fall semester
  INSERT INTO semesters (academic_year_id, name, sequence, start_date, end_date, status)
  VALUES (v_year_id, 'Fall', 1, p_fall_start, p_fall_end, 'upcoming')
  RETURNING id INTO v_fall_id;

  -- Create Spring semester
  INSERT INTO semesters (academic_year_id, name, sequence, start_date, end_date, status)
  VALUES (v_year_id, 'Spring', 2, p_spring_start, p_spring_end, 'upcoming')
  RETURNING id INTO v_spring_id;

  RETURN jsonb_build_object(
    'success', true,
    'academic_year_id', v_year_id,
    'fall_semester_id', v_fall_id,
    'spring_semester_id', v_spring_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Set current academic year and semester
-- Handles race conditions with proper locking
CREATE OR REPLACE FUNCTION set_current_academic_period(
  p_academic_year_id UUID DEFAULT NULL,
  p_semester_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(123456789);

  -- If setting current academic year
  IF p_academic_year_id IS NOT NULL THEN
    -- Verify year exists
    IF NOT EXISTS (SELECT 1 FROM academic_years WHERE id = p_academic_year_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Academic year not found');
    END IF;

    -- Unset all current flags
    UPDATE academic_years SET is_current = false WHERE is_current = true;

    -- Set new current
    UPDATE academic_years
    SET is_current = true, status = 'active'
    WHERE id = p_academic_year_id;
  END IF;

  -- If setting current semester
  IF p_semester_id IS NOT NULL THEN
    -- Verify semester exists
    IF NOT EXISTS (SELECT 1 FROM semesters WHERE id = p_semester_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Semester not found');
    END IF;

    -- Unset all current flags
    UPDATE semesters SET is_current = false WHERE is_current = true;

    -- Set new current
    UPDATE semesters
    SET is_current = true, status = 'active'
    WHERE id = p_semester_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Archive completed academic year
CREATE OR REPLACE FUNCTION archive_academic_year(p_academic_year_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_year_name TEXT;
BEGIN
  -- Get year name for confirmation
  SELECT name INTO v_year_name
  FROM academic_years
  WHERE id = p_academic_year_id;

  IF v_year_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Academic year not found');
  END IF;

  -- Archive the year
  UPDATE academic_years
  SET status = 'archived', is_current = false
  WHERE id = p_academic_year_id;

  -- Archive all semesters
  UPDATE semesters
  SET status = 'archived', is_current = false
  WHERE academic_year_id = p_academic_year_id;

  -- Complete all class sections
  UPDATE class_sections
  SET status = 'completed'
  WHERE academic_year_id = p_academic_year_id;

  -- Complete all active enrollments
  UPDATE student_class_enrollments
  SET status = 'completed'
  WHERE academic_year_id = p_academic_year_id AND status = 'active';

  RETURN jsonb_build_object(
    'success', true,
    'archived_year', v_year_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk enroll students to a class section
CREATE OR REPLACE FUNCTION bulk_enroll_students(
  p_class_section_id UUID,
  p_student_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_academic_year_id UUID;
  v_success_count INTEGER := 0;
  v_skip_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- Get academic year
  SELECT academic_year_id INTO v_academic_year_id
  FROM class_sections
  WHERE id = p_class_section_id;

  IF v_academic_year_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class section not found');
  END IF;

  -- Loop through students
  FOREACH v_student_id IN ARRAY p_student_ids
  LOOP
    BEGIN
      -- Check if already enrolled
      IF EXISTS (
        SELECT 1 FROM student_class_enrollments
        WHERE student_id = v_student_id
          AND class_section_id = p_class_section_id
      ) THEN
        v_skip_count := v_skip_count + 1;
      ELSE
        -- Enroll student
        INSERT INTO student_class_enrollments (student_id, class_section_id, academic_year_id)
        VALUES (v_student_id, p_class_section_id, v_academic_year_id);
        v_success_count := v_success_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := array_append(v_errors, SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'enrolled', v_success_count,
    'skipped', v_skip_count,
    'errors', v_error_count,
    'error_messages', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANTS
-- ========================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_students_for_promotion TO authenticated;
GRANT EXECUTE ON FUNCTION create_academic_year TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_academic_period TO authenticated;
GRANT EXECUTE ON FUNCTION archive_academic_year TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_enroll_students TO authenticated;
