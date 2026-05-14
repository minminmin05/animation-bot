-- ========================================
-- FIX ADMIN ACCESS TO SETTINGS
-- ========================================
-- This script fixes admin user access to settings page
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Find all admin users from auth.users
WITH auth_admins AS (
  SELECT 
    au.id, 
    au.email,
    COALESCE(pu.role, 'missing') as current_role
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE au.email LIKE '%admin%' OR au.raw_app_meta_data->>'role' = 'admin'
),
-- Step 2: Check what we have
debug_info AS (
  SELECT 
    id, 
    email, 
    current_role,
    CASE 
      WHEN current_role = 'admin' THEN '✅ Already has admin role'
      WHEN current_role = 'missing' THEN '❌ Missing from public.users'
      ELSE '⚠️ Has role: ' || current_role
    END as status
  FROM auth_admins
)
SELECT * FROM debug_info;

-- Step 3: Ensure all auth admin users have admin role in public.users
DO $$
DECLARE
  admin_user RECORD;
  update_count INT := 0;
BEGIN
  -- Find admin users from auth
  FOR admin_user IN
    SELECT DISTINCT au.id, au.email
    FROM auth.users au
    WHERE 
      au.email LIKE '%admin%' 
      OR au.raw_app_meta_data->>'role' = 'admin'
      OR au.email = 'admin@school.com'
  LOOP
    -- Update or insert into public.users with admin role
    INSERT INTO public.users (id, email, role, full_name)
    VALUES (
      admin_user.id, 
      admin_user.email, 
      'admin',
      COALESCE(
        (SELECT full_name FROM public.users WHERE id = admin_user.id),
        'ผู้ดูแลระบบ'
      )
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin'  -- Ensure role is admin
    WHERE public.users.role != 'admin';
    
    update_count := update_count + 1;
    RAISE NOTICE 'Fixed admin user: % (%)', admin_user.email, admin_user.id;
  END LOOP;
  
  RAISE NOTICE 'Total admin users processed: %', update_count;
END $$;

-- Step 4: Verify all admins now have correct role
SELECT 
  u.id,
  u.email,
  u.role,
  u.full_name,
  au.email_confirmed_at IS NOT NULL as is_confirmed
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE u.role = 'admin'
ORDER BY u.created_at DESC;
