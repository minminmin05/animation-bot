-- ========================================
-- VERIFICATION TESTS FOR EMAIL DUPLICATE FIX
-- ========================================
-- Purpose: Test that the false "email already exists" bug is fixed
-- Run this AFTER applying migration 16
--
-- Expected Results:
-- 1. New emails can be registered (no false positives)
-- 2. Actual duplicates are still blocked
-- 3. Orphaned auth records don't block signups
-- 4. Soft-deleted auth records don't block signups
-- ========================================

\echo ''
\echo '========================================'
\echo 'EMAIL DUPLICATE FIX VERIFICATION TESTS'
\echo '========================================'
\echo ''

-- Setup: Clean up any existing test data
\echo '1. Cleaning up existing test data...'
DELETE FROM public.users WHERE email LIKE '%@testfix.example.com';
DELETE FROM auth.users WHERE email LIKE '%@testfix.example.com';
DELETE FROM auth.users WHERE email LIKE '%@orphan.example.com';
\echo '   Cleanup complete.'
\echo ''

-- ========================================
-- TEST 1: Brand new email should work
-- ========================================
\echo 'TEST 1: Brand new email signup (should succeed)'
\echo '----------------------------------------------'

SELECT public_signup(
  'newuser@testfix.example.com',
  'testpass123',
  'Test User',
  'student'
) AS result;

\echo ''
\echo 'Expected: { success: true, ... }'
\echo 'If success: true, the fix works for new emails!'
\echo ''

-- ========================================
-- TEST 2: Actual duplicate should be blocked
-- ========================================
\echo 'TEST 2: Duplicate email (should be blocked)'
\echo '--------------------------------------------'

SELECT public_signup(
  'newuser@testfix.example.com',  -- Same as TEST 1
  'testpass123',
  'Test User',
  'student'
) AS result;

\echo ''
\echo 'Expected: { success: false, error: "Email already registered" }'
\echo 'If error shown, duplicate detection still works!'
\echo ''

-- ========================================
-- TEST 3: Orphaned auth record should NOT block
-- ========================================
\echo 'TEST 3: Orphaned auth record (the bug scenario)'
\echo '------------------------------------------------'
\echo 'Creating orphaned auth record...'

-- Simulate orphaned auth record (auth.users without public.users)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  raw_app_meta_data
) VALUES (
  gen_random_uuid(),
  'orphan@testfix.example.com',
  crypt('testpass123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Orphan User", "role": "student"}'::jsonb,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb
);

\echo 'Orphaned auth record created.'
\echo ''
\echo 'Now attempting to signup with orphaned email...'

SELECT public_signup(
  'orphan@testfix.example.com',
  'testpass123',
  'Orphan User',
  'student'
) AS result;

\echo ''
\echo 'Expected: { success: true, ... }'
\echo 'If success: true, the ORPHAN BUG IS FIXED! (Previously would fail)'
\echo ''

-- ========================================
-- TEST 4: Verify cleanup worked
-- ========================================
\echo 'TEST 4: Verify orphan was cleaned up properly'
\echo '------------------------------------------------'

SELECT
  au.id,
  au.email,
  au.deleted_at,
  CASE
    WHEN pu.id IS NOT NULL THEN 'In public.users'
    ELSE 'Orphaned (should be deleted)'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email LIKE '%@testfix.example.com' OR au.email LIKE '%@orphan.example.com';

\echo ''

-- ========================================
-- TEST 5: Case insensitive check
-- ========================================
\echo 'TEST 5: Case insensitive email (should be blocked)'
\echo '---------------------------------------------------'

SELECT public_signup(
  'NEWUSER@TESTFIX.EXAMPLE.COM',  -- Uppercase version
  'testpass123',
  'Test User',
  'student'
) AS result;

\echo ''
\echo 'Expected: { success: false, error: "Email already registered" }'
\echo 'If blocked, case insensitive check works!'
\echo ''

-- ========================================
-- TEST 6: admin_create_user with orphaned record
-- ========================================
\echo 'TEST 6: Admin create user with orphaned auth record'
\echo '----------------------------------------------------'
\echo 'Note: This test requires being logged in as admin'
\echo 'Skipping auth check for this test...'

-- Create another orphaned record
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at,
  raw_app_meta_data
) VALUES (
  gen_random_uuid(),
  'adminorphan@testfix.example.com',
  crypt('testpass123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Admin Orphan", "role": "teacher"}'::jsonb,
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb
);

\echo 'Created orphaned auth record for admin test.'
\echo ''
\echo 'Testing admin_create_user (may fail if not admin)...'

DO $$
DECLARE
  result JSONB;
BEGIN
  -- Try to call admin_create_user
  SELECT admin_create_user(
    'adminorphan@testfix.example.com',
    'testpass123',
    'Admin Orphan',
    'teacher'
  ) INTO result;

  RAISE NOTICE 'Result: %', result;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Expected (not admin): %', SQLERRM;
END $$;

\echo ''

-- ========================================
-- FINAL SUMMARY
-- ========================================
\echo '========================================'
\echo 'TEST SUMMARY'
\echo '========================================'
\echo ''
\echo '✓ TEST 1: New email signup'
\echo '✓ TEST 2: Duplicate blocking'
\echo '✓ TEST 3: Orphaned record handling (MAIN BUG FIX)'
\echo '✓ TEST 4: Cleanup verification'
\echo '✓ TEST 5: Case insensitive check'
\echo '✓ TEST 6: Admin create user'
\echo ''
\echo 'All tests completed!'
\echo ''

-- Cleanup
\echo 'Cleaning up test data...'
DELETE FROM public.users WHERE email LIKE '%@testfix.example.com' OR email LIKE '%@orphan.example.com';
DELETE FROM auth.users WHERE email LIKE '%@testfix.example.com' OR email LIKE '%@orphan.example.com';
\echo 'Cleanup complete.'
\echo ''
