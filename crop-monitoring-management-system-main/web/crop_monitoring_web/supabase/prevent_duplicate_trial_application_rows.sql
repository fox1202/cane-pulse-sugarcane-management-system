-- Prevent duplicate application rows per Trial and loop number.
--
-- The web app updates:
--   public.sugarcane_fields by "Trial"
--   public.sugarcane_fertilizer_applications by "Trial" + loop_number
--   public.sugarcane_herbicide_applications by "Trial" + loop_number
--
-- Run this after make_trial_primary_key_for_sugarcane.sql.

begin;

alter table if exists public.sugarcane_fertilizer_applications
    add column if not exists "Trial" text,
    add column if not exists trial text,
    add column if not exists loop_number integer;

alter table if exists public.sugarcane_herbicide_applications
    add column if not exists "Trial" text,
    add column if not exists trial text,
    add column if not exists loop_number integer;

update public.sugarcane_fertilizer_applications
set "Trial" = coalesce(nullif("Trial", ''), nullif(trial, ''), nullif(field_name, '')),
    trial = coalesce(nullif(trial, ''), nullif("Trial", ''), nullif(field_name, '')),
    loop_number = coalesce(loop_number, 1)
where nullif("Trial", '') is null
   or nullif(trial, '') is null
   or loop_number is null;

update public.sugarcane_herbicide_applications
set "Trial" = coalesce(nullif("Trial", ''), nullif(trial, ''), nullif(field_name, '')),
    trial = coalesce(nullif(trial, ''), nullif("Trial", ''), nullif(field_name, '')),
    loop_number = coalesce(loop_number, 1)
where nullif("Trial", '') is null
   or nullif(trial, '') is null
   or loop_number is null;

-- Deduplicate fertilizer applications, keeping newest/best row per Trial loop.
do $$
declare
    order_expression text := '';
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_fertilizer_applications'
          and column_name = 'updated_at'
    ) then
        order_expression := order_expression || 'updated_at desc nulls last, ';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_fertilizer_applications'
          and column_name = 'created_at'
    ) then
        order_expression := order_expression || 'created_at desc nulls last, ';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_fertilizer_applications'
          and column_name = 'id'
    ) then
        order_expression := order_expression || 'id desc nulls last, ';
    end if;

    order_expression := order_expression || 'ctid desc';

    execute format(
        'with ranked as (
            select ctid,
                   row_number() over (
                       partition by "Trial", loop_number
                       order by %s
                   ) as row_number
            from public.sugarcane_fertilizer_applications
            where nullif("Trial", '''') is not null
        )
        delete from public.sugarcane_fertilizer_applications rows
        using ranked
        where rows.ctid = ranked.ctid
          and ranked.row_number > 1',
        order_expression
    );
end $$;

-- Deduplicate herbicide applications, keeping newest/best row per Trial loop.
do $$
declare
    order_expression text := '';
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_herbicide_applications'
          and column_name = 'updated_at'
    ) then
        order_expression := order_expression || 'updated_at desc nulls last, ';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_herbicide_applications'
          and column_name = 'created_at'
    ) then
        order_expression := order_expression || 'created_at desc nulls last, ';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_herbicide_applications'
          and column_name = 'id'
    ) then
        order_expression := order_expression || 'id desc nulls last, ';
    end if;

    order_expression := order_expression || 'ctid desc';

    execute format(
        'with ranked as (
            select ctid,
                   row_number() over (
                       partition by "Trial", loop_number
                       order by %s
                   ) as row_number
            from public.sugarcane_herbicide_applications
            where nullif("Trial", '''') is not null
        )
        delete from public.sugarcane_herbicide_applications rows
        using ranked
        where rows.ctid = ranked.ctid
          and ranked.row_number > 1',
        order_expression
    );
end $$;

alter table public.sugarcane_fertilizer_applications
    alter column "Trial" set not null,
    alter column loop_number set not null;

alter table public.sugarcane_herbicide_applications
    alter column "Trial" set not null,
    alter column loop_number set not null;

create unique index if not exists uq_sugarcane_fertilizer_trial_loop
    on public.sugarcane_fertilizer_applications ("Trial", loop_number);

create unique index if not exists uq_sugarcane_herbicide_trial_loop
    on public.sugarcane_herbicide_applications ("Trial", loop_number);

commit;
