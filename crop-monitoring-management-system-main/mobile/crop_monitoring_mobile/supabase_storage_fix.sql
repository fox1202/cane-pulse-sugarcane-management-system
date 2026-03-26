-- 1. Create the bucket 'crop-monitoring-photos' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('crop-monitoring-photos', 'crop-monitoring-photos', true)
on conflict (id) do nothing;

-- 2. Drop existing policies to avoid conflicts (optional but recommended for clean slate)
drop policy if exists "Allow authenticated uploads" on storage.objects;
drop policy if exists "Allow public viewing" on storage.objects;
drop policy if exists "Allow users to update own images" on storage.objects;
drop policy if exists "Allow users to delete own images" on storage.objects;

-- 3. Policy to allow authenticated users to upload images
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'crop-monitoring-photos' );

-- 4. Policy to allow public viewing of images
create policy "Allow public viewing"
on storage.objects for select
to public
using ( bucket_id = 'crop-monitoring-photos' );

-- 5. (Optional) Policy to allow users to update/delete their own images
create policy "Allow users to update own images"
on storage.objects for update
to authenticated
using ( bucket_id = 'crop-monitoring-photos' and auth.uid() = owner )
with check ( bucket_id = 'crop-monitoring-photos' and auth.uid() = owner );

create policy "Allow users to delete own images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'crop-monitoring-photos' and auth.uid() = owner );
