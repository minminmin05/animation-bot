-- ========================================
-- FIX ADMIN USER - Clean and recreate
-- ========================================
-- Run in Supabase Dashboard → SQL Editor

-- Step 1: Delete existing admin user
DELETE FROM public.users WHERE email = 'admin@school.com';

-- Get the auth.user ID first
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@school.com';

  IF admin_id IS NOT NULL THEN
    -- Delete from role-specific tables first
    DELETE FROM students WHERE students.user_id = admin_id;
    DELETE FROM teachers WHERE teachers.user_id = admin_id;
    DELETE FROM parents WHERE parents.user_id = admin_id;

    -- Then delete from auth.users
    DELETE FROM auth.users WHERE id = admin_id;

    RAISE NOTICE 'Deleted existing admin user';
  END IF;
END $$;

-- Step 2: Create new admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  raw_app_meta_data,
  is_anonymous
) VALUES (
  '99999999-9999-9999-9999-999999999999',
  'admin@school.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"full_name": "ผู้ดูแลระบบ", "role": "admin"}'::jsonb,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false
);

-- Step 3: Insert into public.users
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'admin@school.com',
  'admin',
  'ผู้ดูแลระบบ'
);

-- Verify
SELECT '✅ Admin user ready!' as status,
       u.id, u.email, u.role, u.full_name
FROM public.users u
WHERE u.email = 'admin@school.com';

-- Login credentials:
-- Email: admin@school.com
-- Password: admin123
