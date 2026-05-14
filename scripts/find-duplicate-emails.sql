-- ========================================
-- FIND DUPLICATE/ORPHANED EMAILS
-- ========================================
-- Run in Supabase Dashboard → SQL Editor

-- Find emails in auth.users but NOT in public.users (orphaned)
SELECT au.id,
       au.email,
       au.email_confirmed_at,
       au.created_at,
       'ORPHANED - in auth but not public' as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
AND au.deleted_at IS NULL
ORDER BY au.created_at DESC;

-- Find emails in public.users but NOT in auth.users
SELECT pu.id,
       pu.email,
       pu.created_at,
       'ORPHANED - in public but not auth' as status
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- Check specific email (change to the email you're testing)
SELECT 'Checking dd@gmail.com' as info,
       (SELECT COUNT(*) FROM auth.users WHERE email = 'dd@gmail.com') as in_auth,
       (SELECT COUNT(*) FROM public.users WHERE email = 'dd@gmail.com') as in_public;
