-- ============================================================================
-- PROFILE PICTURE UPLOADS
-- ============================================================================
-- Run this in the Supabase SQL Editor.
--
-- It creates:
--   1. profile picture URL columns on public.profiles and public.user_profiles
--   2. a public Supabase Storage bucket named profile-pictures
--   3. storage policies so logged-in users can upload/update/delete pictures
--      inside their own folder: profile-pictures/<user_id>/<file_name>
--
-- After uploading a file, store its public URL in public.profiles.avatar_url.
-- The web app reads that column after login and displays it in the profile card.
-- ============================================================================

-- 1. Add picture URL columns to the profile tables used by this project.
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists picture text,
  add column if not exists photo_url text,
  add column if not exists image_url text;

alter table public.user_profiles
  add column if not exists avatar_url text,
  add column if not exists picture text,
  add column if not exists photo_url text,
  add column if not exists image_url text;

create index if not exists idx_profiles_avatar_url
  on public.profiles(avatar_url)
  where avatar_url is not null;

-- 2. Create the Supabase Storage bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3. Storage policies.
-- Expected upload path:
--   <auth.uid()>/<file-name>
-- Example:
--   17ab9618-596b-4cff-a66d-51c8ea21348b/profile.png

drop policy if exists "Profile pictures are publicly readable" on storage.objects;
create policy "Profile pictures are publicly readable"
on storage.objects
for select
using (bucket_id = 'profile-pictures');

drop policy if exists "Users can upload own profile pictures" on storage.objects;
create policy "Users can upload own profile pictures"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users can update own profile pictures" on storage.objects;
create policy "Users can update own profile pictures"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-pictures'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Users can delete own profile pictures" on storage.objects;
create policy "Users can delete own profile pictures"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- 4. Let each logged-in user save their selected profile picture URL.
drop policy if exists "Users can update their own profile picture" on public.profiles;
create policy "Users can update their own profile picture"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can update their own user profile picture" on public.user_profiles;
create policy "Users can update their own user profile picture"
on public.user_profiles
for update
to authenticated
using (auth.uid() = coalesce(user_id, id))
with check (auth.uid() = coalesce(user_id, id));

grant select, update on public.profiles to authenticated;
grant select, update on public.user_profiles to authenticated;

-- 5. Optional helper: run this after uploading a picture to Storage.
-- Replace the email and URL with your real values.
--
-- update public.profiles
-- set
--   avatar_url = 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/profile-pictures/USER-ID/profile.png',
--   updated_at = now()
-- where lower(email) = lower('silentabrahamganda02@gmail.com');
--
-- update public.user_profiles
-- set
--   avatar_url = 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/profile-pictures/USER-ID/profile.png',
--   updated_at = now()
-- where lower(email) = lower('silentabrahamganda02@gmail.com');

-- 6. Verify picture columns are available.
select
  id,
  email,
  first_name,
  last_name,
  avatar_url,
  picture,
  photo_url,
  image_url
from public.profiles
order by email;
