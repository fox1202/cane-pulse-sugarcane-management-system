-- ============================================================================
-- ADD PLOUGHING DATE COLUMN
-- ============================================================================
-- Adds the ploughing_date column used by the web entry form.
--
-- Run this ENTIRE script in the Supabase SQL Editor.
-- ============================================================================

begin;

alter table public.sugarcane_field_management
    add column if not exists ploughing_date date;

comment on column public.sugarcane_field_management.ploughing_date is
    'Stores the ploughing date captured before planting date in the web entry form.';

commit;

select
    'PLOUGHING DATE COLUMN ADDED' as status,
    count(*) as total_rows
from public.sugarcane_field_management;
