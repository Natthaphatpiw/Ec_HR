-- EC AIHR (eCloudtec Thailand) — Migration v3: Multi-tenant SaaS
-- Run this in Supabase SQL Editor AFTER schema.sql + seed.sql.
-- Safe to re-run: every statement uses IF NOT EXISTS or guarded blocks.
--
-- What this migration changes:
--   1. Organizations get business_name / tier / trial windows / seat limit
--   2. Employees get home location + flexible business-agnostic columns
--   3. Attendance gets reason/source/device metadata (pairing is enforced in data.ts)
--   4. New social_security_config table (Thai SSO 2026 rates pre-seeded)
--   5. New profile_edit_audit table to track who edited whose profile
--   6. Account_status enum extended to support 'awaiting_supervisor' state
--   7. Existing org backfilled: a real business_name + a long trial window so demos keep working
-- =============================================================================

-- 1. Organizations: SaaS tenancy + tier metadata --------------------------------

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS business_name        TEXT,
  ADD COLUMN IF NOT EXISTS business_name_norm   TEXT, -- lower(trim()) used for fuzzy-join
  ADD COLUMN IF NOT EXISTS business_type        TEXT, -- factory / restaurant / retail / clinic / other
  ADD COLUMN IF NOT EXISTS owner_employee_id    UUID, -- first registrant (FK below)
  ADD COLUMN IF NOT EXISTS tier                 TEXT DEFAULT 'free'
                                                    CHECK (tier IN ('free','starter','pro','enterprise')),
  ADD COLUMN IF NOT EXISTS seat_limit           INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS trial_started_at     TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS is_active            BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS plan_notes           TEXT;

-- Keep the Northstar demo row aligned and alive: long trial, large cap
UPDATE organizations
SET name               = 'บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด',
    business_name      = 'บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด',
    business_name_norm = lower(trim('บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด')),
    business_type      = COALESCE(business_type, 'factory'),
    tier               = 'enterprise',
    seat_limit         = 999,
    trial_started_at   = COALESCE(trial_started_at, created_at),
    trial_ends_at      = GREATEST(
      COALESCE(trial_ends_at, NOW()),
      NOW() + INTERVAL '5 years'
    ),
    is_active          = COALESCE(is_active, TRUE)
WHERE id = '11111111-1111-1111-1111-111111111111';

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_business_name_norm
  ON organizations(business_name_norm) WHERE business_name_norm IS NOT NULL;

-- 2. Employees: business-agnostic + home-location + supervisor permission flags --

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS account_status           TEXT DEFAULT 'pending_review'
                                                       CHECK (account_status IN ('pending_review','active','inactive','awaiting_supervisor')),
  ADD COLUMN IF NOT EXISTS phone                    TEXT,
  ADD COLUMN IF NOT EXISTS national_id              TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth            DATE,
  ADD COLUMN IF NOT EXISTS address                  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact        TEXT,
  ADD COLUMN IF NOT EXISTS id_card_photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS bank_book_photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason         TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by_id           UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS leave_supervisor_id      UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS ot_supervisor_id         UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS contact_supervisor_id    UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS is_supervisor            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subordinate_ids          UUID[] DEFAULT '{}',
  -- v3 additions ↓
  ADD COLUMN IF NOT EXISTS nickname                 TEXT,
  ADD COLUMN IF NOT EXISTS gender                   TEXT CHECK (gender IS NULL OR gender IN ('male','female','other','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS nationality              TEXT,
  ADD COLUMN IF NOT EXISTS marital_status           TEXT CHECK (marital_status IS NULL OR marital_status IN ('single','married','divorced','widowed','other')),
  ADD COLUMN IF NOT EXISTS hire_date                DATE,
  ADD COLUMN IF NOT EXISTS employment_type          TEXT DEFAULT 'full_time'
                                                       CHECK (employment_type IN ('full_time','part_time','contractor','intern','daily_wage','other')),
  ADD COLUMN IF NOT EXISTS job_title                TEXT, -- free-form, complements `position`
  ADD COLUMN IF NOT EXISTS home_lat                 NUMERIC(10,8),
  ADD COLUMN IF NOT EXISTS home_lng                 NUMERIC(11,8),
  ADD COLUMN IF NOT EXISTS home_location_label      TEXT,  -- pasted maps URL or human-readable address
  ADD COLUMN IF NOT EXISTS home_location_source     TEXT CHECK (home_location_source IS NULL OR home_location_source IN ('gps','maps_url','manual')),
  ADD COLUMN IF NOT EXISTS line_picture_url         TEXT,
  ADD COLUMN IF NOT EXISTS line_display_name        TEXT,
  ADD COLUMN IF NOT EXISTS pdpa_consent_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata                 JSONB DEFAULT '{}'::jsonb, -- per-business custom fields
  ADD COLUMN IF NOT EXISTS notes                    TEXT;

-- schema.sql + seed.sql run before this migration. Those legacy employees are
-- already approved demo records, so preserve that state instead of letting the
-- new pending_review default make every seeded LIFF account unusable.
UPDATE employees
SET account_status = 'active',
    is_supervisor = (role = 'supervisor'),
    submitted_at = COALESCE(submitted_at, created_at),
    approved_at = COALESCE(approved_at, created_at)
WHERE org_id = '11111111-1111-1111-1111-111111111111'
  AND account_status = 'pending_review';

-- Owner FK on organizations (lives in employees, so add after both have columns)
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_owner_employee_id_fkey;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_owner_employee_id_fkey
    FOREIGN KEY (owner_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Indexes that the SaaS flows depend on
CREATE INDEX IF NOT EXISTS idx_employees_org_status  ON employees(org_id, account_status);
CREATE INDEX IF NOT EXISTS idx_employees_org_role    ON employees(org_id, role);
CREATE INDEX IF NOT EXISTS idx_employees_org_name_th ON employees(org_id, name_th);
CREATE INDEX IF NOT EXISTS idx_employees_org_name_en ON employees(org_id, name_en);
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_leave   ON employees(leave_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_ot      ON employees(ot_supervisor_id);
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_contact ON employees(contact_supervisor_id);

-- 3. Attendance: add reason and source metadata -------------------------------

ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS reason            TEXT,
  ADD COLUMN IF NOT EXISTS source            TEXT DEFAULT 'liff'
                                                CHECK (source IN ('liff','web','line_bot','admin_correction')),
  ADD COLUMN IF NOT EXISTS device_label      TEXT,
  ADD COLUMN IF NOT EXISTS maps_url          TEXT;

-- 4. Social-security config (Thai SSO, 2026-aware) -----------------------------
-- A history table so that as ceilings change (2029, 2032 phases) you can append
-- a new row instead of editing code.

CREATE TABLE IF NOT EXISTS social_security_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country         TEXT NOT NULL DEFAULT 'TH',
  effective_from  DATE NOT NULL,
  effective_to    DATE,                   -- nullable = current
  rate_pct        NUMERIC NOT NULL,       -- 5.0 = 5 percent
  wage_floor      NUMERIC NOT NULL,       -- 1650 in 2026
  wage_ceiling    NUMERIC NOT NULL,       -- 17500 in 2026 (phase 1)
  max_contribution NUMERIC NOT NULL,      -- 875 in 2026 (phase 1)
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_config_country_dates
  ON social_security_config(country, effective_from);

-- Seed the three known Thai SSO phases (Section 33).
-- Source: Ministerial regulation published 2025-12-12, effective 2026-01-01.
INSERT INTO social_security_config (country, effective_from, effective_to, rate_pct, wage_floor, wage_ceiling, max_contribution, notes)
SELECT * FROM (VALUES
  ('TH', DATE '2026-01-01', DATE '2028-12-31', 5.0, 1650, 17500, 875,  'Section 33 — Phase 1 (2026-2028)'),
  ('TH', DATE '2029-01-01', DATE '2031-12-31', 5.0, 1650, 20000, 1000, 'Section 33 — Phase 2 (2029-2031)'),
  ('TH', DATE '2032-01-01', NULL,             5.0, 1650, 23000, 1150, 'Section 33 — Phase 3 (2032 onwards)')
) AS v(country, effective_from, effective_to, rate_pct, wage_floor, wage_ceiling, max_contribution, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM social_security_config s
   WHERE s.country = v.country AND s.effective_from = v.effective_from
);

-- 5. Profile edit audit --------------------------------------------------------

CREATE TABLE IF NOT EXISTS profile_edit_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  edited_by   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field       TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_audit_target ON profile_edit_audit(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_audit_actor  ON profile_edit_audit(edited_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_audit_org    ON profile_edit_audit(org_id);

-- 6. Optional: helper view to read the active SSO row for "today"

CREATE OR REPLACE VIEW current_sso_config AS
  SELECT *
    FROM social_security_config
   WHERE effective_from <= CURRENT_DATE
     AND (effective_to IS NULL OR effective_to >= CURRENT_DATE);

-- 7. RLS for new tables (policies still defined in Supabase Dashboard) ----------

ALTER TABLE profile_edit_audit       ENABLE ROW LEVEL SECURITY;
-- social_security_config is global; leave RLS off so all tenants read.

-- 8. Quality-of-life: a function HR can call manually to upgrade a tenant ------
--   SELECT promote_org_tier('<org_id>', 'pro', 50, NOW() + INTERVAL '1 year');

CREATE OR REPLACE FUNCTION promote_org_tier(
  p_org_id     UUID,
  p_tier       TEXT,
  p_seats      INTEGER,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS organizations
LANGUAGE plpgsql
AS $$
DECLARE
  result organizations;
BEGIN
  UPDATE organizations
     SET tier           = p_tier,
         seat_limit     = p_seats,
         trial_ends_at  = COALESCE(p_expires_at, trial_ends_at),
         is_active      = TRUE
   WHERE id = p_org_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- 9. Drop the deprecated approver_id column from leave_requests if you used the
--    older schema. (Idempotent — guard so it doesn't blow up if you don't.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name='leave_requests' AND column_name='approver_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name='leave_requests' AND column_name='supervisor_id'
  ) THEN
    ALTER TABLE leave_requests ADD COLUMN supervisor_id UUID REFERENCES employees(id);
  END IF;
END$$;

-- 10. Done. Verify with:
--   SELECT id, business_name, tier, seat_limit, trial_ends_at FROM organizations;
--   SELECT * FROM current_sso_config;
