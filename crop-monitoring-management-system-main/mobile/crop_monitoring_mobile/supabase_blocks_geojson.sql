create table if not exists public.blocks (
  id text primary key,
  block_id text not null unique,
  section_name text,
  name text,
  field_name text,
  geom jsonb
);

alter table public.blocks
  add column if not exists section_name text,
  add column if not exists name text,
  add column if not exists field_name text,
  add column if not exists geom jsonb;

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
