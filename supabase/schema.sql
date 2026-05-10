-- LinForge HR — Database Schema
-- Run in Supabase SQL Editor in this exact order.

-- 1. Organizations (Factories)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT DEFAULT 'Asia/Bangkok',
  thai_tax_id TEXT,
  geofence_lat NUMERIC(10,8),
  geofence_lng NUMERIC(11,8),
  geofence_radius NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  line_user_id TEXT UNIQUE,
  employee_code TEXT UNIQUE NOT NULL,
  name_th TEXT,
  name_en TEXT,
  name_zh TEXT,
  role TEXT CHECK (role IN ('employee','supervisor','hr','executive')) DEFAULT 'employee',
  department TEXT,
  position TEXT,
  shift_group TEXT,
  base_salary NUMERIC,
  bank_account TEXT,
  sso_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 60
);

-- 4. Employee Shifts (daily assignment)
CREATE TABLE IF NOT EXISTS employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  overtime_hours_calculated NUMERIC DEFAULT 0
);

-- 5. Attendance Logs
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT CHECK (type IN ('in','out')) NOT NULL,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  ip_address TEXT,
  status TEXT CHECK (status IN ('ontime','late','absent','early')) DEFAULT 'ontime',
  photo_url TEXT
);

-- 6. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT CHECK (leave_type IN ('annual','sick','maternity','personal')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  approver_id UUID REFERENCES employees(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Overtime Requests
CREATE TABLE IF NOT EXISTS overtime_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Payrolls
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  base_pay NUMERIC,
  ot_pay NUMERIC,
  ssf_deduction NUMERIC,
  tax_deduction NUMERIC,
  net_pay NUMERIC,
  payslip_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  kpi_score NUMERIC,
  notes TEXT
);

-- 10. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  line_message_id TEXT,
  type TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AI Agent Interactions (audit log)
CREATE TABLE IF NOT EXISTS ai_agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  channel TEXT CHECK (channel IN ('line','dashboard','liff')) DEFAULT 'line',
  user_message TEXT,
  agent_response TEXT,
  tools_used JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_ts ON attendance_logs(employee_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_employee_line ON employees(line_user_id);

-- Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: define RLS policies in Supabase Dashboard.
-- Policy patterns:
--   employee: can SELECT own row, own attendance, own leave/OT, own payroll
--   supervisor: can SELECT same-department rows + UPDATE leave/OT status
--   hr: full SELECT/INSERT/UPDATE/DELETE within org
--   executive: read-only across org
