-- ============================================================================
-- CREATE NORMALIZED OBSERVATION ENTRY TABLES
-- ============================================================================
-- Creates the public tables used by the web entry form:
--   observations
--   crop_information
--   crop_monitoring
--   soil_characteristics
--   irrigation_management
--   nutrient_management
--   crop_protection
--   control_methods
--   harvest
--   residual_management
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

create table if not exists public.observations (
    id uuid primary key default gen_random_uuid(),
    client_uuid text,
    collector_id text,
    section_name text,
    block_id text,
    field_name text not null,
    latitude double precision,
    longitude double precision,
    gps_accuracy numeric,
    date_recorded timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.crop_information (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    crop_type text default 'Sugarcane',
    ratoon_number integer,
    variety text,
    ploughing_date date,
    planting_date date,
    expected_harvest_date date,
    crop_stage text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.crop_monitoring (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    crop_vigor text,
    canopy_cover numeric,
    stress text,
    remarks text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.soil_characteristics (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    soil_type text,
    soil_texture text,
    soil_ph numeric,
    organic_matter numeric,
    drainage_class text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.irrigation_management (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    irrigation_type text,
    irrigation_date date,
    irrigation_volume numeric,
    soil_moisture_percentage numeric,
    water_source text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.nutrient_management (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    fertilizer_type text,
    application_date date,
    application_rate numeric,
    npk_ratio text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.crop_protection (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    weed_type text,
    weed_level text,
    pest_type text,
    pest_severity text,
    disease_type text,
    disease_severity text,
    remarks text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.control_methods (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    weed_control text,
    pest_control text,
    disease_control text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.harvest (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    harvest_date date,
    yield numeric,
    harvest_method text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create table if not exists public.residual_management (
    id uuid primary key default gen_random_uuid(),
    observation_id uuid not null references public.observations(id) on delete cascade,
    residue_type text,
    management_method text,
    remarks text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (observation_id)
);

create index if not exists idx_observations_date_recorded on public.observations(date_recorded);
create index if not exists idx_observations_field_name on public.observations(field_name);
create index if not exists idx_observations_collector_id on public.observations(collector_id);
create index if not exists idx_observations_block_id on public.observations(block_id);

create index if not exists idx_crop_information_observation_id on public.crop_information(observation_id);
create index if not exists idx_crop_monitoring_observation_id on public.crop_monitoring(observation_id);
create index if not exists idx_soil_characteristics_observation_id on public.soil_characteristics(observation_id);
create index if not exists idx_irrigation_management_observation_id on public.irrigation_management(observation_id);
create index if not exists idx_nutrient_management_observation_id on public.nutrient_management(observation_id);
create index if not exists idx_crop_protection_observation_id on public.crop_protection(observation_id);
create index if not exists idx_control_methods_observation_id on public.control_methods(observation_id);
create index if not exists idx_harvest_observation_id on public.harvest(observation_id);
create index if not exists idx_residual_management_observation_id on public.residual_management(observation_id);

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'observations',
        'crop_information',
        'crop_monitoring',
        'soil_characteristics',
        'irrigation_management',
        'nutrient_management',
        'crop_protection',
        'control_methods',
        'harvest',
        'residual_management'
    ]
    loop
        execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
        execute format(
            'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
            table_name,
            table_name
        );
    end loop;
end $$;

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'observations',
        'crop_information',
        'crop_monitoring',
        'soil_characteristics',
        'irrigation_management',
        'nutrient_management',
        'crop_protection',
        'control_methods',
        'harvest',
        'residual_management'
    ]
    loop
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

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'observations',
        'crop_information',
        'crop_monitoring',
        'soil_characteristics',
        'irrigation_management',
        'nutrient_management',
        'crop_protection',
        'control_methods',
        'harvest',
        'residual_management'
    ]
    loop
        begin
            execute format('alter publication supabase_realtime add table public.%I', table_name);
        exception
            when duplicate_object then null;
            when undefined_object then null;
        end;
    end loop;
end $$;

notify pgrst, 'reload schema';

select 'NORMALIZED OBSERVATION TABLES READY' as status;
