-- Add sugarcane_field_management to Supabase Realtime if it is not already published.
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'sugarcane_field_management'
    ) then
        execute 'alter publication supabase_realtime add table public.sugarcane_field_management';
    end if;
end
$$;
