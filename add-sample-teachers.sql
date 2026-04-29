-- ========================================
-- ADD SAMPLE TEACHERS
-- Run this in Supabase SQL Editor
-- ========================================

-- Step 1: Create auth users (this requires service_role privileges)
-- If this fails on hosted Supabase, use the "Add Teacher" button in the UI instead

-- First, let's check if we can create users directly
-- This works on local dev, may fail on hosted

INSERT INTO auth.users (
  instance_id,
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'sarah.johnson@school.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "teacher", "full_name": "Dr. Sarah Johnson"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'michael.williams@school.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "teacher", "full_name": "Prof. Michael Williams"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Step 2: Backfill to public.users table
INSERT INTO public.users (id, email, role, full_name, created_at, updated_at)
SELECT
  id,
  email,
  raw_user_meta_data->>'role',
  raw_user_meta_data->>'full_name',
  created_at,
  updated_at
FROM auth.users
WHERE email LIKE '%@school.dev'
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.users.id);

-- Step 3: Create teacher profiles
INSERT INTO teachers (id, user_id, name, subject, department, employee_id, phone, qualifications, hire_date, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  u.full_name,
  'Mathematics',
  'STEM',
  'T' || LPAD(ROW_NUMBER() OVER (ORDER BY u.created_at)::TEXT, 3, '0'),
  '555-0101',
  'Ph.D.',
  '2024-01-01',
  NOW(),
  NOW()
FROM users u
WHERE u.email LIKE '%@school.dev'
  AND NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = u.id);

-- Verify
SELECT 'Teachers created:' as info, COUNT(*) as count FROM teachers;
SELECT id, name, subject, department, employee_id FROM teachers;
