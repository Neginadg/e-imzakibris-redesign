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

alter table public.contact_messages enable row level security;
alter table public.applications enable row level security;
alter table public.renewal_requests enable row level security;

-- No public insert/select policies are created intentionally.
-- Browser clients should call your /api/* endpoints only.
-- Serverless functions use SUPABASE_SERVICE_ROLE_KEY and bypass RLS safely.
