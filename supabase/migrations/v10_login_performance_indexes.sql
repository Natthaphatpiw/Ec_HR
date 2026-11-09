-- Optional login/page-gate performance check. Apply manually in Supabase SQL
-- Console; no data or authentication policy is changed.
--
-- Migration v3 already creates this exact index. Repeating it is harmless and
-- covers installations whose earlier schema setup omitted that index.
-- The trial/seat gate counts only active + pending_review employees for one org.
CREATE INDEX IF NOT EXISTS idx_employees_org_status
  ON public.employees (org_id, account_status);

-- employees.line_user_id is already UNIQUE in schema.sql, so its lookup already
-- has a PostgreSQL index. organizations.id is a primary key. No duplicate
-- indexes are added for those authentication lookups.
