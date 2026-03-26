-- ============================================================================
-- FIX: Profile not found error
-- ============================================================================
-- This script will:
-- 1. Create profiles table if it doesn't exist
-- 2. Create profile record for silentabrahamganda02@gmail.com
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL UNIQUE,
    role text NOT NULL DEFAULT 'collector' CHECK (role IN ('collector', 'supervisor', 'admin')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_active boolean DEFAULT true,
    phone text,
    department text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 2: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable" ON public.profiles;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Profiles are publicly readable"
    ON public.profiles FOR SELECT
    USING (true);

-- Step 5: Create timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

-- Step 6: INSERT/UPDATE profile for silentabrahamganda02@gmail.com
INSERT INTO public.profiles (id, email, first_name, last_name, role, status, is_active, department)
SELECT 
    u.id,
    u.email,
    'Silent',
    'Abraham Ganda',
    'admin',
    'approved',
    true,
    'Management'
FROM auth.users u
WHERE u.email = 'silentabrahamganda02@gmail.com'
ON CONFLICT (email) DO UPDATE SET 
    status = 'approved',
    is_active = true,
    updated_at = now();

-- Step 7: Verify profile was created
SELECT 
    'PROFILE CREATED ✓' as result,
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    is_active
FROM public.profiles 
WHERE email = 'silentabrahamganda02@gmail.com';

-- Step 8: Verify auth user exists
SELECT 
    'AUTH USER EXISTS ✓' as result,
    email,
    id,
    email_confirmed_at
FROM auth.users
WHERE email = 'silentabrahamganda02@gmail.com';
