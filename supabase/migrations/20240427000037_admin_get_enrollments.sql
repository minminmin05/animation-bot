-- ========================================
-- ADMIN GET ALL ENROLLMENTS WITH DETAILS
-- ========================================
-- Function for admins to get all enrollments with student and class info
-- Bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION admin_get_all_enrollments()
RETURNS TABLE (
  id UUID,
  student_id UUID,
  class_id UUID,
  enrollment_date DATE,
  status TEXT,
  created_at TIMESTAMPTZ,
  student_name TEXT,
  student_email TEXT,
  class_name TEXT,
  class_subject TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.student_id,
    se.class_id,
    se.enrollment_date,
    se.status,
    se.created_at,
    s.name as student_name,
    u.email as student_email,
    c.name as class_name,
    c.subject as class_subject
  FROM student_enrollments se
  LEFT JOIN students s ON se.student_id = s.id
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN classes c ON se.class_id = c.id
  ORDER BY se.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_get_all_enrollments() TO authenticated;

-- ========================================
-- DEBUG: COUNT ENROLLMENTS BY CLASS
-- ========================================
CREATE OR REPLACE FUNCTION debug_enrollment_counts()
RETURNS TABLE (
  class_name TEXT,
  class_id UUID,
  active_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name,
    c.id,
    COUNT(*) FILTER (WHERE se.status = 'active') as active_count,
    COUNT(*) as total_count
  FROM classes c
  LEFT JOIN student_enrollments se ON c.id = se.class_id
  GROUP BY c.id, c.name
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_enrollment_counts() TO authenticated;
