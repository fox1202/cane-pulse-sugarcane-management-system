-- Predefined field registry for data collectors.
-- Run this in Supabase SQL editor to create/seed the backend field catalog.

create extension if not exists pgcrypto;

create table if not exists public.fields (
    id uuid primary key default gen_random_uuid(),
    field_name text not null unique,
    section_name text not null,
    block_id text not null,
    latitude double precision not null,
    longitude double precision not null,
    geom jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.fields (
    field_name,
    section_name,
    block_id,
    latitude,
    longitude,
    geom
)
values
(
    'FIELD A1',
    'SECTION A',
    'BLOCK-01',
    -17.82074,
    31.04988,
    '{
      "type":"Polygon",
      "coordinates":[[[31.0482,-17.8223],[31.0524,-17.8223],[31.0524,-17.8192],[31.0482,-17.8192],[31.0482,-17.8223]]]
    }'::jsonb
),
(
    'FIELD A2',
    'SECTION A',
    'BLOCK-02',
    -17.82084,
    31.05456,
    '{
      "type":"Polygon",
      "coordinates":[[[31.053,-17.822],[31.0569,-17.822],[31.0569,-17.8191],[31.053,-17.8191],[31.053,-17.822]]]
    }'::jsonb
),
(
    'FIELD B1',
    'SECTION B',
    'BLOCK-03',
    -17.82442,
    31.05008,
    '{
      "type":"Polygon",
      "coordinates":[[[31.0484,-17.8261],[31.0526,-17.8261],[31.0526,-17.8233],[31.0484,-17.8233],[31.0484,-17.8261]]]
    }'::jsonb
),
(
    'FIELD B2',
    'SECTION B',
    'BLOCK-04',
    -17.82482,
    31.05474,
    '{
      "type":"Polygon",
      "coordinates":[[[31.0531,-17.8259],[31.0572,-17.8259],[31.0572,-17.8232],[31.0531,-17.8232],[31.0531,-17.8259]]]
    }'::jsonb
)
on conflict (field_name) do update
set
    section_name = excluded.section_name,
    block_id = excluded.block_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    geom = excluded.geom,
    updated_at = now();
