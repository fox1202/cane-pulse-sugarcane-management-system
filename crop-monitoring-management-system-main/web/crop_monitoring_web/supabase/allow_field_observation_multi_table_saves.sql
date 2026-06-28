-- ============================================================================
-- ALLOW FIELD OBSERVATION SAVES ACROSS THE LIVE WRITE TABLES
-- ============================================================================
-- Fixes:
--   new row violates row-level security policy for table "sugarcane_fields"
--   record "new" has no field "field_name"
--
-- The web app reads from public.sugarcane_field_management, but saves into:
--   public.sugarcane_fields
--   public.sugarcane_soil_properties
--   public.sugarcane_crop_information
--   public.sugarcane_important_dates
--   public.sugarcane_residue_management
--   public.sugarcane_crop_protection
--   public.sugarcane_foliar_sampling
--   public.sugarcane_fertilizer_applications
--   public.sugarcane_herbicide_applications
--
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare
    table_name text;
    column_spec text;
begin
    foreach table_name in array array[
        'sugarcane_fields',
        'sugarcane_soil_properties',
        'sugarcane_crop_information',
        'sugarcane_important_dates',
        'sugarcane_residue_management',
        'sugarcane_crop_protection',
        'sugarcane_foliar_sampling',
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications'
    ]
    loop
        if to_regclass('public.' || table_name) is not null then
            foreach column_spec in array array[
                'sugarcane_field_management_id text',
                'observation_id text',
                'field_name text',
                'field_id text',
                'section_name text',
                'block_id text',
                'collector_id text',
                'date_recorded date',
                'created_at timestamptz not null default now()',
                'updated_at timestamptz not null default now()'
            ]
            loop
                execute format('alter table public.%I add column if not exists %s', table_name, column_spec);
            end loop;

            if table_name in ('sugarcane_fertilizer_applications', 'sugarcane_herbicide_applications') then
                foreach column_spec in array array[
                    'loop_number integer',
                    'fertilizer_type text',
                    'herbicide_name text',
                    'application_date date',
                    'application_rate numeric',
                    'foliar_sampling_date date',
                    'remarks text'
                ]
                loop
                    execute format('alter table public.%I add column if not exists %s', table_name, column_spec);
                end loop;
            end if;

            execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
            execute format(
                'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
                table_name,
                table_name
            );

            execute format('alter table public.%I enable row level security', table_name);
            execute format('grant select, insert, update, delete on table public.%I to anon, authenticated', table_name);

            execute format('drop policy if exists "Cane Pulse can read %s" on public.%I', table_name, table_name);
            execute format(
                'create policy "Cane Pulse can read %s" on public.%I for select to anon, authenticated using (true)',
                table_name,
                table_name
            );

            execute format('drop policy if exists "Cane Pulse can insert %s" on public.%I', table_name, table_name);
            execute format(
                'create policy "Cane Pulse can insert %s" on public.%I for insert to anon, authenticated with check (true)',
                table_name,
                table_name
            );

            execute format('drop policy if exists "Cane Pulse can update %s" on public.%I', table_name, table_name);
            execute format(
                'create policy "Cane Pulse can update %s" on public.%I for update to anon, authenticated using (true) with check (true)',
                table_name,
                table_name
            );

            execute format('drop policy if exists "Cane Pulse can delete %s" on public.%I', table_name, table_name);
            execute format(
                'create policy "Cane Pulse can delete %s" on public.%I for delete to anon, authenticated using (true)',
                table_name,
                table_name
            );
        end if;
    end loop;
end $$;

do $$
begin
    if to_regclass('public.sugarcane_field_management') is not null then
        grant select on table public.sugarcane_field_management to anon, authenticated;
    end if;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';

select
    'FIELD OBSERVATION SAVE POLICIES READY' as status;
