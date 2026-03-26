-- Create login_details table to store user credentials and authentication info
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

create table if not exists public.login_details (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    email text not null unique,
    password_hash text not null,
    first_name text not null,
    last_name text not null,
    role text not null default 'staff',
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    last_login timestamptz,
    is_active boolean default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create index on email for faster lookups
create index if not exists idx_login_details_email on public.login_details(email);

-- Create index on username for faster lookups
create index if not exists idx_login_details_username on public.login_details(username);

-- Enable RLS (Row Level Security) for security
alter table public.login_details enable row level security;

-- Allow users to view their own login details
create policy "Users can view their own login details"
    on public.login_details for select
    using (auth.uid()::text = id::text);

-- Allow users to update their own login details
create policy "Users can update their own login details"
    on public.login_details for update
    using (auth.uid()::text = id::text);
