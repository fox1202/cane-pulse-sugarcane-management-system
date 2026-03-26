-- Fix login for: silentaganda@gmail.com
-- Why needed:
-- This app allows sign-in only when a matching row exists in public.profiles
-- and status = 'approved'.
-- Run in Supabase SQL Editor as project admin.

begin;

-- Create missing profile from auth.users if needed.
insert into public.profiles (id, first_name, last_name, email, role, status)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'first_name', ''), 'Silent'),
  coalesce(nullif(u.raw_user_meta_data->>'last_name', ''), 'Aganda'),
  u.email,
  'supervisor',
  'approved'
from auth.users u
where lower(u.email) = lower('silentaganda@gmail.com')
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  );

-- Ensure role + approval are set.
update public.profiles
set
  role = 'supervisor',
  status = 'approved'
where lower(email) = lower('silentaganda@gmail.com');

-- Verify.
select id, email, role, status
from public.profiles
where lower(email) = lower('silentaganda@gmail.com');

commit;
