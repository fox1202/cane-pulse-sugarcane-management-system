-- ============================================================================
-- GRANT PMAFURATIDZE SUPERUSER ACCESS
-- ============================================================================
-- Run this in the Supabase SQL Editor with a privileged role.
--
-- This keeps Silent as a superuser and also grants the same database admin
-- role/access to pmafuratidze@science.uz.ac.zw.
-- ============================================================================

begin;

create temporary table pmafuratidze_superuser (
  email text primary key,
  first_name text not null,
  last_name text not null
) on commit preserve rows;

insert into pmafuratidze_superuser (email, first_name, last_name)
values ('pmafuratidze@science.uz.ac.zw', 'Pmafuratidze', 'User')
on conflict (email) do update set
  first_name = excluded.first_name,
  last_name = excluded.last_name;

do $$
begin
  if not exists (
    select 1
    from auth.users u
    where lower(u.email) = lower('pmafuratidze@science.uz.ac.zw')
  ) then
    raise exception 'Auth user pmafuratidze@science.uz.ac.zw does not exist. Create the user in Supabase Authentication first, then rerun this script.';
  end if;
end $$;

-- Create or repair the profile row from the existing Supabase auth user.
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
  'admin',
  'approved',
  true
from pmafuratidze_superuser s
join auth.users u on lower(u.email) = s.email
on conflict (email) do update
set
  id = excluded.id,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  full_name = excluded.full_name,
  role = 'admin',
  status = 'approved',
  is_active = true,
  updated_at = now();

-- Keep Supabase auth metadata aligned for clients that read role/status there.
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'first_name', s.first_name,
    'last_name', s.last_name,
    'full_name', trim(s.first_name || ' ' || s.last_name),
    'role', 'admin',
    'status', 'approved'
  ),
  updated_at = now()
from pmafuratidze_superuser s
where lower(u.email) = s.email;

-- Allow both approved superuser emails to keep the real admin role in RLS.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'admin'
      and lower(p.email) not in (
        lower('silentabrahamganda02@gmail.com'),
        lower('pmafuratidze@science.uz.ac.zw')
      )
      then 'supervisor'
    else p.role
  end
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'approved'
    and coalesce(p.is_active, true) = true
  limit 1
$$;

-- Allow both superusers through policies that call current_user_is_admin().
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
      and lower(email) in (
        lower('silentabrahamganda02@gmail.com'),
        lower('pmafuratidze@science.uz.ac.zw')
      )
      and status = 'approved'
      and coalesce(is_active, true) = true
  )
$$;

commit;

select
  email,
  role,
  status,
  is_active,
  case
    when role = 'admin'
      and lower(email) in (
        lower('silentabrahamganda02@gmail.com'),
        lower('pmafuratidze@science.uz.ac.zw')
      )
      then 'SUPERUSER'
    else 'NON_SUPERUSER'
  end as app_access
from public.profiles
where lower(email) in (
  lower('silentabrahamganda02@gmail.com'),
  lower('pmafuratidze@science.uz.ac.zw')
)
order by email;
