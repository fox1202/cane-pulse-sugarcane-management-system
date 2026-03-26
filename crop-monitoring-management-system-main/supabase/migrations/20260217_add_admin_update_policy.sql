-- Migration: Add Admin Update Policy
-- Description: Allows admins to update profile status and role.
-- Created at: 2026-02-17

create policy "Admins can update all profiles" 
on public.profiles 
for update 
using (
  public.is_admin()
)
with check (
  public.is_admin()
);
