-- ============================================================================
-- UPDATE SUGARCANE_FIELD_MANAGEMENT WITH ENTRY-FORM COLUMNS
-- ============================================================================
-- Adds the columns used by the web Entry Forms save flow.
-- Most importantly, fertilizer_applications and herbicide_applications store
-- every application row from the form as JSON arrays, up to 10 rows each.
--
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================================

alter table public.sugarcane_field_management
    add column if not exists field_id text,
    add column if not exists section_name text,
    add column if not exists block_id text,
    add column if not exists collector_id text,
    add column if not exists latitude double precision,
    add column if not exists longitude double precision,
    add column if not exists area numeric,
    add column if not exists irrigation_type text,
    add column if not exists water_source text,
    add column if not exists tam text,
    add column if not exists tam_mm text,
    add column if not exists soil_type text,
    add column if not exists soil_ph numeric,
    add column if not exists remarks text,
    add column if not exists field_remarks text,
    add column if not exists date_recorded date,
    add column if not exists trial_number text,
    add column if not exists trial_name text,
    add column if not exists contact_person text,
    add column if not exists contact_person_scientist text,
    add column if not exists crop_type text,
    add column if not exists crop_class text,
    add column if not exists variety text,
    add column if not exists crop_stage text,
    add column if not exists stress text,
    add column if not exists planting_date date,
    add column if not exists soil_sampling_date date,
    add column if not exists soil_test_pdf_url text,
    add column if not exists foliar_analysis_pdf_url text,
    add column if not exists previous_cutting date,
    add column if not exists previous_cutting_date date,
    add column if not exists cutting_date date,
    add column if not exists expected_harvest_date date,
    add column if not exists residue_type text,
    add column if not exists residue_management_method text,
    add column if not exists management_method text,
    add column if not exists residual_management_remarks text,
    add column if not exists residue_remarks text,
    add column if not exists fertilizer_type text,
    add column if not exists fertilizer_application_date date,
    add column if not exists nutrient_application_date date,
    add column if not exists application_date date,
    add column if not exists application_rate numeric,
    add column if not exists foliar_sampling_date date,
    add column if not exists fertilizer_applications jsonb,
    add column if not exists herbicide_name text,
    add column if not exists herbicide_application_date date,
    add column if not exists herbicide_application_rate numeric,
    add column if not exists weed_application_date date,
    add column if not exists weed_application_rate numeric,
    add column if not exists herbicide_applications jsonb,
    add column if not exists pest_control text,
    add column if not exists pest_remarks text,
    add column if not exists disease_control text,
    add column if not exists disease_remarks text,
    add column if not exists harvest_date date,
    add column if not exists harvest_yield numeric,
    add column if not exists yield numeric,
    add column if not exists harvest_method text,
    add column if not exists quality_remarks text,
    add column if not exists cane_quality_remarks text,
    add column if not exists geom_polygon jsonb,
    add column if not exists updated_at timestamptz not null default now();

comment on column public.sugarcane_field_management.fertilizer_applications is
    'JSON array storing up to 10 fertilizer application rows from the web entry form.';

comment on column public.sugarcane_field_management.herbicide_applications is
    'JSON array storing up to 10 herbicide application rows from the web entry form.';

update public.sugarcane_field_management
set fertilizer_applications = jsonb_build_array(
    jsonb_strip_nulls(
        jsonb_build_object(
            'loop_number', 1,
            'fertilizer_type', fertilizer_type,
            'application_date', coalesce(nutrient_application_date, fertilizer_application_date, application_date),
            'application_rate', application_rate,
            'foliar_sampling_date', foliar_sampling_date
        )
    )
)
where fertilizer_applications is null
  and (
      fertilizer_type is not null
      or nutrient_application_date is not null
      or fertilizer_application_date is not null
      or application_date is not null
      or application_rate is not null
      or foliar_sampling_date is not null
  );

update public.sugarcane_field_management
set herbicide_applications = jsonb_build_array(
    jsonb_strip_nulls(
        jsonb_build_object(
            'loop_number', 1,
            'herbicide_name', herbicide_name,
            'application_date', coalesce(weed_application_date, herbicide_application_date),
            'application_rate', coalesce(weed_application_rate, herbicide_application_rate)
        )
    )
)
where herbicide_applications is null
  and (
      herbicide_name is not null
      or weed_application_date is not null
      or herbicide_application_date is not null
      or weed_application_rate is not null
      or herbicide_application_rate is not null
  );

alter table public.sugarcane_field_management
    drop constraint if exists sugarcane_field_management_fertilizer_applications_array_chk;

alter table public.sugarcane_field_management
    add constraint sugarcane_field_management_fertilizer_applications_array_chk
    check (
        fertilizer_applications is null
        or (
            jsonb_typeof(fertilizer_applications) = 'array'
            and jsonb_array_length(fertilizer_applications) <= 10
        )
    );

alter table public.sugarcane_field_management
    drop constraint if exists sugarcane_field_management_herbicide_applications_array_chk;

alter table public.sugarcane_field_management
    add constraint sugarcane_field_management_herbicide_applications_array_chk
    check (
        herbicide_applications is null
        or (
            jsonb_typeof(herbicide_applications) = 'array'
            and jsonb_array_length(herbicide_applications) <= 10
        )
    );

create index if not exists idx_sugarcane_field_management_field_id
    on public.sugarcane_field_management(field_id);

create index if not exists idx_sugarcane_field_management_date_recorded
    on public.sugarcane_field_management(date_recorded);

select
    'SUGARCANE_FIELD_MANAGEMENT ENTRY COLUMNS UPDATED' as status,
    count(*) as total_rows
from public.sugarcane_field_management;
