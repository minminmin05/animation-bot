-- ========================================
-- CREATE ADMIN USER MANUALLY
-- ========================================
-- Run this in Supabase Dashboard → SQL Editor
-- This creates a working admin user directly

-- First, check if email exists in auth.users
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'admin@school.com';

-- If exists, update email_confirmed_at
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find the user
  SELECT id, email INTO user_record
  FROM auth.users
  WHERE email = 'admin@school.com'
  LIMIT 1;

  IF user_record.id IS NOT NULL THEN
    -- Confirm email
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = user_record.id;

    RAISE NOTICE 'Found user in auth.users, email confirmed. ID: %', user_record.id;

    -- Check if exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_record.id) THEN
      -- Insert into public.users
      INSERT INTO public.users (id, email, role, full_name)
      VALUES (user_record.id, 'admin@school.com', 'admin', 'ผู้ดูแลระบบ');

      RAISE NOTICE 'Inserted into public.users';
    ELSE
      RAISE NOTICE 'Already exists in public.users';
    END IF;
  ELSE
    RAISE NOTICE 'User not found. Creating new admin user...';

    -- Create new user directly
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
      'admin@school.com',
      crypt('demo1234', gen_salt('bf')),
      NOW(),
      '{"full_name": "ผู้ดูแลระบบ", "role": "admin"}'::jsonb,
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb
    );

    RAISE NOTICE 'New admin user created';
  END IF;
END $$;

-- Verify
SELECT u.id, u.email, u.role, u.full_name,
       au.email_confirmed_at IS NOT NULL as is_confirmed
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE u.email = 'admin@school.com';
