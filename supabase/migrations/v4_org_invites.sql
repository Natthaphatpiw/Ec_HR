-- =====================================================================
-- v4_org_invites.sql — Supervisor-first registration: org invite links
-- =====================================================================
-- Adds the org_invites table that backs the "supervisor generates a QR /
-- link, employees self-register into the SAME company" flow.
--
-- A supervisor (the company owner, or any active supervisor) owns one
-- reusable invite per company. Employees open
--   https://liff.line.me/<LIFF_ID_REGISTER>?invite=<token>
-- which resolves the token -> org_id + inviting supervisor, so they join
-- the exact tenant WITHOUT typing the business name, and are auto-linked
-- to the inviting supervisor's team (leave/ot/contact pointers +
-- subordinate_ids). They still land as account_status='pending_review'
-- and the inviting supervisor approves them via the existing LINE card.
--
-- Idempotent (safe to re-run). Apply AFTER schema.sql + v3_saas_multitenant.sql.
-- Uses real NOW() wall-clock (matches trial/seat gates, NOT the frozen
-- 2026-05-09 analytics clock).
-- =====================================================================

CREATE TABLE IF NOT EXISTS org_invites (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token             TEXT NOT NULL UNIQUE,
  -- The supervisor who created / owns this invite. Both usually point at
  -- the same employee; kept separate so an owner could mint a link that
  -- routes joiners to a different supervisor later.
  created_by        UUID REFERENCES employees(id) ON DELETE SET NULL,
  set_supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  -- Role the invite confers on the joiner (mirrors employees.role check).
  role_to_grant     TEXT NOT NULL DEFAULT 'employee'
                      CHECK (role_to_grant IN ('employee','supervisor','hr','executive')),
  -- Which approval pointers the inviting supervisor auto-receives.
  grant_leave       BOOLEAN NOT NULL DEFAULT TRUE,
  grant_overtime    BOOLEAN NOT NULL DEFAULT TRUE,
  grant_contact     BOOLEAN NOT NULL DEFAULT TRUE,
  -- NULL expires_at = never; NULL max_uses = unlimited (reusable company link).
  expires_at        TIMESTAMPTZ,
  max_uses          INTEGER,
  use_count         INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- O(1) redemption lookup by the public token.
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invites_token ON org_invites(token);
-- List / get-or-create a company's active invite.
CREATE INDEX IF NOT EXISTS idx_org_invites_org ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_created_by ON org_invites(created_by);
-- Fast "the active reusable invite for this supervisor" lookup.
CREATE INDEX IF NOT EXISTS idx_org_invites_active
  ON org_invites(org_id, set_supervisor_id) WHERE is_active;

-- Tenant-scoped table: enable RLS to match the rest of the schema. All
-- server access is via the service-role key (bypasses RLS), same as every
-- other data.ts query, so no permissive policy is added.
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE org_invites IS
  'Supervisor-generated invite links: token -> org_id + inviting supervisor. Employees redeem to self-register into the same tenant.';

-- ---------------------------------------------------------------------
-- Atomic subordinate append. Concurrent redemptions of the same reusable
-- invite must not lose an id to a read-modify-write race, so the append is a
-- single UPDATE under the row lock (dedupes and preserves order-insensitively).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_subordinate(p_supervisor UUID, p_new UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE employees
  SET subordinate_ids = (
        SELECT array(
          SELECT DISTINCT e
          FROM unnest(COALESCE(subordinate_ids, '{}') || p_new) AS e
        )
      ),
      is_supervisor = TRUE
  WHERE id = p_supervisor;
$$;

-- ---------------------------------------------------------------------
-- Backfill owner_employee_id so no populated tenant is left "ownerless".
-- registerSupervisor no longer relies on owner_employee_id to decide owner
-- auto-activation (it uses actually-created + a zero-members guard), but a
-- NULL owner on a real tenant is still undesirable. The seeded demo tenant's
-- designated owner is EMP008 (Factory Owner).
-- ---------------------------------------------------------------------
UPDATE organizations o
SET owner_employee_id = '33333333-3333-3333-3333-333333333308'
WHERE o.id = '11111111-1111-1111-1111-111111111111'
  AND o.owner_employee_id IS NULL
  AND EXISTS (SELECT 1 FROM employees e WHERE e.id = '33333333-3333-3333-3333-333333333308');

-- Any other populated tenant with a NULL owner: adopt its earliest-created
-- active employee (defense-in-depth).
UPDATE organizations o
SET owner_employee_id = sub.eid
FROM (
  SELECT DISTINCT ON (e.org_id) e.org_id AS oid, e.id AS eid
  FROM employees e
  WHERE e.account_status = 'active'
  ORDER BY e.org_id, e.created_at ASC
) sub
WHERE o.id = sub.oid
  AND o.owner_employee_id IS NULL;
