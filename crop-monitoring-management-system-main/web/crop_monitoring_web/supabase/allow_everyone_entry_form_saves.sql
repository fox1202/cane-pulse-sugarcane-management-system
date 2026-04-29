-- ============================================================================
-- ALLOW EVERY SIGNED-IN USER TO SAVE ENTRY FORMS
-- ============================================================================
-- Run this in the Supabase SQL Editor when entry-form saves fail with:
-- "new row violates row-level security policy for table sugarcane_field_management"
--
-- This keeps RLS enabled, but allows any authenticated app user to read, insert,
-- and update field-management/entry-form rows and upload related PDF files.
-- ============================================================================

begin;

do $$
begin
  if to_regclass('public.sugarcane_field_management') is not null then
    execute 'alter table public.sugarcane_field_management enable row level security';
    execute 'grant select, insert, update on public.sugarcane_field_management to authenticated';
    execute 'grant usage, select on all sequences in schema public to authenticated';

    execute 'drop policy if exists "Admins and supervisors can add field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Approved users can add field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Everyone signed in can add field management" on public.sugarcane_field_management';
    execute 'create policy "Everyone signed in can add field management"
      on public.sugarcane_field_management for insert
      with check (auth.role() = ''authenticated'')';

    execute 'drop policy if exists "Approved users can read field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Everyone signed in can read field management" on public.sugarcane_field_management';
    execute 'create policy "Everyone signed in can read field management"
      on public.sugarcane_field_management for select
      using (auth.role() = ''authenticated'')';

    execute 'drop policy if exists "Admins can edit field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Admins and supervisors can edit field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Approved users can edit field management" on public.sugarcane_field_management';
    execute 'drop policy if exists "Everyone signed in can edit field management" on public.sugarcane_field_management';
    execute 'create policy "Everyone signed in can edit field management"
      on public.sugarcane_field_management for update
      using (auth.role() = ''authenticated'')
      with check (auth.role() = ''authenticated'')';
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "Admins and supervisors can upload soil result files" on storage.objects';
    execute 'drop policy if exists "Approved users can upload soil result files" on storage.objects';
    execute 'drop policy if exists "Everyone signed in can upload lab PDFs" on storage.objects';
    execute 'create policy "Everyone signed in can upload lab PDFs"
      on storage.objects for insert
      with check (
        bucket_id in (''soil-test-pdfs'', ''foliar-analysis-pdfs'', ''final-eldana-survey-pdfs'')
        and auth.role() = ''authenticated''
      )';
  end if;
end $$;

commit;

