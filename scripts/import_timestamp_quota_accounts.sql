-- Bulk-import B2B/reseller Zaman Damgası (timestamp) quota accounts into
-- public.timestamp_application, for the "Zaman Damgası" tab in the admin
-- Customer Center (api/admin-requests.js -> TABLE_CONFIGS.timestamp).
--
-- timestamp_application has no dedicated columns for Username / Requests /
-- Limit / KALAN, so all four are kept in the payload jsonb column
-- (payload.username / requests / limit / kalan) alongside a
-- source: "bulk-import-quota-list" marker. plan_label gets a human-readable
-- "Limit: N" summary so it's visible in the admin list at a glance.
--
-- application_type is set to 'Kurumsal' for all rows (these are all
-- companies/institutions). payment_method and total_text are left NULL —
-- this is a quota/reseller list, not a priced retail order.
--
-- Safe to re-run: rows are only inserted if no existing timestamp_application
-- row already has that email (case-insensitive), so running this twice
-- won't create duplicates.
--
-- ⚠ ALEMDAR_TS (last row) is INCOMPLETE — the source image only showed two
-- numbers (2523 and 577) for what should be three columns (Requests/Limit/
-- KALAN). It's included below with requests=2523, limit=577, kalan=NULL as
-- a placeholder — confirm the real numbers and fix that row (or delete it
-- and re-add it) before/after running this.

insert into public.timestamp_application
  (form_type, full_name, email, phone, application_type, plan_label, total_text, payment_method, source_page, payload)
select v.form_type, v.full_name, v.email, v.phone, v.application_type, v.plan_label, v.total_text, v.payment_method, v.source_page, v.payload
from (
  values
    ('timestamp', 'Noveltech Solutions Ltd.', 'info@noveltechsolutions.net', null::text, 'Kurumsal', 'Limit: 1.000', null::text, null::text, 'admin-import', '{"username":"NOVELTECH_TS","requests":381,"limit":1000,"kalan":619,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'KIBRIS MOBİLE TELEKOMÜNİKASYON LTD.', 'baris.kizildere@kktcell.com', null, 'Kurumsal', 'Limit: 400.100', null, null, 'admin-import', '{"username":"KKTCELL_TS","requests":383242,"limit":400100,"kalan":16858,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'FLYTOM NETWORKS LTD.', 'hello@flynet.net', null, 'Kurumsal', 'Limit: 4.100', null, null, 'admin-import', '{"username":"FLYTOM_TS","requests":3268,"limit":4100,"kalan":832,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Vodafone Mobile Operations Ltd.', 'aytac.tanriverdi@vodafone.com', null, 'Kurumsal', 'Limit: 430.100', null, null, 'admin-import', '{"username":"VODAFONE_TS","requests":336181,"limit":430100,"kalan":93919,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Royalnet Networks ltd', 'selcukmora@gmail.com', null, 'Kurumsal', 'Limit: 1.100', null, null, 'admin-import', '{"username":"ROYALNET_TS","requests":532,"limit":1100,"kalan":568,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Digital Dönüşüm Teknoloji Hizmetleri', 'esref.atak@ddtech.com.tr', null, 'Kurumsal', 'Limit: 1.200', null, null, 'admin-import', '{"username":"DDTECH_TS","requests":462,"limit":1200,"kalan":738,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Cypking Network', 'ahmet@cypking.com', null, 'Kurumsal', 'Limit: 10.100', null, null, 'admin-import', '{"username":"CYPKING_TS","requests":4532,"limit":10100,"kalan":5568,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'BİLGİ TEKNOLOJİLERİ VE HABERLEŞME KURUMU', 'mehmet.cezar@bthk.org', null, 'Kurumsal', 'Limit: 100', null, null, 'admin-import', '{"username":"BTHK_TS","requests":5,"limit":100,"kalan":95,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'HAYPEM İLETİŞİM LTD', 'haypem@hotmail.com', null, 'Kurumsal', 'Limit: 30.100', null, null, 'admin-import', '{"username":"HAYPEMTS","requests":27134,"limit":30100,"kalan":2966,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'COMTECH TİCARET LTD', 'sdeniz@kktc.net', null, 'Kurumsal', 'Limit: 3.100', null, null, 'admin-import', '{"username":"COMTECH_TS","requests":2528,"limit":3100,"kalan":572,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Cyprus Sky Network Global Ltd', 'metin.ozturk@neareasttechnology.com', null, 'Kurumsal', 'Limit: 7.100', null, null, 'admin-import', '{"username":"CYPRUSSKY_TS","requests":3093,"limit":7100,"kalan":4007,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'FixNet Broadband Ltd.', 'olgu@fixnetbroadband.com', null, 'Kurumsal', 'Limit: 5.100', null, null, 'admin-import', '{"username":"FIXNET_TS","requests":4465,"limit":5100,"kalan":635,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Macrogate Net Solutions', 'sertug@macrogate.net', null, 'Kurumsal', 'Limit: 1.100', null, null, 'admin-import', '{"username":"MACROGATE_TS","requests":30,"limit":1100,"kalan":1070,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'ENSON NET LTD', 'ensonnet@gmail.com', null, 'Kurumsal', 'Limit: 6.100', null, null, 'admin-import', '{"username":"ENSONNET_TS","requests":1815,"limit":6100,"kalan":4285,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Hypernet Internet Ltd', 'efe_nuri@hotmail.com', null, 'Kurumsal', 'Limit: 2.100', null, null, 'admin-import', '{"username":"HYPERNET_TS","requests":2100,"limit":2100,"kalan":0,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Broadmax Iletisim Ltd', 'yalman@broadmax.net', null, 'Kurumsal', 'Limit: 5.100', null, null, 'admin-import', '{"username":"BROADMAX_TS","requests":2799,"limit":5100,"kalan":2301,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Towernet iletisim ltd', 'huseyin@towernet.net', null, 'Kurumsal', 'Limit: 10.100', null, null, 'admin-import', '{"username":"TOWERNET_TS","requests":2381,"limit":10100,"kalan":7719,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Analiz Computer Cesim Ltd.', 'mehmet.civisilli@analiz.net', null, 'Kurumsal', 'Limit: 3.100', null, null, 'admin-import', '{"username":"ANALIZCES_TS","requests":2116,"limit":3100,"kalan":984,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'NETONLINE', 'vural.mut@nethouse.net', null, 'Kurumsal', 'Limit: 77.100', null, null, 'admin-import', '{"username":"NETONLINE_TS","requests":57916,"limit":77100,"kalan":19184,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Goldsurf Internet Limited', 'samet@gold-surf.com', null, 'Kurumsal', 'Limit: 7.100', null, null, 'admin-import', '{"username":"GOLDSURF_TS","requests":6100,"limit":7100,"kalan":1000,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'HIGH LEVEL SOFTWARE LTD', 'info@highlevelsoftware.com', null, 'Kurumsal', 'Limit: 2.100', null, null, 'admin-import', '{"username":"HIGHLEVEL_TS","requests":1341,"limit":2100,"kalan":759,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Bassam and Wael internet ltd', 'admin@jokerisp.com', null, 'Kurumsal', 'Limit: 2.100', null, null, 'admin-import', '{"username":"BASSAMANDWAEL_TS","requests":1292,"limit":2100,"kalan":808,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Longnet İletişim Ltd.', 'longson_eu@hotmail.com', null, 'Kurumsal', 'Limit: 2.100', null, null, 'admin-import', '{"username":"LONGNET_TS","requests":1958,"limit":2100,"kalan":142,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Elworks Technologies LTD', 'info@veezynet.com', null, 'Kurumsal', 'Limit: 1.100', null, null, 'admin-import', '{"username":"ELWORKS_TS","requests":0,"limit":1100,"kalan":1100,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'FİBERNET TEKNOLOJİ LTD', 'mehmetuzunca85@gmail.com', null, 'Kurumsal', 'Limit: 2.100', null, null, 'admin-import', '{"username":"FIBERNET_TS","requests":1294,"limit":2100,"kalan":806,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Arinet Security and Internet Consultancy LTD', 'oyildirim@extendbroadband.com', null, 'Kurumsal', 'Limit: 10.100', null, null, 'admin-import', '{"username":"ARINET_TS","requests":2574,"limit":10100,"kalan":7526,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'CYBERSPACE SOLUTIONS LTD.', 'info@cyberkibris.com', null, 'Kurumsal', 'Limit: 1.000', null, null, 'admin-import', '{"username":"CYBERSPACE_TS","requests":776,"limit":1000,"kalan":224,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'PAPERZERO', 'ezgi.ozdemir@paperzero.com', null, 'Kurumsal', 'Limit: 100', null, null, 'admin-import', '{"username":"PAPERZERO_TS","requests":0,"limit":100,"kalan":100,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Digital Dönüşüm Teknoloji Hizmetleri', 'kursat.demirci@didteknoloji.com.tr', null, 'Kurumsal', 'Limit: 2.000', null, null, 'admin-import', '{"username":"20260127","requests":100,"limit":2000,"kalan":1900,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Xrealnet internet ltd', 'xrealinternet@gmail.com', null, 'Kurumsal', 'Limit: 26.100', null, null, 'admin-import', '{"username":"XREALNET-TS","requests":23680,"limit":26100,"kalan":2420,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'FREENET İLETİŞİM LTD', 'halilbetmez@gmail.com', null, 'Kurumsal', 'Limit: 10.100', null, null, 'admin-import', '{"username":"FREENET_TS","requests":17,"limit":10100,"kalan":10083,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Surfacenet limited', 'info@surfacenetcy.com', null, 'Kurumsal', 'Limit: 5.100', null, null, 'admin-import', '{"username":"SURFACENET_TS","requests":1967,"limit":5100,"kalan":3133,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Primenet İnternet Servis Sağlayıcılığı LTD.', 'serhat@primenet.com.tr', null, 'Kurumsal', 'Limit: 6.100', null, null, 'admin-import', '{"username":"PRIMENET_TS","requests":4543,"limit":6100,"kalan":1557,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'MULTİMAX İLETİŞİM LTD.', 'fitnet.ozdirenli@gmail.com', null, 'Kurumsal', 'Limit: 100', null, null, 'admin-import', '{"username":"MULTIMAX_TS","requests":0,"limit":100,"kalan":100,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'AIRMAX COMMUNICATION LTD', 'adilmalik77@gmail.com', null, 'Kurumsal', 'Limit: 2.100', null, null, 'admin-import', '{"username":"AIRMAX_TS","requests":1656,"limit":2100,"kalan":444,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'SKYWORLD NETWORKS LTD.', 'mehmetbeyzade@gmail.com', null, 'Kurumsal', 'Limit: 1.100', null, null, 'admin-import', '{"username":"SKYWORLD_TS","requests":0,"limit":1100,"kalan":1100,"source":"bulk-import-quota-list"}'::jsonb),
    ('timestamp', 'Mahir and Sons LTD', 'malpturk@kibris.net', null, 'Kurumsal', 'Limit: 3.100', null, null, 'admin-import', '{"username":"MAHIR_TS","requests":2094,"limit":3100,"kalan":1006,"source":"bulk-import-quota-list"}'::jsonb),
    -- ⚠ INCOMPLETE ROW — source image cut off KALAN (or Limit). requests=2523,
    -- limit guessed as 577 (unverified). Fix before/after running.
    ('timestamp', 'ALEMDAR', 'alemdar_488@hotmail.com', null, 'Kurumsal', 'Limit: 577 (UNVERIFIED)', null, null, 'admin-import', '{"username":"ALEMDAR_TS","requests":2523,"limit":577,"kalan":null,"source":"bulk-import-quota-list","needs_review":true}'::jsonb)
) as v(form_type, full_name, email, phone, application_type, plan_label, total_text, payment_method, source_page, payload)
where not exists (
  select 1 from public.timestamp_application t
  where lower(trim(t.email)) = lower(trim(v.email))
);

-- Verify: should return 38 rows tagged with this import (re-running the
-- script after a partial run will show fewer new inserts, since duplicates
-- by email are skipped).
select
  payload->>'username' as username,
  full_name,
  email,
  plan_label,
  payload->>'needs_review' as needs_review
from public.timestamp_application
where payload->>'source' = 'bulk-import-quota-list'
order by full_name;
