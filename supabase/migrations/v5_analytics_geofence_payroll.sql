-- =============================================================================
-- EC AIHR - Migration v5: analytics, configurable geofence, payroll audit data
-- Apply AFTER v4_org_invites.sql.
-- Idempotent: safe to run more than once.
-- =============================================================================

-- Geofence is opt-in so existing tenants keep the current non-blocking behavior.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS geofence_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Retain the server-side decision used for each clock event. This makes
-- location enforcement explainable in reports without exposing raw GPS alone.
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS geofence_distance_m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS geofence_result TEXT NOT NULL DEFAULT 'disabled'
    CHECK (geofence_result IN ('disabled','inside','outside','missing_location','unconfigured'));

-- Tax inputs vary per employee and tax year. JSON keeps optional allowances
-- extensible while calculation_details below freezes the exact applied inputs.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS tax_profile JSONB NOT NULL DEFAULT '{
    "personal_allowance": 60000,
    "spouse_allowance": 0,
    "child_allowance": 0,
    "parent_allowance": 0,
    "insurance_deduction": 0,
    "provident_fund_deduction": 0,
    "other_deductions": 0
  }'::jsonb;

ALTER TABLE payrolls
  ADD COLUMN IF NOT EXISTS allowance_pay NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_pay NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_income NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_deductions NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_pay NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_sso_contribution NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_income NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annualized_taxable_income NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_tax NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_method TEXT NOT NULL DEFAULT 'thai_pit_annualized',
  ADD COLUMN IF NOT EXISTS calculation_version TEXT NOT NULL DEFAULT 'TH-2026.1',
  ADD COLUMN IF NOT EXISTS calculation_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calculation_status TEXT NOT NULL DEFAULT 'estimate'
    CHECK (calculation_status IN ('estimate','reviewed','file_ready','paid','void')),
  ADD COLUMN IF NOT EXISTS reviewed_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS override_reason TEXT;

UPDATE payrolls
SET gross_pay = COALESCE(base_pay, 0) + COALESCE(ot_pay, 0)
WHERE gross_pay = 0;

UPDATE payrolls
SET employer_sso_contribution = COALESCE(ssf_deduction, 0)
WHERE employer_sso_contribution = 0;

-- There must be one auditable result per employee and payroll month.
-- Do not silently delete accounting records if an older database contains
-- duplicates: stop with a descriptive error so HR can reconcile them first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM payrolls
    GROUP BY employee_id, month_year
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate payroll rows found for employee/month. Run v5_preflight_payroll_duplicates.sql, review its output, then apply v5 again.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_employee_month
  ON payrolls(employee_id, month_year);
CREATE INDEX IF NOT EXISTS idx_payroll_month
  ON payrolls(month_year);
CREATE INDEX IF NOT EXISTS idx_attendance_geofence_result
  ON attendance_logs(geofence_result, timestamp DESC);
