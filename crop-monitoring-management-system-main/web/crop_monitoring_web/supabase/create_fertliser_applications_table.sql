-- ============================================================================
-- CREATE OR MIGRATE FERTLISER_APPLICATIONS TABLE
-- ============================================================================
-- One row per field_name.
-- This table is linked to public.sugarcane_monitoring in the app by field_name.
-- Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;

do $$
begin
    if to_regclass('public.fertliser_applications') is not null
        and exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'fertliser_applications'
              and column_name = 'application_type'
        )
        and to_regclass('public.fertliser_applications_legacy') is null then
        alter table public.fertliser_applications rename to fertliser_applications_legacy;
    end if;

    if to_regclass('public.fertilizer_application') is not null
        and to_regclass('public.fertliser_applications_legacy') is null then
        alter table public.fertilizer_application rename to fertliser_applications_legacy;
    end if;
end $$;

create table if not exists public.fertliser_applications (
    field_name text primary key,
    fertilizer_applications jsonb,
    herbicide_applications jsonb,
    foliar_sampling_date date,
    collector_id text,
    remarks text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

do $$
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'fertliser_applications'
          and column_name = 'fertilizer_applications'
    ) then
        alter table public.fertliser_applications
            add column fertilizer_applications jsonb;
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'fertliser_applications'
          and column_name = 'herbicide_applications'
    ) then
        alter table public.fertliser_applications
            add column herbicide_applications jsonb;
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'fertliser_applications'
          and column_name = 'foliar_sampling_date'
    ) then
        alter table public.fertliser_applications
            add column foliar_sampling_date date;
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'fertliser_applications'
          and column_name = 'collector_id'
    ) then
        alter table public.fertliser_applications
            add column collector_id text;
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'fertliser_applications'
          and column_name = 'remarks'
    ) then
        alter table public.fertliser_applications
            add column remarks text;
    end if;
end $$;

insert into public.fertliser_applications (
    field_name,
    fertilizer_applications,
    herbicide_applications,
    foliar_sampling_date,
    collector_id,
    remarks
)
select distinct on (trim(sm.field_name))
    trim(sm.field_name) as field_name,
    sm.fertilizer_applications,
    sm.herbicide_applications,
    sm.foliar_sampling_date,
    sm.collector_id,
    sm.remarks
from public.sugarcane_monitoring sm
where trim(coalesce(sm.field_name, '')) <> ''
order by
    trim(sm.field_name),
    sm.date_recorded desc nulls last,
    sm.updated_at desc nulls last,
    sm.created_at desc nulls last
on conflict (field_name) do update
set
    fertilizer_applications = excluded.fertilizer_applications,
    herbicide_applications = excluded.herbicide_applications,
    foliar_sampling_date = excluded.foliar_sampling_date,
    collector_id = excluded.collector_id,
    remarks = excluded.remarks,
    updated_at = now();

comment on table public.fertliser_applications is
    'Separate linked application table keyed by field_name.';

comment on column public.fertliser_applications.field_name is
    'Primary key used to link application details to sugarcane_monitoring rows by field_name.';

create index if not exists idx_fertliser_applications_field_name
    on public.fertliser_applications(field_name);

alter table public.fertliser_applications enable row level security;

drop policy if exists "Allow authenticated to read fertilizer_application" on public.fertliser_applications;
drop policy if exists "Allow authenticated to insert fertilizer_application" on public.fertliser_applications;
drop policy if exists "Allow authenticated to update fertilizer_application" on public.fertliser_applications;
drop policy if exists "Allow authenticated to delete fertilizer_application" on public.fertliser_applications;
drop policy if exists "Allow authenticated to read fertliser_applications" on public.fertliser_applications;
drop policy if exists "Allow authenticated to insert fertliser_applications" on public.fertliser_applications;
drop policy if exists "Allow authenticated to update fertliser_applications" on public.fertliser_applications;
drop policy if exists "Allow authenticated to delete fertliser_applications" on public.fertliser_applications;

create policy "Allow authenticated to read fertliser_applications"
    on public.fertliser_applications for select
    using (true);

create policy "Allow authenticated to insert fertliser_applications"
    on public.fertliser_applications for insert
    with check (true);

create policy "Allow authenticated to update fertliser_applications"
    on public.fertliser_applications for update
    using (true);

create policy "Allow authenticated to delete fertliser_applications"
    on public.fertliser_applications for delete
    using (true);

create or replace function public.update_fertliser_applications_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists update_fertilizer_application_updated_at on public.fertliser_applications;
drop trigger if exists update_fertliser_applications_updated_at on public.fertliser_applications;
create trigger update_fertliser_applications_updated_at
    before update on public.fertliser_applications
    for each row
    execute procedure public.update_fertliser_applications_timestamp();

/*
insert into public.fertliser_applications (
    field_name,
    fertilizer_applications,
    herbicide_applications,
    foliar_sampling_date,
    collector_id,
    remarks
)
values (
    'FIELD A1',
    '[{"loop_number":1,"fertilizer_type":"NPK 20-10-10","application_date":"2026-03-01","application_rate":100,"foliar_sampling_date":"2026-03-03"}]'::jsonb,
    '[{"loop_number":1,"herbicide_name":"Roundup","application_date":"2026-03-05","application_rate":2.5}]'::jsonb,
    '2026-03-03',
    'collector-1',
    'Starter field application bundle'
);
*/

-- Example join to monitoring by field_name:
-- select
--     sm.id as monitoring_id,
--     sm.field_name,
--     sm.date_recorded,
--     fa.fertilizer_applications,
--     fa.herbicide_applications,
--     fa.foliar_sampling_date
-- from public.sugarcane_monitoring sm
-- left join public.fertliser_applications fa
--   on fa.field_name = sm.field_name
-- order by sm.date_recorded desc;

select
    'FERTLISER_APPLICATIONS TABLE READY' as status,
    count(*) as total_rows
from public.fertliser_applications;
