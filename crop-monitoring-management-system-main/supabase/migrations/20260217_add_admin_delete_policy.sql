-- Migration: Add Admin Delete Policy
-- Description: Allows admins to delete profiles (required for rejecting users).
-- Created at: 2026-02-17

create policy "Admins can delete profiles"
on public.profiles
for delete
using (
  public.is_admin()
);
