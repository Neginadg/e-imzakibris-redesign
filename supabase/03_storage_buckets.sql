-- Supabase Storage buckets and object policies
-- Uses the existing bucket naming convention already present in the website URLs.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values
  ('Public Bucket', 'Public Bucket', true),
  ('admin-assets', 'admin-assets', false)
on conflict (id) do update
set public = excluded.public;

-- Public Bucket: readable by everyone, writable only by admins
drop policy if exists "Public read public bucket objects" on storage.objects;
create policy "Public read public bucket objects"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'Public Bucket');

drop policy if exists "Admins insert public bucket objects" on storage.objects;
create policy "Admins insert public bucket objects"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'Public Bucket' and public.is_admin());

drop policy if exists "Admins update public bucket objects" on storage.objects;
create policy "Admins update public bucket objects"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'Public Bucket' and public.is_admin())
  with check (bucket_id = 'Public Bucket' and public.is_admin());

drop policy if exists "Admins delete public bucket objects" on storage.objects;
create policy "Admins delete public bucket objects"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'Public Bucket' and public.is_admin());

-- admin-assets: private bucket for admin previews/uploads if needed
drop policy if exists "Admins read admin assets" on storage.objects;
create policy "Admins read admin assets"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'admin-assets' and public.is_admin());

drop policy if exists "Admins insert admin assets" on storage.objects;
create policy "Admins insert admin assets"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'admin-assets' and public.is_admin());

drop policy if exists "Admins update admin assets" on storage.objects;
create policy "Admins update admin assets"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'admin-assets' and public.is_admin())
  with check (bucket_id = 'admin-assets' and public.is_admin());

drop policy if exists "Admins delete admin assets" on storage.objects;
create policy "Admins delete admin assets"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'admin-assets' and public.is_admin());
