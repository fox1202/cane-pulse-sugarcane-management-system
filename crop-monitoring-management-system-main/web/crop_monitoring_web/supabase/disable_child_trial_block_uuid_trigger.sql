-- Disable the child-table trigger that treats text block_id values as UUIDs.
--
-- The web form stores block labels such as "Impala" in block_id. The live
-- trigger trg_set_trial_block / set_child_trial_and_block() attempts to parse
-- that value as uuid on child tables, causing:
--   invalid input syntax for type uuid: "Impala"
--
-- This script keeps block_id in the tables and removes only that problematic
-- trigger from the split child tables. It does not remove updated_at triggers.

begin;

drop trigger if exists trg_set_trial_block on public.sugarcane_soil_properties;
drop trigger if exists trg_set_trial_block on public.sugarcane_crop_information;
drop trigger if exists trg_set_trial_block on public.sugarcane_important_dates;
drop trigger if exists trg_set_trial_block on public.sugarcane_residue_management;
drop trigger if exists trg_set_trial_block on public.sugarcane_crop_protection;
drop trigger if exists trg_set_trial_block on public.sugarcane_foliar_sampling;
drop trigger if exists trg_set_trial_block on public.sugarcane_fertilizer_applications;
drop trigger if exists trg_set_trial_block on public.sugarcane_herbicide_applications;

commit;
