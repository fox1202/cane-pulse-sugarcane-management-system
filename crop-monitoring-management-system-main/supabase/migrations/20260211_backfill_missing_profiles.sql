-- Migration: Backfill Missing Profiles (v4)
-- Description: Adds 'email' column if missing, Backfills email, Inserts missing profiles. Handles NULL roles.
-- Created at: 2026-02-11

-- 1. Ensure the email column exists
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
        alter table public.profiles add column email text;
    end if;
end $$;

-- 2. Backfill existing profiles that have null email (if any)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
and p.email is null;

-- 3. Insert missing profiles for users who have no profile record at all
-- If role is null in metadata, default to 'supervisor' (or 'collector' if safer) to satisfy NOT NULL constraint
insert into public.profiles (id, first_name, last_name, email, role, status)
select
  u.id,
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  u.email,
  coalesce(u.raw_user_meta_data->>'role', 'supervisor'), -- Default to supervisor if null
  'pending'
from auth.users u
where u.id not in (select id from public.profiles);
