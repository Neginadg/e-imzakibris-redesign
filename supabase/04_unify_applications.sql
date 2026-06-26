-- 04_unify_applications.sql
-- Unifies legacy imported data and new website form submissions into
-- eimza_kibris_applications_2026 as the single source of truth.
-- Run ONCE in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Relax schema constraints
--   source_row_number was only meaningful for legacy CSV imports.
--   Website submissions have no row number, so make it nullable and give
--   source_file_name a default so inserts can omit it.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.eimza_kibris_applications_2026
  ALTER COLUMN source_file_name SET DEFAULT 'website',
  ALTER COLUMN source_row_number DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Replace the blanket UNIQUE(source_file_name, source_row_number)
--   constraint with a partial unique index.
--   The partial index only applies where source_row_number IS NOT NULL,
--   so legacy imported rows remain deduplicated while multiple website
--   submissions (which have NULL source_row_number) are all permitted.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.eimza_kibris_applications_2026'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.eimza_kibris_applications_2026 DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eimza_apps_2026_source_uniq
  ON public.eimza_kibris_applications_2026 (source_file_name, source_row_number)
  WHERE source_row_number IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Add indexes to support admin panel search and ordering
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS eimza_apps_2026_adi_soyadi_idx
  ON public.eimza_kibris_applications_2026 (lower(adi_soyadi));

CREATE INDEX IF NOT EXISTS eimza_apps_2026_e_posta_idx
  ON public.eimza_kibris_applications_2026 (lower(e_posta_adresi));

CREATE INDEX IF NOT EXISTS eimza_apps_2026_imported_at_idx
  ON public.eimza_kibris_applications_2026 (imported_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Migrate records from the website submissions table.
--
--   Checks both "applications" (plural) and "application" (singular).
--   For each table found, also checks whether pin/puk columns exist
--   (they were added later to the schema and may be missing in older tables)
--   and builds the SELECT expression dynamically to avoid column-not-found errors.
--
--   ON CONFLICT (id) DO NOTHING makes this idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_has_pin  boolean;
  v_has_puk  boolean;
  v_pin_expr text;
  v_puk_expr text;
  v_sql      text;
BEGIN

  -- ── Helper: build pin/puk expressions based on column presence ─────────────
  -- (reused for both table names below)

  -- ── applications (plural) ──────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'applications'
  ) THEN

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'pin'
    ) INTO v_has_pin;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'puk'
    ) INTO v_has_puk;

    v_pin_expr := CASE WHEN v_has_pin
      THEN format('COALESCE(NULLIF(a.pin, %L), a.payload -> %L ->> %L, %L)', '', 'admin_codes', 'pin_code', '')
      ELSE format('COALESCE(a.payload -> %L ->> %L, %L)', 'admin_codes', 'pin_code', '')
    END;

    v_puk_expr := CASE WHEN v_has_puk
      THEN format('COALESCE(NULLIF(a.puk, %L), a.payload -> %L ->> %L, %L)', '', 'admin_codes', 'puk_code', '')
      ELSE format('COALESCE(a.payload -> %L ->> %L, %L)', 'admin_codes', 'puk_code', '')
    END;

    v_sql := format($sql$
      INSERT INTO public.eimza_kibris_applications_2026 (
        id, source_file_name, adi_soyadi, e_posta_adresi, cep_telefon_numarasi,
        kimlik_pasaport_numarasi, odeme_sekli, pin, puk, durum, payload, kayit_tarihi, imported_at
      )
      SELECT
        a.id,
        %L,
        a.full_name,
        a.email,
        COALESCE(a.phone, %L),
        COALESCE(a.identity_number, %L),
        COALESCE(a.payment_method, %L),
        %s,
        %s,
        %L,
        COALESCE(a.payload, %L::jsonb)
          || jsonb_build_object(%L, COALESCE(a.source_page, %L)),
        to_char(a.created_at AT TIME ZONE %L, %L),
        a.created_at
      FROM public.applications a
      ON CONFLICT (id) DO NOTHING
    $sql$,
      'website',          -- source_file_name
      '',                 -- phone fallback
      '',                 -- identity_number fallback
      'Havale/EFT',       -- payment_method fallback
      v_pin_expr,         -- pin  (%s = unquoted, expression already built)
      v_puk_expr,         -- puk
      'Yeni',             -- durum
      '{}',               -- payload fallback
      'source_page',      -- jsonb key
      '',                 -- source_page fallback
      'UTC',              -- timezone
      'DD.MM.YYYY HH24:MI:SS'  -- date format
    );

    EXECUTE v_sql;
    RAISE NOTICE 'Migrated records from public.applications (pin_col=%, puk_col=%)', v_has_pin, v_has_puk;

  ELSE
    RAISE NOTICE 'Table public.applications not found — skipping';
  END IF;

  -- ── application (singular) ─────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'application'
  ) THEN

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'pin'
    ) INTO v_has_pin;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'application' AND column_name = 'puk'
    ) INTO v_has_puk;

    v_pin_expr := CASE WHEN v_has_pin
      THEN format('COALESCE(NULLIF(a.pin, %L), a.payload -> %L ->> %L, %L)', '', 'admin_codes', 'pin_code', '')
      ELSE format('COALESCE(a.payload -> %L ->> %L, %L)', 'admin_codes', 'pin_code', '')
    END;

    v_puk_expr := CASE WHEN v_has_puk
      THEN format('COALESCE(NULLIF(a.puk, %L), a.payload -> %L ->> %L, %L)', '', 'admin_codes', 'puk_code', '')
      ELSE format('COALESCE(a.payload -> %L ->> %L, %L)', 'admin_codes', 'puk_code', '')
    END;

    v_sql := format($sql$
      INSERT INTO public.eimza_kibris_applications_2026 (
        id, source_file_name, adi_soyadi, e_posta_adresi, cep_telefon_numarasi,
        kimlik_pasaport_numarasi, odeme_sekli, pin, puk, durum, payload, kayit_tarihi, imported_at
      )
      SELECT
        a.id,
        %L,
        a.full_name,
        a.email,
        COALESCE(a.phone, %L),
        COALESCE(a.identity_number, %L),
        COALESCE(a.payment_method, %L),
        %s,
        %s,
        %L,
        COALESCE(a.payload, %L::jsonb)
          || jsonb_build_object(%L, COALESCE(a.source_page, %L)),
        to_char(a.created_at AT TIME ZONE %L, %L),
        a.created_at
      FROM public.application a
      ON CONFLICT (id) DO NOTHING
    $sql$,
      'website',
      '',
      '',
      'Havale/EFT',
      v_pin_expr,
      v_puk_expr,
      'Yeni',
      '{}',
      'source_page',
      '',
      'UTC',
      'DD.MM.YYYY HH24:MI:SS'
    );

    EXECUTE v_sql;
    RAISE NOTICE 'Migrated records from public.application (pin_col=%, puk_col=%)', v_has_pin, v_has_puk;

  ELSE
    RAISE NOTICE 'Table public.application not found — skipping';
  END IF;

END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Ensure the service_role key (used by the API) can bypass RLS.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access" ON public.eimza_kibris_applications_2026;
CREATE POLICY "Service role full access"
  ON public.eimza_kibris_applications_2026
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Verify the migration (informational — check row counts)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.eimza_kibris_applications_2026
    WHERE source_file_name = 'website')  AS unified_website_rows,
  (SELECT count(*) FROM public.eimza_kibris_applications_2026
    WHERE source_file_name != 'website') AS unified_legacy_rows,
  (SELECT count(*) FROM public.eimza_kibris_applications_2026) AS unified_total;
