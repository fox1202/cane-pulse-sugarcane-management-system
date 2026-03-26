-- ============================================================================
-- TROUBLESHOOTING SCRIPT - Check what's configured and what's missing
-- ============================================================================
-- Run each query SEPARATELY to diagnose the issue

-- 1. CHECK: Does profiles table exist?
SELECT 
    't' as result,
    'profiles table EXISTS ✓' as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'profiles'
UNION ALL
SELECT 
    'f' as result,
    'ERROR: profiles table does NOT exist - run setup_complete.sql' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
);

-- 2. CHECK: Does user exist in Auth?
SELECT 
    email,
    id,
    'Auth user EXISTS ✓' as status,
    confirmed_at,
    email_confirmed_at
FROM auth.users 
WHERE email = 'silentganda02@gmail.com';

-- 3. CHECK: Does profile exist?
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    is_active,
    'Profile EXISTS ✓' as result
FROM public.profiles 
WHERE email = 'silentganda02@gmail.com';

-- 4. CHECK: Is profile status "approved"?
SELECT 
    CASE 
        WHEN status = 'approved' THEN 'Status is APPROVED ✓'
        WHEN status = 'pending' THEN 'ERROR: Status is PENDING - need to approve'
        WHEN status = 'rejected' THEN 'ERROR: Status is REJECTED'
        ELSE 'ERROR: Unknown status'
    END as status_check
FROM public.profiles
WHERE email = 'silentganda02@gmail.com';

-- 5. IF NO RESULTS ABOVE, user doesn't exist yet
-- You must create the user in Supabase Auth Dashboard first
