-- ========================================
-- ADMIN GET CLASSES WITH TEACHER NAMES
-- ========================================
-- Function for admins to get classes with teacher names
-- Bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION admin_get_classes_with_teachers()
RETURNS TABLE (
  id UUID,
  name TEXT,
  subject TEXT,
  teacher_id UUID,
  grade_level INTEGER,
  section TEXT,
  academic_year TEXT,
  room_number TEXT,
  schedule TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  teacher_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.subject,
    c.teacher_id,
    c.grade_level,
    c.section,
    c.academic_year,
    c.room_number,
    c.schedule,
    c.created_at,
    c.updated_at,
    t.name as teacher_name
  FROM classes c
  LEFT JOIN teachers t ON c.teacher_id = t.id
  ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_get_classes_with_teachers() TO authenticated;
