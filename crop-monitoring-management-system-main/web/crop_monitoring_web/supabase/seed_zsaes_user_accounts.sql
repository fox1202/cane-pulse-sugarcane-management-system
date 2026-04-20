-- ============================================================================
-- ZSAES BULK USER ACCOUNT SEED
-- ============================================================================
-- Run this in Supabase SQL Editor with a privileged role.
--
-- Password groups:
--   Supervisors: ZSAES_456
--   Users:       ZSAES_123456
--
-- App role mapping:
--   Superuser  -> admin (silentabrahamganda02@gmail.com only)
--   Supervisor -> supervisor
--   User       -> collector
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- Repair older profile schemas before Auth triggers try to create profile rows.
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
end
where role is distinct from case lower(trim(coalesce(role, '')))
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

update public.profiles
set role = 'supervisor'
where role = 'admin'
  and lower(email) <> lower('silentabrahamganda02@gmail.com');

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('collector', 'supervisor', 'admin'));

create temporary table seed_cane_pulse_users (
  email text primary key,
  first_name text not null,
  last_name text not null,
  app_role text not null check (app_role in ('admin', 'supervisor', 'collector')),
  clear_password text not null
) on commit preserve rows;

insert into seed_cane_pulse_users (email, first_name, last_name, app_role, clear_password)
values
  ('tmururami@zsaes.org.zw', 'Tariro', 'Mururami', 'supervisor', 'ZSAES_456'),
  ('tmuzenda@zsaes.org.zw', 'Tererai', 'Muzenda', 'supervisor', 'ZSAES_456'),
  ('cmesi@zsaes.org.zw', 'Clive', 'Mesi', 'supervisor', 'ZSAES_456'),
  ('fields@zsaes.org.zw', 'Research Services Field', 'Assistants', 'supervisor', 'ZSAES_456'),
  ('emuzira@zsaes.org.zw', 'Elias', 'Muzira', 'supervisor', 'ZSAES_456'),
  ('plantprotection@zsaes.org.zw', 'Plant', 'Protection', 'supervisor', 'ZSAES_456'),
  ('ssithole@zsaes.org.zw', 'Simbarashe', 'Sithole', 'supervisor', 'ZSAES_456'),
  ('cmukanga@zsaes.org.zw', 'Concilia', 'Mukanga', 'collector', 'ZSAES_123456'),
  ('pzvoutete@zsaes.org.zw', 'Petros', 'Zvoutete', 'collector', 'ZSAES_123456'),
  ('tmoyo@zsaes.org.zw', 'Thabani', 'Moyo', 'collector', 'ZSAES_123456'),
  ('gmabaya@zsaes.org.zw', 'Goden', 'Mabaya', 'collector', 'ZSAES_123456'),
  ('lmpofu@zsaes.org.zw', 'Leo T', 'Mpofu', 'collector', 'ZSAES_123456'),
  ('schinorumba@zsaes.org.zw', 'Simbarashe', 'Chinorumba', 'collector', 'ZSAES_123456'),
  ('amabveni@zsaes.org.zw', 'Audrey', 'Mabveni', 'collector', 'ZSAES_123456'),
  ('wmutatu@zsaes.org.zw', 'Washington', 'Mutatu', 'collector', 'ZSAES_123456'),
  ('mshumba@zsaes.org.zw', 'Moreblessing', 'Shumba', 'collector', 'ZSAES_123456'),
  ('irrigation@zsaes.org.zw', 'Zvipozvashe', 'Shumba', 'collector', 'ZSAES_123456'),
  ('lsanjobo@zsaes.org.zw', 'Lyod', 'Sanjobo', 'collector', 'ZSAES_123456');

-- Update existing auth users so they use the requested password and metadata.
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
    'role', s.app_role,
    'status', 'approved'
  ),
  updated_at = now()
from seed_cane_pulse_users s
where lower(u.email) = s.email;

-- Create missing Supabase Auth users.
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
    'role', s.app_role,
    'status', 'approved'
  ),
  now(),
  now()
from seed_cane_pulse_users s
where not exists (
  select 1
  from auth.users u
  where lower(u.email) = s.email
);

-- GoTrue can return "Database error querying schema" if manually-seeded Auth
-- users have null string token fields. Keep this dynamic across Supabase
-- Auth schema versions and run after all seeded users exist.
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
         from seed_cane_pulse_users s
         where lower(u.email) = s.email',
        auth_column_name,
        ''
      );
    end if;
  end loop;
end $$;

-- Ensure email/password identities exist for the seeded Auth users.
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
     join seed_cane_pulse_users s on lower(u.email) = s.email
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

-- Refresh existing email identity metadata for users that were already present.
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
join seed_cane_pulse_users s on lower(u.email) = s.email
where i.user_id = u.id
  and i.provider = 'email';

-- Update matching profile rows first.
update public.profiles p
set
  email = s.email,
  first_name = s.first_name,
  last_name = s.last_name,
  role = s.app_role,
  status = 'approved',
  is_active = true,
  updated_at = now()
from seed_cane_pulse_users s
join auth.users u on lower(u.email) = s.email
where p.id = u.id;

-- Create missing app profile rows, or repair rows that already exist by email.
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
  s.app_role,
  'approved',
  true
from seed_cane_pulse_users s
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

-- Verify the seeded accounts.
select
  s.email,
  trim(s.first_name || ' ' || s.last_name) as full_name,
  case s.app_role
    when 'admin' then 'Administrator'
    when 'supervisor' then 'Supervisor'
    else 'User'
  end as requested_role,
  p.role as app_role,
  p.status,
  p.is_active,
  u.email_confirmed_at is not null as email_confirmed,
  u.confirmation_token is not null
    and u.recovery_token is not null
    and u.email_change is not null
    and u.email_change_token_new is not null as auth_tokens_ready,
  exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
  ) as has_email_identity
from seed_cane_pulse_users s
left join auth.users u on lower(u.email) = s.email
left join public.profiles p on p.id = u.id
order by
  case s.app_role when 'admin' then 1 when 'supervisor' then 2 else 3 end,
  s.email;
