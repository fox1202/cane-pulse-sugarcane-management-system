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

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
          and lower(email) = lower('silentabrahamganda02@gmail.com')
          and status = 'approved'
    )
$$;

-- Allow users to view their own profile
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
    on public.profiles for select
    using (public.current_user_is_admin());

-- Allow users to update their own profile
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
    on public.profiles for update
    using (public.current_user_is_admin())
    with check (public.current_user_is_admin());

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

-- Step 5: Create pending profile rows from requested access roles
create or replace function public.normalize_profile_role(requested_role text)
returns text
language sql
immutable
as $$
    select case lower(trim(coalesce(requested_role, '')))
        when 'admin' then 'admin'
        when 'administrator' then 'admin'
        when 'system administrator' then 'admin'
        when 'system_administrator' then 'admin'
        when 'system-administrator' then 'admin'
        when 'supervisor' then 'supervisor'
        when 'regional supervisor' then 'supervisor'
        when 'regional_supervisor' then 'supervisor'
        when 'regional-supervisor' then 'supervisor'
        when 'user' then 'collector'
        when 'users' then 'collector'
        when 'collector' then 'collector'
        else 'collector'
    end
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    profile_email text := lower(trim(coalesce(new.email, '')));
    profile_first_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
    profile_last_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
    requested_role text := public.normalize_profile_role(new.raw_user_meta_data ->> 'role');
begin
    profile_first_name := coalesce(
        profile_first_name,
        nullif(split_part(profile_email, '@', 1), ''),
        'Pending'
    );
    profile_last_name := coalesce(profile_last_name, 'User');

    insert into public.profiles (id, email, first_name, last_name, role, status, is_active)
    values (new.id, profile_email, profile_first_name, profile_last_name, requested_role, 'pending', false)
    on conflict (id) do update set
        email = excluded.email,
        first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
        last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
        role = case
            when public.profiles.status = 'pending' then excluded.role
            else public.profiles.role
        end,
        is_active = case
            when public.profiles.status = 'pending' then false
            else public.profiles.is_active
        end,
        updated_at = now();

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
    after insert on auth.users
    for each row
    execute function public.handle_new_auth_user_profile();

create or replace function public.create_pending_profile_for_auth_signup(
    new_user_id uuid,
    user_email text,
    profile_first_name text,
    profile_last_name text,
    user_role text default 'collector'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    profile_data json;
    normalized_email text := lower(trim(coalesce(user_email, '')));
    normalized_role text := public.normalize_profile_role(user_role);
begin
    if not exists (
        select 1
        from auth.users
        where id = new_user_id
          and lower(email) = normalized_email
    ) then
        raise exception 'Matching auth user was not found for this access request.';
    end if;

    insert into public.profiles (id, email, first_name, last_name, role, status, is_active)
    values (
        new_user_id,
        normalized_email,
        coalesce(nullif(trim(profile_first_name), ''), nullif(split_part(normalized_email, '@', 1), ''), 'Pending'),
        coalesce(nullif(trim(profile_last_name), ''), 'User'),
        normalized_role,
        'pending',
        false
    )
    on conflict (id) do update set
        email = excluded.email,
        first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
        last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
        role = case
            when public.profiles.status = 'pending' then excluded.role
            else public.profiles.role
        end,
        is_active = case
            when public.profiles.status = 'pending' then false
            else public.profiles.is_active
        end,
        updated_at = now()
    returning json_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'status', status
    ) into profile_data;

    return profile_data;
end;
$$;

grant execute on function public.create_pending_profile_for_auth_signup(uuid, text, text, text, text) to anon, authenticated;

-- Step 6: Check if user exists, if not show message
-- Note: You must create the auth user first via Supabase Dashboard
-- Then this script will help verify the profile

-- Step 7: View all profiles (for debugging)
-- SELECT id, email, first_name, last_name, role, status, is_active FROM public.profiles;
