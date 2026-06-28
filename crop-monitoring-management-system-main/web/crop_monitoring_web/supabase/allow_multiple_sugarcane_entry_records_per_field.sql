-- ============================================================================
-- ALLOW MULTIPLE DATA-ENTRY RECORDS PER TRIAL/FIELD
-- ============================================================================
-- The data-entry workflow needs each saved submission to appear as a new row.
-- Older constraints such as uq_sugarcane_soil_properties_field allow only one
-- row per field/trial and cause new saves to overwrite or fail.
--
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================================

alter table if exists public.sugarcane_fields drop constraint if exists uq_sugarcane_fields_field;
alter table if exists public.sugarcane_soil_properties drop constraint if exists uq_sugarcane_soil_properties_field;
alter table if exists public.sugarcane_crop_information drop constraint if exists uq_sugarcane_crop_information_field;
alter table if exists public.sugarcane_important_dates drop constraint if exists uq_sugarcane_important_dates_field;
alter table if exists public.sugarcane_residue_management drop constraint if exists uq_sugarcane_residue_management_field;
alter table if exists public.sugarcane_crop_protection drop constraint if exists uq_sugarcane_crop_protection_field;
alter table if exists public.sugarcane_foliar_sampling drop constraint if exists uq_sugarcane_foliar_sampling_field;

drop index if exists public.uq_sugarcane_fields_field;
drop index if exists public.uq_sugarcane_soil_properties_field;
drop index if exists public.uq_sugarcane_crop_information_field;
drop index if exists public.uq_sugarcane_important_dates_field;
drop index if exists public.uq_sugarcane_residue_management_field;
drop index if exists public.uq_sugarcane_crop_protection_field;
drop index if exists public.uq_sugarcane_foliar_sampling_field;

do $$
declare
    target_table text;
    constraint_record record;
begin
    foreach target_table in array array[
        'sugarcane_fields',
        'sugarcane_soil_properties',
        'sugarcane_crop_information',
        'sugarcane_important_dates',
        'sugarcane_residue_management',
        'sugarcane_crop_protection',
        'sugarcane_foliar_sampling'
    ]
    loop
        if to_regclass('public.' || target_table) is null then
            continue;
        end if;

        for constraint_record in
            select con.conname
            from pg_constraint con
            join pg_class rel on rel.oid = con.conrelid
            join pg_namespace nsp on nsp.oid = rel.relnamespace
            where nsp.nspname = 'public'
              and rel.relname = target_table
              and con.contype = 'u'
              and (
                con.conname ilike '%field%'
                or con.conname ilike '%trial%'
                or pg_get_constraintdef(con.oid) ilike '%field_name%'
                or pg_get_constraintdef(con.oid) ilike '%trial%'
              )
        loop
            execute format(
                'alter table public.%I drop constraint if exists %I',
                target_table,
                constraint_record.conname
            );
        end loop;
    end loop;
end $$;

notify pgrst, 'reload schema';

select 'MULTIPLE SUGARCANE ENTRY RECORDS PER FIELD ENABLED' as status;
