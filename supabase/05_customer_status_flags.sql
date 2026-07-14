-- Adds admin-managed status flags to the e-imza Kıbrıs customer applications
-- table used by the Customer Center "eimzakibris" tab in the admin panel.
--
-- If your ADMIN_CUSTOMERS_TABLE env var points somewhere other than the
-- default below, change the table name in this file to match before running.

alter table public.eimza_kibris_applications_2026
  add column if not exists payment_done boolean not null default false,
  add column if not exists receipt_written boolean not null default false,
  add column if not exists signature_ready boolean not null default false;
