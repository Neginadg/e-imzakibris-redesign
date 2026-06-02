-- Run this in Supabase SQL editor.
-- Tables for website form submissions.

create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text not null,
  subject text,
  message text not null,
  source_page text,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  identity_number text,
  pin text,
  puk text,
  payment_method text,
  source_page text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.renewal_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  identity_number text,
  payment_method text,
  source_page text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.molohiya_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  identity_number text,
  payment_method text,
  source_page text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.timestamp_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  payment_method text,
  application_type text,
  source_page text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.timestamp_application (
  id uuid primary key default gen_random_uuid(),
  form_type text not null default 'timestamp',
  full_name text not null,
  email text not null,
  phone text,
  application_type text,
  plan_label text,
  total_text text,
  payment_method text,
  source_page text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.molohiya_application (
  id uuid primary key default gen_random_uuid(),
  form_type text not null default 'molohiya',
  full_name text not null,
  email text not null,
  phone text,
  identity_number text,
  plan_label text,
  total_text text,
  payment_method text,
  source_page text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- contact_messages: Disable RLS for public contact form submissions
alter table public.contact_messages disable row level security;

-- Keep RLS enabled for app-specific tables that need protection
alter table public.applications enable row level security;
alter table public.renewal_requests enable row level security;
alter table public.molohiya_requests enable row level security;
alter table public.timestamp_requests enable row level security;
alter table public.timestamp_application enable row level security;
alter table public.molohiya_application enable row level security;

-- Public inserts (via RLS-disabled table) fallback if serverless endpoint fails.
-- Serverless functions use SUPABASE_SERVICE_ROLE_KEY when configured.

create table if not exists public.eimza_kibris_applications_2026 (
  id uuid primary key default gen_random_uuid(),
  source_file_name text not null,
  source_row_number integer not null,
  kayit_numarasi text,
  kayit_tarihi text,
  adi_soyadi text,
  uyrugu text,
  kimlik_pasaport_numarasi text,
  dogum_tarihi text,
  dogum_yeri text,
  calistigi_sirket text,
  gorevi text,
  e_posta_adresi text,
  e_posta_adresini_sertifikada_goster text,
  adres text,
  bolge text,
  telefon_numarasi text,
  cep_telefon_numarasi text,
  faks_numarasi text,
  fatura_adresi_ayniidir text,
  calistigi_kurum text,
  calistigi_kurum_adresi text,
  calistigi_kurum_bolgesi text,
  vergi_numarasi text,
  vergi_dairesi text,
  fatura_turu text,
  sertifika_paketi text,
  akilli_cubuk text,
  uzak_baglantili_kurulum text,
  sertifika_public_directory_consent text,
  odeme_sekli text,
  sertifika_ucreti_tl text,
  akilli_cubuk_ucreti_tl text,
  uzaktan_kurulum_ucreti_tl text,
  kdv_dahil_toplam_tutar_tl text,
  pin text,
  puk text,
  durum text,
  payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (source_file_name, source_row_number)
);

create index if not exists eimza_kibris_applications_2026_kayit_numarasi_idx
  on public.eimza_kibris_applications_2026 (kayit_numarasi);

create index if not exists eimza_kibris_applications_2026_email_idx
  on public.eimza_kibris_applications_2026 (e_posta_adresi);

create index if not exists eimza_kibris_applications_2026_identity_idx
  on public.eimza_kibris_applications_2026 (kimlik_pasaport_numarasi);

alter table public.eimza_kibris_applications_2026 enable row level security;
