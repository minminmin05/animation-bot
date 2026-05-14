-- ========================================
-- MOCK USERS CREATION SCRIPT
-- ========================================
-- รัน script นี้ใน Supabase SQL Editor
-- จะสร้าง users โดยตรงโดยไม่ต้องผ่าน authentication
--
-- รหัสผ่านสำหรับทุกคน: 123456
-- ========================================

-- ปิด trigger ชั่วคราวเพื่อไม่ให้ซ้ำซ้อน
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ========================================
-- สร้างนักเรียน 20 คน
-- ========================================
DO $$
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'student' || i || '@fake.com',
      crypt('123456', gen_salt('bf')),
      NOW(),
      jsonb_build_object('full_name', 'นักเรียน ' || i, 'role', 'student'),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'Created 20 students';
END $$;

-- ========================================
-- สร้างครู 5 คน
-- ========================================
DO $$
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'teacher' || i || '@fake.com',
      crypt('123456', gen_salt('bf')),
      NOW(),
      jsonb_build_object('full_name', 'ครู ' || i, 'role', 'teacher'),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'Created 5 teachers';
END $$;

-- ========================================
-- สร้างผู้ปกครอง 5 คน
-- ========================================
DO $$
BEGIN
  FOR i IN 1..5 LOOP
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      'parent' || i || '@fake.com',
      crypt('123456', gen_salt('bf')),
      NOW(),
      jsonb_build_object('full_name', 'ผู้ปกครอง ' || i, 'role', 'parent'),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO NOTHING;
  END LOOP;
  RAISE NOTICE 'Created 5 parents';
END $$;

-- ========================================
-- สร้าง records ใน public.users และ role-specific tables
-- ========================================
-- นักเรียน
INSERT INTO public.users (id, email, role, full_name)
SELECT id, email, 'student', raw_user_meta_data->>'full_name'
FROM auth.users
WHERE email LIKE 'student%@fake.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (user_id, name, class, grade_level)
SELECT id, raw_user_meta_data->>'full_name', 'Unassigned', NULL
FROM auth.users
WHERE email LIKE 'student%@fake.com'
ON CONFLICT (user_id) DO NOTHING;

-- ครู
INSERT INTO public.users (id, email, role, full_name)
SELECT id, email, 'teacher', raw_user_meta_data->>'full_name'
FROM auth.users
WHERE email LIKE 'teacher%@fake.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (user_id, name, subject, department)
SELECT id, raw_user_meta_data->>'full_name', 'Not assigned', 'Unassigned'
FROM auth.users
WHERE email LIKE 'teacher%@fake.com'
ON CONFLICT (user_id) DO NOTHING;

-- ผู้ปกครอง
INSERT INTO public.users (id, email, role, full_name)
SELECT id, email, 'parent', raw_user_meta_data->>'full_name'
FROM auth.users
WHERE email LIKE 'parent%@fake.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO parents (user_id, name)
SELECT id, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE email LIKE 'parent%@fake.com'
ON CONFLICT (user_id) DO NOTHING;

-- ========================================
-- เปิด trigger กลับ
-- ========================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- ตรวจสอบผลลัพธ์
-- ========================================
SELECT
  'นักเรียน' as type, COUNT(*) as count
FROM students
UNION ALL
SELECT
  'ครู' as type, COUNT(*) as count
FROM teachers
UNION ALL
SELECT
  'ผู้ปกครอง' as type, COUNT(*) as count
FROM parents;
