-- ============================================================================
-- CANE PULSE ROLE PERMISSIONS
-- ============================================================================
-- Run this in Supabase SQL Editor after users/profiles have been seeded.
-- Safe to rerun: it repairs role/status constraints, replaces managed policies,
-- and finishes with a rights matrix you can inspect in the query result.
--
-- Roles:
--   admin      -> full backend/admin/data/download access
--   supervisor -> add/upload/view/download access
--   collector  -> view/download access
-- ============================================================================

begin;

-- Repair old installs where the profiles role constraint did not include
-- supervisor/admin, or where imported rows used display labels like "User".
alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = case
  when lower(trim(coalesce(role::text, ''))) in ('admin', 'administrator', 'system administrator', 'system_administrator') then 'admin'
  when lower(trim(coalesce(role::text, ''))) in ('supervisor', 'regional supervisor', 'regional_supervisor') then 'supervisor'
  when lower(trim(coalesce(role::text, ''))) in ('collector', 'user', 'users', 'field assistant', 'field_assistant') then 'collector'
  else 'collector'
end
where role is distinct from case
  when lower(trim(coalesce(role::text, ''))) in ('admin', 'administrator', 'system administrator', 'system_administrator') then 'admin'
  when lower(trim(coalesce(role::text, ''))) in ('supervisor', 'regional supervisor', 'regional_supervisor') then 'supervisor'
  when lower(trim(coalesce(role::text, ''))) in ('collector', 'user', 'users', 'field assistant', 'field_assistant') then 'collector'
  else 'collector'
end;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('collector', 'supervisor', 'admin'));

alter table public.profiles
  drop constraint if exists profiles_status_check;

update public.profiles
set status = case
  when lower(trim(coalesce(status::text, ''))) = 'approved' then 'approved'
  when lower(trim(coalesce(status::text, ''))) = 'rejected' then 'rejected'
  else 'pending'
end
where status is distinct from case
  when lower(trim(coalesce(status::text, ''))) = 'approved' then 'approved'
  when lower(trim(coalesce(status::text, ''))) = 'rejected' then 'rejected'
  else 'pending'
end;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected'));

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'admin'
      and lower(p.email) <> lower('silentabrahamganda02@gmail.com')
      then 'supervisor'
    else p.role
  end
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'approved'
    and coalesce(p.is_active, true) = true
  limit 1
$$;

create or replace function public.current_user_can(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_profile_role()
    when 'admin' then permission_name in (
      'access_backend',
      'approve_users',
      'manage_fields',
      'backup_data',
      'view_supervisor_inputs',
      'add_data',
      'upload_files',
      'view_data',
      'download_csv',
      'download_field_data',
      'download_soil_results'
    )
    when 'supervisor' then permission_name in (
      'add_data',
      'upload_files',
      'view_data',
      'download_csv',
      'download_field_data',
      'download_soil_results'
    )
    when 'collector' then permission_name in (
      'view_data',
      'download_csv',
      'download_field_data',
      'download_soil_results'
    )
    else false
  end
$$;

-- Profiles: users can read themselves; admins approve/manage everyone.
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Profiles are readable" on public.profiles;
drop policy if exists "Profiles are readable by everyone" on public.profiles;
drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.current_user_can('approve_users'));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  using (public.current_user_can('approve_users'))
  with check (public.current_user_can('approve_users'));

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (public.current_user_can('approve_users'));

-- Live field-management records: approved users can view; admins and
-- supervisors can add/update; only admins can delete existing rows.
do $$
begin
  if to_regclass('public.sugarcane_field_management') is not null then
    execute 'alter table public.sugarcane_field_management enable row level security';
    execute 'grant select, insert, update, delete on public.sugarcane_field_management to authenticated';

    execute 'drop policy if exists "Allow authenticated to read sugarcane_field_management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Allow authenticated to insert sugarcane_field_management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Allow authenticated to update sugarcane_field_management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Allow authenticated to delete sugarcane_field_management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Approved users can read field management" on public.sugarcane_field_management';
    execute 'create policy "Approved users can read field management"
      on public.sugarcane_field_management for select
      using (public.current_user_can(''view_data''))';

    execute 'drop policy if exists "Admins and supervisors can add field management" on public.sugarcane_field_management';
    execute 'create policy "Admins and supervisors can add field management"
      on public.sugarcane_field_management for insert
      with check (public.current_user_can(''add_data''))';

    execute 'drop policy if exists "Admins can edit field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Admins and supervisors can edit field management" on public.sugarcane_field_management';
    execute 'create policy "Admins and supervisors can edit field management"
      on public.sugarcane_field_management for update
      using (public.current_user_can(''add_data'') or public.current_user_can(''manage_fields''))
      with check (public.current_user_can(''add_data'') or public.current_user_can(''manage_fields''))';

    execute 'drop policy if exists "Admins can delete field management" on public.sugarcane_field_management';
    execute 'create policy "Admins can delete field management"
      on public.sugarcane_field_management for delete
      using (public.current_user_can(''manage_fields''))';
  end if;
end $$;

-- Legacy observation tables follow the same data-entry/read model.
do $$
declare
  table_name text;
  qualified_table text;
begin
  foreach table_name in array array[
    'observations',
    'observations_raw',
    'field_observations',
    'observation',
    'crop_information',
    'crop_monitoring',
    'harvest',
    'soil_characteristics',
    'irrigation_management',
    'nutrient_management',
    'crop_protection',
    'control_methods',
    'residual_management',
    'observation_images'
  ] loop
    qualified_table := format('public.%I', table_name);

    if to_regclass(qualified_table) is not null then
      execute format('alter table %s enable row level security', qualified_table);
      execute format('grant select, insert, update, delete on %s to authenticated', qualified_table);

      execute format('drop policy if exists "Allow authenticated to read %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Allow authenticated to insert %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Allow authenticated to update %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Allow authenticated to delete %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Approved users can read %I" on %s', table_name, qualified_table);
      execute format('create policy "Approved users can read %I" on %s for select using (public.current_user_can(''view_data''))', table_name, qualified_table);

      execute format('drop policy if exists "Admins and supervisors can add %I" on %s', table_name, qualified_table);
      execute format('create policy "Admins and supervisors can add %I" on %s for insert with check (public.current_user_can(''add_data''))', table_name, qualified_table);

      execute format('drop policy if exists "Admins can edit %I" on %s', table_name, qualified_table);
      execute format('create policy "Admins can edit %I" on %s for update using (public.current_user_can(''manage_fields'')) with check (public.current_user_can(''manage_fields''))', table_name, qualified_table);

      execute format('drop policy if exists "Admins can delete %I" on %s', table_name, qualified_table);
      execute format('create policy "Admins can delete %I" on %s for delete using (public.current_user_can(''manage_fields''))', table_name, qualified_table);
    end if;
  end loop;
end $$;

-- Field and block registries: everyone can view/download field data; only admins
-- can add or edit official fields/boundaries.
do $$
declare
  table_name text;
  qualified_table text;
begin
  foreach table_name in array array['fields', 'blocks'] loop
    qualified_table := format('public.%I', table_name);

    if to_regclass(qualified_table) is not null then
      execute format('alter table %s enable row level security', qualified_table);
      execute format('grant select, insert, update, delete on %s to authenticated', qualified_table);

      execute format('drop policy if exists "Allow authenticated to read %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Allow authenticated to insert %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Allow authenticated to update %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Allow authenticated to delete %I" on %s', table_name, qualified_table);
      execute format('drop policy if exists "Approved users can read %I" on %s', table_name, qualified_table);
      execute format('create policy "Approved users can read %I" on %s for select using (public.current_user_can(''download_field_data''))', table_name, qualified_table);

      execute format('drop policy if exists "Admins can add %I" on %s', table_name, qualified_table);
      execute format('create policy "Admins can add %I" on %s for insert with check (public.current_user_can(''manage_fields''))', table_name, qualified_table);

      execute format('drop policy if exists "Admins can edit %I" on %s', table_name, qualified_table);
      execute format('create policy "Admins can edit %I" on %s for update using (public.current_user_can(''manage_fields'')) with check (public.current_user_can(''manage_fields''))', table_name, qualified_table);

      execute format('drop policy if exists "Admins can delete %I" on %s', table_name, qualified_table);
      execute format('create policy "Admins can delete %I" on %s for delete using (public.current_user_can(''manage_fields''))', table_name, qualified_table);
    end if;
  end loop;
end $$;

-- Soil/foliar result files: everyone can read/download; admins and supervisors
-- can upload; only admins can replace or delete.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values
      ('soil-test-pdfs', 'soil-test-pdfs', false),
      ('foliar-analysis-pdfs', 'foliar-analysis-pdfs', false),
      ('final-eldana-survey-pdfs', 'final-eldana-survey-pdfs', false)
    on conflict (id) do nothing;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Approved users can read soil result files" on storage.objects';
    execute 'create policy "Approved users can read soil result files"
      on storage.objects for select
      using (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and public.current_user_can(''download_soil_results'')
      )';

    execute 'drop policy if exists "Admins and supervisors can upload soil result files" on storage.objects';
    execute 'create policy "Admins and supervisors can upload soil result files"
      on storage.objects for insert
      with check (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and public.current_user_can(''upload_files'')
      )';

    execute 'drop policy if exists "Admins can update soil result files" on storage.objects';
    execute 'create policy "Admins can update soil result files"
      on storage.objects for update
      using (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and public.current_user_can(''manage_fields'')
      )
      with check (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and public.current_user_can(''manage_fields'')
      )';

    execute 'drop policy if exists "Admins can delete soil result files" on storage.objects';
    execute 'create policy "Admins can delete soil result files"
      on storage.objects for delete
      using (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and public.current_user_can(''manage_fields'')
      )';
  end if;
end $$;

commit;

-- Quick permission check for all approved profiles.
select
  email,
  case
    when role = 'admin' and lower(email) <> lower('silentabrahamganda02@gmail.com') then 'supervisor'
    else role
  end as effective_role,
  role = 'admin' and lower(email) = lower('silentabrahamganda02@gmail.com') as can_access_backend,
  role = 'admin' and lower(email) = lower('silentabrahamganda02@gmail.com') as can_approve_users,
  role = 'admin' and lower(email) = lower('silentabrahamganda02@gmail.com') as can_manage_fields,
  role = 'admin' and lower(email) = lower('silentabrahamganda02@gmail.com') as can_backup_data,
  role = 'admin' and lower(email) = lower('silentabrahamganda02@gmail.com') as can_view_supervisor_inputs,
  role in ('admin', 'supervisor') as can_add_data,
  role in ('admin', 'supervisor') as can_upload_files,
  role in ('admin', 'supervisor', 'collector') as can_view_data,
  role in ('admin', 'supervisor', 'collector') as can_download_csv,
  role in ('admin', 'supervisor', 'collector') as can_download_field_data,
  role in ('admin', 'supervisor', 'collector') as can_download_soil_results
from public.profiles
where status = 'approved'
order by role, email;
