-- Remove sugarcane_fields dependency from fertilizer/herbicide application saves.
--
-- The web observation form no longer writes to public.sugarcane_fields.
-- These two application tables must therefore accept rows by Trial/field data
-- without requiring a matching parent row in public.sugarcane_fields.
--
-- Run this in the Supabase SQL Editor.

begin;

alter table if exists public.sugarcane_fertilizer_applications
    drop constraint if exists sugarcane_fertilizer_applications_trial_fkey;

alter table if exists public.sugarcane_herbicide_applications
    drop constraint if exists sugarcane_herbicide_applications_trial_fkey;

do $$
declare
    trigger_row record;
begin
    for trigger_row in
        select
            cls.relname as table_name,
            tg.tgname as trigger_name
        from pg_trigger tg
        join pg_class cls on cls.oid = tg.tgrelid
        join pg_namespace ns on ns.oid = cls.relnamespace
        join pg_proc proc on proc.oid = tg.tgfoid
        where ns.nspname = 'public'
          and cls.relname in (
              'sugarcane_fertilizer_applications',
              'sugarcane_herbicide_applications'
          )
          and not tg.tgisinternal
          and (
              pg_get_triggerdef(tg.oid) ilike '%sugarcane_fields%'
              or pg_get_functiondef(proc.oid) ilike '%sugarcane_fields%'
              or pg_get_functiondef(proc.oid) ilike '%Trial%does not exist%'
              or pg_get_functiondef(proc.oid) ilike '%trial%does not exist%'
          )
    loop
        execute format(
            'drop trigger if exists %I on public.%I',
            trigger_row.trigger_name,
            trigger_row.table_name
        );
    end loop;
end $$;

notify pgrst, 'reload schema';

commit;
