-- Secures the customer status flags (payment_done / receipt_written /
-- signature_ready / delivered) shown in the "Müşteri Kayıtları" admin panel:
--   1. Adds "who / when" tracking columns for the latest change per field.
--   2. Adds an append-only audit log table with the full change history.
--   3. Adds Row Level Security policies so that, even if someone obtained
--      the publishable/anon key and a Viewer Admin's access token and called
--      the Supabase REST API directly (bypassing our own /api endpoints,
--      which already enforce this in lib/auth.js + api/admin-customers.js),
--      the database itself still rejects the write.
--
-- If your ADMIN_CUSTOMERS_TABLE env var points somewhere other than the
-- default below, adjust the table name in this file to match before running.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: "Last changed by / at" columns, one pair per status field.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.eimza_kibris_applications_2026
  add column if not exists payment_done_changed_by text,
  add column if not exists payment_done_changed_at timestamptz,
  add column if not exists receipt_written_changed_by text,
  add column if not exists receipt_written_changed_at timestamptz,
  add column if not exists signature_ready_changed_by text,
  add column if not exists signature_ready_changed_at timestamptz,
  add column if not exists delivered_changed_by text,
  add column if not exists delivered_changed_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Full audit trail — one row per confirmed status change, keeping
-- the previous and new value so history isn't lost when a status is
-- reverted/corrected.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.customer_status_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  application_id uuid not null,
  field text not null,
  old_value boolean not null,
  new_value boolean not null,
  changed_by_user_id uuid,
  changed_by_email text,
  changed_by_role text,
  changed_at timestamptz not null default now()
);

create index if not exists customer_status_audit_log_application_idx
  on public.customer_status_audit_log (application_id);

alter table public.customer_status_audit_log enable row level security;

-- Only the Node API (service_role key) writes/reads this table.
drop policy if exists "Service role full access" on public.customer_status_audit_log;
create policy "Service role full access"
  on public.customer_status_audit_log
  for all
  to service_role
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: is_any_admin() — true for BOTH roles ('admin' and 'viewer').
-- public.is_admin() (from 02_admin_auth.sql) already means "Full Admin only"
-- and is reused below for the update policy.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_any_admin(check_user_id uuid default auth.uid())
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
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: RLS policies on the customer table for the `authenticated` role.
-- The service_role policy from 04_unify_applications.sql is untouched and
-- keeps working for our Node API. These new policies are what stand between
-- a Viewer Admin's own session token and the raw table if it's ever called
-- directly instead of through /api/admin-customers.
--
-- Note this is intentionally stricter than the app-level rule (any admin may
-- tick a status; only a Full Admin may untick one). Ticking always happens
-- through our API, which authenticates with the service_role key — never
-- directly against Supabase with a Viewer's own token — so restricting this
-- policy to Full Admin only never blocks a real feature. Expressing the
-- tick/untick nuance itself in RLS would require a BEFORE UPDATE trigger
-- comparing OLD vs NEW per column; not worth it while no client calls
-- Supabase directly for this table.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Admins can read customer applications" on public.eimza_kibris_applications_2026;
create policy "Admins can read customer applications"
  on public.eimza_kibris_applications_2026
  for select
  to authenticated
  using (public.is_any_admin());

drop policy if exists "Full admins can update customer applications" on public.eimza_kibris_applications_2026;
create policy "Full admins can update customer applications"
  on public.eimza_kibris_applications_2026
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
