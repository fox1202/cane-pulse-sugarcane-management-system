-- ============================================================================
-- CREATE SUGARCANE_MONITORING TABLE FOR ANALYSIS
-- ============================================================================
-- This table stores all sugarcane monitoring data for analysis
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. CREATE SUGARCANE_MONITORING TABLE
-- ============================================================================

create table if not exists public.sugarcane_monitoring (
    id uuid primary key default gen_random_uuid(),
    
    -- Location & Date
    field_name text not null,
    section_name text,
    block_id text,
    latitude double precision,
    longitude double precision,
    date_recorded timestamptz not null,
    
    -- Crop Information
    crop_type text default 'Sugarcane',
    variety text,
    ratoon_number integer,
    crop_stage text,
    planting_date date,
    expected_harvest_date date,
    
    -- Crop Monitoring
    crop_vigor text,
    canopy_cover numeric,
    stress text,
    
    -- Soil Characteristics
    soil_type text,
    soil_texture text,
    soil_ph numeric,
    organic_matter numeric,
    drainage_class text,
    
    -- Irrigation Management
    irrigation_type text,
    irrigation_date date,
    irrigation_volume numeric,
    soil_moisture_percentage numeric,
    water_source text,
    
    -- Nutrient Management
    fertilizer_type text,
    fertilizer_application_date date,
    application_rate numeric,
    npk_ratio text,
    
    -- Crop Protection
    weed_type text,
    weed_level text,
    pest_type text,
    pest_severity text,
    disease_type text,
    disease_severity text,
    
    -- Control Methods
    weed_control text,
    pest_control text,
    disease_control text,
    
    -- Harvest Information
    harvest_date date,
    yield numeric,
    harvest_method text,
    
    -- Residual Management
    residue_type text,
    residue_management_method text,
    
    -- Metadata
    collector_id text,
    remarks text,
    image_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR ANALYSIS
-- ============================================================================

create index if not exists idx_sugarcane_field_name on public.sugarcane_monitoring(field_name);
create index if not exists idx_sugarcane_date_recorded on public.sugarcane_monitoring(date_recorded);
create index if not exists idx_sugarcane_variety on public.sugarcane_monitoring(variety);
create index if not exists idx_sugarcane_crop_stage on public.sugarcane_monitoring(crop_stage);
create index if not exists idx_sugarcane_crop_vigor on public.sugarcane_monitoring(crop_vigor);
create index if not exists idx_sugarcane_canopy_cover on public.sugarcane_monitoring(canopy_cover);
create index if not exists idx_sugarcane_yield on public.sugarcane_monitoring(yield);
create index if not exists idx_sugarcane_soil_type on public.sugarcane_monitoring(soil_type);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

alter table public.sugarcane_monitoring enable row level security;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Allow authenticated users to read all monitoring data
drop policy if exists "Allow authenticated to read sugarcane_monitoring" on public.sugarcane_monitoring;
create policy "Allow authenticated to read sugarcane_monitoring"
    on public.sugarcane_monitoring for select
    using (true);

-- Allow authenticated users to insert monitoring data
drop policy if exists "Allow authenticated to insert sugarcane_monitoring" on public.sugarcane_monitoring;
create policy "Allow authenticated to insert sugarcane_monitoring"
    on public.sugarcane_monitoring for insert
    with check (true);

-- Allow authenticated users to update monitoring data
drop policy if exists "Allow authenticated to update sugarcane_monitoring" on public.sugarcane_monitoring;
create policy "Allow authenticated to update sugarcane_monitoring"
    on public.sugarcane_monitoring for update
    using (true);

-- ============================================================================
-- 5. CREATE AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

create or replace function public.update_sugarcane_monitoring_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_sugarcane_monitoring_updated_at on public.sugarcane_monitoring;
create trigger update_sugarcane_monitoring_updated_at
    before update on public.sugarcane_monitoring
    for each row
    execute procedure public.update_sugarcane_monitoring_timestamp();

-- ============================================================================
-- 6. INSERT SAMPLE DATA FOR TESTING
-- ============================================================================

insert into public.sugarcane_monitoring (
    field_name, section_name, block_id, latitude, longitude,
    date_recorded, crop_type, variety, crop_stage, ratoon_number,
    crop_vigor, canopy_cover, stress,
    soil_type, soil_ph, organic_matter,
    irrigation_type, soil_moisture_percentage, water_source,
    fertilizer_type, application_rate, npk_ratio,
    weed_level, pest_severity, disease_severity,
    weed_control, pest_control, disease_control,
    yield, harvest_method,
    collector_id, remarks
)
values
    ('Field A1', 'Section A', 'BLOCK-01', -17.82074, 31.04988,
     now(), 'Sugarcane', 'SP70-1284', 'Maturity', 1,
     'Excellent', 85, 'None',
     'Sandy Loam', 6.8, 3.2,
     'Drip', 65, 'Borehole',
     'NPK 20-10-10', 100, '20:10:10',
     'Low', 'No', 'No',
     'Manual', 'Not Required', 'Not Required',
     75.5, 'Mechanical',
     'collector-1', 'Excellent field conditions, ready for harvest'),
     
    ('Field A2', 'Section A', 'BLOCK-02', -17.82084, 31.05456,
     now() - interval '7 days', 'Sugarcane', 'NCo376', 'Late Elongation', 2,
     'Good', 78, 'Water Stress',
     'Clay Loam', 6.9, 2.8,
     'Flood', 58, 'Canal',
     'NPK 15-15-15', 80, '15:15:15',
     'Moderate', 'Low', 'Low',
     'Chemical', 'Trap Crop', 'Fungicide',
     68.2, 'Mechanical',
     'collector-2', 'Water stress observed, irrigation recommended'),
     
    ('Field B1', 'Section B', 'BLOCK-03', -17.81234, 31.06123,
     now() - interval '14 days', 'Sugarcane', 'SP70-1284', 'Elongation', 1,
     'Fair', 72, 'Nutrient Deficiency',
     'Loamy', 6.5, 2.5,
     'Sprinkler', 55, 'Well',
     'NPK 17-8-8', 90, '17:8:8',
     'Low', 'Medium', 'No',
     'Mechanical', 'Spray', 'Monitoring',
     NULL, NULL,
     'collector-3', 'Nitrogen deficiency detected, fertilizer applied')
on conflict do nothing;

-- ============================================================================
-- 7. VERIFY TABLE CREATED
-- ============================================================================

select 
    'SUGARCANE_MONITORING TABLE CREATED ✓' as status,
    count(*) as total_records,
    count(distinct field_name) as unique_fields
from public.sugarcane_monitoring;

select 'Table ready for analysis!' as message;
