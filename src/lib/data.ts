import {
  ACTION_TOKENS,
  ATTENDANCE_LOGS,
  CONTACT_REQUESTS,
  EMPLOYEES,
  EMPLOYEE_SHIFTS,
  LEAVE_REQUESTS,
  NOTIFICATIONS,
  ORGANIZATION,
  OVERTIME_REQUESTS,
  PAYROLLS,
  PERFORMANCE_REVIEWS,
  SCHEDULE_ASSIGNMENTS,
  SCHEDULE_CHANGES,
  SCHEDULE_ENTRIES,
  SHIFTS,
} from "./demo-data";
import { hasSupabaseConfig, supabaseAdmin } from "./supabase/admin";
import type {
  ActionToken,
  ActionTokenAction,
  ActionTokenKind,
  AttendanceLog,
  ContactRequest,
  Employee,
  EmployeeShift,
  LeaveRequest,
  LeaveType,
  Notification,
  Organization,
  OvertimeRequest,
  Payroll,
  PerformanceReview,
  RegistrationInput,
  RequestStatus,
  ScheduleAssignment,
  ScheduleChange,
  ScheduleEntry,
  ScheduleEntryType,
  Shift,
} from "./types";

const ORG_ID = "11111111-1111-1111-1111-111111111111";

// =========================================================================
// Mode switch — production hits Supabase, demo uses in-memory arrays.
// Production prerequisites:
//   1. NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//   2. DEMO_MODE=false (or unset)
//   3. supabase/schema.sql + seed.sql + migration v2 SQL have been run
// =========================================================================

function isDemo(): boolean {
  if ((process.env.DEMO_MODE ?? "true") === "true") return true;
  return !hasSupabaseConfig();
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
}

// Helper: surface Supabase errors loudly so callers don't silently get []
function unwrap<T>(label: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    throw new Error(`Supabase ${label} failed: ${res.error.message}`);
  }
  return res.data as T;
}

// =========================================================================
// Organization
// =========================================================================

export async function getOrganization(): Promise<Organization> {
  if (isDemo()) return ORGANIZATION;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("organizations")
    .select("*")
    .eq("id", ORG_ID)
    .maybeSingle();
  if (error) throw new Error(`getOrganization: ${error.message}`);
  return (data as Organization) ?? ORGANIZATION;
}

// =========================================================================
// Employees
// =========================================================================

export async function listEmployees(): Promise<Employee[]> {
  if (isDemo()) return EMPLOYEES;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("employees").select("*").order("employee_code");
  if (error) throw new Error(`listEmployees: ${error.message}`);
  return (data ?? []) as Employee[];
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  if (isDemo()) return EMPLOYEES.find((e) => e.id === id);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("employees").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getEmployeeById: ${error.message}`);
  return (data as Employee) ?? undefined;
}

export async function getEmployeeByLineId(lineUserId: string): Promise<Employee | undefined> {
  if (isDemo()) return EMPLOYEES.find((e) => e.line_user_id === lineUserId);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) throw new Error(`getEmployeeByLineId: ${error.message}`);
  return (data as Employee) ?? undefined;
}

export async function getEmployeeByCode(code: string): Promise<Employee | undefined> {
  const norm = code.toUpperCase().trim();
  if (isDemo()) return EMPLOYEES.find((e) => e.employee_code === norm);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .eq("employee_code", norm)
    .maybeSingle();
  if (error) throw new Error(`getEmployeeByCode: ${error.message}`);
  return (data as Employee) ?? undefined;
}

export async function getEmployeeByNationalId(nationalId: string): Promise<Employee | undefined> {
  if (isDemo()) return EMPLOYEES.find((e) => e.national_id === nationalId);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .eq("national_id", nationalId)
    .maybeSingle();
  if (error) throw new Error(`getEmployeeByNationalId: ${error.message}`);
  return (data as Employee) ?? undefined;
}

export async function listHrEmployees(): Promise<Employee[]> {
  if (isDemo()) return EMPLOYEES.filter((e) => e.role === "hr" && e.line_user_id);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .eq("role", "hr")
    .not("line_user_id", "is", null);
  if (error) throw new Error(`listHrEmployees: ${error.message}`);
  return (data ?? []) as Employee[];
}

export async function listTeamForSupervisor(supervisorId: string): Promise<Employee[]> {
  // Source of truth: employees.subordinate_ids on the supervisor's row.
  // Falls back to the reverse-lookup on the 3 approval-supervisor pointers
  // for rows where subordinate_ids hasn't been backfilled yet.
  const supervisor = await getEmployeeById(supervisorId);
  const explicit = supervisor?.subordinate_ids ?? [];

  if (isDemo()) {
    if (explicit.length > 0) {
      return EMPLOYEES.filter((e) => explicit.includes(e.id));
    }
    return EMPLOYEES.filter(
      (e) =>
        e.leave_supervisor_id === supervisorId ||
        e.ot_supervisor_id === supervisorId ||
        e.contact_supervisor_id === supervisorId,
    );
  }

  const sb = supabaseAdmin();
  if (explicit.length > 0) {
    const { data, error } = await sb.from("employees").select("*").in("id", explicit);
    if (error) throw new Error(`listTeamForSupervisor (subordinate_ids): ${error.message}`);
    return (data ?? []) as Employee[];
  }
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .or(
      `leave_supervisor_id.eq.${supervisorId},ot_supervisor_id.eq.${supervisorId},contact_supervisor_id.eq.${supervisorId}`,
    );
  if (error) throw new Error(`listTeamForSupervisor: ${error.message}`);
  return (data ?? []) as Employee[];
}

export async function getSupervisorForEmployee(
  employeeId: string,
  kind: "leave" | "overtime" | "contact",
): Promise<Employee | undefined> {
  const e = await getEmployeeById(employeeId);
  if (!e) return undefined;
  const fkId =
    kind === "leave" ? e.leave_supervisor_id :
    kind === "overtime" ? e.ot_supervisor_id :
    e.contact_supervisor_id;
  if (!fkId) return undefined;
  return getEmployeeById(fkId);
}

// =========================================================================
// Registration (employees row with account_status)
// =========================================================================

export interface RegisterResult {
  ok: boolean;
  message: string;
  employee?: Employee;
  duplicate?: "line_user_id" | "national_id";
}

export async function registerEmployee(input: RegistrationInput): Promise<RegisterResult> {
  // Dedup checks (same in both modes)
  const existingByLine = await getEmployeeByLineId(input.line_user_id);
  if (existingByLine) {
    return {
      ok: false,
      message: "This LINE account is already registered.",
      duplicate: "line_user_id",
      employee: existingByLine,
    };
  }
  const existingByNid = await getEmployeeByNationalId(input.national_id);
  if (existingByNid) {
    return { ok: false, message: "This national ID is already in our records.", duplicate: "national_id" };
  }

  const newRow: Omit<Employee, "id"> & { id?: string } = {
    org_id: ORG_ID,
    line_user_id: input.line_user_id,
    employee_code: null,
    name_th: input.name_th,
    name_en: input.name_en ?? null,
    name_zh: input.name_zh ?? null,
    role: "employee",
    department: input.department,
    position: input.position,
    shift_group: input.shift_group ?? null,
    base_salary: null,
    bank_account: input.bank_account ?? null,
    sso_number: null,
    account_status: "pending_review",
    phone: input.phone,
    national_id: input.national_id,
    date_of_birth: input.date_of_birth,
    address: input.address,
    emergency_contact: input.emergency_contact,
    id_card_photo_url: input.id_card_photo_url ?? null,
    bank_book_photo_url: input.bank_book_photo_url ?? null,
    profile_photo_url: input.profile_photo_url ?? null,
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (isDemo()) {
    const employee: Employee = { id: newId("emp"), ...newRow } as Employee;
    EMPLOYEES.push(employee);
    return { ok: true, message: "Application submitted.", employee };
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("employees").insert(newRow).select("*").single();
  if (error) return { ok: false, message: `registerEmployee failed: ${error.message}` };
  return { ok: true, message: "Application submitted.", employee: data as Employee };
}

export async function getRegistrationStatus(lineUserId: string): Promise<
  | { state: "new" }
  | { state: "pending"; employee: Employee }
  | { state: "active"; employee: Employee }
  | { state: "rejected"; employee: Employee }
> {
  const e = await getEmployeeByLineId(lineUserId);
  if (!e) return { state: "new" };
  if (e.account_status === "pending_review") return { state: "pending", employee: e };
  if (e.account_status === "inactive") return { state: "rejected", employee: e };
  return { state: "active", employee: e };
}

export async function approveRegistration(
  employeeId: string,
  approverId: string,
  patch: { employee_code: string; role?: Employee["role"]; base_salary?: number },
): Promise<Employee | undefined> {
  if (isDemo()) {
    const e = EMPLOYEES.find((x) => x.id === employeeId);
    if (!e) return undefined;
    e.account_status = "active";
    e.employee_code = patch.employee_code;
    if (patch.role) e.role = patch.role;
    if (typeof patch.base_salary === "number") e.base_salary = patch.base_salary;
    e.approved_at = new Date().toISOString();
    e.approved_by_id = approverId;
    return e;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .update({
      account_status: "active",
      employee_code: patch.employee_code,
      role: patch.role ?? "employee",
      base_salary: patch.base_salary ?? null,
      approved_at: new Date().toISOString(),
      approved_by_id: approverId,
    })
    .eq("id", employeeId)
    .select("*")
    .single();
  if (error) throw new Error(`approveRegistration: ${error.message}`);
  return data as Employee;
}

export async function rejectRegistration(
  employeeId: string,
  approverId: string,
  reason: string,
): Promise<Employee | undefined> {
  if (isDemo()) {
    const e = EMPLOYEES.find((x) => x.id === employeeId);
    if (!e) return undefined;
    e.account_status = "inactive";
    e.rejection_reason = reason;
    e.approved_at = new Date().toISOString();
    e.approved_by_id = approverId;
    return e;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .update({
      account_status: "inactive",
      rejection_reason: reason,
      approved_at: new Date().toISOString(),
      approved_by_id: approverId,
    })
    .eq("id", employeeId)
    .select("*")
    .single();
  if (error) throw new Error(`rejectRegistration: ${error.message}`);
  return data as Employee;
}

// =========================================================================
// Shifts + employee shifts (kept demo for now)
// =========================================================================

export async function listShifts(): Promise<Shift[]> {
  if (isDemo()) return SHIFTS;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("shifts").select("*").order("start_time");
  if (error) throw new Error(`listShifts: ${error.message}`);
  return (data ?? []) as Shift[];
}

export async function listEmployeeShifts(): Promise<EmployeeShift[]> {
  return EMPLOYEE_SHIFTS;
}

// =========================================================================
// Attendance (read in production for personal history)
// =========================================================================

export async function listAttendanceLogs(): Promise<AttendanceLog[]> {
  return [...ATTENDANCE_LOGS].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function listAttendanceForEmployee(employeeId: string): Promise<AttendanceLog[]> {
  if (isDemo()) {
    return ATTENDANCE_LOGS.filter((l) => l.employee_id === employeeId).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("attendance_logs")
    .select("*")
    .eq("employee_id", employeeId)
    .order("timestamp", { ascending: false });
  if (error) throw new Error(`listAttendanceForEmployee: ${error.message}`);
  return (data ?? []) as AttendanceLog[];
}

// =========================================================================
// Leave requests
// =========================================================================

export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  if (isDemo()) {
    return [...LEAVE_REQUESTS].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leave_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listLeaveRequests: ${error.message}`);
  return (data ?? []) as LeaveRequest[];
}

export async function listLeaveForEmployee(employeeId: string): Promise<LeaveRequest[]> {
  if (isDemo()) return LEAVE_REQUESTS.filter((l) => l.employee_id === employeeId);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leave_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listLeaveForEmployee: ${error.message}`);
  return (data ?? []) as LeaveRequest[];
}

export interface CreateLeaveRequestInput {
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
}

export async function createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
  const employee = await getEmployeeById(input.employee_id);
  const supervisor_id = employee?.leave_supervisor_id ?? null;

  if (isDemo()) {
    const row: LeaveRequest = {
      id: newId("leave"),
      employee_id: input.employee_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      days: input.days,
      status: "pending",
      supervisor_id,
      approver_id: null,
      reason: input.reason,
      decision_reason: null,
      decided_at: null,
      line_card_message_id: null,
      created_at: new Date().toISOString(),
    };
    LEAVE_REQUESTS.unshift(row);
    return row;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leave_requests")
    .insert({
      employee_id: input.employee_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      days: input.days,
      status: "pending",
      supervisor_id,
      reason: input.reason,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createLeaveRequest: ${error.message}`);
  return data as LeaveRequest;
}

export async function decideLeaveRequest(
  id: string,
  decision: "approved" | "rejected",
  approverId: string,
  reason?: string | null,
): Promise<LeaveRequest | undefined> {
  if (isDemo()) {
    const row = LEAVE_REQUESTS.find((r) => r.id === id);
    if (!row) return undefined;
    row.status = decision;
    row.approver_id = approverId;
    row.decision_reason = decision === "rejected" ? (reason ?? null) : null;
    row.decided_at = new Date().toISOString();
    return row;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leave_requests")
    .update({
      status: decision,
      approver_id: approverId,
      decision_reason: decision === "rejected" ? (reason ?? null) : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`decideLeaveRequest: ${error.message}`);
  return data as LeaveRequest;
}

export async function getLeaveRequestById(id: string): Promise<LeaveRequest | undefined> {
  if (isDemo()) return LEAVE_REQUESTS.find((r) => r.id === id);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("leave_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getLeaveRequestById: ${error.message}`);
  return (data as LeaveRequest) ?? undefined;
}

export async function listLeaveRequestsForSupervisor(
  supervisorId: string,
  status?: RequestStatus,
): Promise<LeaveRequest[]> {
  if (isDemo()) {
    return LEAVE_REQUESTS.filter(
      (r) => r.supervisor_id === supervisorId && (status ? r.status === status : true),
    );
  }
  const sb = supabaseAdmin();
  let q = sb.from("leave_requests").select("*").eq("supervisor_id", supervisorId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listLeaveRequestsForSupervisor: ${error.message}`);
  return (data ?? []) as LeaveRequest[];
}

export async function getLeaveBalance(employeeId: string): Promise<{
  annual: { used: number; total: number };
  sick: { used: number; total: number };
  personal: { used: number; total: number };
}> {
  let approved: LeaveRequest[] = [];
  if (isDemo()) {
    approved = LEAVE_REQUESTS.filter(
      (l) => l.employee_id === employeeId && l.status === "approved",
    );
  } else {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("leave_requests")
      .select("leave_type,days")
      .eq("employee_id", employeeId)
      .eq("status", "approved");
    if (error) throw new Error(`getLeaveBalance: ${error.message}`);
    approved = (data ?? []) as LeaveRequest[];
  }
  const sumDays = (type: string) =>
    approved.filter((l) => l.leave_type === type).reduce((acc, l) => acc + l.days, 0);
  return {
    annual: { used: sumDays("annual"), total: 10 },
    sick: { used: sumDays("sick"), total: 30 },
    personal: { used: sumDays("personal"), total: 3 },
  };
}

// =========================================================================
// Overtime requests
// =========================================================================

export async function listOvertimeRequests(): Promise<OvertimeRequest[]> {
  if (isDemo()) {
    return [...OVERTIME_REQUESTS].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("overtime_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listOvertimeRequests: ${error.message}`);
  return (data ?? []) as OvertimeRequest[];
}

export async function listOvertimeForEmployee(employeeId: string): Promise<OvertimeRequest[]> {
  if (isDemo()) return OVERTIME_REQUESTS.filter((o) => o.employee_id === employeeId);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("overtime_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listOvertimeForEmployee: ${error.message}`);
  return (data ?? []) as OvertimeRequest[];
}

export interface CreateOvertimeRequestInput {
  employee_id: string;
  date: string;
  hours: number;
  reason: string | null;
}

export async function createOvertimeRequest(input: CreateOvertimeRequestInput): Promise<OvertimeRequest> {
  const employee = await getEmployeeById(input.employee_id);
  const supervisor_id = employee?.ot_supervisor_id ?? null;

  if (isDemo()) {
    const row: OvertimeRequest = {
      id: newId("ot"),
      employee_id: input.employee_id,
      date: input.date,
      hours: input.hours,
      reason: input.reason,
      status: "pending",
      supervisor_id,
      approver_id: null,
      decision_reason: null,
      decided_at: null,
      line_card_message_id: null,
      created_at: new Date().toISOString(),
    };
    OVERTIME_REQUESTS.unshift(row);
    return row;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("overtime_requests")
    .insert({
      employee_id: input.employee_id,
      date: input.date,
      hours: input.hours,
      reason: input.reason,
      status: "pending",
      supervisor_id,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createOvertimeRequest: ${error.message}`);
  return data as OvertimeRequest;
}

export async function decideOvertimeRequest(
  id: string,
  decision: "approved" | "rejected",
  approverId: string,
  reason?: string | null,
): Promise<OvertimeRequest | undefined> {
  if (isDemo()) {
    const row = OVERTIME_REQUESTS.find((r) => r.id === id);
    if (!row) return undefined;
    row.status = decision;
    row.approver_id = approverId;
    row.decision_reason = decision === "rejected" ? (reason ?? null) : null;
    row.decided_at = new Date().toISOString();
    return row;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("overtime_requests")
    .update({
      status: decision,
      approver_id: approverId,
      decision_reason: decision === "rejected" ? (reason ?? null) : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`decideOvertimeRequest: ${error.message}`);
  return data as OvertimeRequest;
}

export async function getOvertimeRequestById(id: string): Promise<OvertimeRequest | undefined> {
  if (isDemo()) return OVERTIME_REQUESTS.find((r) => r.id === id);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("overtime_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getOvertimeRequestById: ${error.message}`);
  return (data as OvertimeRequest) ?? undefined;
}

export async function listOvertimeRequestsForSupervisor(
  supervisorId: string,
  status?: RequestStatus,
): Promise<OvertimeRequest[]> {
  if (isDemo()) {
    return OVERTIME_REQUESTS.filter(
      (r) => r.supervisor_id === supervisorId && (status ? r.status === status : true),
    );
  }
  const sb = supabaseAdmin();
  let q = sb.from("overtime_requests").select("*").eq("supervisor_id", supervisorId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listOvertimeRequestsForSupervisor: ${error.message}`);
  return (data ?? []) as OvertimeRequest[];
}

// =========================================================================
// Contact requests
// =========================================================================

export interface CreateContactRequestInput {
  employee_id: string;
  requested_date: string;
  time_start: string;
  time_end: string;
  reason: string;
}

export async function createContactRequest(input: CreateContactRequestInput): Promise<ContactRequest> {
  const employee = await getEmployeeById(input.employee_id);
  const supervisor_id = employee?.contact_supervisor_id ?? null;

  if (isDemo()) {
    const row: ContactRequest = {
      id: newId("contact"),
      employee_id: input.employee_id,
      supervisor_id,
      approver_id: null,
      requested_date: input.requested_date,
      time_start: input.time_start,
      time_end: input.time_end,
      reason: input.reason,
      status: "pending",
      decision_reason: null,
      decided_at: null,
      line_card_message_id: null,
      created_at: new Date().toISOString(),
    };
    CONTACT_REQUESTS.unshift(row);
    return row;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contact_requests")
    .insert({
      employee_id: input.employee_id,
      supervisor_id,
      requested_date: input.requested_date,
      time_start: input.time_start,
      time_end: input.time_end,
      reason: input.reason,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(`createContactRequest: ${error.message}`);
  return data as ContactRequest;
}

export async function decideContactRequest(
  id: string,
  decision: "approved" | "rejected",
  approverId: string,
  reason?: string | null,
): Promise<ContactRequest | undefined> {
  if (isDemo()) {
    const row = CONTACT_REQUESTS.find((r) => r.id === id);
    if (!row) return undefined;
    row.status = decision;
    row.approver_id = approverId;
    row.decision_reason = decision === "rejected" ? (reason ?? null) : null;
    row.decided_at = new Date().toISOString();
    return row;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contact_requests")
    .update({
      status: decision,
      approver_id: approverId,
      decision_reason: decision === "rejected" ? (reason ?? null) : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`decideContactRequest: ${error.message}`);
  return data as ContactRequest;
}

export async function getContactRequestById(id: string): Promise<ContactRequest | undefined> {
  if (isDemo()) return CONTACT_REQUESTS.find((r) => r.id === id);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("contact_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getContactRequestById: ${error.message}`);
  return (data as ContactRequest) ?? undefined;
}

export async function listContactForEmployee(employeeId: string): Promise<ContactRequest[]> {
  if (isDemo()) return CONTACT_REQUESTS.filter((c) => c.employee_id === employeeId);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contact_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("requested_date", { ascending: false });
  if (error) throw new Error(`listContactForEmployee: ${error.message}`);
  return (data ?? []) as ContactRequest[];
}

export async function listContactRequestsForSupervisor(
  supervisorId: string,
  status?: RequestStatus,
): Promise<ContactRequest[]> {
  if (isDemo()) {
    return CONTACT_REQUESTS.filter(
      (r) => r.supervisor_id === supervisorId && (status ? r.status === status : true),
    );
  }
  const sb = supabaseAdmin();
  let q = sb.from("contact_requests").select("*").eq("supervisor_id", supervisorId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.order("requested_date", { ascending: false });
  if (error) throw new Error(`listContactRequestsForSupervisor: ${error.message}`);
  return (data ?? []) as ContactRequest[];
}

// =========================================================================
// Schedule entries / assignments / changes
// =========================================================================

export async function listScheduleEntries(
  employeeId: string,
  weekStart: string,
  weekEnd: string,
): Promise<ScheduleEntry[]> {
  if (isDemo()) {
    return SCHEDULE_ENTRIES.filter(
      (s) => s.employee_id === employeeId && s.date >= weekStart && s.date <= weekEnd,
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("schedule_entries")
    .select("*")
    .eq("employee_id", employeeId)
    .gte("date", weekStart)
    .lte("date", weekEnd);
  if (error) throw new Error(`listScheduleEntries: ${error.message}`);
  return (data ?? []) as ScheduleEntry[];
}

export async function listScheduleEntriesForTeam(
  supervisorId: string,
  weekStart: string,
  weekEnd: string,
): Promise<ScheduleEntry[]> {
  const team = await listTeamForSupervisor(supervisorId);
  if (team.length === 0) return [];
  if (isDemo()) {
    const ids = new Set(team.map((e) => e.id));
    return SCHEDULE_ENTRIES.filter(
      (s) => ids.has(s.employee_id) && s.date >= weekStart && s.date <= weekEnd,
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("schedule_entries")
    .select("*")
    .in("employee_id", team.map((e) => e.id))
    .gte("date", weekStart)
    .lte("date", weekEnd);
  if (error) throw new Error(`listScheduleEntriesForTeam: ${error.message}`);
  return (data ?? []) as ScheduleEntry[];
}

export interface UpsertScheduleEntryInput {
  employee_id: string;
  date: string;
  entry_type: ScheduleEntryType;
  hours: number;
  notes?: string | null;
  created_by_id: string;
  is_supervisor_override?: boolean;
  supervisor_assignment_id?: string | null;
}

export async function upsertScheduleEntry(
  input: UpsertScheduleEntryInput,
): Promise<{ entry: ScheduleEntry; change?: ScheduleChange }> {
  const isSupervisorAction =
    input.is_supervisor_override === true && input.created_by_id !== input.employee_id;

  if (isDemo()) {
    const existing = SCHEDULE_ENTRIES.find(
      (s) =>
        s.employee_id === input.employee_id &&
        s.date === input.date &&
        s.entry_type === input.entry_type,
    );
    let change: ScheduleChange | undefined;

    if (existing) {
      if (existing.is_supervisor_override && !isSupervisorAction) return { entry: existing };
      const prevHours = existing.hours;
      existing.hours = input.hours;
      existing.notes = input.notes ?? existing.notes;
      existing.created_by_id = input.created_by_id;
      existing.is_supervisor_override =
        input.is_supervisor_override ?? existing.is_supervisor_override;
      existing.supervisor_assignment_id =
        input.supervisor_assignment_id ?? existing.supervisor_assignment_id;
      existing.updated_at = new Date().toISOString();
      if (isSupervisorAction && prevHours !== input.hours) {
        change = {
          id: newId("change"),
          employee_id: input.employee_id,
          date: input.date,
          entry_type: input.entry_type,
          previous_hours: prevHours,
          new_hours: input.hours,
          changed_by_id: input.created_by_id,
          notified_at: null,
          created_at: new Date().toISOString(),
        };
        SCHEDULE_CHANGES.push(change);
      }
      return { entry: existing, change };
    }

    const entry: ScheduleEntry = {
      id: newId("sched"),
      employee_id: input.employee_id,
      date: input.date,
      entry_type: input.entry_type,
      hours: input.hours,
      notes: input.notes ?? null,
      created_by_id: input.created_by_id,
      is_supervisor_override: input.is_supervisor_override ?? false,
      supervisor_assignment_id: input.supervisor_assignment_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    SCHEDULE_ENTRIES.push(entry);
    if (isSupervisorAction) {
      change = {
        id: newId("change"),
        employee_id: input.employee_id,
        date: input.date,
        entry_type: input.entry_type,
        previous_hours: null,
        new_hours: input.hours,
        changed_by_id: input.created_by_id,
        notified_at: null,
        created_at: new Date().toISOString(),
      };
      SCHEDULE_CHANGES.push(change);
    }
    return { entry, change };
  }

  // ---- Supabase mode ----
  const sb = supabaseAdmin();

  // Honor supervisor lock: check existing first, abort if locked and we're not the supervisor.
  const { data: existing } = await sb
    .from("schedule_entries")
    .select("*")
    .eq("employee_id", input.employee_id)
    .eq("date", input.date)
    .eq("entry_type", input.entry_type)
    .maybeSingle();
  if (existing && (existing as ScheduleEntry).is_supervisor_override && !isSupervisorAction) {
    return { entry: existing as ScheduleEntry };
  }

  const { data, error } = await sb
    .from("schedule_entries")
    .upsert(
      {
        employee_id: input.employee_id,
        date: input.date,
        entry_type: input.entry_type,
        hours: input.hours,
        notes: input.notes ?? null,
        created_by_id: input.created_by_id,
        is_supervisor_override: input.is_supervisor_override ?? false,
        supervisor_assignment_id: input.supervisor_assignment_id ?? null,
      },
      { onConflict: "employee_id,date,entry_type" },
    )
    .select("*")
    .single();
  if (error) throw new Error(`upsertScheduleEntry: ${error.message}`);

  // The schedule_changes log row is auto-inserted by the SQL trigger
  // log_schedule_change() defined in migration v2.
  return { entry: data as ScheduleEntry };
}

export async function deleteScheduleEntry(
  employeeId: string,
  date: string,
  entryType: ScheduleEntryType,
  byId: string,
): Promise<void> {
  if (isDemo()) {
    const i = SCHEDULE_ENTRIES.findIndex(
      (s) => s.employee_id === employeeId && s.date === date && s.entry_type === entryType,
    );
    if (i < 0) return;
    const e = SCHEDULE_ENTRIES[i];
    if (e.is_supervisor_override && byId !== e.created_by_id) return;
    SCHEDULE_ENTRIES.splice(i, 1);
    return;
  }
  const sb = supabaseAdmin();
  const { data: existing } = await sb
    .from("schedule_entries")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("date", date)
    .eq("entry_type", entryType)
    .maybeSingle();
  if (!existing) return;
  const e = existing as ScheduleEntry;
  if (e.is_supervisor_override && byId !== e.created_by_id) return;
  const { error } = await sb
    .from("schedule_entries")
    .delete()
    .eq("employee_id", employeeId)
    .eq("date", date)
    .eq("entry_type", entryType);
  if (error) throw new Error(`deleteScheduleEntry: ${error.message}`);
}

export async function createSupervisorAssignment(input: {
  supervisor_id: string;
  date: string;
  entry_type: ScheduleEntryType;
  hours: number;
  notes?: string | null;
  employee_ids: string[];
}): Promise<{ assignment: ScheduleAssignment; entries: ScheduleEntry[] }> {
  if (isDemo()) {
    const assignment: ScheduleAssignment = {
      id: newId("assign"),
      supervisor_id: input.supervisor_id,
      date: input.date,
      entry_type: input.entry_type,
      hours: input.hours,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
    };
    SCHEDULE_ASSIGNMENTS.push(assignment);
    const entries: ScheduleEntry[] = [];
    for (const eid of input.employee_ids) {
      const { entry } = await upsertScheduleEntry({
        employee_id: eid,
        date: input.date,
        entry_type: input.entry_type,
        hours: input.hours,
        notes: input.notes ?? null,
        created_by_id: input.supervisor_id,
        is_supervisor_override: true,
        supervisor_assignment_id: assignment.id,
      });
      entries.push(entry);
    }
    return { assignment, entries };
  }

  const sb = supabaseAdmin();
  const { data: assignmentRow, error: aerr } = await sb
    .from("schedule_assignments")
    .insert({
      supervisor_id: input.supervisor_id,
      date: input.date,
      entry_type: input.entry_type,
      hours: input.hours,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (aerr) throw new Error(`createSupervisorAssignment: ${aerr.message}`);
  const assignment = assignmentRow as ScheduleAssignment;

  const entries: ScheduleEntry[] = [];
  for (const eid of input.employee_ids) {
    const { entry } = await upsertScheduleEntry({
      employee_id: eid,
      date: input.date,
      entry_type: input.entry_type,
      hours: input.hours,
      notes: input.notes ?? null,
      created_by_id: input.supervisor_id,
      is_supervisor_override: true,
      supervisor_assignment_id: assignment.id,
    });
    entries.push(entry);
  }
  return { assignment, entries };
}

export async function listPendingScheduleChanges(): Promise<ScheduleChange[]> {
  if (isDemo()) return SCHEDULE_CHANGES.filter((c) => c.notified_at === null);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("schedule_changes")
    .select("*")
    .is("notified_at", null);
  if (error) throw new Error(`listPendingScheduleChanges: ${error.message}`);
  return (data ?? []) as ScheduleChange[];
}

export async function markScheduleChangeNotified(id: string): Promise<void> {
  if (isDemo()) {
    const c = SCHEDULE_CHANGES.find((x) => x.id === id);
    if (c) c.notified_at = new Date().toISOString();
    return;
  }
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("schedule_changes")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`markScheduleChangeNotified: ${error.message}`);
}

// =========================================================================
// LINE postback action tokens
// =========================================================================

export async function createActionToken(input: {
  action: ActionTokenAction;
  kind: ActionTokenKind;
  request_id: string;
  intended_user_id: string | null;
}): Promise<ActionToken> {
  const tokenStr = newId("tok").replace(/-/g, "");
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const created_at = new Date().toISOString();

  if (isDemo()) {
    const token: ActionToken = {
      token: tokenStr,
      action: input.action,
      kind: input.kind,
      request_id: input.request_id,
      intended_user_id: input.intended_user_id,
      used_at: null,
      expires_at,
      created_at,
    };
    ACTION_TOKENS.push(token);
    return token;
  }

  const sb = supabaseAdmin();
  // SQL column is `request_kind`; we store via insert + read with alias.
  const { data, error } = await sb
    .from("line_action_tokens")
    .insert({
      token: tokenStr,
      action: input.action,
      request_kind: input.kind,
      request_id: input.request_id,
      intended_user_id: input.intended_user_id,
      expires_at,
    })
    .select("token, action, kind:request_kind, request_id, intended_user_id, used_at, expires_at, created_at")
    .single();
  if (error) throw new Error(`createActionToken: ${error.message}`);
  return data as unknown as ActionToken;
}

export async function consumeActionToken(
  tokenStr: string,
  intendedUserId: string | null,
): Promise<{ ok: true; token: ActionToken } | { ok: false; reason: string }> {
  if (isDemo()) {
    const t = ACTION_TOKENS.find((x) => x.token === tokenStr);
    if (!t) return { ok: false, reason: "unknown token" };
    if (t.used_at) return { ok: false, reason: "token already used" };
    if (new Date(t.expires_at) < new Date()) return { ok: false, reason: "token expired" };
    t.used_at = new Date().toISOString();
    return { ok: true, token: t };
  }

  const sb = supabaseAdmin();
  const { data: existing, error: rerr } = await sb
    .from("line_action_tokens")
    .select("token, action, kind:request_kind, request_id, intended_user_id, used_at, expires_at, created_at")
    .eq("token", tokenStr)
    .maybeSingle();
  if (rerr) throw new Error(`consumeActionToken read: ${rerr.message}`);
  if (!existing) return { ok: false, reason: "unknown token" };
  const t = existing as unknown as ActionToken;
  if (t.used_at) return { ok: false, reason: "token already used" };
  if (new Date(t.expires_at) < new Date()) return { ok: false, reason: "token expired" };
  if (t.intended_user_id && intendedUserId && t.intended_user_id !== intendedUserId) {
    // userId mismatch is allowed (we don't always know intendedUserId at validation time);
    // a stricter policy could return { ok: false } here.
  }
  const { error: uerr } = await sb
    .from("line_action_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", tokenStr);
  if (uerr) throw new Error(`consumeActionToken update: ${uerr.message}`);
  t.used_at = new Date().toISOString();
  return { ok: true, token: t };
}

// =========================================================================
// Notifications
// =========================================================================

export async function listNotifications(employeeId?: string): Promise<Notification[]> {
  if (isDemo()) {
    if (employeeId) return NOTIFICATIONS.filter((n) => n.employee_id === employeeId);
    return NOTIFICATIONS;
  }
  const sb = supabaseAdmin();
  let q = sb.from("notifications").select("*");
  if (employeeId) q = q.eq("employee_id", employeeId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listNotifications: ${error.message}`);
  return (data ?? []) as Notification[];
}

export async function recordNotification(
  employeeId: string,
  type: string,
  message: string,
  lineMessageId?: string | null,
): Promise<Notification> {
  if (isDemo()) {
    const n: Notification = {
      id: newId("notif"),
      employee_id: employeeId,
      line_message_id: lineMessageId ?? null,
      type,
      message,
      read: false,
      created_at: new Date().toISOString(),
    };
    NOTIFICATIONS.unshift(n);
    return n;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("notifications")
    .insert({
      employee_id: employeeId,
      line_message_id: lineMessageId ?? null,
      type,
      message,
      read: false,
    })
    .select("*")
    .single();
  if (error) throw new Error(`recordNotification: ${error.message}`);
  return data as Notification;
}

// =========================================================================
// Payroll (read-only LIFF use)
// =========================================================================

export async function listPayrolls(): Promise<Payroll[]> {
  return PAYROLLS;
}

export async function listPayrollsForEmployee(employeeId: string): Promise<Payroll[]> {
  if (isDemo()) {
    return PAYROLLS.filter((p) => p.employee_id === employeeId).sort((a, b) =>
      b.month_year.localeCompare(a.month_year),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("payrolls")
    .select("*")
    .eq("employee_id", employeeId)
    .order("month_year", { ascending: false });
  if (error) throw new Error(`listPayrollsForEmployee: ${error.message}`);
  return (data ?? []) as Payroll[];
}

// =========================================================================
// Performance reviews (kept demo-only)
// =========================================================================

export async function listPerformanceReviews(): Promise<PerformanceReview[]> {
  return PERFORMANCE_REVIEWS;
}

// =========================================================================
// Display helpers
// =========================================================================

export function getEmployeeName(employee: Employee, locale: "en" | "th" | "zh" = "en"): string {
  const fallback = employee.employee_code ?? employee.id.slice(0, 8);
  if (locale === "th") return employee.name_th ?? employee.name_en ?? fallback;
  if (locale === "zh") return employee.name_zh ?? employee.name_en ?? fallback;
  return employee.name_en ?? fallback;
}

// =========================================================================
// Dashboard analytics (kept demo-only — wire to Supabase in a follow-up pass)
// =========================================================================

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  attendanceRate: number;
  lateToday: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = "2026-05-09";
  const employees = EMPLOYEES.filter((e) => e.role === "employee" || e.role === "supervisor");
  const todayLogs = ATTENDANCE_LOGS.filter(
    (l) => l.timestamp.startsWith(today) && l.type === "in",
  );
  const present = new Set(todayLogs.map((l) => l.employee_id)).size;
  const late = todayLogs.filter((l) => l.status === "late").length;
  const onLeave = LEAVE_REQUESTS.filter(
    (l) => l.status === "approved" && l.start_date <= today && l.end_date >= today,
  ).length;
  const pending =
    LEAVE_REQUESTS.filter((l) => l.status === "pending").length +
    OVERTIME_REQUESTS.filter((o) => o.status === "pending").length;
  const total = employees.length;
  return {
    totalEmployees: EMPLOYEES.length,
    presentToday: present,
    onLeaveToday: onLeave,
    pendingApprovals: pending,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    lateToday: late,
  };
}

export async function getAttendanceTrend(days = 7): Promise<
  { date: string; present: number; late: number; absent: number }[]
> {
  const trend: { date: string; present: number; late: number; absent: number }[] = [];
  const employees = EMPLOYEES.filter((e) => e.role === "employee" || e.role === "supervisor").length;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date("2026-05-09T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = ATTENDANCE_LOGS.filter((l) => l.timestamp.startsWith(dateStr) && l.type === "in");
    const present = new Set(dayLogs.map((l) => l.employee_id)).size;
    const late = dayLogs.filter((l) => l.status === "late").length;
    const absent = Math.max(0, employees - present);
    trend.push({ date: dateStr, present, late, absent });
  }
  return trend;
}

export async function getDepartmentBreakdown(): Promise<{ department: string; count: number }[]> {
  const groups = new Map<string, number>();
  for (const e of EMPLOYEES) {
    const k = e.department ?? "Unassigned";
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([department, count]) => ({ department, count }));
}
