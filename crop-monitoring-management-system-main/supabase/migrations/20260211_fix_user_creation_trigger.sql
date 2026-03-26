-- Migration: Fix User Creation Trigger (v4)
-- Description: Fixes RLS infinite recursion and handles NULL roles.
-- Created at: 2026-02-11

-- 1. Ensure the email column exists
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
        alter table public.profiles add column email text;
    end if;
end $$;

-- 2. Helper functions to avoid RLS recursion
-- These run as the table owner (SECURITY DEFINER), bypassing RLS
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_supervisor()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'supervisor'
  );
$$;

-- 3. Create or replace the handler function
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_role text;
begin
    v_role := new.raw_user_meta_data->>'role';
    
    -- Default role to 'supervisor' if missing/null to avoid NOT NULL constraint violations
    if v_role is null then
        v_role := 'supervisor';
    end if;

    insert into public.profiles (id, first_name, last_name, email, role, status)
    values (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.email,
        v_role,
        coalesce(new.raw_user_meta_data->>'status', 'pending')
    )
    on conflict (id) do update set
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        role = excluded.role;
    return new;
end;
$$ language plpgsql security definer;

-- 4. Trigger setup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Policies
alter table public.profiles enable row level security;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles for select using (
    public.is_admin()
);

drop policy if exists "Supervisors can view all profiles" on public.profiles;
create policy "Supervisors can view all profiles" on public.profiles for select using (
    public.is_supervisor()
);

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (
    auth.uid() = id
);
