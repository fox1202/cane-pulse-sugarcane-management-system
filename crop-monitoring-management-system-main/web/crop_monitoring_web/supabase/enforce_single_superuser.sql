-- ============================================================================
-- ENFORCE SINGLE CANE PULSE SUPERUSER
-- ============================================================================
-- The app uses the existing database role value "admin" for the superuser
-- because current Supabase policies are keyed to role = 'admin'.
--
-- Run this in the Supabase SQL Editor with a privileged role.
-- ============================================================================

begin;

-- Demote every other administrator so only the named account keeps superuser
-- access in the app and in Supabase RLS policies.
update public.profiles
set
    role = 'supervisor',
    updated_at = now()
where lower(email) <> lower('silentabrahamganda02@gmail.com')
  and role = 'admin';

-- Promote/approve the requested superuser profile.
insert into public.profiles (id, email, first_name, last_name, role, status, is_active)
select
    u.id,
    u.email,
    coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), 'Silent'),
    coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), 'Abraham Ganda'),
    'admin',
    'approved',
    true
from auth.users u
where lower(u.email) = lower('silentabrahamganda02@gmail.com')
on conflict (email) do update
set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    role = 'admin',
    status = 'approved',
    is_active = true,
    updated_at = now();

-- Keep Supabase auth metadata aligned for clients that fall back to metadata.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'admin', 'status', 'approved')
where lower(email) = lower('silentabrahamganda02@gmail.com');

commit;

select
    email,
    role,
    status,
    is_active,
    case
        when lower(email) = lower('silentabrahamganda02@gmail.com') and role = 'admin' then 'SUPERUSER'
        else 'NON_SUPERUSER'
    end as app_access
from public.profiles
where role = 'admin'
   or lower(email) = lower('silentabrahamganda02@gmail.com')
order by app_access desc, email;
