-- ============================================================================
-- CREATE SUGARCANE ENTRY SPLIT TABLES
-- ============================================================================
-- Creates/updates the nine public tables used by the web data-entry save flow:
--   sugarcane_fields
--   sugarcane_soil_properties
--   sugarcane_crop_information
--   sugarcane_important_dates
--   sugarcane_residue_management
--   sugarcane_crop_protection
--   sugarcane_foliar_sampling
--   sugarcane_fertilizer_applications
--   sugarcane_herbicide_applications
--
-- Run this ENTIRE script in the Supabase SQL Editor with project-owner access.
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

create table if not exists public.sugarcane_fields (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    trial text,
    trial_number text,
    trial_name text,
    section_name text,
    block_id text,
    collector_id text,
    contact_person text,
    latitude double precision,
    longitude double precision,
    area numeric,
    geom_polygon jsonb,
    spatial_data jsonb,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_soil_properties (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    irrigation_type text,
    water_source text,
    tam numeric,
    tam_mm numeric,
    soil_type text,
    soil_ph numeric,
    soil_test_pdf_url text,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_crop_information (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    crop_type text default 'Sugarcane',
    crop_class text,
    ratoon_number integer,
    variety text,
    crop_stage text,
    stress text,
    harvest_method text,
    cane_yield numeric,
    quality_remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_important_dates (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    date_recorded date,
    ploughing_date date,
    planting_date date,
    soil_sampling_date date,
    previous_cutting_date date,
    cutting_date date,
    expected_harvest_date date,
    harvest_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_residue_management (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    residue_type text,
    residue_management_method text,
    management_method text,
    residual_management_remarks text,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_crop_protection (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    weed_type text,
    weed_level text,
    pest_type text,
    pest_severity text,
    disease_type text,
    disease_severity text,
    pest_remarks text,
    disease_remarks text,
    weed_control text,
    pest_control text,
    disease_control text,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_foliar_sampling (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    foliar_sampling_date date,
    foliar_analysis_pdf_url text,
    final_eldana_survey_pdf_url text,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_fertilizer_applications (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    loop_number integer,
    fertilizer_type text,
    herbicide_name text,
    application_date date,
    application_rate numeric,
    foliar_sampling_date date,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.sugarcane_herbicide_applications (
    id uuid primary key default gen_random_uuid(),
    sugarcane_field_management_id text,
    observation_id text,
    field_name text,
    field_id text,
    section_name text,
    block_id text,
    collector_id text,
    loop_number integer,
    fertilizer_type text,
    herbicide_name text,
    application_date date,
    application_rate numeric,
    foliar_sampling_date date,
    remarks text,
    date_recorded date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.sugarcane_fields
    add column if not exists trial text,
    add column if not exists trial_number text,
    add column if not exists trial_name text,
    add column if not exists contact_person text,
    add column if not exists latitude double precision,
    add column if not exists longitude double precision,
    add column if not exists area numeric,
    add column if not exists geom_polygon jsonb,
    add column if not exists spatial_data jsonb,
    add column if not exists remarks text;

alter table public.sugarcane_soil_properties
    add column if not exists irrigation_type text,
    add column if not exists water_source text,
    add column if not exists tam numeric,
    add column if not exists tam_mm numeric,
    add column if not exists soil_type text,
    add column if not exists soil_ph numeric,
    add column if not exists soil_test_pdf_url text,
    add column if not exists remarks text;

alter table public.sugarcane_crop_information
    add column if not exists crop_type text,
    add column if not exists crop_class text,
    add column if not exists ratoon_number integer,
    add column if not exists variety text,
    add column if not exists crop_stage text,
    add column if not exists stress text,
    add column if not exists harvest_method text,
    add column if not exists cane_yield numeric,
    add column if not exists quality_remarks text;

alter table public.sugarcane_important_dates
    add column if not exists ploughing_date date,
    add column if not exists planting_date date,
    add column if not exists soil_sampling_date date,
    add column if not exists previous_cutting_date date,
    add column if not exists cutting_date date,
    add column if not exists expected_harvest_date date,
    add column if not exists harvest_date date;

alter table public.sugarcane_residue_management
    add column if not exists residue_type text,
    add column if not exists residue_management_method text,
    add column if not exists management_method text,
    add column if not exists residual_management_remarks text,
    add column if not exists remarks text;

alter table public.sugarcane_crop_protection
    add column if not exists weed_type text,
    add column if not exists weed_level text,
    add column if not exists pest_type text,
    add column if not exists pest_severity text,
    add column if not exists disease_type text,
    add column if not exists disease_severity text,
    add column if not exists pest_remarks text,
    add column if not exists disease_remarks text,
    add column if not exists weed_control text,
    add column if not exists pest_control text,
    add column if not exists disease_control text,
    add column if not exists remarks text;

alter table public.sugarcane_foliar_sampling
    add column if not exists foliar_sampling_date date,
    add column if not exists foliar_analysis_pdf_url text,
    add column if not exists final_eldana_survey_pdf_url text,
    add column if not exists remarks text;

alter table public.sugarcane_fertilizer_applications
    add column if not exists loop_number integer,
    add column if not exists fertilizer_type text,
    add column if not exists herbicide_name text,
    add column if not exists application_date date,
    add column if not exists application_rate numeric,
    add column if not exists foliar_sampling_date date,
    add column if not exists remarks text;

alter table public.sugarcane_herbicide_applications
    add column if not exists loop_number integer,
    add column if not exists fertilizer_type text,
    add column if not exists herbicide_name text,
    add column if not exists application_date date,
    add column if not exists application_rate numeric,
    add column if not exists foliar_sampling_date date,
    add column if not exists remarks text;

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

        execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
        execute format(
            'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
            table_name,
            table_name
        );

        execute format('create index if not exists idx_%I_observation_id on public.%I(observation_id)', table_name, table_name);
        execute format('create index if not exists idx_%I_field_name on public.%I(field_name)', table_name, table_name);
        execute format('create index if not exists idx_%I_date_recorded on public.%I(date_recorded)', table_name, table_name);

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
    end loop;
end $$;

grant usage, select on all sequences in schema public to anon, authenticated;

notify pgrst, 'reload schema';

select 'SUGARCANE ENTRY SPLIT TABLES READY' as status;
