import "server-only";

import {
  getOrganizationById,
  listAttendanceLogs,
  listContactRequestsForOrg,
  listEmployeeShifts,
  listEmployeesForOrg,
  listLeaveRequestsForOrg,
  listOvertimeRequestsForOrg,
  listPayrolls,
  listPerformanceReviews,
} from "@/lib/data";
import type {
  AttendanceLog,
  ContactRequest,
  Employee,
  EmployeeShift,
  LeaveRequest,
  Organization,
  OvertimeRequest,
  Payroll,
  PerformanceReview,
} from "@/lib/types";

export interface AnalyticsDailyAttendance {
  date: string;
  scheduled: number;
  present: number;
  onTime: number;
  late: number;
  absent: number;
  onLeave: number;
  attendanceRate: number;
}

export interface AnalyticsDepartmentRow {
  department: string;
  headcount: number;
  attendanceRate: number;
  lateRate: number;
  approvedOtHours: number;
  latestGrossPay: number;
  latestNetPay: number;
  averageKpi: number | null;
}

export interface AnalyticsPayrollMonth {
  month: string;
  grossPay: number;
  netPay: number;
  employeeSso: number;
  employerSso: number;
  withholdingTax: number;
}

export interface AnalyticsLeaveTypeRow {
  type: LeaveRequest["leave_type"];
  approvedDays: number;
  pendingDays: number;
  rejectedDays: number;
}

export interface AnalyticsRiskRow {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  scheduledDays: number;
  absentDays: number;
  lateDays: number;
  approvedOtHours: number;
  approvedLeaveDays: number;
  riskScore: number;
  level: "low" | "medium" | "high";
}

export interface AnalyticsDataQualityIssue {
  key: "missing_salary" | "missing_line" | "missing_supervisor" | "missing_shift";
  count: number;
  label: string;
}

export interface AnalyticsSummary {
  activeHeadcount: number;
  scheduledEmployeeDays: number;
  presentEmployeeDays: number;
  attendanceRate: number;
  punctualityRate: number;
  approvedOtHours: number;
  approvedLeaveDays: number;
  pendingApprovals: number;
  averageApprovalHours: number | null;
  latestPayrollMonth: string | null;
  latestGrossPayroll: number;
  latestNetPayroll: number;
  employerSsoCost: number;
  recordedGeofencePassRate: number | null;
  lineBindingRate: number;
  salaryCoverageRate: number;
}

export interface AnalyticsRawData {
  organization: Organization;
  employees: Employee[];
  attendance: AttendanceLog[];
  employeeShifts: EmployeeShift[];
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  contactRequests: ContactRequest[];
  payrolls: Payroll[];
  performanceReviews: PerformanceReview[];
}

export interface WorkforceAnalytics {
  organization: Organization;
  scope: "organization" | "team";
  asOfDate: string;
  rangeStart: string;
  rangeEnd: string;
  days: number;
  summary: AnalyticsSummary;
  dailyAttendance: AnalyticsDailyAttendance[];
  departments: AnalyticsDepartmentRow[];
  payrollTrend: AnalyticsPayrollMonth[];
  leaveByType: AnalyticsLeaveTypeRow[];
  risks: AnalyticsRiskRow[];
  dataQuality: AnalyticsDataQualityIssue[];
  raw: AnalyticsRawData;
}

export interface WorkforceAnalyticsOptions {
  orgId: string;
  days?: number;
  employeeIds?: string[];
  scope?: "organization" | "team";
}

function clampDays(value: number | undefined): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(180, Math.max(7, Math.round(value ?? 30)));
}

function datePlus(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isWeekday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + Number(value || 0), 0) * 100) / 100;
}

function employeeName(employee: Employee): string {
  return employee.name_th ?? employee.name_en ?? employee.employee_code ?? employee.id.slice(0, 8);
}

function within(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function hoursBetween(start: string, end: string | null): number | null {
  if (!end) return null;
  const duration = new Date(end).getTime() - new Date(start).getTime();
  return duration >= 0 ? duration / 3_600_000 : null;
}

export async function getWorkforceAnalytics(
  options: WorkforceAnalyticsOptions,
): Promise<WorkforceAnalytics> {
  const days = clampDays(options.days);
  const organization = await getOrganizationById(options.orgId);
  if (!organization) throw new Error("Organization not found.");

  const [allEmployees, allAttendance, allEmployeeShifts, allLeave, allOvertime, allContacts, allPayrolls, allReviews] =
    await Promise.all([
      listEmployeesForOrg(options.orgId),
      listAttendanceLogs(options.orgId),
      listEmployeeShifts(options.orgId),
      listLeaveRequestsForOrg(options.orgId),
      listOvertimeRequestsForOrg(options.orgId),
      listContactRequestsForOrg(options.orgId),
      listPayrolls(options.orgId),
      listPerformanceReviews(options.orgId),
    ]);

  const requestedScope = options.employeeIds ? new Set(options.employeeIds) : null;
  const employees = requestedScope
    ? allEmployees.filter((employee) => requestedScope.has(employee.id))
    : allEmployees;
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const attendance = allAttendance.filter((row) => employeeIds.has(row.employee_id));
  const employeeShifts = allEmployeeShifts.filter((row) => employeeIds.has(row.employee_id));
  const leaveRequests = allLeave.filter((row) => employeeIds.has(row.employee_id));
  const overtimeRequests = allOvertime.filter((row) => employeeIds.has(row.employee_id));
  const contactRequests = allContacts.filter((row) => employeeIds.has(row.employee_id));
  const payrolls = allPayrolls.filter((row) => employeeIds.has(row.employee_id));
  const performanceReviews = allReviews.filter((row) => employeeIds.has(row.employee_id));

  const asOfDate =
    attendance.find((row) => row.type === "in")?.timestamp.slice(0, 10) ??
    payrolls[0]?.month_year.concat("-28") ??
    new Date().toISOString().slice(0, 10);
  const rangeEnd = asOfDate;
  const rangeStart = datePlus(rangeEnd, -(days - 1));
  const activeEmployees = employees.filter((employee) => employee.account_status === "active");
  // Synthetic demo rows intentionally do not carry fake LINE identities. Do
  // not report that deliberate privacy choice as a production onboarding gap.
  const lineOnboardingPopulation = activeEmployees.filter(
    (employee) => employee.metadata?.demo_seed !== true,
  );
  const activeIds = new Set(activeEmployees.map((employee) => employee.id));
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

  const rangeAttendance = attendance.filter((row) =>
    within(row.timestamp.slice(0, 10), rangeStart, rangeEnd),
  );
  const rangeShifts = employeeShifts.filter((row) => within(row.date, rangeStart, rangeEnd));
  const rangeLeaves = leaveRequests.filter(
    (row) => row.start_date <= rangeEnd && row.end_date >= rangeStart,
  );
  const rangeOvertime = overtimeRequests.filter((row) => within(row.date, rangeStart, rangeEnd));

  const shiftsByDate = new Map<string, Set<string>>();
  for (const shift of rangeShifts) {
    if (!activeIds.has(shift.employee_id)) continue;
    const set = shiftsByDate.get(shift.date) ?? new Set<string>();
    set.add(shift.employee_id);
    shiftsByDate.set(shift.date, set);
  }
  const checkInsByDate = new Map<string, Map<string, AttendanceLog>>();
  for (const log of rangeAttendance) {
    if (log.type !== "in" || !activeIds.has(log.employee_id)) continue;
    const date = log.timestamp.slice(0, 10);
    const byEmployee = checkInsByDate.get(date) ?? new Map<string, AttendanceLog>();
    if (!byEmployee.has(log.employee_id)) byEmployee.set(log.employee_id, log);
    checkInsByDate.set(date, byEmployee);
  }

  const expectedDaysByEmployee = new Map<string, number>();
  const presentDaysByEmployee = new Map<string, number>();
  const lateDaysByEmployee = new Map<string, number>();
  const departmentExpected = new Map<string, number>();
  const departmentPresent = new Map<string, number>();
  const departmentLate = new Map<string, number>();
  const dailyAttendance: AnalyticsDailyAttendance[] = [];

  for (let index = 0; index < days; index += 1) {
    const date = datePlus(rangeStart, index);
    const explicitlyScheduled = shiftsByDate.get(date);
    const scheduledIds = explicitlyScheduled
      ? new Set(explicitlyScheduled)
      : isWeekday(date)
        ? new Set(activeIds)
        : new Set<string>();
    const approvedLeaveIds = new Set(
      rangeLeaves
        .filter(
          (leave) =>
            leave.status === "approved" && leave.start_date <= date && leave.end_date >= date,
        )
        .map((leave) => leave.employee_id),
    );
    const expectedIds = new Set(
      Array.from(scheduledIds).filter((employeeId) => !approvedLeaveIds.has(employeeId)),
    );
    const checkIns = checkInsByDate.get(date) ?? new Map<string, AttendanceLog>();
    const presentIds = new Set(
      Array.from(checkIns.keys()).filter((employeeId) => expectedIds.has(employeeId)),
    );
    const lateIds = new Set(
      Array.from(presentIds).filter((employeeId) => checkIns.get(employeeId)?.status === "late"),
    );

    for (const employeeId of expectedIds) {
      expectedDaysByEmployee.set(employeeId, (expectedDaysByEmployee.get(employeeId) ?? 0) + 1);
      const department = employeeMap.get(employeeId)?.department ?? "Unassigned";
      departmentExpected.set(department, (departmentExpected.get(department) ?? 0) + 1);
    }
    for (const employeeId of presentIds) {
      presentDaysByEmployee.set(employeeId, (presentDaysByEmployee.get(employeeId) ?? 0) + 1);
      const department = employeeMap.get(employeeId)?.department ?? "Unassigned";
      departmentPresent.set(department, (departmentPresent.get(department) ?? 0) + 1);
    }
    for (const employeeId of lateIds) {
      lateDaysByEmployee.set(employeeId, (lateDaysByEmployee.get(employeeId) ?? 0) + 1);
      const department = employeeMap.get(employeeId)?.department ?? "Unassigned";
      departmentLate.set(department, (departmentLate.get(department) ?? 0) + 1);
    }

    dailyAttendance.push({
      date,
      scheduled: expectedIds.size,
      present: presentIds.size,
      onTime: Math.max(0, presentIds.size - lateIds.size),
      late: lateIds.size,
      absent: Math.max(0, expectedIds.size - presentIds.size),
      onLeave: approvedLeaveIds.size,
      attendanceRate: percent(presentIds.size, expectedIds.size),
    });
  }

  const approvedOvertime = rangeOvertime.filter((request) => request.status === "approved");
  const approvedLeaves = rangeLeaves.filter((request) => request.status === "approved");
  const latestPayrollMonth = payrolls.map((payroll) => payroll.month_year).sort().at(-1) ?? null;
  const latestPayrolls = latestPayrollMonth
    ? payrolls.filter((payroll) => payroll.month_year === latestPayrollMonth)
    : [];
  const scheduledEmployeeDays = sum(dailyAttendance.map((row) => row.scheduled));
  const presentEmployeeDays = sum(dailyAttendance.map((row) => row.present));
  const totalCheckIns = sum(dailyAttendance.map((row) => row.present));
  const totalOnTime = sum(dailyAttendance.map((row) => row.onTime));

  const approvalHours = [
    ...leaveRequests.map((request) => hoursBetween(request.created_at, request.decided_at)),
    ...overtimeRequests.map((request) => hoursBetween(request.created_at, request.decided_at)),
    ...contactRequests.map((request) => hoursBetween(request.created_at, request.decided_at)),
  ].filter((value): value is number => value != null);

  const geofenceDecisions = rangeAttendance.filter(
    (row) => row.geofence_result === "inside" || row.geofence_result === "outside",
  );
  const geofenceInside = geofenceDecisions.filter((row) => row.geofence_result === "inside").length;

  const departments = Array.from(
    new Set(activeEmployees.map((employee) => employee.department ?? "Unassigned")),
  )
    .map((department): AnalyticsDepartmentRow => {
      const departmentEmployeeIds = new Set(
        activeEmployees
          .filter((employee) => (employee.department ?? "Unassigned") === department)
          .map((employee) => employee.id),
      );
      const otHours = sum(
        approvedOvertime
          .filter((request) => departmentEmployeeIds.has(request.employee_id))
          .map((request) => request.hours),
      );
      const departmentPayrolls = latestPayrolls.filter((payroll) =>
        departmentEmployeeIds.has(payroll.employee_id),
      );
      const kpiScores = performanceReviews
        .filter((review) => departmentEmployeeIds.has(review.employee_id))
        .map((review) => review.kpi_score);
      const expected = departmentExpected.get(department) ?? 0;
      const present = departmentPresent.get(department) ?? 0;
      return {
        department,
        headcount: departmentEmployeeIds.size,
        attendanceRate: percent(present, expected),
        lateRate: percent(departmentLate.get(department) ?? 0, present),
        approvedOtHours: otHours,
        latestGrossPay: sum(
          departmentPayrolls.map(
            (payroll) => payroll.gross_pay || payroll.base_pay + payroll.ot_pay,
          ),
        ),
        latestNetPay: sum(departmentPayrolls.map((payroll) => payroll.net_pay)),
        averageKpi:
          kpiScores.length > 0 ? Math.round((sum(kpiScores) / kpiScores.length) * 10) / 10 : null,
      };
    })
    .sort((a, b) => b.headcount - a.headcount || a.department.localeCompare(b.department));

  const payrollTrend = Array.from(new Set(payrolls.map((payroll) => payroll.month_year)))
    .sort()
    .slice(-6)
    .map((month): AnalyticsPayrollMonth => {
      const rows = payrolls.filter((payroll) => payroll.month_year === month);
      return {
        month,
        grossPay: sum(rows.map((payroll) => payroll.gross_pay || payroll.base_pay + payroll.ot_pay)),
        netPay: sum(rows.map((payroll) => payroll.net_pay)),
        employeeSso: sum(rows.map((payroll) => payroll.ssf_deduction)),
        employerSso: sum(
          rows.map(
            (payroll) => payroll.employer_sso_contribution || payroll.ssf_deduction,
          ),
        ),
        withholdingTax: sum(rows.map((payroll) => payroll.tax_deduction)),
      };
    });

  const leaveTypes: LeaveRequest["leave_type"][] = ["annual", "sick", "personal", "maternity"];
  const leaveByType = leaveTypes.map((type): AnalyticsLeaveTypeRow => ({
    type,
    approvedDays: sum(rangeLeaves.filter((row) => row.leave_type === type && row.status === "approved").map((row) => row.days)),
    pendingDays: sum(rangeLeaves.filter((row) => row.leave_type === type && row.status === "pending").map((row) => row.days)),
    rejectedDays: sum(rangeLeaves.filter((row) => row.leave_type === type && row.status === "rejected").map((row) => row.days)),
  }));

  const otByEmployee = new Map<string, number>();
  for (const request of approvedOvertime) {
    otByEmployee.set(request.employee_id, (otByEmployee.get(request.employee_id) ?? 0) + request.hours);
  }
  const leaveByEmployee = new Map<string, number>();
  for (const request of approvedLeaves) {
    leaveByEmployee.set(request.employee_id, (leaveByEmployee.get(request.employee_id) ?? 0) + request.days);
  }
  const risks = activeEmployees
    .map((employee): AnalyticsRiskRow => {
      const scheduledDays = expectedDaysByEmployee.get(employee.id) ?? 0;
      const presentDays = presentDaysByEmployee.get(employee.id) ?? 0;
      const absentDays = Math.max(0, scheduledDays - presentDays);
      const lateDays = lateDaysByEmployee.get(employee.id) ?? 0;
      const approvedOtHours = Math.round((otByEmployee.get(employee.id) ?? 0) * 10) / 10;
      const approvedLeaveDays = Math.round((leaveByEmployee.get(employee.id) ?? 0) * 10) / 10;
      const riskScore = Math.min(
        100,
        Math.round(absentDays * 18 + lateDays * 7 + Math.max(0, approvedOtHours - 12) * 2),
      );
      return {
        employeeId: employee.id,
        employeeCode: employee.employee_code ?? "—",
        name: employeeName(employee),
        department: employee.department ?? "Unassigned",
        scheduledDays,
        absentDays,
        lateDays,
        approvedOtHours,
        approvedLeaveDays,
        riskScore,
        level: riskScore >= 55 ? "high" : riskScore >= 25 ? "medium" : "low",
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore || b.absentDays - a.absentDays);

  const missingShiftIds = new Set(employeeShifts.map((shift) => shift.employee_id));
  const dataQuality: AnalyticsDataQualityIssue[] = [
    {
      key: "missing_salary",
      label: "Active employees without salary",
      count: activeEmployees.filter((employee) => !employee.base_salary || employee.base_salary <= 0).length,
    },
    {
      key: "missing_line",
      label: "Active real profiles not bound to LINE (synthetic demo rows excluded)",
      count: lineOnboardingPopulation.filter((employee) => !employee.line_user_id).length,
    },
    {
      key: "missing_supervisor",
      label: "Employees without an approval supervisor",
      count: activeEmployees.filter(
        (employee) =>
          employee.role === "employee" &&
          !employee.leave_supervisor_id &&
          !employee.ot_supervisor_id &&
          !employee.contact_supervisor_id,
      ).length,
    },
    {
      key: "missing_shift",
      label: "Active employees without a shift assignment",
      count: activeEmployees.filter((employee) => !missingShiftIds.has(employee.id)).length,
    },
  ];

  return {
    organization,
    scope: options.scope ?? (requestedScope ? "team" : "organization"),
    asOfDate,
    rangeStart,
    rangeEnd,
    days,
    summary: {
      activeHeadcount: activeEmployees.length,
      scheduledEmployeeDays,
      presentEmployeeDays,
      attendanceRate: percent(presentEmployeeDays, scheduledEmployeeDays),
      punctualityRate: percent(totalOnTime, totalCheckIns),
      approvedOtHours: sum(approvedOvertime.map((request) => request.hours)),
      approvedLeaveDays: sum(approvedLeaves.map((request) => request.days)),
      pendingApprovals:
        leaveRequests.filter((request) => request.status === "pending").length +
        overtimeRequests.filter((request) => request.status === "pending").length +
        contactRequests.filter((request) => request.status === "pending").length,
      averageApprovalHours:
        approvalHours.length > 0
          ? Math.round((sum(approvalHours) / approvalHours.length) * 10) / 10
          : null,
      latestPayrollMonth,
      latestGrossPayroll: sum(
        latestPayrolls.map((payroll) => payroll.gross_pay || payroll.base_pay + payroll.ot_pay),
      ),
      latestNetPayroll: sum(latestPayrolls.map((payroll) => payroll.net_pay)),
      employerSsoCost: sum(
        latestPayrolls.map(
          (payroll) => payroll.employer_sso_contribution || payroll.ssf_deduction,
        ),
      ),
      recordedGeofencePassRate:
        geofenceDecisions.length > 0 ? percent(geofenceInside, geofenceDecisions.length) : null,
      lineBindingRate: percent(
        lineOnboardingPopulation.filter((employee) => employee.line_user_id).length,
        lineOnboardingPopulation.length,
      ),
      salaryCoverageRate: percent(
        activeEmployees.filter((employee) => employee.base_salary && employee.base_salary > 0).length,
        activeEmployees.length,
      ),
    },
    dailyAttendance,
    departments,
    payrollTrend,
    leaveByType,
    risks,
    dataQuality,
    raw: {
      organization,
      employees,
      attendance,
      employeeShifts,
      leaveRequests,
      overtimeRequests,
      contactRequests,
      payrolls,
      performanceReviews,
    },
  };
}
