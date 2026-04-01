-- Undo row level security on sugarcane_field_management
alter table public.sugarcane_field_management no force row level security;
alter table public.sugarcane_field_management disable row level security;
