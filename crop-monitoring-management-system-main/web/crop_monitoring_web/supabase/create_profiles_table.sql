-- ============================================================================
-- CREATE PROPER PROFILES TABLE + AUTH INTEGRATION
-- ============================================================================
-- This script creates the profiles table that the app expects
-- Run this in Supabase SQL Editor FIRST, then create the users in Auth
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. CREATE PROFILES TABLE (linked to Supabase Auth)
-- ============================================================================

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

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_role on public.profiles(role);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles enable row level security;

-- Allow users to view their own profile
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id or
           (select role from auth.users where id = auth.uid())::text = 'admin');

-- Allow users to update their own profile
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- ============================================================================
-- 4. AUTO UPDATE TIMESTAMP TRIGGER
-- ============================================================================

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

-- ============================================================================
-- 5. FUNCTION TO CREATE USER WITH PROFILE
-- ============================================================================

create or replace function public.create_user_with_profile(
    user_email text,
    user_password text,
    first_name text,
    last_name text,
    user_role text default 'collector',
    user_status text default 'pending'
)
returns json as $$
declare
    new_user_id uuid;
    profile_data json;
begin
    -- Create user in auth.users
    new_user_id := auth.uid();
    
    -- Insert profile
    insert into public.profiles (id, email, first_name, last_name, role, status)
    values (new_user_id, user_email, first_name, last_name, user_role, user_status);
    
    select json_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'status', status
    ) into profile_data from public.profiles where id = new_user_id;
    
    return profile_data;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- END OF SCHEMA CREATION
-- ============================================================================
-- Next steps:
-- 1. Use Supabase Auth settings to disable email confirmation (Password reset)
-- 2. Create users manually in Auth tab, then create matching profiles below
-- 3. OR use the admin API to automate user + profile creation
-- ============================================================================
