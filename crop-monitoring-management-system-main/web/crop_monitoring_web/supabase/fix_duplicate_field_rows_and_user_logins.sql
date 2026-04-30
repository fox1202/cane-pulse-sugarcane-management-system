-- ============================================================================
-- FIX DUPLICATE FIELD ROWS AND USER LOGIN READINESS
-- ============================================================================
-- Run this once in the Supabase SQL Editor with a privileged/service role.
--
-- What it does:
--   1. Keeps one public.sugarcane_field_management row per field identity.
--   2. Deletes duplicate physical rows for the same field identity.
--   3. Adds a unique index so future saves update the existing field row.
--   4. Repairs existing Auth/Profile users so they behave like
--      silentabrahamganda02@gmail.com: confirmed email, approved profile,
--      active profile, and email identity present.
--
-- Existing profile roles are preserved. This script fixes account readiness,
-- not permissions.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

-- Keep profile roles/statuses consistent with the app.
alter table public.profiles
    drop constraint if exists profiles_role_check;

update public.profiles
set role = case lower(trim(coalesce(role, '')))
    when 'admin' then 'admin'
    when 'administrator' then 'admin'
    when 'system_administrator' then 'admin'
    when 'system administrator' then 'admin'
    when 'supervisor' then 'supervisor'
    when 'regional_supervisor' then 'supervisor'
    when 'regional supervisor' then 'supervisor'
    when 'collector' then 'collector'
    when 'user' then 'collector'
    when 'users' then 'collector'
    else 'collector'
end;

alter table public.profiles
    add constraint profiles_role_check
    check (role in ('collector', 'supervisor', 'admin'));

-- Create or repair profile rows for every existing Auth user.
insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    is_active
)
select
    u.id,
    lower(trim(u.email)),
    coalesce(nullif(trim(u.raw_user_meta_data->>'first_name'), ''), split_part(lower(trim(u.email)), '@', 1), 'User'),
    coalesce(nullif(trim(u.raw_user_meta_data->>'last_name'), ''), 'Account'),
    case
        when lower(trim(coalesce(u.raw_user_meta_data->>'role', ''))) in ('admin', 'administrator', 'system_administrator', 'system administrator') then 'admin'
        when lower(trim(coalesce(u.raw_user_meta_data->>'role', ''))) in ('supervisor', 'regional_supervisor', 'regional supervisor') then 'supervisor'
        when lower(trim(coalesce(u.raw_user_meta_data->>'role', ''))) in ('collector', 'user', 'users') then 'collector'
        else 'collector'
    end,
    'approved',
    true
from auth.users u
where nullif(trim(coalesce(u.email, '')), '') is not null
on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
    last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
    role = public.profiles.role,
    status = 'approved',
    is_active = true,
    updated_at = now();

update public.profiles
set
    status = 'approved',
    is_active = true,
    updated_at = now()
where status is distinct from 'approved'
   or coalesce(is_active, false) is distinct from true;

-- Confirm every existing email user and align metadata with the approved profile.
update auth.users u
set
    aud = 'authenticated',
    role = 'authenticated',
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
    ),
    raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'role', p.role,
        'status', 'approved',
        'email_verified', true
    ),
    updated_at = now()
from public.profiles p
where p.id = u.id
  and nullif(trim(coalesce(u.email, '')), '') is not null;

-- GoTrue expects these string token fields to be non-null on manually repaired users.
do $$
declare
    auth_column_name text;
    required_empty_string_columns text[] := array[
        'confirmation_token',
        'recovery_token',
        'email_change',
        'email_change_token_new',
        'email_change_token_current',
        'phone_change',
        'phone_change_token',
        'reauthentication_token'
    ];
begin
    foreach auth_column_name in array required_empty_string_columns loop
        if exists (
            select 1
            from information_schema.columns
            where table_schema = 'auth'
              and table_name = 'users'
              and column_name = auth_column_name
        ) then
            execute format(
                'update auth.users set %1$I = coalesce(%1$I, %2$L)',
                auth_column_name,
                ''
            );
        end if;
    end loop;
end $$;

-- Ensure an email identity exists for every existing email/password user.
do $$
declare
    identity_id_type text;
    provider_id_column_is_writable boolean;
    identity_id_expression text;
    identity_columns text;
    identity_values text;
begin
    select data_type
    into identity_id_type
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'id';

    select exists (
        select 1
        from information_schema.columns
        where table_schema = 'auth'
          and table_name = 'identities'
          and column_name = 'provider_id'
          and is_generated = 'NEVER'
    )
    into provider_id_column_is_writable;

    identity_id_expression := case
        when identity_id_type = 'uuid' then 'u.id'
        else 'u.id::text'
    end;

    if provider_id_column_is_writable then
        identity_columns := 'id, user_id, provider_id, identity_data, provider, created_at, updated_at';
        identity_values := identity_id_expression || ', u.id, u.id::text, jsonb_build_object(' ||
            quote_literal('sub') || ', u.id::text, ' ||
            quote_literal('email') || ', u.email, ' ||
            quote_literal('email_verified') || ', true, ' ||
            quote_literal('phone_verified') || ', false), ' ||
            quote_literal('email') || ', now(), now()';
    else
        identity_columns := 'id, user_id, identity_data, provider, created_at, updated_at';
        identity_values := identity_id_expression || ', u.id, jsonb_build_object(' ||
            quote_literal('sub') || ', u.id::text, ' ||
            quote_literal('email') || ', u.email, ' ||
            quote_literal('email_verified') || ', true, ' ||
            quote_literal('phone_verified') || ', false), ' ||
            quote_literal('email') || ', now(), now()';
    end if;

    execute format(
        'insert into auth.identities (%s)
         select %s
         from auth.users u
         where nullif(trim(coalesce(u.email, '''')), '''') is not null
           and not exists (
             select 1
             from auth.identities i
             where i.user_id = u.id
               and i.provider = %L
           )',
        identity_columns,
        identity_values,
        'email'
    );
end $$;

-- Remove duplicate physical field-management rows, keeping the best row:
-- dated rows first, then newest date, then newest updated/created timestamp.
do $$
declare
    target_schema text := 'public';
    target_table text := 'sugarcane_field_management';
    name_expr text := null;
    section_expr text := quote_literal('');
    block_expr text := quote_literal('');
    date_expr text := 'null::timestamptz';
    updated_expr text := 'null::timestamptz';
    created_expr text := 'null::timestamptz';
    identity_expr text;
    cleanup_sql text;
    unique_sql text;
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'field_name'
    ) then
        name_expr := 'field_name::text';
    elsif exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'Trial'
    ) then
        name_expr := '"Trial"::text';
    elsif exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'field_id'
    ) then
        name_expr := 'field_id::text';
    end if;

    if name_expr is null then
        raise notice 'Skipping duplicate cleanup: no field identity column was found on %.%', target_schema, target_table;
        return;
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'section_name'
    ) then
        section_expr := 'section_name::text';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'block_id'
    ) then
        block_expr := 'block_id::text';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'date_recorded'
    ) then
        date_expr := 'date_recorded::timestamptz';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'updated_at'
    ) then
        updated_expr := 'updated_at::timestamptz';
    end if;

    if exists (
        select 1 from information_schema.columns
        where table_schema = target_schema and table_name = target_table and column_name = 'created_at'
    ) then
        created_expr := 'created_at::timestamptz';
    end if;

    identity_expr := format(
        'lower(regexp_replace(coalesce(%s, ''''), ''\s+'', '' '', ''g'')) || %L ||
         lower(regexp_replace(coalesce(%s, ''''), ''\s+'', '' '', ''g'')) || %L ||
         lower(regexp_replace(coalesce(%s, ''''), ''\s+'', '' '', ''g''))',
        name_expr,
        '|',
        section_expr,
        '|',
        block_expr
    );

    cleanup_sql := format(
        'with ranked as (
            select
                id::text as row_id,
                %1$s as identity_key,
                row_number() over (
                    partition by %1$s
                    order by
                        (%2$s is not null) desc,
                        %2$s desc nulls last,
                        %3$s desc nulls last,
                        %4$s desc nulls last,
                        id::text desc
                ) as row_rank
            from %5$I.%6$I
            where nullif(trim(coalesce(%7$s, '''')), '''') is not null
        )
        delete from %5$I.%6$I t
        using ranked r
        where t.id::text = r.row_id
          and r.row_rank > 1',
        identity_expr,
        date_expr,
        updated_expr,
        created_expr,
        target_schema,
        target_table,
        name_expr
    );

    execute cleanup_sql;

    unique_sql := format(
        'create unique index if not exists sugarcane_field_management_unique_field_identity
         on %1$I.%2$I ((%3$s))
         where nullif(trim(coalesce(%4$s, '''')), '''') is not null',
        target_schema,
        target_table,
        identity_expr,
        name_expr
    );

    execute unique_sql;
end $$;

commit;

-- Verification: this should return zero duplicate groups.
do $$
declare
    duplicate_count integer := 0;
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'sugarcane_field_management'
          and column_name = 'Trial'
    ) then
        execute '
            select count(*)
            from (
                select lower(regexp_replace(coalesce("Trial"::text, ''''), ''\s+'', '' '', ''g'')) as trial_key,
                       count(*) as row_count
                from public.sugarcane_field_management
                group by 1
                having count(*) > 1
            ) duplicates'
        into duplicate_count;
    end if;

    raise notice 'Remaining duplicate Trial groups: %', duplicate_count;
end $$;
