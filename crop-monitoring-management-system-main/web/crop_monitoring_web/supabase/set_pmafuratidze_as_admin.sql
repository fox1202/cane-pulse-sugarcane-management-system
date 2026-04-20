-- Approve pmafuratidze@science.uz.ac.zw as supervisor.
-- The only Cane Pulse superuser/admin is silentabrahamganda02@gmail.com.
-- Run this in Supabase SQL Editor with a privileged role.

begin;

-- If the auth user exists but profile row is missing, create it first.
insert into public.profiles (id, first_name, last_name, email, role, status)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'first_name', ''), 'System'),
  coalesce(nullif(u.raw_user_meta_data->>'last_name', ''), 'Administrator'),
  u.email,
  'supervisor',
  'approved'
from auth.users u
where lower(u.email) = lower('pmafuratidze@science.uz.ac.zw')
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  );

-- Ensure role/status are correct without granting superuser access.
update public.profiles
set
  role = 'supervisor',
  status = 'approved',
  is_active = true
where lower(email) = lower('pmafuratidze@science.uz.ac.zw');

-- Verify result.
select id, email, role, status, is_active
from public.profiles
where lower(email) = lower('pmafuratidze@science.uz.ac.zw');

commit;
