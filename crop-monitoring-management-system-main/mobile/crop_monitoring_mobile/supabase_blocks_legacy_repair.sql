-- Repair legacy public.blocks schema so it matches the mobile app contract.
-- Safe to run multiple times.

begin;

alter table public.blocks
  add column if not exists section_name text,
  add column if not exists field_name text;

update public.blocks
set
  field_name = coalesce(field_name, name, block_id),
  section_name = coalesce(section_name, '')
where field_name is null
   or section_name is null;

create unique index if not exists blocks_block_id_idx
  on public.blocks (block_id);

alter table public.blocks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'blocks'
      and policyname = 'Authenticated users can read blocks'
  ) then
    create policy "Authenticated users can read blocks"
      on public.blocks
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'blocks'
      and policyname = 'Authenticated users can insert blocks'
  ) then
    create policy "Authenticated users can insert blocks"
      on public.blocks
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'blocks'
      and policyname = 'Authenticated users can update blocks'
  ) then
    create policy "Authenticated users can update blocks"
      on public.blocks
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

commit;
