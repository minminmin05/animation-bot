-- ========================================
-- FIX ADMIN USER - Simple version
-- ========================================
-- Run in Supabase Dashboard → SQL Editor

-- First, check what exists
SELECT 'Checking existing users...' as step;
SELECT id, email, role FROM public.users WHERE email = 'admin@school.com';
SELECT id, email FROM auth.users WHERE email = 'admin@school.com';

-- Delete everything related to admin@school.com
DELETE FROM public.users WHERE email = 'admin@school.com';
DELETE FROM auth.users WHERE email = 'admin@school.com';

-- Now create fresh admin user
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
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin@school.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"full_name": "ผู้ดูแลระบบ", "role": "admin"}'::jsonb,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  false
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- Insert into public.users
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin@school.com',
  'admin',
  'ผู้ดูแลระบบ'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Verify
SELECT '✅ Done!' as status,
       u.id, u.email, u.role, u.full_name
FROM public.users u
WHERE u.email = 'admin@school.com';

-- Credentials
SELECT 'Email: admin@school.com | Password: admin123' as login_info;
