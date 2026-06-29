-- ============================================================================
-- ENSURE SUGARCANE SPLIT TABLES USE ID PRIMARY KEYS
-- ============================================================================
-- Use this when new records are replacing existing field/trial rows.
--
-- It repairs the split data-entry tables so every table has:
--   id uuid primary key default gen_random_uuid()
--
-- It also removes old field/trial unique constraints and application indexes
-- that allow only one record per field/trial + loop number.
-- ============================================================================

create extension if not exists pgcrypto;

do $$
declare
    target_table text;
    pk_record record;
    unique_record record;
begin
    foreach target_table in array array[
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
        if to_regclass('public.' || target_table) is null then
            continue;
        end if;

        execute format('alter table public.%I add column if not exists id uuid', target_table);
        execute format('alter table public.%I alter column id set default gen_random_uuid()', target_table);
        execute format('update public.%I set id = gen_random_uuid() where id is null', target_table);
        execute format('alter table public.%I alter column id set not null', target_table);

        for pk_record in
            select con.conname,
                   pg_get_constraintdef(con.oid) as constraint_def
            from pg_constraint con
            join pg_class rel on rel.oid = con.conrelid
            join pg_namespace nsp on nsp.oid = rel.relnamespace
            where nsp.nspname = 'public'
              and rel.relname = target_table
              and con.contype = 'p'
        loop
            if pk_record.constraint_def not ilike '%(id)%' then
                execute format('alter table public.%I drop constraint if exists %I', target_table, pk_record.conname);
            end if;
        end loop;

        if not exists (
            select 1
            from pg_constraint con
            join pg_class rel on rel.oid = con.conrelid
            join pg_namespace nsp on nsp.oid = rel.relnamespace
            where nsp.nspname = 'public'
              and rel.relname = target_table
              and con.contype = 'p'
        ) then
            execute format('alter table public.%I add constraint %I primary key (id)', target_table, target_table || '_pkey');
        end if;

        for unique_record in
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
                or pg_get_constraintdef(con.oid) ilike '%"Trial"%'
              )
        loop
            execute format('alter table public.%I drop constraint if exists %I', target_table, unique_record.conname);
        end loop;

        execute format('create index if not exists idx_%I_observation_id on public.%I(observation_id)', target_table, target_table);
        execute format('create index if not exists idx_%I_field_name on public.%I(field_name)', target_table, target_table);
    end loop;
end $$;

drop index if exists public.uq_sugarcane_soil_properties_field;
drop index if exists public.uq_sugarcane_crop_information_field;
drop index if exists public.uq_sugarcane_important_dates_field;
drop index if exists public.uq_sugarcane_residue_management_field;
drop index if exists public.uq_sugarcane_crop_protection_field;
drop index if exists public.uq_sugarcane_foliar_sampling_field;
drop index if exists public.uq_sugarcane_fertilizer_trial_loop;
drop index if exists public.uq_sugarcane_herbicide_trial_loop;

notify pgrst, 'reload schema';

select 'SUGARCANE SPLIT TABLES NOW USE ID PRIMARY KEYS' as status;
