-- ========================================
-- PRODUCTION-READY SEED DATA SCRIPT
-- ========================================
-- Migration: 20240427000017_production_seed
-- Description: Clean seed data with proper dependency order
--
-- IMPORTANT: This script uses direct INSERT into auth.users for development.
-- For production, create users via Supabase Auth signup API or Admin API.
--
-- DEPENDENCY ORDER:
--   1. auth.users (bypass trigger for seed)
--   2. public.users (backfill)
--   3. students, teachers, parents (role profiles)
--   4. classes (needs teachers)
--   5. student_parent_relations (needs students + parents)
--   6. student_enrollments (needs students + classes)
--   7. assignments (needs teachers + classes)
--   8. grades, attendance (needs previous data)
--   9. notifications
-- ========================================

-- Set variables for consistent UUIDs
DO $$
BEGIN

  -- NOTIFICATIONS
  DELETE FROM notifications
  WHERE user_id IN (
    SELECT u.id
    FROM users u
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- ATTENDANCE
  DELETE FROM attendance
  WHERE student_id IN (
    SELECT s.id
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- GRADES
  DELETE FROM grades
  WHERE student_id IN (
    SELECT s.id
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- ASSIGNMENTS
  DELETE FROM assignments
  WHERE teacher_id IN (
    SELECT t.id
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- ENROLLMENTS
  DELETE FROM student_enrollments
  WHERE student_id IN (
    SELECT s.id
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- RELATIONS
  DELETE FROM student_parent_relations
  WHERE student_id IN (
    SELECT s.id
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- CLASSES
  DELETE FROM classes
  WHERE teacher_id IN (
    SELECT t.id
    FROM teachers t
    JOIN users u ON t.user_id = u.id
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- ROLE TABLES
  DELETE FROM parents
  WHERE user_id IN (
    SELECT u.id FROM users u
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  DELETE FROM teachers
  WHERE user_id IN (
    SELECT u.id FROM users u
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  DELETE FROM students
  WHERE user_id IN (
    SELECT u.id FROM users u
    WHERE u.email LIKE '%@lumaid-seed.dev'
  );

  -- USERS
  DELETE FROM users
  WHERE email LIKE '%@lumaid-seed.dev';

  -- AUTH
  DELETE FROM auth.users
  WHERE email LIKE '%@lumaid-seed.dev';

END $$;

-- ========================================
-- STEP 1: CREATE AUTH USERS
-- ========================================
-- Note: Direct insert into auth.users works in local/dev with service_role key
-- For production, use Supabase Management API or signup endpoint

-- Create Admin User
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@lumaid-seed.dev',
  -- Password: admin123 (hashed with bcrypt)
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i',
  NOW(),
  '{"role": "admin", "full_name": "System Administrator"}',
  NOW(),
  NOW()
);

-- Create Teachers (3)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000010', 'teacher.johnson@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "teacher", "full_name": "Dr. Sarah Johnson"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000011', 'teacher.williams@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "teacher", "full_name": "Prof. Michael Williams"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000012', 'teacher.davis@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "teacher", "full_name": "Dr. Emily Davis"}', NOW(), NOW());

-- Create Parents (5)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000020', 'parent.miller@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "parent", "full_name": "Robert Miller"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000021', 'parent.garcia@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "parent", "full_name": "Maria Garcia"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000022', 'parent.chen@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "parent", "full_name": "David Chen"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000023', 'parent.patel@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "parent", "full_name": "Priya Patel"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000024', 'parent.thompson@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "parent", "full_name": "James Thompson"}', NOW(), NOW());

-- Create Students (10)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000030', 'student.emma.miller@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Emma Miller"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000031', 'student.jacob.garcia@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Jacob Garcia"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000032', 'student.sophia.chen@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Sophia Chen"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000033', 'student.liam.patel@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Liam Patel"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000034', 'student.olivia.thompson@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Olivia Thompson"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000035', 'student.noah.wilson@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Noah Wilson"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000036', 'student.ava.martinez@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Ava Martinez"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000037', 'student.ethan.rodriguez@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Ethan Rodriguez"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000038', 'student.isabella.lee@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Isabella Lee"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000039', 'student.lucas.clark@lumaid-seed.dev', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLaEmc0i', NOW(), '{"role": "student", "full_name": "Lucas Clark"}', NOW(), NOW());

-- ========================================
-- STEP 2: BACKFILL PUBLIC USERS (from auth.users)
-- ========================================
-- This creates the profile records for all auth users
INSERT INTO public.users (id, email, role, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'student'),
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 3: CREATE ROLE-SPECIFIC PROFILES
-- ========================================

-- Teachers (3)
INSERT INTO teachers (id, user_id, name, subject, department, employee_id, phone, qualifications, hire_date) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Dr. Sarah Johnson', 'Mathematics', 'STEM', 'T001', '555-0101', 'Ph.D. Mathematics, MIT', '2020-08-01'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'Prof. Michael Williams', 'Physics', 'STEM', 'T002', '555-0102', 'Ph.D. Physics, Stanford', '2019-08-01'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000012', 'Dr. Emily Davis', 'English Literature', 'Humanities', 'T003', '555-0103', 'Ph.D. English, Harvard', '2021-08-01')
ON CONFLICT (user_id) DO NOTHING;

-- Parents (5)
INSERT INTO parents (id, user_id, name, phone, address, occupation) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'Robert Miller', '555-0201', '123 Oak Street, Springfield', 'Engineer'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', 'Maria Garcia', '555-0202', '456 Maple Ave, Springfield', 'Doctor'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000022', 'David Chen', '555-0203', '789 Pine Road, Springfield', 'Accountant'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000023', 'Priya Patel', '555-0204', '321 Elm Court, Springfield', 'Lawyer'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000024', 'James Thompson', '555-0205', '654 Birch Lane, Springfield', 'Business Owner')
ON CONFLICT (user_id) DO NOTHING;

-- Students (10)
INSERT INTO students (id, user_id, name, class, grade_level, date_of_birth, address, phone, enrollment_date) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', 'Emma Miller', '10A', 10, '2008-03-15', '123 Oak Street, Springfield', '555-0301', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000031', 'Jacob Garcia', '10A', 10, '2008-07-22', '456 Maple Ave, Springfield', '555-0302', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000032', 'Sophia Chen', '10A', 10, '2008-11-08', '789 Pine Road, Springfield', '555-0303', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000033', 'Liam Patel', '10A', 10, '2008-05-19', '321 Elm Court, Springfield', '555-0304', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000034', 'Olivia Thompson', '10A', 10, '2008-09-03', '654 Birch Lane, Springfield', '555-0305', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000035', 'Noah Wilson', '10A', 10, '2008-01-28', '987 Cedar Drive, Springfield', '555-0306', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000036', 'Ava Martinez', '10A', 10, '2008-06-12', '147 Walnut Way, Springfield', '555-0307', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000037', 'Ethan Rodriguez', '10A', 10, '2008-12-25', '258 Spruce Street, Springfield', '555-0308', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000038', 'Isabella Lee', '10A', 10, '2008-04-17', '369 Aspen Avenue, Springfield', '555-0309', '2024-08-15'),
  ('30000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000039', 'Lucas Clark', '10A', 10, '2008-08-30', '741 Willow Road, Springfield', '555-0310', '2024-08-15')
ON CONFLICT (user_id) DO NOTHING;

-- ========================================
-- STEP 4: CREATE CLASSES (depends on teachers)
-- ========================================
INSERT INTO classes (id, name, subject, teacher_id, grade_level, section, academic_year, room_number, schedule) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Grade 10 Mathematics - Section A', 'Mathematics', '10000000-0000-0000-0000-000000000001', 10, 'A', '2024-2025', 'Room 101', 'Mon/Wed/Fri 9:00-10:00 AM'),
  ('40000000-0000-0000-0000-000000000002', 'Grade 10 Physics - Section A', 'Physics', '10000000-0000-0000-0000-000000000002', 10, 'A', '2024-2025', 'Room 205', 'Tue/Thu 10:00-11:30 AM'),
  ('40000000-0000-0000-0000-000000000003', 'Grade 10 English - Section A', 'English', '10000000-0000-0000-0000-000000000003', 10, 'A', '2024-2025', 'Room 301', 'Mon/Wed/Fri 11:00 AM-12:00 PM')
ON CONFLICT DO NOTHING;

-- ========================================
-- STEP 5: CREATE STUDENT-PARENT RELATIONS (depends on students + parents)
-- ========================================
INSERT INTO student_parent_relations (id, parent_id, student_id, relationship, is_primary_contact) VALUES
  -- Emma Miller - Robert Miller (father)
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'father', true),
  -- Jacob Garcia - Maria Garcia (mother)
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'mother', true),
  -- Sophia Chen - David Chen (father)
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'father', true),
  -- Liam Patel - Priya Patel (mother)
  ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'mother', true),
  -- Olivia Thompson - James Thompson (father)
  ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 'father', true),
  -- Noah Wilson - Robert Miller (guardian - extended family example)
  ('50000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', 'guardian', true),
  -- Ava Martinez - Maria Garcia (guardian)
  ('50000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000007', 'guardian', true),
  -- Ethan Rodriguez - David Chen (guardian)
  ('50000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000008', 'guardian', true),
  -- Isabella Lee - Priya Patel (guardian)
  ('50000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000009', 'guardian', true),
  -- Lucas Clark - James Thompson (guardian)
  ('50000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000010', 'guardian', true)
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- ========================================
-- STEP 6: CREATE STUDENT ENROLLMENTS (depends on students + classes)
-- ========================================
-- Enroll all 10 students in all 3 classes
INSERT INTO student_enrollments (id, student_id, class_id, enrollment_date, status) VALUES
  -- Mathematics Class enrollments
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001', '2024-08-15', 'active'),
  -- Physics Class enrollments
  ('60000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000020', '30000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000002', '2024-08-15', 'active'),
  -- English Class enrollments
  ('60000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000023', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000024', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000026', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000027', '30000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000028', '30000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000029', '30000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active'),
  ('60000000-0000-0000-0000-000000000030', '30000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000003', '2024-08-15', 'active')
ON CONFLICT (student_id, class_id) DO NOTHING;

-- ========================================
-- STEP 7: CREATE ASSIGNMENTS (depends on teachers + classes)
-- ========================================
INSERT INTO assignments (id, teacher_id, class_id, title, description, due_date, total_points, assignment_type) VALUES
  -- Mathematics assignments
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Chapter 1: Algebra Fundamentals', 'Complete exercises 1.1 through 1.5', '2024-09-15', 100, 'homework'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Quiz: Linear Equations', 'Covers Chapter 2 material', '2024-09-30', 50, 'quiz'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Midterm Exam', 'Comprehensive exam covering Chapters 1-5', '2024-10-20', 200, 'exam'),
  -- Physics assignments
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Lab Report: Motion and Forces', 'Document your findings from the physics lab', '2024-09-20', 100, 'project'),
  ('70000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'Quiz: Newton''s Laws', 'Multiple choice and short answer', '2024-10-05', 50, 'quiz'),
  -- English assignments
  ('70000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'Essay: Personal Narrative', 'Write a 500-word personal narrative essay', '2024-09-25', 100, 'homework'),
  ('70000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'Book Report: To Kill a Mockingbird', 'Analyze themes and characters', '2024-10-15', 150, 'project')
ON CONFLICT DO NOTHING;

-- ========================================
-- STEP 8: CREATE GRADES (depends on students + assignments + classes + teachers)
-- ========================================
INSERT INTO grades (id, student_id, assignment_id, class_id, teacher_id, grade, term, comments, graded_at) VALUES
  -- Math Homework - Chapter 1
  ('80000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 95.00, 'Fall 2024', 'Excellent work!', NOW()),
  ('80000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 88.00, 'Fall 2024', 'Good effort, review chapter 3', NOW()),
  ('80000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 92.00, 'Fall 2024', 'Well done!', NOW()),
  ('80000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 85.00, 'Fall 2024', 'Show your work more clearly', NOW()),
  ('80000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 90.00, 'Fall 2024', 'Great progress!', NOW()),
  -- Math Quiz - Linear Equations
  ('80000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 48.00, 'Fall 2024', 'Outstanding!', NOW()),
  ('80000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 42.00, 'Fall 2024', 'Study chapter 4 more', NOW()),
  -- Physics Lab Report
  ('80000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 96.00, 'Fall 2024', 'Excellent analysis!', NOW()),
  ('80000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 91.00, 'Fall 2024', 'Very good documentation', NOW()),
  -- English Essay
  ('80000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 89.00, 'Fall 2024', 'Strong voice and structure', NOW()),
  ('80000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 94.00, 'Fall 2024', 'Beautifully written!', NOW())
ON CONFLICT DO NOTHING;

-- ========================================
-- STEP 8: CREATE ATTENDANCE (depends on students + classes + teachers)
-- ========================================
INSERT INTO attendance (id, student_id, class_id, date, status, marked_by, notes) VALUES
  -- Mathematics attendance for the week of Sept 1-6, 2024
  ('90000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2024-09-02', 'present', '10000000-0000-0000-0000-000000000001', NULL),
  ('90000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '2024-09-02', 'present', '10000000-0000-0000-0000-000000000001', NULL),
  ('90000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '2024-09-02', 'present', '10000000-0000-0000-0000-000000000001', NULL),
  ('90000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '2024-09-02', 'late', '10000000-0000-0000-0000-000000000001', 'Arrived 10 minutes late'),
  ('90000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', '2024-09-02', 'present', '10000000-0000-0000-0000-000000000001', NULL),
  ('90000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001', '2024-09-02', 'absent', '10000000-0000-0000-0000-000000000001', 'Sick - parent notified'),
  -- Physics attendance
  ('90000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', '2024-09-03', 'present', '10000000-0000-0000-0000-000000000002', NULL),
  ('90000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '2024-09-03', 'present', '10000000-0000-0000-0000-000000000002', NULL),
  ('90000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '2024-09-03', 'excused', '10000000-0000-0000-0000-000000000002', 'School activity'),
  -- English attendance
  ('90000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', '2024-09-04', 'present', '10000000-0000-0000-0000-000000000003', NULL),
  ('90000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000003', '2024-09-04', 'present', '10000000-0000-0000-0000-000000000003', NULL),
  ('90000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000003', '2024-09-04', 'present', '10000000-0000-0000-0000-000000000003', NULL)
ON CONFLICT (student_id, date, class_id) DO NOTHING;

-- ========================================
-- STEP 9: CREATE NOTIFICATIONS
-- ========================================
INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES
  -- Admin notifications
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Welcome to Lumaid School Management', 'Your admin account has been set up successfully.', 'success', false),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'New Student Enrollment', '10 new students have been enrolled for the 2024-2025 academic year.', 'info', false),
  -- Teacher notifications
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'Class Assignment', 'You have been assigned to teach Grade 10 Mathematics - Section A.', 'info', false),
  ('a0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000010', 'Assignment Grading Due', 'Please grade the Chapter 1 homework by September 20th.', 'warning', false),
  ('a0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000011', 'Class Assignment', 'You have been assigned to teach Grade 10 Physics - Section A.', 'info', false),
  ('a0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000012', 'Class Assignment', 'You have been assigned to teach Grade 10 English - Section A.', 'info', false),
  -- Student notifications
  ('a0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000030', 'New Assignment Posted', 'Chapter 1: Algebra Fundamentals homework is now available. Due: Sept 15', 'info', false),
  ('a0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000030', 'Grade Posted', 'Your homework has been graded: 95/100 - Excellent work!', 'success', false),
  ('a0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000031', 'New Assignment Posted', 'Chapter 1: Algebra Fundamentals homework is now available. Due: Sept 15', 'info', false),
  -- Parent notifications
  ('a0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'Student Attendance Alert', 'Emma was marked absent on September 2, 2024. Reason: Sick', 'warning', false),
  ('a0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000020', 'Grade Report Available', 'Emma''s grades for Chapter 1 homework have been posted: 95/100', 'success', false)
ON CONFLICT DO NOTHING;

-- ========================================
-- SUMMARY
-- ========================================
-- Seed data created:
-- - 1 Admin user
-- - 3 Teachers (Dr. Johnson, Prof. Williams, Dr. Davis)
-- - 5 Parents (Miller, Garcia, Chen, Patel, Thompson)
-- - 10 Students (all in Grade 10A)
-- - 3 Classes (Mathematics, Physics, English)
-- - 30 Student enrollments (10 students × 3 classes)
-- - 10 Student-parent relations
-- - 7 Assignments
-- - 11 Grades
-- - 12 Attendance records
-- - 11 Notifications
--
-- Test credentials (all passwords: admin123):
-- - admin@lumaid-seed.dev
-- - teacher.johnson@lumaid-seed.dev
-- - student.emma.miller@lumaid-seed.dev
-- - parent.miller@lumaid-seed.dev
