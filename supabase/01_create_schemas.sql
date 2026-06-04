-- Supabase schema migration: documents, news, pricing, customers
-- Run in Supabase SQL editor (or via migrations) to provision required tables and policies

create extension if not exists pgcrypto;

-- helper function to update updated_at timestamp
create or replace function public.trigger_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- DOCUMENTS TABLE
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  section_type text not null,
  title text not null,
  description text,
  start_date date,
  end_date date,
  file_url text,
  file_name text,
  file_size bigint,
  mime_type text,
  display_order integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.documents enable row level security;

grant usage on schema public to anon, authenticated;

-- Public can read documents
drop policy if exists "Public can select documents" on public.documents;
create policy "Public can select documents"
  on public.documents
  for select
  to anon
  using (true);

-- Authenticated users can insert (admin role will be enforced separately)
drop policy if exists "Authenticated can insert documents" on public.documents;
create policy "Authenticated can insert documents"
  on public.documents
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- Authenticated users can update/delete their own rows (later tighten to admin)
drop policy if exists "Authenticated can update documents" on public.documents;
create policy "Authenticated can update documents"
  on public.documents
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can delete documents" on public.documents;
create policy "Authenticated can delete documents"
  on public.documents
  for delete
  to authenticated
  using (auth.uid() is not null);

create index if not exists documents_section_idx on public.documents (section_type);
create index if not exists documents_order_idx on public.documents (display_order asc, created_at desc);

-- trigger to maintain updated_at
drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute procedure public.trigger_set_updated_at();

-- NEWS TABLE
create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  content text,
  image_url text,
  image_alt text,
  published_at timestamptz,
  display_date text,
  badge text,
  badge_class text,
  sort_order integer default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.news enable row level security;

drop policy if exists "Public can select news" on public.news;
create policy "Public can select news"
  on public.news
  for select
  to anon
  using (true);

drop policy if exists "Authenticated can insert news" on public.news;
create policy "Authenticated can insert news"
  on public.news
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can modify news" on public.news;
create policy "Authenticated can modify news"
  on public.news
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can delete news" on public.news;
create policy "Authenticated can delete news"
  on public.news
  for delete
  to authenticated
  using (auth.uid() is not null);

create index if not exists news_published_idx on public.news (published_at desc);
create index if not exists news_sort_idx on public.news (sort_order asc, published_at desc);

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
  before update on public.news
  for each row execute procedure public.trigger_set_updated_at();

-- PRICING TABLE
create table if not exists public.pricing (
  id uuid primary key default gen_random_uuid(),
  price_key text not null unique,
  label text,
  value numeric(12,2) not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.pricing enable row level security;

drop policy if exists "Public can select pricing" on public.pricing;
create policy "Public can select pricing"
  on public.pricing
  for select
  to anon
  using (true);

drop policy if exists "Authenticated can modify pricing" on public.pricing;
create policy "Authenticated can modify pricing"
  on public.pricing
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can update pricing" on public.pricing;
create policy "Authenticated can update pricing"
  on public.pricing
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can delete pricing" on public.pricing;
create policy "Authenticated can delete pricing"
  on public.pricing
  for delete
  to authenticated
  using (auth.uid() is not null);

create index if not exists pricing_key_idx on public.pricing (price_key);

drop trigger if exists trg_pricing_updated_at on public.pricing;
create trigger trg_pricing_updated_at
  before update on public.pricing
  for each row execute procedure public.trigger_set_updated_at();

-- CUSTOMERS TABLE
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  display_order integer default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.customers enable row level security;

drop policy if exists "Public can select customers" on public.customers;
create policy "Public can select customers"
  on public.customers
  for select
  to anon
  using (true);

drop policy if exists "Authenticated can modify customers" on public.customers;
create policy "Authenticated can modify customers"
  on public.customers
  for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can update customers" on public.customers;
create policy "Authenticated can update customers"
  on public.customers
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated can delete customers" on public.customers;
create policy "Authenticated can delete customers"
  on public.customers
  for delete
  to authenticated
  using (auth.uid() is not null);

create index if not exists customers_order_idx on public.customers (display_order asc, created_at desc);

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute procedure public.trigger_set_updated_at();

-- End of migration
