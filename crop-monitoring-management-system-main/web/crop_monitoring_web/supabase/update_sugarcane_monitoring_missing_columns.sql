-- ============================================================================
-- UPDATE SUGARCANE_MONITORING WITH MISSING ENTRY-FORM COLUMNS
-- ============================================================================
-- Adds the columns used by the Enter Field Observation Record form
-- when they are missing from the live public.sugarcane_monitoring table.
--
-- It also:
-- 1. backfills one-loop fertilizer/herbicide arrays from legacy single fields
-- 2. limits fertilizer_applications to at most 10 loop rows
-- 3. limits herbicide_applications to at most 10 loop rows
--
-- Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================================

alter table public.sugarcane_monitoring
    add column if not exists collector_id text,
    add column if not exists fertilizer_application_date date,
    add column if not exists application_rate numeric,
    add column if not exists fertilizer_applications jsonb,
    add column if not exists herbicide_applications jsonb,
    add column if not exists weed_control text,
    add column if not exists pest_control text,
    add column if not exists disease_control text,
    add column if not exists yield numeric,
    add column if not exists residue_type text,
    add column if not exists residue_management_method text,
    add column if not exists remarks text,
    add column if not exists field_id text,
    add column if not exists area numeric,
    add column if not exists geom_polygon jsonb,
    add column if not exists trial_number text,
    add column if not exists trial_name text,
    add column if not exists contact_person text,
    add column if not exists crop_class text,
    add column if not exists previous_cutting date,
    add column if not exists tam_mm text,
    add column if not exists field_remarks text,
    add column if not exists residual_management_remarks text,
    add column if not exists nutrient_application_date date,
    add column if not exists foliar_sampling_date date,
    add column if not exists herbicide_name text,
    add column if not exists weed_application_date date,
    add column if not exists weed_application_rate numeric,
    add column if not exists pest_remarks text,
    add column if not exists disease_remarks text,
    add column if not exists harvest_yield numeric,
    add column if not exists quality_remarks text;

comment on column public.sugarcane_monitoring.fertilizer_applications is
    'JSON array storing up to 10 fertilizer loop records.';

comment on column public.sugarcane_monitoring.herbicide_applications is
    'JSON array storing up to 10 herbicide loop records.';

comment on column public.sugarcane_monitoring.field_id is
    'Field identifier used by the Enter Field Observation Record form.';

comment on column public.sugarcane_monitoring.area is
    'Observed field area or block size.';

comment on column public.sugarcane_monitoring.geom_polygon is
    'Captured polygon geometry for the field observation in GeoJSON/jsonb form.';

comment on column public.sugarcane_monitoring.trial_number is
    'Trial number captured from the entry form.';

comment on column public.sugarcane_monitoring.trial_name is
    'Trial name captured from the entry form.';

comment on column public.sugarcane_monitoring.contact_person is
    'Contact person captured from the entry form.';

comment on column public.sugarcane_monitoring.crop_class is
    'Crop class selected in the entry form.';

comment on column public.sugarcane_monitoring.previous_cutting is
    'Previous cutting date captured in the entry form.';

comment on column public.sugarcane_monitoring.tam_mm is
    'TAM value captured in the entry form.';

comment on column public.sugarcane_monitoring.field_remarks is
    'Field-specific remarks captured in the entry form.';

comment on column public.sugarcane_monitoring.residual_management_remarks is
    'Residual management remarks captured in the entry form.';

comment on column public.sugarcane_monitoring.nutrient_application_date is
    'Nutrient/fertilizer application date captured in the entry form.';

comment on column public.sugarcane_monitoring.foliar_sampling_date is
    'Foliar sampling date captured in the entry form.';

comment on column public.sugarcane_monitoring.herbicide_name is
    'Herbicide name captured in the entry form.';

comment on column public.sugarcane_monitoring.weed_application_date is
    'Herbicide/weed application date captured in the entry form.';

comment on column public.sugarcane_monitoring.weed_application_rate is
    'Herbicide/weed application rate captured in the entry form.';

comment on column public.sugarcane_monitoring.pest_remarks is
    'Pest remarks captured in the entry form.';

comment on column public.sugarcane_monitoring.disease_remarks is
    'Disease remarks captured in the entry form.';

comment on column public.sugarcane_monitoring.harvest_yield is
    'Harvest yield captured in the entry form.';

comment on column public.sugarcane_monitoring.quality_remarks is
    'Quality remarks captured in the entry form.';

-- ============================================================================
-- BACKFILL LOOP ARRAYS FROM LEGACY SINGLE-VALUE FIELDS
-- ============================================================================

update public.sugarcane_monitoring
set fertilizer_applications = jsonb_build_array(
    jsonb_strip_nulls(
        jsonb_build_object(
            'loop_number', 1,
            'fertilizer_type', fertilizer_type,
            'application_date', coalesce(nutrient_application_date, fertilizer_application_date),
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
      or application_rate is not null
      or foliar_sampling_date is not null
  );

update public.sugarcane_monitoring
set herbicide_applications = jsonb_build_array(
    jsonb_strip_nulls(
        jsonb_build_object(
            'loop_number', 1,
            'herbicide_name', coalesce(herbicide_name, weed_control),
            'application_date', weed_application_date,
            'application_rate', weed_application_rate
        )
    )
)
where herbicide_applications is null
  and (
      herbicide_name is not null
      or weed_control is not null
      or weed_application_date is not null
      or weed_application_rate is not null
  );

-- ============================================================================
-- ENFORCE JSON ARRAY SHAPE AND MAX 10 LOOPS
-- ============================================================================

alter table public.sugarcane_monitoring
    drop constraint if exists sugarcane_monitoring_fertilizer_applications_array_chk;

alter table public.sugarcane_monitoring
    add constraint sugarcane_monitoring_fertilizer_applications_array_chk
    check (
        fertilizer_applications is null
        or (
            jsonb_typeof(fertilizer_applications) = 'array'
            and jsonb_array_length(fertilizer_applications) <= 10
        )
    );

alter table public.sugarcane_monitoring
    drop constraint if exists sugarcane_monitoring_herbicide_applications_array_chk;

alter table public.sugarcane_monitoring
    add constraint sugarcane_monitoring_herbicide_applications_array_chk
    check (
        herbicide_applications is null
        or (
            jsonb_typeof(herbicide_applications) = 'array'
            and jsonb_array_length(herbicide_applications) <= 10
        )
    );

-- ============================================================================
-- OPTIONAL INDEXES FOR COMMON FORM QUERIES
-- ============================================================================

create index if not exists idx_sugarcane_monitoring_field_id
    on public.sugarcane_monitoring(field_id);

create index if not exists idx_sugarcane_monitoring_crop_class
    on public.sugarcane_monitoring(crop_class);

create index if not exists idx_sugarcane_monitoring_previous_cutting
    on public.sugarcane_monitoring(previous_cutting);

-- ============================================================================
-- VERIFY
-- ============================================================================

select
    'SUGARCANE_MONITORING UPDATED' as status,
    count(*) as total_rows
from public.sugarcane_monitoring;
