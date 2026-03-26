-- Migration: Restore Admin Access
-- Description: Manually sets a user to Admin role and Approved status.
-- Created at: 2026-02-11

-- IMPORTANT: Replace 'YOUR_EMAIL_HERE' with your actual admin email address.
-- Example: 'nelson.murerwa@example.com'

update public.profiles
set 
  role = 'admin',
  status = 'approved'
where email = 'YOUR_EMAIL_HERE'; -- <--- UPDATE THIS EMAIL!

-- Check the result
select * from public.profiles where email = 'YOUR_EMAIL_HERE';
