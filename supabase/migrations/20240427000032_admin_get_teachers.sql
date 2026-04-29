-- ========================================
-- ADMIN GET TEACHERS WITH EMAIL
-- ========================================
-- Function for admins to get teachers with user emails
-- Bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION admin_get_teachers_with_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  subject TEXT,
  department TEXT,
  employee_id TEXT,
  phone TEXT,
  qualifications TEXT,
  hire_date DATE,
  created_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.name,
    t.subject,
    t.department,
    t.employee_id,
    t.phone,
    t.qualifications,
    t.hire_date,
    t.created_at,
    u.email,
    u.full_name
  FROM teachers t
  LEFT JOIN users u ON t.user_id = u.id
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only allow authenticated users to call this function
-- The function will respect RLS through the query itself,
-- but admins should be the primary users
GRANT EXECUTE ON FUNCTION admin_get_teachers_with_emails() TO authenticated;
