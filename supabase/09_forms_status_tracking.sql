-- Extends the Ödeme / Makbuz / İmza / Teslim (payment_done / receipt_written
-- / signature_ready / delivered) status workflow — already live on
-- eimza_kibris_applications_2026 (see 05, 07, 08) — to the other three
-- submission tables: renewal_requests, molohiya_application,
-- timestamp_application.
--
-- Before this migration, renewal_requests only had payment_done (from
-- 06_paypoint_payment_tracking.sql, auto-set by the PayPoint card callback
-- only) and no _changed_by/_changed_at tracking at all; molohiya_application
-- and timestamp_application were the same. api/admin-requests.js already
-- assumed receipt_written/signature_ready/delivered existed on
-- renewal_requests (statusEnabled: true there) — if that assumption was
-- wrong, the "Yenileme" tab in Customer Center would have been failing on
-- every load. Run this migration to make sure the columns genuinely exist
-- (IF NOT EXISTS everywhere, so it's harmless to run even if some already
-- do).
--
-- Run ONCE in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Status columns + per-field changed_by/changed_at tracking.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.renewal_requests
  add column if not exists receipt_written boolean not null default false,
  add column if not exists signature_ready boolean not null default false,
  add column if not exists delivered boolean not null default false,
  add column if not exists payment_done_changed_by text,
  add column if not exists payment_done_changed_at timestamptz,
  add column if not exists receipt_written_changed_by text,
  add column if not exists receipt_written_changed_at timestamptz,
  add column if not exists signature_ready_changed_by text,
  add column if not exists signature_ready_changed_at timestamptz,
  add column if not exists delivered_changed_by text,
  add column if not exists delivered_changed_at timestamptz;

alter table public.molohiya_application
  add column if not exists receipt_written boolean not null default false,
  add column if not exists signature_ready boolean not null default false,
  add column if not exists delivered boolean not null default false,
  add column if not exists payment_done_changed_by text,
  add column if not exists payment_done_changed_at timestamptz,
  add column if not exists receipt_written_changed_by text,
  add column if not exists receipt_written_changed_at timestamptz,
  add column if not exists signature_ready_changed_by text,
  add column if not exists signature_ready_changed_at timestamptz,
  add column if not exists delivered_changed_by text,
  add column if not exists delivered_changed_at timestamptz;

alter table public.timestamp_application
  add column if not exists receipt_written boolean not null default false,
  add column if not exists signature_ready boolean not null default false,
  add column if not exists delivered boolean not null default false,
  add column if not exists payment_done_changed_by text,
  add column if not exists payment_done_changed_at timestamptz,
  add column if not exists receipt_written_changed_by text,
  add column if not exists receipt_written_changed_at timestamptz,
  add column if not exists signature_ready_changed_by text,
  add column if not exists signature_ready_changed_at timestamptz,
  add column if not exists delivered_changed_by text,
  add column if not exists delivered_changed_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: RLS — mirrors 08_customer_status_security.sql's policies on
-- eimza_kibris_applications_2026, reusing the same public.is_any_admin() /
-- public.is_admin() helper functions it already created. Defense in depth:
-- the app never calls Supabase directly with a viewer's own token today (it
-- always goes through the Node API with the service_role key), but this
-- means the database itself would still reject an unauthorized write even
-- if that ever changed.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "Service role full access" on public.renewal_requests;
create policy "Service role full access"
  on public.renewal_requests
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Admins can read renewal requests" on public.renewal_requests;
create policy "Admins can read renewal requests"
  on public.renewal_requests
  for select
  to authenticated
  using (public.is_any_admin());

drop policy if exists "Full admins can update renewal requests" on public.renewal_requests;
create policy "Full admins can update renewal requests"
  on public.renewal_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Service role full access" on public.molohiya_application;
create policy "Service role full access"
  on public.molohiya_application
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Admins can read molohiya applications" on public.molohiya_application;
create policy "Admins can read molohiya applications"
  on public.molohiya_application
  for select
  to authenticated
  using (public.is_any_admin());

drop policy if exists "Full admins can update molohiya applications" on public.molohiya_application;
create policy "Full admins can update molohiya applications"
  on public.molohiya_application
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Service role full access" on public.timestamp_application;
create policy "Service role full access"
  on public.timestamp_application
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Admins can read timestamp applications" on public.timestamp_application;
create policy "Admins can read timestamp applications"
  on public.timestamp_application
  for select
  to authenticated
  using (public.is_any_admin());

drop policy if exists "Full admins can update timestamp applications" on public.timestamp_application;
create policy "Full admins can update timestamp applications"
  on public.timestamp_application
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Verify (informational).
-- ─────────────────────────────────────────────────────────────────────────────
select
  table_name,
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('renewal_requests', 'molohiya_application', 'timestamp_application')
  and column_name in (
    'payment_done', 'receipt_written', 'signature_ready', 'delivered',
    'payment_done_changed_by', 'payment_done_changed_at',
    'receipt_written_changed_by', 'receipt_written_changed_at',
    'signature_ready_changed_by', 'signature_ready_changed_at',
    'delivered_changed_by', 'delivered_changed_at'
  )
order by table_name, column_name;
