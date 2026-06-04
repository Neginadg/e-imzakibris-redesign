-- Supabase admin access control
-- Run after auth is enabled and users exist in auth.users

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'admin',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.admins enable row level security;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = check_user_id
      and a.role = 'admin'
  );
$$;

grant usage on schema public to anon, authenticated;

drop policy if exists "Admins can read admins table" on public.admins;
create policy "Admins can read admins table"
  on public.admins
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert admins table" on public.admins;
create policy "Admins can insert admins table"
  on public.admins
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update admins table" on public.admins;
create policy "Admins can update admins table"
  on public.admins
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete admins table" on public.admins;
create policy "Admins can delete admins table"
  on public.admins
  for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists trg_admins_updated_at on public.admins;
create trigger trg_admins_updated_at
  before update on public.admins
  for each row execute procedure public.trigger_set_updated_at();

-- Tighten core tables to admins only for writes
drop policy if exists "Authenticated can insert documents" on public.documents;
create policy "Admins can insert documents"
  on public.documents
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Authenticated can update documents" on public.documents;
create policy "Admins can update documents"
  on public.documents
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can delete documents" on public.documents;
create policy "Admins can delete documents"
  on public.documents
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Authenticated can insert news" on public.news;
create policy "Admins can insert news"
  on public.news
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Authenticated can modify news" on public.news;
create policy "Admins can update news"
  on public.news
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can delete news" on public.news;
create policy "Admins can delete news"
  on public.news
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Authenticated can modify pricing" on public.pricing;
create policy "Admins can insert pricing"
  on public.pricing
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Authenticated can update pricing" on public.pricing;
create policy "Admins can update pricing"
  on public.pricing
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can delete pricing" on public.pricing;
create policy "Admins can delete pricing"
  on public.pricing
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Authenticated can modify customers" on public.customers;
create policy "Admins can insert customers"
  on public.customers
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Authenticated can update customers" on public.customers;
create policy "Admins can update customers"
  on public.customers
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can delete customers" on public.customers;
create policy "Admins can delete customers"
  on public.customers
  for delete
  to authenticated
  using (public.is_admin());

-- Seed the first admin manually by inserting your auth user id here after signup:
-- insert into public.admins (user_id, email, role)
-- values ('YOUR_AUTH_USER_UUID', 'admin@example.com', 'admin');
