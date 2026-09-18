-- Bulk-mark eimza_kibris_applications_2026 customers as fully complete
-- (Ödeme / Makbuz / İmza / Teslim = payment_done / receipt_written /
-- signature_ready / delivered, all true) EXCEPT the customers listed below
-- who still owe money ("have debt to us") — their status is left untouched.
--
-- Run in the Supabase SQL Editor, ONE STEP AT A TIME (Step 1, read the
-- results, then Step 2, then Step 3).
--
-- Only the fields that are currently false get a new *_changed_by/*_changed_at
-- stamp — a field that's already true keeps its original history instead of
-- being overwritten with this bulk-update's timestamp.

-- ============================================================
-- STEP 1 — PREVIEW
-- ============================================================
with debt_emails(email) as (
  values
    ('ahmet.dagbasi@ktemo.org'),
    ('aman.rassouli@alasia.edu.tr'),
    ('alemdar_488@hotmail.com'),
    ('bora.yetis@arucad.edu.tr'),
    ('ashraf.foureh@ktemo.org'),
    ('kktc_coskun@hotmail.com'),
    ('cankan.kanli@ktemo.org'),
    ('davut.solyali@emu.edu.tr'),
    ('aytac.cerkez@emu.edu.tr'),
    ('dotekotomasyon@hotmail.com'),
    ('celal@efetech.net.tr'),
    ('erhanozgenc.work@gmail.com'),
    ('guliz.gozuguzel@gmail.com'),
    ('hakan.pehlivan@ktemo.org'),
    ('hasan.zeytun@ktemo.org'),
    ('ahmet.canevi@jsholding.com.tr'),
    ('ktmmob@ktmmob.org'),
    ('mustafa.soforoglu1974@gmail.com'),
    ('tsakalli@hotmail.com'),
    ('mehmetgokcebag@yahoo.com'),
    ('mkdesignsconstruction@gmail.com'),
    ('mustafaportocu@gmail.com'),
    ('kadirbeyar@sarpkanltd.com'),
    ('serentunalibaskut@hotmail.com'),
    ('fatih.tas@supercell.com.tr'),
    ('t.pitt@tpskibris.com'),
    ('sezen.ozbarisci@turkishbank.net'),
    ('ufuk.tip17@gmail.com'),
    ('osman.ercanli@hotmail.com'),
    ('tahir.tehdit@vodafone.com'),
    ('mine.bengi@neareastbank.com'),
    ('yazen.sahawneh@gmail.com'),
    ('z_mert@hotmail.com')
)
select
  (select count(*) from public.eimza_kibris_applications_2026) as total_rows,
  (select count(*) from public.eimza_kibris_applications_2026
     where lower(trim(e_posta_adresi)) in (select lower(email) from debt_emails)) as rows_matching_debt_list,
  (select count(*) from public.eimza_kibris_applications_2026
     where lower(trim(e_posta_adresi)) not in (select lower(email) from debt_emails)
       and (payment_done = false or receipt_written = false or signature_ready = false or delivered = false)) as rows_to_be_updated,
  (select count(*) from public.eimza_kibris_applications_2026
     where lower(trim(e_posta_adresi)) not in (select lower(email) from debt_emails)
       and payment_done = true and receipt_written = true and signature_ready = true and delivered = true) as rows_already_fully_complete,
  (select count(*) from debt_emails de
     where not exists (
       select 1 from public.eimza_kibris_applications_2026 a
       where lower(trim(a.e_posta_adresi)) = lower(de.email)
     )) as debt_emails_with_no_matching_row;

-- ============================================================
-- STEP 2 — UPDATE
-- ============================================================
with debt_emails(email) as (
  values
    ('ahmet.dagbasi@ktemo.org'),
    ('aman.rassouli@alasia.edu.tr'),
    ('alemdar_488@hotmail.com'),
    ('bora.yetis@arucad.edu.tr'),
    ('ashraf.foureh@ktemo.org'),
    ('kktc_coskun@hotmail.com'),
    ('cankan.kanli@ktemo.org'),
    ('davut.solyali@emu.edu.tr'),
    ('aytac.cerkez@emu.edu.tr'),
    ('dotekotomasyon@hotmail.com'),
    ('celal@efetech.net.tr'),
    ('erhanozgenc.work@gmail.com'),
    ('guliz.gozuguzel@gmail.com'),
    ('hakan.pehlivan@ktemo.org'),
    ('hasan.zeytun@ktemo.org'),
    ('ahmet.canevi@jsholding.com.tr'),
    ('ktmmob@ktmmob.org'),
    ('mustafa.soforoglu1974@gmail.com'),
    ('tsakalli@hotmail.com'),
    ('mehmetgokcebag@yahoo.com'),
    ('mkdesignsconstruction@gmail.com'),
    ('mustafaportocu@gmail.com'),
    ('kadirbeyar@sarpkanltd.com'),
    ('serentunalibaskut@hotmail.com'),
    ('fatih.tas@supercell.com.tr'),
    ('t.pitt@tpskibris.com'),
    ('sezen.ozbarisci@turkishbank.net'),
    ('ufuk.tip17@gmail.com'),
    ('osman.ercanli@hotmail.com'),
    ('tahir.tehdit@vodafone.com'),
    ('mine.bengi@neareastbank.com'),
    ('yazen.sahawneh@gmail.com'),
    ('z_mert@hotmail.com')
)
update public.eimza_kibris_applications_2026 a
set
  payment_done = true,
  payment_done_changed_by = case when a.payment_done = false then 'bulk-update:abdolbaghinegin@gmail.com' else a.payment_done_changed_by end,
  payment_done_changed_at = case when a.payment_done = false then now() else a.payment_done_changed_at end,

  receipt_written = true,
  receipt_written_changed_by = case when a.receipt_written = false then 'bulk-update:abdolbaghinegin@gmail.com' else a.receipt_written_changed_by end,
  receipt_written_changed_at = case when a.receipt_written = false then now() else a.receipt_written_changed_at end,

  signature_ready = true,
  signature_ready_changed_by = case when a.signature_ready = false then 'bulk-update:abdolbaghinegin@gmail.com' else a.signature_ready_changed_by end,
  signature_ready_changed_at = case when a.signature_ready = false then now() else a.signature_ready_changed_at end,

  delivered = true,
  delivered_changed_by = case when a.delivered = false then 'bulk-update:abdolbaghinegin@gmail.com' else a.delivered_changed_by end,
  delivered_changed_at = case when a.delivered = false then now() else a.delivered_changed_at end
where lower(trim(a.e_posta_adresi)) not in (select lower(email) from debt_emails)
  and (a.payment_done = false or a.receipt_written = false or a.signature_ready = false or a.delivered = false);

-- ============================================================
-- STEP 3 — VERIFY
-- ============================================================
with debt_emails(email) as (
  values
    ('ahmet.dagbasi@ktemo.org'),
    ('aman.rassouli@alasia.edu.tr'),
    ('alemdar_488@hotmail.com'),
    ('bora.yetis@arucad.edu.tr'),
    ('ashraf.foureh@ktemo.org'),
    ('kktc_coskun@hotmail.com'),
    ('cankan.kanli@ktemo.org'),
    ('davut.solyali@emu.edu.tr'),
    ('aytac.cerkez@emu.edu.tr'),
    ('dotekotomasyon@hotmail.com'),
    ('celal@efetech.net.tr'),
    ('erhanozgenc.work@gmail.com'),
    ('guliz.gozuguzel@gmail.com'),
    ('hakan.pehlivan@ktemo.org'),
    ('hasan.zeytun@ktemo.org'),
    ('ahmet.canevi@jsholding.com.tr'),
    ('ktmmob@ktmmob.org'),
    ('mustafa.soforoglu1974@gmail.com'),
    ('tsakalli@hotmail.com'),
    ('mehmetgokcebag@yahoo.com'),
    ('mkdesignsconstruction@gmail.com'),
    ('mustafaportocu@gmail.com'),
    ('kadirbeyar@sarpkanltd.com'),
    ('serentunalibaskut@hotmail.com'),
    ('fatih.tas@supercell.com.tr'),
    ('t.pitt@tpskibris.com'),
    ('sezen.ozbarisci@turkishbank.net'),
    ('ufuk.tip17@gmail.com'),
    ('osman.ercanli@hotmail.com'),
    ('tahir.tehdit@vodafone.com'),
    ('mine.bengi@neareastbank.com'),
    ('yazen.sahawneh@gmail.com'),
    ('z_mert@hotmail.com')
)
select
  (select count(*) from public.eimza_kibris_applications_2026
     where payment_done = true and receipt_written = true and signature_ready = true and delivered = true) as fully_complete_now,
  (select count(*) from public.eimza_kibris_applications_2026 a
     join debt_emails de on lower(trim(a.e_posta_adresi)) = lower(de.email)
     where a.payment_done = true and a.receipt_written = true and a.signature_ready = true and a.delivered = true) as debt_customers_incorrectly_marked_complete;
-- debt_customers_incorrectly_marked_complete should be 0 (or only reflect
-- rows that were already fully complete before this script ran, since
-- Step 2 never touches the debt list at all).
