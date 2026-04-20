-- ============================================================================
-- RESET SILENT SUPERUSER PASSWORD
-- ============================================================================
-- Run this whole file in the Supabase SQL Editor with a privileged role.
--
-- Target login:
--   silentabrahamganda02@gmail.com
--
-- This script:
--   - sets the Supabase Auth password for the target account
--   - confirms the email if needed
--   - ensures this profile is the only admin/superuser profile
--   - does not touch auth.identities because that table is owner-restricted
-- ============================================================================

begin;

create extension if not exists pgcrypto;

create temporary table silent_superuser_reset (
  email text primary key,
  first_name text not null,
  last_name text not null,
  clear_password text not null
) on commit preserve rows;

insert into silent_superuser_reset (email, first_name, last_name, clear_password)
values
  ('silentabrahamganda02@gmail.com', 'Silent', 'Abraham Ganda', 'GANDA@2025');

-- Only this email should keep the database admin role that maps to app superuser.
update public.profiles
set
  role = 'supervisor',
  updated_at = now()
where lower(email) <> lower('silentabrahamganda02@gmail.com')
  and role = 'admin';

do $$
begin
  if not exists (
    select 1
    from auth.users u
    where lower(u.email) = lower('silentabrahamganda02@gmail.com')
  ) then
    raise exception 'Auth user silentabrahamganda02@gmail.com does not exist. Create the user in Supabase Authentication first, then rerun this password reset.';
  end if;
end $$;

-- Reset the target password and repair auth metadata.
update auth.users u
set
  aud = 'authenticated',
  role = 'authenticated',
  encrypted_password = crypt(s.clear_password, gen_salt('bf')),
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email')
  ),
  raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'full_name', trim(s.first_name || ' ' || s.last_name),
    'role', 'admin',
    'status', 'approved'
  ),
  updated_at = now()
from silent_superuser_reset s
where lower(u.email) = s.email;

-- GoTrue can reject manually repaired users when token fields are NULL.
do $$
declare
  auth_column_name text;
  required_empty_string_columns text[] := array[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ];
begin
  foreach auth_column_name in array required_empty_string_columns loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = auth_column_name
    ) then
      execute format(
        'update auth.users u
         set %1$I = coalesce(u.%1$I, %2$L)
         from silent_superuser_reset s
         where lower(u.email) = s.email',
        auth_column_name,
        ''
      );
    end if;
  end loop;
end $$;

-- Repair the app profile for the superuser.
update public.profiles p
set
  id = u.id,
  email = s.email,
  first_name = s.first_name,
  last_name = s.last_name,
  role = 'admin',
  status = 'approved',
  is_active = true,
  updated_at = now()
from silent_superuser_reset s
join auth.users u on lower(u.email) = s.email
where p.id = u.id
   or lower(p.email) = s.email;

insert into public.profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  is_active
)
select
  u.id,
  s.email,
  s.first_name,
  s.last_name,
  'admin',
  'approved',
  true
from silent_superuser_reset s
join auth.users u on lower(u.email) = s.email
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
)
on conflict (email) do update set
  id = excluded.id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  role = excluded.role,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

commit;

-- This row must show password_matches = true and profile_ready = true.
select
  s.email,
  u.id as auth_user_id,
  u.email_confirmed_at is not null as email_confirmed,
  u.encrypted_password = crypt(s.clear_password, u.encrypted_password) as password_matches,
  p.role,
  p.status,
  p.is_active,
  p.role = 'admin'
    and p.status = 'approved'
    and coalesce(p.is_active, true) = true as profile_ready
from silent_superuser_reset s
left join auth.users u on lower(u.email) = s.email
left join public.profiles p on p.id = u.id;
