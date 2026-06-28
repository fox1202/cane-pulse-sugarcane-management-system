-- Fix duplicate primary-key insert errors on public.sugarcane_fields after
-- rows were imported with explicit id values.
--
-- Error this addresses:
--   duplicate key value violates unique constraint "sugarcane_fields_pkey"
--
-- Run this in the Supabase SQL editor. It moves the id sequence to the
-- current maximum id so the next inserted duplicate field row receives
-- a fresh primary key.

do $$
declare
    sequence_name text;
begin
    select pg_get_serial_sequence('public.sugarcane_fields', 'id')
    into sequence_name;

    if sequence_name is null then
        raise notice 'No serial/identity sequence found for public.sugarcane_fields.id.';
        return;
    end if;

    execute format(
        'select setval(%L, coalesce((select max(id) from public.sugarcane_fields), 0) + 1, false)',
        sequence_name
    );
end $$;
