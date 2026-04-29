-- ============================================================================
-- GRANT NORMAL USERS ENTRY FORM RIGHTS
-- ============================================================================
-- Run this in the Supabase SQL Editor to give normal Users/collectors the same
-- entry-form, remarks, trial-progress, and laboratory PDF rights as supervisors.
-- It keeps backend/security/user-management permissions admin-only.
-- ============================================================================

begin;

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
      'add_data',
      'upload_files',
      'view_data',
      'download_csv',
      'download_field_data',
      'download_soil_results'
    )
    else false
  end
$$;

do $$
begin
  if to_regclass('public.sugarcane_field_management') is not null then
    execute 'alter table public.sugarcane_field_management enable row level security';
    execute 'grant select, insert, update on public.sugarcane_field_management to authenticated';

    execute 'drop policy if exists "Admins and supervisors can add field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Approved users can add field management" on public.sugarcane_field_management';
    execute 'create policy "Approved users can add field management"
      on public.sugarcane_field_management for insert
      with check (public.current_user_can(''add_data''))';

    execute 'drop policy if exists "Admins and supervisors can edit field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Approved users can edit field management" on public.sugarcane_field_management';
    execute 'create policy "Approved users can edit field management"
      on public.sugarcane_field_management for update
      using (public.current_user_can(''add_data'') or public.current_user_can(''manage_fields''))
      with check (public.current_user_can(''add_data'') or public.current_user_can(''manage_fields''))';
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Admins and supervisors can upload soil result files" on storage.objects';
    execute 'drop policy if exists "Approved users can upload soil result files" on storage.objects';
    execute 'create policy "Approved users can upload soil result files"
      on storage.objects for insert
      with check (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and public.current_user_can(''upload_files'')
      )';

    execute 'drop policy if exists "Admins and supervisors can upload eldana survey files" on storage.objects';
    execute 'drop policy if exists "Approved users can upload eldana survey files" on storage.objects';
    execute 'create policy "Approved users can upload eldana survey files"
      on storage.objects for insert
      with check (
        bucket_id = ''final-eldana-survey-pdfs''
        and public.current_user_can(''upload_files'')
      )';
  end if;
end $$;

commit;

select
  email,
  case
    when role = 'admin' and lower(email) <> lower('silentabrahamganda02@gmail.com') then 'supervisor'
    else role
  end as effective_role,
  role in ('admin', 'supervisor', 'collector') as can_add_entry_forms,
  role in ('admin', 'supervisor', 'collector') as can_upload_lab_pdfs,
  role in ('admin', 'supervisor', 'collector') as can_view_trial_progress,
  role in ('admin', 'supervisor', 'collector') as can_download_lab_pdfs
from public.profiles
where status = 'approved'
order by role, email;
