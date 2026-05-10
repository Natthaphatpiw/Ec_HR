import {
  ATTENDANCE_LOGS,
  EMPLOYEES,
  EMPLOYEE_SHIFTS,
  LEAVE_REQUESTS,
  NOTIFICATIONS,
  ORGANIZATION,
  OVERTIME_REQUESTS,
  PAYROLLS,
  PERFORMANCE_REVIEWS,
  SHIFTS,
} from "./demo-data";
import type {
  AttendanceLog,
  Employee,
  EmployeeShift,
  LeaveRequest,
  Notification,
  Organization,
  OvertimeRequest,
  Payroll,
  PerformanceReview,
  Shift,
} from "./types";

const DEMO = (process.env.DEMO_MODE ?? "true") === "true";

function isDemo(): boolean {
  return DEMO || !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export async function getOrganization(): Promise<Organization> {
  return ORGANIZATION;
}

export async function listEmployees(): Promise<Employee[]> {
  if (isDemo()) return EMPLOYEES;
  return EMPLOYEES;
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  return EMPLOYEES.find((e) => e.id === id);
}

export async function getEmployeeByLineId(lineUserId: string): Promise<Employee | undefined> {
  return EMPLOYEES.find((e) => e.line_user_id === lineUserId);
}

export async function getEmployeeByCode(code: string): Promise<Employee | undefined> {
  return EMPLOYEES.find((e) => e.employee_code === code.toUpperCase().trim());
}

export async function listShifts(): Promise<Shift[]> {
  return SHIFTS;
}

export async function listEmployeeShifts(): Promise<EmployeeShift[]> {
  return EMPLOYEE_SHIFTS;
}

export async function listAttendanceLogs(): Promise<AttendanceLog[]> {
  return [...ATTENDANCE_LOGS].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function listAttendanceForEmployee(employeeId: string): Promise<AttendanceLog[]> {
  return ATTENDANCE_LOGS.filter((l) => l.employee_id === employeeId).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  return [...LEAVE_REQUESTS].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listLeaveForEmployee(employeeId: string): Promise<LeaveRequest[]> {
  return LEAVE_REQUESTS.filter((l) => l.employee_id === employeeId);
}

export async function listOvertimeRequests(): Promise<OvertimeRequest[]> {
  return [...OVERTIME_REQUESTS].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function listOvertimeForEmployee(employeeId: string): Promise<OvertimeRequest[]> {
  return OVERTIME_REQUESTS.filter((o) => o.employee_id === employeeId);
}

export async function listPayrolls(): Promise<Payroll[]> {
  return PAYROLLS;
}

export async function listPayrollsForEmployee(employeeId: string): Promise<Payroll[]> {
  return PAYROLLS.filter((p) => p.employee_id === employeeId).sort((a, b) =>
    b.month_year.localeCompare(a.month_year),
  );
}

export async function listPerformanceReviews(): Promise<PerformanceReview[]> {
  return PERFORMANCE_REVIEWS;
}

export async function listNotifications(employeeId?: string): Promise<Notification[]> {
  if (employeeId) return NOTIFICATIONS.filter((n) => n.employee_id === employeeId);
  return NOTIFICATIONS;
}

export function getEmployeeName(employee: Employee, locale: "en" | "th" | "zh" = "en"): string {
  if (locale === "th") return employee.name_th ?? employee.name_en ?? employee.employee_code;
  if (locale === "zh") return employee.name_zh ?? employee.name_en ?? employee.employee_code;
  return employee.name_en ?? employee.employee_code;
}

export function getLeaveBalance(employeeId: string): {
  annual: { used: number; total: number };
  sick: { used: number; total: number };
  personal: { used: number; total: number };
} {
  const used = LEAVE_REQUESTS.filter(
    (l) => l.employee_id === employeeId && l.status === "approved",
  );
  const sumDays = (type: string) =>
    used.filter((l) => l.leave_type === type).reduce((acc, l) => acc + l.days, 0);
  return {
    annual: { used: sumDays("annual"), total: 10 },
    sick: { used: sumDays("sick"), total: 30 },
    personal: { used: sumDays("personal"), total: 3 },
  };
}

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
