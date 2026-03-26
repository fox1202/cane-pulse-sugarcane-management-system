-- ============================================================================
-- APPROVE USER: silentabrahamganda02@gmail.com
-- ============================================================================
-- Run this script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create/Update profile with APPROVED status
INSERT INTO public.profiles (id, email, first_name, last_name, role, status, is_active)
SELECT 
    u.id,
    u.email,
    'Silent',
    'Abraham Ganda',
    'admin',
    'approved',
    true
FROM auth.users u
WHERE u.email = 'silentabrahamganda02@gmail.com'
ON CONFLICT (email) DO UPDATE SET 
    status = 'approved',
    is_active = true,
    updated_at = now();

-- Step 2: Verify the user is now approved
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    is_active,
    created_at,
    'User is now APPROVED ✓' as result
FROM public.profiles 
WHERE email = 'silentabrahamganda02@gmail.com';
