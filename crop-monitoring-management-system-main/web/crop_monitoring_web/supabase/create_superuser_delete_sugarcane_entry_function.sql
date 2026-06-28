-- ============================================================================
-- SUPERUSER DELETE FOR SUGARCANE ENTRY RECORDS
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--
-- The web app calls this RPC before falling back to direct table deletes. The
-- function removes the selected entry from the sugarcane split tables,
-- application tables, normalized observation tables, observations, and
-- sugarcane_field_management.
-- ============================================================================

create or replace function public.delete_sugarcane_entry_records(
    p_observation_ids text[] default array[]::text[],
    p_row_ids text[] default array[]::text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    target_table text;
    deleted_count integer := 0;
    affected_count integer := 0;
    cleaned_observation_ids text[] := array(
        select distinct nullif(trim(value), '')
        from unnest(coalesce(p_observation_ids, array[]::text[])) as value
        where nullif(trim(value), '') is not null
    );
    cleaned_row_ids text[] := array(
        select distinct nullif(trim(value), '')
        from unnest(coalesce(p_row_ids, array[]::text[])) as value
        where nullif(trim(value), '') is not null
    );
begin
    if not (
        lower(coalesce(auth.email(), '')) in (
            'silentabrahamganda02@gmail.com',
            'pmafuratidze@science.uz.ac.zw'
        )
        or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and p.status = 'approved'
              and coalesce(p.is_active, true) = true
              and p.role = 'admin'
        )
    ) then
        raise exception 'Only superusers can delete sugarcane entry records.';
    end if;

    foreach target_table in array array[
        'sugarcane_fertilizer_applications',
        'sugarcane_herbicide_applications',
        'sugarcane_foliar_sampling',
        'sugarcane_crop_protection',
        'sugarcane_residue_management',
        'sugarcane_important_dates',
        'sugarcane_crop_information',
        'sugarcane_soil_properties',
        'sugarcane_fields',
        'observation_images',
        'images',
        'residual_management',
        'harvest',
        'harvest_information',
        'control_methods',
        'crop_protection',
        'nutrient_management',
        'irrigation_management',
        'soil_characteristics',
        'crop_monitoring',
        'crop_information'
    ]
    loop
        if to_regclass('public.' || target_table) is not null then
            begin
                execute format('delete from public.%I where observation_id = any($1)', target_table)
                using cleaned_observation_ids;
                get diagnostics affected_count = row_count;
                deleted_count := deleted_count + affected_count;
            exception
                when undefined_column then
                    null;
            end;

            begin
                execute format('delete from public.%I where id::text = any($1)', target_table)
                using cleaned_row_ids;
                get diagnostics affected_count = row_count;
                deleted_count := deleted_count + affected_count;
            exception
                when undefined_column then
                    null;
            end;
        end if;
    end loop;

    if to_regclass('public.sugarcane_field_management') is not null then
        begin
            delete from public.sugarcane_field_management
            where observation_id = any(cleaned_observation_ids);
            get diagnostics affected_count = row_count;
            deleted_count := deleted_count + affected_count;
        exception
            when undefined_column then
                null;
        end;

        delete from public.sugarcane_field_management
        where id::text = any(cleaned_row_ids);
        get diagnostics affected_count = row_count;
        deleted_count := deleted_count + affected_count;
    end if;

    if to_regclass('public.observations') is not null then
        delete from public.observations
        where id::text = any(cleaned_observation_ids)
           or id::text = any(cleaned_row_ids);
        get diagnostics affected_count = row_count;
        deleted_count := deleted_count + affected_count;
    end if;

    return deleted_count;
end;
$$;

revoke all on function public.delete_sugarcane_entry_records(text[], text[]) from public;
grant execute on function public.delete_sugarcane_entry_records(text[], text[]) to authenticated;

notify pgrst, 'reload schema';

