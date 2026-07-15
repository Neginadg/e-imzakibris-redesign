-- Adds the "Teslim Edildi" (Delivered) status flag to the e-imza Kıbrıs
-- customer applications table used by the Customer Center "eimzakibris" tab
-- in the admin panel.
--
-- If your ADMIN_CUSTOMERS_TABLE env var points somewhere other than the
-- default below, change the table name in this file to match before running.

alter table public.eimza_kibris_applications_2026
  add column if not exists delivered boolean not null default false;
