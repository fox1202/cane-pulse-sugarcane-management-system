-- ============================================================================
-- ADD FINAL ELDANA SURVEY PDF SUPPORT
-- ============================================================================
-- Adds the final_eldana_survey_pdf_url column and creates the storage bucket
-- plus policies required by the web entry form upload.
--
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================================

begin;

alter table public.sugarcane_field_management
    add column if not exists final_eldana_survey_pdf_url text;

comment on column public.sugarcane_field_management.final_eldana_survey_pdf_url is
    'Stores the uploaded PDF URL for the final eldana survey from the pest control section of the web entry form.';

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('final-eldana-survey-pdfs', 'final-eldana-survey-pdfs', false)
    on conflict (id) do nothing;
  end if;

  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Approved users can read eldana survey files" on storage.objects';
    execute 'create policy "Approved users can read eldana survey files"
      on storage.objects for select
      using (
        bucket_id = ''final-eldana-survey-pdfs''
        and public.current_user_can(''download_soil_results'')
      )';

    execute 'drop policy if exists "Admins and supervisors can upload eldana survey files" on storage.objects';
    execute 'drop policy if exists "Approved users can upload eldana survey files" on storage.objects';
    execute 'create policy "Approved users can upload eldana survey files"
      on storage.objects for insert
      with check (
        bucket_id = ''final-eldana-survey-pdfs''
        and public.current_user_can(''upload_files'')
      )';

    execute 'drop policy if exists "Admins can update eldana survey files" on storage.objects';
    execute 'create policy "Admins can update eldana survey files"
      on storage.objects for update
      using (
        bucket_id = ''final-eldana-survey-pdfs''
        and public.current_user_can(''manage_fields'')
      )
      with check (
        bucket_id = ''final-eldana-survey-pdfs''
        and public.current_user_can(''manage_fields'')
      )';

    execute 'drop policy if exists "Admins can delete eldana survey files" on storage.objects';
    execute 'create policy "Admins can delete eldana survey files"
      on storage.objects for delete
      using (
        bucket_id = ''final-eldana-survey-pdfs''
        and public.current_user_can(''manage_fields'')
      )';
  end if;
end $$;

commit;

select
    'FINAL ELDANA SURVEY PDF SUPPORT ADDED' as status,
    count(*) as total_rows
from public.sugarcane_field_management;
