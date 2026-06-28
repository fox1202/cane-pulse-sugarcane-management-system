-- One-time compatibility repair for the 9 split sugarcane entry tables.
--
-- This script intentionally ONLY adds missing compatibility columns.
-- It does not update existing rows, because the live database has triggers
-- that may interpret trial/block values as UUIDs.
--
-- This fixes errors like:
--   record "new" has no field "field_id"
--
-- It avoids errors like:
--   invalid input syntax for type uuid: "Impala"

begin;

alter table if exists public.sugarcane_fields
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_soil_properties
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_crop_information
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_important_dates
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_residue_management
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_crop_protection
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_foliar_sampling
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_fertilizer_applications
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

alter table if exists public.sugarcane_herbicide_applications
    add column if not exists field_name text,
    add column if not exists field_id text,
    add column if not exists trial text;

commit;
