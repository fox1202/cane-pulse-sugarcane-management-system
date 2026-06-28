-- ============================================================================
-- RESET PMAFURATIDZE PASSWORD
-- ============================================================================
-- Run this whole file in the Supabase SQL Editor with a privileged role.
--
-- Target login:
--   pmafuratidze@science.uz.ac.zw
--
-- New password:
--   PM_2026
-- ============================================================================

begin;

create extension if not exists pgcrypto;

create temporary table pmafuratidze_password_reset (
  email text primary key,
  first_name text not null,
  last_name text not null,
  clear_password text not null
) on commit preserve rows;

insert into pmafuratidze_password_reset (
  email,
  first_name,
  last_name,
  clear_password
)
values (
  'pmafuratidze@science.uz.ac.zw',
  'Pmafuratidze',
  'User',
  'PM_2026'
);

do $$
begin
  if not exists (
    select 1
    from auth.users u
    where lower(u.email) = lower('pmafuratidze@science.uz.ac.zw')
  ) then
    raise exception 'Auth user pmafuratidze@science.uz.ac.zw does not exist. Create the user in Supabase Authentication first, then rerun this password reset.';
  end if;
end $$;

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
    'role', 'supervisor',
    'status', 'approved'
  ),
  updated_at = now()
from pmafuratidze_password_reset s
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
         from pmafuratidze_password_reset s
         where lower(u.email) = s.email',
        auth_column_name,
        ''
      );
    end if;
  end loop;
end $$;

-- Ensure the app profile can pass the app's approved-user login gate.
insert into public.profiles (
  id,
  email,
  first_name,
  last_name,
  full_name,
  role,
  status,
  is_active
)
select
  u.id,
  s.email,
  s.first_name,
  s.last_name,
  trim(s.first_name || ' ' || s.last_name),
  'supervisor',
  'approved',
  true
from pmafuratidze_password_reset s
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
  full_name = excluded.full_name,
  role = excluded.role,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = now();

update public.profiles p
set
  role = 'supervisor',
  status = 'approved',
  is_active = true,
  updated_at = now()
from pmafuratidze_password_reset s
where lower(p.email) = s.email;

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
  p.full_name,
  p.role = 'supervisor'
    and p.status = 'approved'
    and coalesce(p.is_active, true) = true as profile_ready
from pmafuratidze_password_reset s
left join auth.users u on lower(u.email) = s.email
left join public.profiles p on p.id = u.id;
