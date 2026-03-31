-- Remove the legacy observation_entry_form table now that the web app uses
-- public.sugarcane_monitoring as the single source of truth.

drop trigger if exists trg_observation_entry_form_updated_at on public.observation_entry_form;
drop function if exists public.set_observation_entry_form_updated_at();
drop table if exists public.observation_entry_form;
