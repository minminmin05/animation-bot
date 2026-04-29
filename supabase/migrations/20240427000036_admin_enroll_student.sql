-- ========================================
-- ADMIN ENROLL STUDENTS TO CLASS
-- ========================================
-- Function for admins to add students to classes
-- Handles re-enrollment by updating status if enrollment exists

CREATE OR REPLACE FUNCTION admin_enroll_students(
  p_class_id UUID,
  p_student_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Loop through each student
  FOREACH v_student_id IN ARRAY p_student_ids
  LOOP
    -- Check if enrollment already exists
    IF EXISTS (
      SELECT 1 FROM student_enrollments
      WHERE student_id = v_student_id AND class_id = p_class_id
    ) THEN
      -- Update existing enrollment to active
      UPDATE student_enrollments
      SET status = 'active', enrollment_date = CURRENT_DATE
      WHERE student_id = v_student_id AND class_id = p_class_id;
    ELSE
      -- Insert new enrollment
      INSERT INTO student_enrollments (student_id, class_id, status, enrollment_date)
      VALUES (v_student_id, p_class_id, 'active', CURRENT_DATE);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'enrolled', v_count);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_enroll_students(UUID, UUID[]) TO authenticated;
