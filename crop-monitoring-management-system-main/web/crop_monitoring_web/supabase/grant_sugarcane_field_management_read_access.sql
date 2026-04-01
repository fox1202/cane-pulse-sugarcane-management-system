-- Allow the web app to read sugarcane_field_management
grant usage on schema public to anon, authenticated;

grant select on table public.sugarcane_field_management to anon, authenticated;

-- If inserts use an identity/serial id, authenticated users may also need sequence access later.
grant usage, select on all sequences in schema public to authenticated;
