-- Approve tchibarabada@zsaes.org.zw as supervisor.
-- The only Cane Pulse superuser/admin is silentabrahamganda02@gmail.com.
-- Run this in Supabase SQL Editor with a privileged role.

begin;

-- If the auth user exists but profile row is missing, create it first.
insert into public.profiles (id, first_name, last_name, email, role, status, is_active)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'first_name', ''), 'Tendai Polite'),
  coalesce(nullif(u.raw_user_meta_data->>'last_name', ''), 'Chibarabada'),
  lower(u.email),
  'supervisor',
  'approved',
  true
from auth.users u
where u.id = '6e2bbb91-eda8-4130-9329-ba3864fee55b'::uuid
   or lower(u.email) = lower('tchibarabada@zsaes.org.zw')
on conflict (id) do update set
  email = excluded.email,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  role = 'supervisor',
  status = 'approved',
  is_active = true,
  updated_at = now();

-- Keep auth metadata aligned with the app profile and confirm the email if needed.
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'first_name', 'Tendai Polite',
    'last_name', 'Chibarabada',
    'full_name', 'Tendai Polite Chibarabada',
    'role', 'supervisor',
    'status', 'approved'
  ),
  updated_at = now()
where id = '6e2bbb91-eda8-4130-9329-ba3864fee55b'::uuid
   or lower(email) = lower('tchibarabada@zsaes.org.zw');

-- Verify result.
select
  u.id,
  u.email,
  u.email_confirmed_at is not null as email_confirmed,
  p.first_name,
  p.last_name,
  p.role,
  p.status,
  p.is_active
from auth.users u
left join public.profiles p on p.id = u.id
where u.id = '6e2bbb91-eda8-4130-9329-ba3864fee55b'::uuid
   or lower(u.email) = lower('tchibarabada@zsaes.org.zw');

commit;
