-- Allow the observation form to save into the section tables.
--
-- Run this in the Supabase SQL Editor after the section tables exist.
-- The web app reads dashboard data from public.sugarcane_trial_dashboard_flat,
-- but saves submitted form sections into the tables listed below.

begin;

do $$
declare
    table_name text;
    qualified_table text;
begin
    foreach table_name in array array[
        'Contact Person Information',
        'Crop Protection',
        'Crop information',
        'Foliar sampling',
        'Important Dates',
        'Residual Management',
        'Soil_properties',
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications'
    ]
    loop
        qualified_table := format('public.%I', table_name);

        execute format('grant select, insert, update on table %s to authenticated', qualified_table);
        execute format('alter table %s enable row level security', qualified_table);

        execute format(
            'drop policy if exists "Cane Pulse can read %s" on %s',
            table_name,
            qualified_table
        );
        execute format(
            'create policy "Cane Pulse can read %s" on %s for select to authenticated using (true)',
            table_name,
            qualified_table
        );

        execute format(
            'drop policy if exists "Cane Pulse can insert %s" on %s',
            table_name,
            qualified_table
        );
        execute format(
            'create policy "Cane Pulse can insert %s" on %s for insert to authenticated with check (true)',
            table_name,
            qualified_table
        );

        execute format(
            'drop policy if exists "Cane Pulse can update %s" on %s',
            table_name,
            qualified_table
        );
        execute format(
            'create policy "Cane Pulse can update %s" on %s for update to authenticated using (true) with check (true)',
            table_name,
            qualified_table
        );
    end loop;
end $$;

grant usage on schema public to authenticated;

notify pgrst, 'reload schema';

commit;
