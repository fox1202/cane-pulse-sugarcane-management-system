-- ============================================================================
-- RESET AND REPAIR ALL ZSAES SUPERVISOR LOGINS
-- ============================================================================
-- Run this whole file in Supabase SQL Editor.
--
-- Supervisor login password after this script:
--   ZSAES_456
--
-- This script repairs:
--   - missing Auth users
--   - wrong supervisor password hashes
--   - missing/incorrect email identities
--   - unconfirmed Auth email state
--   - null Auth token fields that can break GoTrue login
--   - missing/pending/inactive profile rows
-- ============================================================================

begin;

create extension if not exists pgcrypto;

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = case lower(trim(coalesce(role, '')))
  when 'administrator' then 'admin'
  when 'system_administrator' then 'admin'
  when 'system administrator' then 'admin'
  when 'regional_supervisor' then 'supervisor'
  when 'regional supervisor' then 'supervisor'
  when 'staff' then 'collector'
  when 'user' then 'collector'
  when 'users' then 'collector'
  else lower(trim(coalesce(role, 'collector')))
end;

update public.profiles
set role = 'collector'
where role not in ('collector', 'supervisor', 'admin')
   or role is null;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('collector', 'supervisor', 'admin'));

create temporary table supervisor_login_repair (
  email text primary key,
  first_name text not null,
  last_name text not null,
  clear_password text not null
) on commit preserve rows;

insert into supervisor_login_repair (email, first_name, last_name, clear_password)
values
  ('cmesi@zsaes.org.zw', 'Clive', 'Mesi', 'ZSAES_456'),
  ('fields@zsaes.org.zw', 'Research Services Field', 'Assistants', 'ZSAES_456'),
  ('emuzira@zsaes.org.zw', 'Elias', 'Muzira', 'ZSAES_456'),
  ('plantprotection@zsaes.org.zw', 'Plant', 'Protection', 'ZSAES_456'),
  ('ssithole@zsaes.org.zw', 'Simbarashe', 'Sithole', 'ZSAES_456')
on conflict (email) do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  clear_password = excluded.clear_password;

-- Create missing Supabase Auth users first.
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  s.email,
  crypt(s.clear_password, gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'full_name', trim(s.first_name || ' ' || s.last_name),
    'role', 'supervisor',
    'status', 'approved'
  ),
  now(),
  now()
from supervisor_login_repair s
where not exists (
  select 1
  from auth.users u
  where lower(u.email) = s.email
);

-- Reset every supervisor password and Auth metadata.
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
from supervisor_login_repair s
where lower(u.email) = s.email;

-- GoTrue can reject manually-seeded users when token fields are NULL.
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
         from supervisor_login_repair s
         where lower(u.email) = s.email',
        auth_column_name,
        ''
      );
    end if;
  end loop;
end $$;

-- Ensure email/password identities exist for every supervisor.
do $$
declare
  identity_id_type text;
  provider_id_column_is_writable boolean;
  identity_id_expression text;
  identity_columns text;
  identity_values text;
begin
  select data_type
  into identity_id_type
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities'
    and column_name = 'id';

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
      and is_generated = 'NEVER'
  )
  into provider_id_column_is_writable;

  identity_id_expression := case
    when identity_id_type = 'uuid' then 'u.id'
    else 'u.id::text'
  end;

  if provider_id_column_is_writable then
    identity_columns := 'id, user_id, provider_id, identity_data, provider, created_at, updated_at';
    identity_values := identity_id_expression || ', u.id, u.id::text, jsonb_build_object(' ||
      quote_literal('sub') || ', u.id::text, ' ||
      quote_literal('email') || ', u.email, ' ||
      quote_literal('email_verified') || ', true, ' ||
      quote_literal('phone_verified') || ', false), ' ||
      quote_literal('email') || ', now(), now()';
  else
    identity_columns := 'id, user_id, identity_data, provider, created_at, updated_at';
    identity_values := identity_id_expression || ', u.id, jsonb_build_object(' ||
      quote_literal('sub') || ', u.id::text, ' ||
      quote_literal('email') || ', u.email, ' ||
      quote_literal('email_verified') || ', true, ' ||
      quote_literal('phone_verified') || ', false), ' ||
      quote_literal('email') || ', now(), now()';
  end if;

  execute format(
    'insert into auth.identities (%s)
     select %s
     from auth.users u
     join supervisor_login_repair s on lower(u.email) = s.email
     where not exists (
       select 1
       from auth.identities i
       where i.user_id = u.id
         and i.provider = %L
     )',
    identity_columns,
    identity_values,
    'email'
  );
end $$;

update auth.identities i
set
  identity_data = coalesce(i.identity_data, '{}'::jsonb) || jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  updated_at = now()
from auth.users u
join supervisor_login_repair s on lower(u.email) = s.email
where i.user_id = u.id
  and i.provider = 'email';

-- Create or repair app profiles.
update public.profiles p
set
  id = u.id,
  first_name = s.first_name,
  last_name = s.last_name,
  role = 'supervisor',
  status = 'approved',
  is_active = true,
  updated_at = now()
from supervisor_login_repair s
join auth.users u on lower(u.email) = s.email
where lower(p.email) = s.email;

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
  'supervisor',
  'approved',
  true
from supervisor_login_repair s
join auth.users u on lower(u.email) = s.email
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
     or lower(p.email) = s.email
);

update public.profiles p
set
  email = s.email,
  first_name = s.first_name,
  last_name = s.last_name,
  role = 'supervisor',
  status = 'approved',
  is_active = true,
  updated_at = now()
from supervisor_login_repair s
join auth.users u on lower(u.email) = s.email
where p.id = u.id
   or lower(p.email) = s.email;

commit;

-- All rows below must show password_matches = true and profile_ready = true.
select
  s.email,
  trim(s.first_name || ' ' || s.last_name) as full_name,
  u.id as auth_user_id,
  u.email_confirmed_at is not null as email_confirmed,
  u.encrypted_password = crypt(s.clear_password, u.encrypted_password) as password_matches,
  u.confirmation_token is not null
    and u.recovery_token is not null
    and u.email_change is not null
    and u.email_change_token_new is not null as auth_tokens_ready,
  exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
  ) as has_email_identity,
  p.role,
  p.status,
  p.is_active,
  p.role = 'supervisor'
    and p.status = 'approved'
    and coalesce(p.is_active, true) = true as profile_ready
from supervisor_login_repair s
left join auth.users u on lower(u.email) = s.email
left join public.profiles p on p.id = u.id
order by s.email;
