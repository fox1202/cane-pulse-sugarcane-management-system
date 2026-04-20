-- ============================================================================
-- ACCESS REQUEST PROFILE PROVISIONING
-- ============================================================================
-- Run this in the Supabase SQL Editor to ensure sign-up access requests create
-- pending profile rows with the requested role.
-- ============================================================================

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
          and lower(email) = lower('silentabrahamganda02@gmail.com')
          and status = 'approved'
    )
$$;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
    on public.profiles for select
    using (public.current_user_is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
    on public.profiles for update
    using (public.current_user_is_admin())
    with check (public.current_user_is_admin());

create or replace function public.normalize_profile_role(requested_role text)
returns text
language sql
immutable
as $$
    select case lower(trim(coalesce(requested_role, '')))
        when 'admin' then 'admin'
        when 'administrator' then 'admin'
        when 'system administrator' then 'admin'
        when 'system_administrator' then 'admin'
        when 'system-administrator' then 'admin'
        when 'supervisor' then 'supervisor'
        when 'regional supervisor' then 'supervisor'
        when 'regional_supervisor' then 'supervisor'
        when 'regional-supervisor' then 'supervisor'
        when 'user' then 'collector'
        when 'users' then 'collector'
        when 'collector' then 'collector'
        else 'collector'
    end
$$;

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    profile_email text := lower(trim(coalesce(new.email, '')));
    profile_first_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
    profile_last_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
    requested_role text := public.normalize_profile_role(new.raw_user_meta_data ->> 'role');
begin
    profile_first_name := coalesce(
        profile_first_name,
        nullif(split_part(profile_email, '@', 1), ''),
        'Pending'
    );
    profile_last_name := coalesce(profile_last_name, 'User');

    insert into public.profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        is_active
    )
    values (
        new.id,
        profile_email,
        profile_first_name,
        profile_last_name,
        requested_role,
        'pending',
        false
    )
    on conflict (id) do update set
        email = excluded.email,
        first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
        last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
        role = case
            when public.profiles.status = 'pending' then excluded.role
            else public.profiles.role
        end,
        is_active = case
            when public.profiles.status = 'pending' then false
            else public.profiles.is_active
        end,
        updated_at = now();

    return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
    after insert on auth.users
    for each row
    execute function public.handle_new_auth_user_profile();

create or replace function public.create_pending_profile_for_auth_signup(
    new_user_id uuid,
    user_email text,
    profile_first_name text,
    profile_last_name text,
    user_role text default 'collector'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    profile_data json;
    normalized_email text := lower(trim(coalesce(user_email, '')));
    normalized_role text := public.normalize_profile_role(user_role);
begin
    if not exists (
        select 1
        from auth.users
        where id = new_user_id
          and lower(email) = normalized_email
    ) then
        raise exception 'Matching auth user was not found for this access request.';
    end if;

    insert into public.profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        is_active
    )
    values (
        new_user_id,
        normalized_email,
        coalesce(nullif(trim(profile_first_name), ''), nullif(split_part(normalized_email, '@', 1), ''), 'Pending'),
        coalesce(nullif(trim(profile_last_name), ''), 'User'),
        normalized_role,
        'pending',
        false
    )
    on conflict (id) do update set
        email = excluded.email,
        first_name = coalesce(nullif(public.profiles.first_name, ''), excluded.first_name),
        last_name = coalesce(nullif(public.profiles.last_name, ''), excluded.last_name),
        role = case
            when public.profiles.status = 'pending' then excluded.role
            else public.profiles.role
        end,
        is_active = case
            when public.profiles.status = 'pending' then false
            else public.profiles.is_active
        end,
        updated_at = now()
    returning json_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'role', role,
        'status', status
    ) into profile_data;

    return profile_data;
end;
$$;

grant execute on function public.create_pending_profile_for_auth_signup(uuid, text, text, text, text) to anon, authenticated;
