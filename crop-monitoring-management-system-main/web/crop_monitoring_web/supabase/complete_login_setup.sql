-- ============================================================================
-- COMPLETE LOGIN DETAILS TABLE SETUP WITH TEST DATA AND UTILITY FUNCTIONS
-- ============================================================================
-- Run this complete script in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists pgsodium;

-- ============================================================================
-- 1. CREATE LOGIN_DETAILS TABLE
-- ============================================================================

create table if not exists public.login_details (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    email text not null unique,
    password_hash text not null,
    first_name text not null,
    last_name text not null,
    role text not null default 'staff' check (role in ('staff', 'supervisor', 'admin', 'system_administrator')),
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'inactive')),
    last_login timestamptz,
    is_active boolean default true,
    phone text,
    department text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

create index if not exists idx_login_details_email on public.login_details(email);
create index if not exists idx_login_details_username on public.login_details(username);
create index if not exists idx_login_details_status on public.login_details(status);
create index if not exists idx_login_details_role on public.login_details(role);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.login_details enable row level security;

-- Allow anyone to insert (for registration)
create policy "Anyone can register"
    on public.login_details for insert
    with check (true);

-- Allow users to view their own details
create policy "Users can view their own login details"
    on public.login_details for select
    using (auth.uid()::text = id::text or
           (select role from auth.users where id = auth.uid()) = 'admin');

-- Allow users to update their own details
create policy "Users can update their own login details"
    on public.login_details for update
    using (auth.uid()::text = id::text)
    with check (auth.uid()::text = id::text);

-- ============================================================================
-- 4. CREATE HELPER FUNCTION - HASH PASSWORD
-- ============================================================================

create or replace function public.hash_password(password text)
returns text as $$
declare
    salt text;
    hashed text;
begin
    salt := gen_salt('bf', 10);
    hashed := crypt(password, salt);
    return hashed;
end;
$$ language plpgsql secure;

-- ============================================================================
-- 5. CREATE HELPER FUNCTION - VERIFY PASSWORD
-- ============================================================================

create or replace function public.verify_password(password text, hash text)
returns boolean as $$
begin
    return hash = crypt(password, hash);
end;
$$ language plpgsql secure;

-- ============================================================================
-- 6. CREATE HELPER FUNCTION - UPDATE LAST LOGIN
-- ============================================================================

create or replace function public.update_last_login(user_id uuid)
returns void as $$
begin
    update public.login_details
    set last_login = now()
    where id = user_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 7. CREATE HELPER FUNCTION - AUTO UPDATE TIMESTAMP
-- ============================================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger for auto-updating updated_at
drop trigger if exists update_login_details_updated_at on public.login_details;
create trigger update_login_details_updated_at
    before update on public.login_details
    for each row
    execute procedure public.update_updated_at_column();

-- ============================================================================
-- 8. INSERT TEST DATA (Optional)
-- ============================================================================

insert into public.login_details 
    (username, email, password_hash, first_name, last_name, role, status, is_active, department, phone)
values
    ('silentaganda', 'silentganda02@gmail.com', 
     public.hash_password('DemoPassword123'), 'Silent', 'Aganda', 'system_administrator', 'approved', true, 'Management', '+263-712-345-678'),
    
    ('demo_supervisor', 'supervisor@cane-pulse.co.zw',
     public.hash_password('Supervisor123'), 'John', 'Supervisor', 'supervisor', 'approved', true, 'Field Operations', '+263-712-123-456'),
    
    ('demo_staff', 'staff@cane-pulse.co.zw',
     public.hash_password('Staff123'), 'Jane', 'Staff', 'staff', 'pending', true, 'Data Collection', '+263-712-987-654')
on conflict do nothing;

-- ============================================================================
-- 9. CREATE VIEW - ACTIVE USERS ONLY
-- ============================================================================

create or replace view public.active_login_details as
select * from public.login_details
where is_active = true and status = 'approved'
order by created_at desc;

-- ============================================================================
-- 10. CREATE VIEW - USER STATISTICS
-- ============================================================================

create or replace view public.login_details_stats as
select
    count(*) as total_users,
    sum(case when status = 'approved' then 1 else 0 end) as approved_users,
    sum(case when status = 'pending' then 1 else 0 end) as pending_users,
    sum(case when status = 'rejected' then 1 else 0 end) as rejected_users,
    sum(case when is_active = true then 1 else 0 end) as active_users,
    count(distinct role) as role_types
from public.login_details;

-- ============================================================================
-- End of Script
-- ============================================================================
-- Test data credentials:
-- Username: silentaganda, Email: silentganda02@gmail.com, Password: DemoPassword123
-- Username: demo_supervisor, Email: supervisor@cane-pulse.co.zw, Password: Supervisor123
-- Username: demo_staff, Email: staff@cane-pulse.co.zw, Password: Staff123
-- ============================================================================
