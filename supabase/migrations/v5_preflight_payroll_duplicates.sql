-- =============================================================================
-- EC AIHR - v5 preflight: reconcile exact duplicate payroll snapshots
-- Run BEFORE v5_analytics_geofence_payroll.sql when v5 reports duplicate
-- employee/month rows.
--
-- Safety rules:
--   1. Rows are considered exact duplicates only when every column except the
--      generated id and created_at timestamp is identical.
--   2. Conflicting payroll results are never deleted automatically.
--   3. Removed exact duplicates are retained as JSON in
--      payroll_duplicate_archive for audit/recovery.
-- =============================================================================

-- Inspect duplicate groups before changing anything. `result_variants = 1`
-- means the rows differ only by id/created_at and can be reconciled safely.
SELECT
  p.employee_id,
  e.employee_code,
  COALESCE(e.name_th, e.name_en) AS employee_name,
  p.month_year,
  COUNT(*) AS row_count,
  COUNT(DISTINCT (to_jsonb(p) - 'id' - 'created_at')) AS result_variants,
  ARRAY_AGG(p.id ORDER BY p.created_at NULLS LAST, p.id) AS payroll_ids
FROM payrolls p
LEFT JOIN employees e ON e.id = p.employee_id
GROUP BY p.employee_id, e.employee_code, e.name_th, e.name_en, p.month_year
HAVING COUNT(*) > 1
ORDER BY p.month_year, e.employee_code;

BEGIN;

-- If two rows for the same employee/month contain different accounting or
-- audit values, an HR/accounting reviewer must choose the authoritative row.
DO $$
DECLARE
  conflicting_groups INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflicting_groups
  FROM (
    SELECT p.employee_id, p.month_year
    FROM payrolls p
    GROUP BY p.employee_id, p.month_year
    HAVING COUNT(*) > 1
       AND COUNT(DISTINCT (to_jsonb(p) - 'id' - 'created_at')) > 1
  ) conflicts;

  IF conflicting_groups > 0 THEN
    RAISE EXCEPTION
      'Found % conflicting employee/month payroll group(s). No rows were deleted. Review the diagnostic SELECT and reconcile those results manually.',
      conflicting_groups;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS payroll_duplicate_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL,
  employee_id UUID,
  month_year TEXT NOT NULL,
  archived_row JSONB NOT NULL,
  archive_reason TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_duplicate_archive_payroll_id
  ON payroll_duplicate_archive(payroll_id);

-- All remaining duplicate groups are exact copies. Keep the earliest row and
-- archive every later copy before removing it from the active payroll table.
WITH ranked AS (
  SELECT
    p.id,
    ROW_NUMBER() OVER (
      PARTITION BY p.employee_id, p.month_year
      ORDER BY p.created_at ASC NULLS LAST, p.id ASC
    ) AS duplicate_rank
  FROM payrolls p
),
deleted AS (
  DELETE FROM payrolls p
  USING ranked r
  WHERE p.id = r.id
    AND r.duplicate_rank > 1
  RETURNING p.*
)
INSERT INTO payroll_duplicate_archive (
  payroll_id,
  employee_id,
  month_year,
  archived_row,
  archive_reason
)
SELECT
  d.id,
  d.employee_id,
  d.month_year,
  to_jsonb(d),
  'Exact duplicate removed before v5 unique employee/month constraint'
FROM deleted d
ON CONFLICT (payroll_id) DO NOTHING;

COMMIT;

-- Expected result after a successful run: zero rows.
SELECT employee_id, month_year, COUNT(*) AS row_count
FROM payrolls
GROUP BY employee_id, month_year
HAVING COUNT(*) > 1;

