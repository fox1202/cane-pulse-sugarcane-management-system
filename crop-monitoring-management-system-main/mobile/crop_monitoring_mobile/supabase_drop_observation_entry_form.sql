begin;

drop table if exists public.observation_entry_form cascade;
drop function if exists public.set_observation_entry_form_updated_at() cascade;

commit;
