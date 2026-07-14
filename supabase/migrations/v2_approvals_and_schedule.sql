-- =============================================================================
-- EC AIHR - Migration v2: approval routing, schedule management, action tokens
-- Apply AFTER schema.sql + seed.sql and BEFORE v3_saas_multitenant.sql.
-- Idempotent: safe to run more than once.
-- =============================================================================

-- Registration creates an employee before a permanent code is assigned.
ALTER TABLE employees ALTER COLUMN employee_code DROP NOT NULL;

-- Approval audit fields used by the LINE Flex postback flow.
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line_card_message_id TEXT;

ALTER TABLE overtime_requests
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_reason TEXT,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line_card_message_id TEXT;

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  requested_date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  line_card_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (time_end > time_start)
);

CREATE INDEX IF NOT EXISTS idx_contact_employee
  ON contact_requests(employee_id, requested_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_supervisor_status
  ON contact_requests(supervisor_id, status, requested_date DESC);

CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('work','overtime','leave')),
  hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_assignments_supervisor_date
  ON schedule_assignments(supervisor_id, date);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('work','overtime','leave')),
  hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  notes TEXT,
  created_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  is_supervisor_override BOOLEAN NOT NULL DEFAULT FALSE,
  supervisor_assignment_id UUID REFERENCES schedule_assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date, entry_type)
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_employee_date
  ON schedule_entries(employee_id, date);

CREATE TABLE IF NOT EXISTS schedule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('work','overtime','leave')),
  previous_hours NUMERIC(5,2),
  new_hours NUMERIC(5,2) NOT NULL,
  changed_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_changes_pending
  ON schedule_changes(created_at) WHERE notified_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_changes_employee
  ON schedule_changes(employee_id, created_at DESC);

CREATE OR REPLACE FUNCTION log_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();

  IF NEW.is_supervisor_override = TRUE
     AND NEW.created_by_id IS DISTINCT FROM NEW.employee_id
     AND (
       TG_OP = 'INSERT'
       OR OLD.hours IS DISTINCT FROM NEW.hours
       OR OLD.entry_type IS DISTINCT FROM NEW.entry_type
       OR OLD.notes IS DISTINCT FROM NEW.notes
     )
  THEN
    INSERT INTO schedule_changes (
      employee_id,
      date,
      entry_type,
      previous_hours,
      new_hours,
      changed_by_id
    ) VALUES (
      NEW.employee_id,
      NEW.date,
      NEW.entry_type,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.hours ELSE NULL END,
      NEW.hours,
      NEW.created_by_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_schedule_change ON schedule_entries;
CREATE TRIGGER trg_log_schedule_change
  BEFORE INSERT OR UPDATE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION log_schedule_change();

CREATE TABLE IF NOT EXISTS line_action_tokens (
  token TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('approve','reject')),
  request_kind TEXT NOT NULL CHECK (request_kind IN ('leave','overtime','contact','registration')),
  request_id UUID NOT NULL,
  intended_user_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Some early deployments called the discriminator `kind`. Normalize the
-- column and its CHECK constraint to the name used by data.ts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'line_action_tokens'
      AND column_name = 'kind'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'line_action_tokens'
      AND column_name = 'request_kind'
  ) THEN
    ALTER TABLE line_action_tokens RENAME COLUMN kind TO request_kind;
  END IF;
END
$$;

ALTER TABLE line_action_tokens
  DROP CONSTRAINT IF EXISTS line_action_tokens_kind_check,
  DROP CONSTRAINT IF EXISTS line_action_tokens_request_kind_check;
ALTER TABLE line_action_tokens
  ADD CONSTRAINT line_action_tokens_request_kind_check
  CHECK (request_kind IN ('leave','overtime','contact','registration'));

CREATE INDEX IF NOT EXISTS idx_line_action_tokens_lookup
  ON line_action_tokens(token, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_line_action_tokens_request
  ON line_action_tokens(request_kind, request_id);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_action_tokens ENABLE ROW LEVEL SECURITY;
