-- ============================================================================
-- COMPLETE SETUP: Profiles Table + Test User (RUN THIS ENTIRE SCRIPT)
-- ============================================================================
-- Run this COMPLETE script in Supabase SQL Editor in ONE GO
-- Do NOT run individual parts - run it all together
-- ============================================================================

-- Step 1: Create profiles table
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    first_name text not null,
    last_name text not null,
    email text not null unique,
    role text not null default 'collector' check (role in ('collector', 'supervisor', 'admin')),
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    is_active boolean default true,
    phone text,
    department text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Step 2: Create indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_role on public.profiles(role);

-- Step 3: Enable RLS
alter table public.profiles enable row level security;

-- Allow users to view their own profile
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

-- Allow users to update their own profile
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Allow reading for all (for login check)
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
create policy "Profiles are readable by authenticated users"
    on public.profiles for select
    using (true);

-- Step 4: Create timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
    before update on public.profiles
    for each row
    execute procedure public.update_updated_at_column();

-- Step 5: Check if user exists, if not show message
-- Note: You must create the auth user first via Supabase Dashboard
-- Then this script will help verify the profile

-- Step 6: View all profiles (for debugging)
-- SELECT id, email, first_name, last_name, role, status, is_active FROM public.profiles;
