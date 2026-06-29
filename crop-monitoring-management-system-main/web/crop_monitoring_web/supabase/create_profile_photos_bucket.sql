-- ============================================================================
-- CREATE PROFILE PHOTOS STORAGE BUCKET
-- ============================================================================
-- Run this in Supabase SQL Editor.
--
-- Bucket name:
--   profile-photos
--
-- Upload path format:
--   profile-photos/<USER_ID>/<FILE_NAME>
--
-- Example:
--   profile-photos/17ab9618-596b-4cff-a66d-51c8ea21348b/profile.png
-- ============================================================================

-- Create a public bucket for profile photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Allow everyone to view profile photos.
drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
on storage.objects
for select
using (bucket_id = 'profile-photos');

-- Allow logged-in users to upload only into their own folder.
drop policy if exists "Users can upload own profile photos" on storage.objects;
create policy "Users can upload own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Allow logged-in users to replace/update only their own profile photos.
drop policy if exists "Users can update own profile photos" on storage.objects;
create policy "Users can update own profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Allow logged-in users to delete only their own profile photos.
drop policy if exists "Users can delete own profile photos" on storage.objects;
create policy "Users can delete own profile photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Confirm the bucket exists.
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'profile-photos';
