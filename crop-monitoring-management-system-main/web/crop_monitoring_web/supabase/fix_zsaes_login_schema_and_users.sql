-- ============================================================================
-- FIX ZSAES LOGIN: Auth users + app profile schema + RLS + schema refresh
-- ============================================================================
-- Run this whole script in Supabase SQL Editor with a privileged role.
-- Password for every seeded account: ZSAES_123456
--
-- Why this fixes the login error:
-- The app queries public.profiles with:
--   id, email, first_name, last_name, role, status
-- and login is allowed only when status = 'approved'.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- Keep backups before repairing old/wrong profile tables.
do $$
begin
  if to_regclass('public.profiles') is not null
     and to_regclass('public.profiles_backup_before_login_fix') is null then
    execute 'create table public.profiles_backup_before_login_fix as select * from public.profiles';
  end if;

  if to_regclass('public.user_profiles') is not null
     and to_regclass('public.user_profiles_backup_before_login_fix') is null then
    execute 'create table public.user_profiles_backup_before_login_fix as select * from public.user_profiles';
  end if;
end $$;

-- Create/repair the exact profile table shape expected by the frontend.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  first_name text,
  last_name text,
  role text,
  status text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_status_check;

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists status text;
alter table public.profiles add column if not exists is_active boolean default true;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Optional compatibility columns for older parts/scripts that used the other naming style.
alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists user_role text;
alter table public.profiles add column if not exists is_approved boolean not null default true;
alter table public.profiles add column if not exists approved boolean not null default true;
alter table public.profiles add column if not exists approved_at timestamptz default now();

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid unique,
  email text unique,
  first_name text,
  last_name text,
  full_name text,
  name text,
  role text,
  user_role text,
  status text,
  is_approved boolean not null default true,
  approved boolean not null default true,
  is_active boolean not null default true,
  approved_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles drop constraint if exists user_profiles_status_check;

alter table public.user_profiles add column if not exists user_id uuid;
alter table public.user_profiles add column if not exists email text;
alter table public.user_profiles add column if not exists first_name text;
alter table public.user_profiles add column if not exists last_name text;
alter table public.user_profiles add column if not exists full_name text;
alter table public.user_profiles add column if not exists name text;
alter table public.user_profiles add column if not exists role text;
alter table public.user_profiles add column if not exists user_role text;
alter table public.user_profiles add column if not exists status text;
alter table public.user_profiles add column if not exists is_approved boolean not null default true;
alter table public.user_profiles add column if not exists approved boolean not null default true;
alter table public.user_profiles add column if not exists is_active boolean not null default true;
alter table public.user_profiles add column if not exists approved_at timestamptz default now();
alter table public.user_profiles add column if not exists created_at timestamptz not null default now();
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_email_unique_idx on public.profiles(email);
create unique index if not exists user_profiles_email_unique_idx on public.user_profiles(email);

create temporary table seed_zsaes_users (
  email text primary key,
  first_name text not null,
  last_name text not null,
  app_role text not null check (app_role in ('admin', 'supervisor', 'collector')),
  display_role text not null check (display_role in ('Administrator', 'Supervisor', 'User')),
  clear_password text not null default 'ZSAES_123456'
) on commit preserve rows;

insert into seed_zsaes_users (email, first_name, last_name, app_role, display_role)
values
  ('tchibarabada@zsaes.org.zw', 'Tendai P.', 'Chibarabada', 'admin', 'Administrator'),
  ('tmururami@zsaes.org.zw', 'Tariro', 'Mururami', 'admin', 'Administrator'),
  ('tmuzenda@zsaes.org.zw', 'Tererai', 'Muzenda', 'admin', 'Administrator'),
  ('nshayanewako@zsaes.org.zw', 'N.', 'Shayanewako', 'admin', 'Administrator'),
  ('emupanehari@zsaes.org.zw', 'E.', 'Mupanehari', 'admin', 'Administrator'),
  ('labanalysts@zsaes.org.zw', 'Lab', 'Analysts', 'admin', 'Administrator'),
  ('cmesi@zsaes.org.zw', 'Clive', 'Mesi', 'supervisor', 'Supervisor'),
  ('fields@zsaes.org.zw', 'Research Services Field', 'Assistants', 'supervisor', 'Supervisor'),
  ('emuzira@zsaes.org.zw', 'Elias', 'Muzira', 'supervisor', 'Supervisor'),
  ('plantprotection@zsaes.org.zw', 'Plant', 'Protection', 'supervisor', 'Supervisor'),
  ('ssithole@zsaes.org.zw', 'Simbarashe', 'Sithole', 'supervisor', 'Supervisor'),
  ('cmukanga@zsaes.org.zw', 'Concilia', 'Mukanga', 'collector', 'User'),
  ('pzvoutete@zsaes.org.zw', 'Petros', 'Zvoutete', 'collector', 'User'),
  ('tmoyo@zsaes.org.zw', 'Thabani', 'Moyo', 'collector', 'User'),
  ('gmabaya@zsaes.org.zw', 'Goden', 'Mabaya', 'collector', 'User'),
  ('lmpofu@zsaes.org.zw', 'Leo T', 'Mpofu', 'collector', 'User'),
  ('schinorumba@zsaes.org.zw', 'Simbarashe', 'Chinorumba', 'collector', 'User'),
  ('amabveni@zsaes.org.zw', 'Audrey', 'Mabveni', 'collector', 'User'),
  ('wmutatu@zsaes.org.zw', 'Washington', 'Mutatu', 'collector', 'User'),
  ('mshumba@zsaes.org.zw', 'Moreblessing', 'Shumba', 'collector', 'User'),
  ('irrigation@zsaes.org.zw', 'Zvipozvashe', 'Shumba', 'collector', 'User'),
  ('lsanjobo@zsaes.org.zw', 'Lyod', 'Sanjobo', 'collector', 'User');

-- Update users that already exist in Supabase Auth.
update auth.users u
set
  aud = 'authenticated',
  role = 'authenticated',
  encrypted_password = crypt(s.clear_password, gen_salt('bf')),
  email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  confirmation_token = coalesce(u.confirmation_token, ''),
  recovery_token = coalesce(u.recovery_token, ''),
  raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  raw_user_meta_data = jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'full_name', trim(s.first_name || ' ' || s.last_name),
    'role', s.app_role,
    'status', 'approved'
  ),
  updated_at = now()
from seed_zsaes_users s
where lower(trim(u.email)) = s.email;

-- Create missing Auth users. This covers the standard hosted Supabase Auth schema.
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
from seed_zsaes_users s
where not exists (
  select 1 from auth.users u where lower(trim(u.email)) = s.email
);

-- Null Auth token string columns can cause GoTrue to return:
-- "Database error querying schema" during password sign-in.
do $$
declare
  c text;
begin
  foreach c in array array[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ] loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = c
    ) then
      execute format(
        'update auth.users u
         set %1$I = coalesce(u.%1$I, %2$L)
         from seed_zsaes_users s
         where lower(trim(u.email)) = s.email',
        c,
        ''
      );
    end if;
  end loop;
end $$;

-- Ensure email identities exist. Handles auth.identities.id as uuid or text.
do $$
declare
  identity_id_type text;
  identity_id_sql text;
  provider_id_is_writable boolean;
  cols text;
  vals text;
begin
  select data_type
  into identity_id_type
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities'
    and column_name = 'id';

  identity_id_sql := case
    when identity_id_type = 'uuid' then 'gen_random_uuid()'
    else 'u.id::text'
  end;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
      and is_generated = 'NEVER'
  )
  into provider_id_is_writable;

  if provider_id_is_writable then
    cols := 'id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at';
    vals := identity_id_sql || ', u.id, u.id::text, jsonb_build_object(' ||
      quote_literal('sub') || ', u.id::text, ' ||
      quote_literal('email') || ', u.email, ' ||
      quote_literal('email_verified') || ', true, ' ||
      quote_literal('phone_verified') || ', false), ' ||
      quote_literal('email') || ', now(), now(), now()';
  else
    cols := 'id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at';
    vals := identity_id_sql || ', u.id, jsonb_build_object(' ||
      quote_literal('sub') || ', u.id::text, ' ||
      quote_literal('email') || ', u.email, ' ||
      quote_literal('email_verified') || ', true, ' ||
      quote_literal('phone_verified') || ', false), ' ||
      quote_literal('email') || ', now(), now(), now()';
  end if;

  execute format(
    'insert into auth.identities (%s)
     select %s
     from auth.users u
     join seed_zsaes_users s on lower(trim(u.email)) = s.email
     where not exists (
       select 1
       from auth.identities i
       where i.user_id = u.id
         and i.provider = %L
     )',
    cols,
    vals,
    'email'
  );

  update auth.identities i
  set
    identity_data = jsonb_build_object(
      'sub', u.id::text,
      'email', u.email,
      'email_verified', true,
      'phone_verified', false
    ),
    updated_at = now()
  from auth.users u
  join seed_zsaes_users s on lower(trim(u.email)) = s.email
  where i.user_id = u.id
    and i.provider = 'email';
end $$;

-- Normalize/approve app profiles.
insert into public.profiles (
  id,
  user_id,
  email,
  first_name,
  last_name,
  full_name,
  name,
  role,
  user_role,
  status,
  is_approved,
  approved,
  is_active,
  approved_at,
  updated_at
)
select
  u.id,
  u.id,
  s.email,
  s.first_name,
  s.last_name,
  trim(s.first_name || ' ' || s.last_name),
  trim(s.first_name || ' ' || s.last_name),
  s.app_role,
  s.display_role,
  'approved',
  true,
  true,
  true,
  now(),
  now()
from seed_zsaes_users s
join auth.users u on lower(trim(u.email)) = s.email
on conflict (email) do update set
  id = excluded.id,
  user_id = excluded.user_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  full_name = excluded.full_name,
  name = excluded.name,
  role = excluded.role,
  user_role = excluded.user_role,
  status = 'approved',
  is_approved = true,
  approved = true,
  is_active = true,
  approved_at = now(),
  updated_at = now();

insert into public.user_profiles (
  id,
  user_id,
  email,
  first_name,
  last_name,
  full_name,
  name,
  role,
  user_role,
  status,
  is_approved,
  approved,
  is_active,
  approved_at,
  updated_at
)
select
  u.id,
  u.id,
  s.email,
  s.first_name,
  s.last_name,
  trim(s.first_name || ' ' || s.last_name),
  trim(s.first_name || ' ' || s.last_name),
  s.app_role,
  s.display_role,
  'approved',
  true,
  true,
  true,
  now(),
  now()
from seed_zsaes_users s
join auth.users u on lower(trim(u.email)) = s.email
on conflict (email) do update set
  id = excluded.id,
  user_id = excluded.user_id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  full_name = excluded.full_name,
  name = excluded.name,
  role = excluded.role,
  user_role = excluded.user_role,
  status = 'approved',
  is_approved = true,
  approved = true,
  is_active = true,
  approved_at = now(),
  updated_at = now();

update public.profiles
set
  email = lower(trim(email)),
  first_name = coalesce(nullif(first_name, ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), 'Pending'),
  last_name = coalesce(nullif(last_name, ''), 'User'),
  role = case lower(trim(coalesce(role, 'collector')))
    when 'administrator' then 'admin'
    when 'system_administrator' then 'admin'
    when 'system administrator' then 'admin'
    when 'regional_supervisor' then 'supervisor'
    when 'regional supervisor' then 'supervisor'
    when 'supervisor' then 'supervisor'
    when 'admin' then 'admin'
    else 'collector'
  end,
  status = case lower(trim(coalesce(status, 'approved')))
    when 'approved' then 'approved'
    when 'pending' then 'pending'
    when 'rejected' then 'rejected'
    else 'approved'
  end,
  is_active = coalesce(is_active, true),
  user_id = coalesce(user_id, id),
  full_name = coalesce(nullif(full_name, ''), trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))),
  name = coalesce(nullif(name, ''), trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

update public.user_profiles
set
  email = lower(trim(email)),
  first_name = coalesce(nullif(first_name, ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), 'Pending'),
  last_name = coalesce(nullif(last_name, ''), 'User'),
  role = case lower(trim(coalesce(role, 'collector')))
    when 'administrator' then 'admin'
    when 'system_administrator' then 'admin'
    when 'system administrator' then 'admin'
    when 'regional_supervisor' then 'supervisor'
    when 'regional supervisor' then 'supervisor'
    when 'supervisor' then 'supervisor'
    when 'admin' then 'admin'
    else 'collector'
  end,
  status = case lower(trim(coalesce(status, 'approved')))
    when 'approved' then 'approved'
    when 'pending' then 'pending'
    when 'rejected' then 'rejected'
    else 'approved'
  end,
  is_active = coalesce(is_active, true),
  user_id = coalesce(user_id, id),
  full_name = coalesce(nullif(full_name, ''), trim(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))),
  name = coalesce(nullif(name, ''), trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')));

alter table public.profiles
  add constraint profiles_role_check check (role in ('collector', 'supervisor', 'admin'));

alter table public.profiles
  add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

alter table public.user_profiles
  add constraint user_profiles_role_check check (role in ('collector', 'supervisor', 'admin'));

alter table public.user_profiles
  add constraint user_profiles_status_check check (status in ('pending', 'approved', 'rejected'));

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_status on public.profiles(status);
create index if not exists idx_profiles_role on public.profiles(role);

alter table public.profiles enable row level security;
alter table public.user_profiles enable row level security;

drop policy if exists "Profiles readable for login" on public.profiles;
drop policy if exists "Profiles update own row" on public.profiles;
drop policy if exists "User profiles readable for login" on public.user_profiles;
drop policy if exists "User profiles update own row" on public.user_profiles;

create policy "Profiles readable for login"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "Profiles update own row"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "User profiles readable for login"
on public.user_profiles
for select
to anon, authenticated
using (true);

create policy "User profiles update own row"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select on public.user_profiles to anon, authenticated;
grant update on public.user_profiles to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification result: every row should show profile_status = approved,
-- email_confirmed = true, and has_email_identity = true.
select
  s.email,
  trim(s.first_name || ' ' || s.last_name) as full_name,
  s.display_role as requested_role,
  p.role as app_role,
  p.status as profile_status,
  p.is_active,
  u.email_confirmed_at is not null as email_confirmed,
  coalesce(u.confirmation_token, '') = ''
    and coalesce(u.recovery_token, '') = ''
    and coalesce(u.email_change, '') = ''
    and coalesce(u.email_change_token_new, '') = '' as auth_token_columns_ready,
  exists (
    select 1
    from auth.identities i
    where i.user_id = u.id
      and i.provider = 'email'
  ) as has_email_identity
from seed_zsaes_users s
left join auth.users u on lower(trim(u.email)) = s.email
left join public.profiles p on p.id = u.id
order by
  case s.display_role when 'Administrator' then 1 when 'Supervisor' then 2 else 3 end,
  s.email;
