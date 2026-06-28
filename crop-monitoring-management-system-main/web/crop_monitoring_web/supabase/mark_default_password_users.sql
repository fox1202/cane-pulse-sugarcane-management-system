-- ============================================================================
-- MARK USERS WHO MUST CHANGE DEFAULT PASSWORDS
-- ============================================================================
-- Run this in Supabase SQL Editor with a privileged role.
--
-- It flags any auth user whose current password still matches a known default.
-- The web app reads raw_user_meta_data.must_change_password and shows a
-- blocking popup until the user changes their password.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

create temporary table known_default_passwords (
  clear_password text primary key
) on commit drop;

insert into known_default_passwords (clear_password)
values
  ('ZSAES_123456'),
  ('ZSAES_456'),
  ('PM_2026'),
  ('GANDA@2025'),
  ('DemoPassword123'),
  ('Supervisor123'),
  ('Staff123')
on conflict do nothing;

update auth.users u
set
  raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'must_change_password', true,
      'default_password', true
    ),
  updated_at = now()
where exists (
  select 1
  from known_default_passwords d
  where u.encrypted_password = crypt(d.clear_password, u.encrypted_password)
);

commit;

select
  u.email,
  p.role,
  p.status,
  u.raw_user_meta_data ->> 'must_change_password' as must_change_password
from auth.users u
left join public.profiles p on p.id = u.id
where u.raw_user_meta_data ->> 'must_change_password' = 'true'
order by u.email;
