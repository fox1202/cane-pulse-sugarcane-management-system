-- Repair the three-table sugarcane observation setup used by the web form.
--
-- Save tables:
--   public.sugarcane_fields
--   public.sugarcane_fertilizer_applications
--   public.sugarcane_herbicide_applications
--
-- The web app uses Trial/trial + block_id as the field identity. It does not
-- use field_id for saving.
--
-- This fixes database-side errors like:
--   No sugarcane field exists with field_id <NULL>
--   record "new" has no field "field_id"
-- caused by older triggers/rules/constraints that still reference field_id.
--
-- It keeps block_id. It does not touch the other old split tables.

begin;

-- Keep the three live tables compatible with Trial-based save/view logic.
do $$
declare
    target_table text;
begin
    foreach target_table in array array[
        'sugarcane_fields',
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications'
    ]
    loop
        if not exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'field_name'
        ) then
            execute format('alter table public.%I add column field_name text', target_table);
        end if;

        if not exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'Trial'
        ) then
            execute format('alter table public.%I add column "Trial" text', target_table);
        end if;

        if not exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'trial'
        ) then
            execute format('alter table public.%I add column trial text', target_table);
        end if;

        if not exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'block_id'
        ) then
            execute format('alter table public.%I add column block_id text', target_table);
        end if;

        -- If an old field_id column exists, it must not be required anymore.
        -- The app saves by Trial/trial + block_id.
        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'field_id'
        ) then
            execute format('alter table public.%I alter column field_id drop not null', target_table);
        end if;

    end loop;
end $$;

-- Remove old trigger hooks on only these three tables when they reference
-- field_id/trial-block compatibility logic. PostgreSQL trigger definitions
-- often show only the function name, not the function body, so we also remove
-- validation-style triggers whose names commonly wrap NEW.field_id checks.
do $$
declare
    target_table text;
    trigger_row record;
begin
    foreach target_table in array array[
        'sugarcane_fields',
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications'
    ]
    loop
        for trigger_row in
            select tg.tgname
            from pg_trigger tg
            join pg_class cls on cls.oid = tg.tgrelid
            join pg_namespace ns on ns.oid = cls.relnamespace
            where ns.nspname = 'public'
              and cls.relname = target_table
              and not tg.tgisinternal
              and (
                  tg.tgname = 'trg_set_trial_block'
                  or tg.tgname ilike '%field_id%'
                  or tg.tgname ilike '%field%'
                  or tg.tgname ilike '%trial%'
                  or tg.tgname ilike '%block%'
                  or tg.tgname ilike '%valid%'
                  or tg.tgname ilike '%check%'
                  or tg.tgname ilike '%reference%'
                  or pg_get_triggerdef(tg.oid) ilike '%field_id%'
                  or pg_get_triggerdef(tg.oid) ilike '%set_child_trial_and_block%'
              )
        loop
            execute format(
                'drop trigger if exists %I on public.%I',
                trigger_row.tgname,
                target_table
            );
        end loop;
    end loop;
end $$;

-- Remove foreign-key constraints on field_id in only these three tables.
-- The form identity is field_name/trial + block_id, so field_id must not block
-- inserts when the form intentionally saves without field_id.
do $$
declare
    target_table text;
    constraint_row record;
begin
    foreach target_table in array array[
        'sugarcane_fields',
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications'
    ]
    loop
        for constraint_row in
            select con.conname
            from pg_constraint con
            join pg_class cls on cls.oid = con.conrelid
            join pg_namespace ns on ns.oid = cls.relnamespace
            where ns.nspname = 'public'
              and cls.relname = target_table
              and con.contype = 'f'
              and pg_get_constraintdef(con.oid) ilike '%field_id%'
        loop
            execute format(
                'alter table public.%I drop constraint if exists %I',
                target_table,
                constraint_row.conname
            );
        end loop;
    end loop;
end $$;

-- Remove CHECK constraints that require field_id to be present/non-empty.
do $$
declare
    target_table text;
    constraint_row record;
begin
    foreach target_table in array array[
        'sugarcane_fields',
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications'
    ]
    loop
        for constraint_row in
            select con.conname
            from pg_constraint con
            join pg_class cls on cls.oid = con.conrelid
            join pg_namespace ns on ns.oid = cls.relnamespace
            where ns.nspname = 'public'
              and cls.relname = target_table
              and con.contype = 'c'
              and pg_get_constraintdef(con.oid) ilike '%field_id%'
        loop
            execute format(
                'alter table public.%I drop constraint if exists %I',
                target_table,
                constraint_row.conname
            );
        end loop;
    end loop;
end $$;

commit;
