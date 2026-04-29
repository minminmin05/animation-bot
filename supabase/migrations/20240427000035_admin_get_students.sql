-- ========================================
-- ADMIN GET STUDENTS WITH USER INFO
-- ========================================
-- Function for admins to get students with user emails
-- Bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION admin_get_students_with_users()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  class TEXT,
  grade_level INTEGER,
  created_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.name,
    s.class,
    s.grade_level,
    s.created_at,
    u.email,
    u.full_name
  FROM students s
  LEFT JOIN users u ON s.user_id = u.id
  ORDER BY u.full_name, s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_get_students_with_users() TO authenticated;
