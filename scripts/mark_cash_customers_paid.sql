-- Marks 9 named customers as paid by cash in eimza_kibris_applications_2026.
-- Sets payment_done = true and payment_method = 'Nakit' (cash — an
-- admin-only label; customers never see or pick this on the public forms).
--
-- Matching is by NAME (adi_soyadi), not email, which is riskier than the
-- email-based scripts used earlier — a name can be misspelled, duplicated
-- across different customers, or not match at all. Run Step 1 first and
-- check match_count for every name before running Step 2:
--   - match_count = 1  → safe, Step 2 will update exactly this customer.
--   - match_count = 0  → no row found; check for a typo/spelling variant.
--   - match_count > 1  → multiple customers share this name; Step 2 would
--                        mark ALL of them paid, which may be wrong. Resolve
--                        by adding another filter (e.g. by email or id)
--                        before running Step 2.

-- ============================================================
-- STEP 1 — PREVIEW
-- ============================================================
with cash_customers(full_name) as (
  values
    ('Mehmet Barış Keleş'),
    ('MUSTAFA ERSALICI'),
    ('YAZEN AL SAHAWNEH'),
    ('As-Can Sigorta Şti.Ltd.'),
    ('Aytunç Talu'),
    ('TANER DOĞAN'),
    ('Kemal Dirgen Tözer'),
    ('MUSTAFA ÖZKERİMLER'),
    ('Kemal Paralik Metal Isleri Ltd.')
)
select
  cc.full_name as name_to_match,
  count(a.id) as match_count,
  array_agg(a.id) filter (where a.id is not null) as matching_ids,
  array_agg(a.e_posta_adresi) filter (where a.id is not null) as matching_emails,
  bool_or(a.payment_done) as any_already_paid
from cash_customers cc
left join public.eimza_kibris_applications_2026 a
  on lower(trim(a.adi_soyadi)) = lower(trim(cc.full_name))
group by cc.full_name
order by cc.full_name;

-- ============================================================
-- STEP 2 — UPDATE (only run after confirming every match_count = 1 above,
-- or after narrowing any ambiguous name)
-- ============================================================
with cash_customers(full_name) as (
  values
    ('Mehmet Barış Keleş'),
    ('MUSTAFA ERSALICI'),
    ('YAZEN AL SAHAWNEH'),
    ('As-Can Sigorta Şti.Ltd.'),
    ('Aytunç Talu'),
    ('TANER DOĞAN'),
    ('Kemal Dirgen Tözer'),
    ('MUSTAFA ÖZKERİMLER'),
    ('Kemal Paralik Metal Isleri Ltd.')
)
update public.eimza_kibris_applications_2026 a
set
  payment_done = true,
  odeme_sekli = 'Nakit',
  payment_done_changed_by = case when a.payment_done = false then 'bulk-update:abdolbaghinegin@gmail.com (cash)' else a.payment_done_changed_by end,
  payment_done_changed_at = case when a.payment_done = false then now() else a.payment_done_changed_at end
from cash_customers cc
where lower(trim(a.adi_soyadi)) = lower(trim(cc.full_name));

-- ============================================================
-- STEP 3 — VERIFY
-- ============================================================
with cash_customers(full_name) as (
  values
    ('Mehmet Barış Keleş'),
    ('MUSTAFA ERSALICI'),
    ('YAZEN AL SAHAWNEH'),
    ('As-Can Sigorta Şti.Ltd.'),
    ('Aytunç Talu'),
    ('TANER DOĞAN'),
    ('Kemal Dirgen Tözer'),
    ('MUSTAFA ÖZKERİMLER'),
    ('Kemal Paralik Metal Isleri Ltd.')
)
select a.adi_soyadi, a.e_posta_adresi, a.payment_done, a.odeme_sekli, a.payment_done_changed_at
from public.eimza_kibris_applications_2026 a
join cash_customers cc on lower(trim(a.adi_soyadi)) = lower(trim(cc.full_name))
order by a.adi_soyadi;
