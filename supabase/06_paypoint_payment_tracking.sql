-- Adds PayPoint credit-card payment tracking to all four submission tables.
-- eimza_kibris_applications_2026 already has payment_done (from
-- 05_customer_status_flags.sql) — this adds the same to the other three,
-- plus a transaction-id/response column on all four so the callback/status
-- check can find the right row and admins can see what PayPoint returned.

alter table public.eimza_kibris_applications_2026
  add column if not exists merchant_trn_id bigint,
  add column if not exists paypoint_response jsonb;

alter table public.renewal_requests
  add column if not exists payment_done boolean not null default false,
  add column if not exists merchant_trn_id bigint,
  add column if not exists paypoint_response jsonb;

alter table public.molohiya_application
  add column if not exists payment_done boolean not null default false,
  add column if not exists merchant_trn_id bigint,
  add column if not exists paypoint_response jsonb;

alter table public.timestamp_application
  add column if not exists payment_done boolean not null default false,
  add column if not exists merchant_trn_id bigint,
  add column if not exists paypoint_response jsonb;

create index if not exists eimza_apps_2026_merchant_trn_id_idx
  on public.eimza_kibris_applications_2026 (merchant_trn_id);
create index if not exists renewal_requests_merchant_trn_id_idx
  on public.renewal_requests (merchant_trn_id);
create index if not exists molohiya_application_merchant_trn_id_idx
  on public.molohiya_application (merchant_trn_id);
create index if not exists timestamp_application_merchant_trn_id_idx
  on public.timestamp_application (merchant_trn_id);
