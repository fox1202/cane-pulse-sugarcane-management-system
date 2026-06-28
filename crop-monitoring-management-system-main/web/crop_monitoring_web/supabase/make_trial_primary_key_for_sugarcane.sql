-- Make Trial the primary key for the sugarcane field table.
--
-- Main table:
--   public.sugarcane_fields
--
-- Child/application tables:
--   public.sugarcane_fertilizer_applications
--   public.sugarcane_herbicide_applications
--
-- Important:
-- - public.sugarcane_fields."Trial" must be unique and not null.
-- - Fertilizer/herbicide tables can have many rows for one Trial, so Trial is
--   a foreign key there, not a primary key.
-- - This script does not use field_id.

begin;

alter table if exists public.sugarcane_fields
    add column if not exists "Trial" text;

alter table if exists public.sugarcane_fertilizer_applications
    add column if not exists "Trial" text;

alter table if exists public.sugarcane_herbicide_applications
    add column if not exists "Trial" text;

-- Backfill Trial from existing Trial/trial/field_name values.
update public.sugarcane_fields
set "Trial" = coalesce(nullif("Trial", ''), nullif(trial, ''), nullif(field_name, ''))
where nullif("Trial", '') is null;

update public.sugarcane_fertilizer_applications
set "Trial" = coalesce(nullif("Trial", ''), nullif(trial, ''), nullif(field_name, ''))
where nullif("Trial", '') is null;

update public.sugarcane_herbicide_applications
set "Trial" = coalesce(nullif("Trial", ''), nullif(trial, ''), nullif(field_name, ''))
where nullif("Trial", '') is null;

-- Stop if Trial is missing in the parent table.
do $$
begin
    if exists (
        select 1
        from public.sugarcane_fields
        where nullif("Trial", '') is null
    ) then
        raise exception 'Cannot make sugarcane_fields.Trial primary key: some rows have empty Trial.';
    end if;
end $$;

-- Deduplicate parent rows before creating the primary key. Keep the newest row
-- per Trial, preferring rows with updated_at/created_at/id when those columns
-- exist. This only removes duplicate parent field rows for the same Trial.
do $$
declare
    order_expression text := '';
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_fields'
          and column_name = 'updated_at'
    ) then
        order_expression := order_expression || 'updated_at desc nulls last, ';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_fields'
          and column_name = 'created_at'
    ) then
        order_expression := order_expression || 'created_at desc nulls last, ';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_fields'
          and column_name = 'id'
    ) then
        order_expression := order_expression || 'id desc nulls last, ';
    end if;

    order_expression := order_expression || 'ctid desc';

    execute format(
        'with ranked as (
            select ctid,
                   row_number() over (
                       partition by "Trial"
                       order by %s
                   ) as row_number
            from public.sugarcane_fields
        )
        delete from public.sugarcane_fields fields
        using ranked
        where fields.ctid = ranked.ctid
          and ranked.row_number > 1',
        order_expression
    );
end $$;

-- Remove old primary key on sugarcane_fields, if one exists.
do $$
declare
    pk_name text;
begin
    select con.conname
    into pk_name
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    where ns.nspname = 'public'
      and cls.relname = 'sugarcane_fields'
      and con.contype = 'p'
    limit 1;

    if pk_name is not null then
        execute format('alter table public.sugarcane_fields drop constraint %I', pk_name);
    end if;
end $$;

alter table public.sugarcane_fields
    alter column "Trial" set not null;

alter table public.sugarcane_fields
    add constraint sugarcane_fields_trial_pkey primary key ("Trial");

-- Keep lowercase trial aligned for compatibility with older view/code paths.
update public.sugarcane_fields
set trial = "Trial"
where trial is distinct from "Trial";

update public.sugarcane_fertilizer_applications
set trial = "Trial"
where trial is distinct from "Trial";

update public.sugarcane_herbicide_applications
set trial = "Trial"
where trial is distinct from "Trial";

create index if not exists idx_sugarcane_fertilizer_applications_trial
    on public.sugarcane_fertilizer_applications ("Trial");

create index if not exists idx_sugarcane_herbicide_applications_trial
    on public.sugarcane_herbicide_applications ("Trial");

alter table public.sugarcane_fertilizer_applications
    drop constraint if exists sugarcane_fertilizer_applications_trial_fkey;

alter table public.sugarcane_herbicide_applications
    drop constraint if exists sugarcane_herbicide_applications_trial_fkey;

alter table public.sugarcane_fertilizer_applications
    add constraint sugarcane_fertilizer_applications_trial_fkey
    foreign key ("Trial")
    references public.sugarcane_fields ("Trial")
    on update cascade
    on delete cascade;

alter table public.sugarcane_herbicide_applications
    add constraint sugarcane_herbicide_applications_trial_fkey
    foreign key ("Trial")
    references public.sugarcane_fields ("Trial")
    on update cascade
    on delete cascade;

commit;
