import "server-only";

import demoWorkforceJson from "@/data/demo-workforce-2026.json";
import type {
  AnalyticsDailyAttendance,
  AnalyticsDepartmentRow,
  AnalyticsLeaveTypeRow,
  AnalyticsPayrollMonth,
  WorkforceAnalytics,
} from "@/lib/analytics";
import type {
  AttendanceLog,
  Employee,
  EmployeeShift,
  LeaveRequest,
  Organization,
  OvertimeRequest,
  Payroll,
} from "@/lib/types";
import { isExactDemoWorkforceOrg } from "@/lib/demo-workforce-source";

export const DEMO_WORKFORCE_SOURCE_ID = "workforce-json-2026";
export const DEMO_WORKFORCE_ORG_ID = "11111111-1111-1111-1111-111111111111";
const DEMO_WORKFORCE_COMPANY_NAME = "บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด";
const DEMO_WORKFORCE_SHIFT_ID = "22222222-2222-2222-2222-222222222201";

export type DemoDayStatus = "workday" | "leave" | "absent";
export type DemoArrivalStatus = "before_shift" | "on_time" | "late" | "not_applicable";
export type DemoDepartureStatus =
  | "early_departure"
  | "on_time"
  | "after_shift"
  | "not_applicable";
export type DemoGeofenceResult = "inside" | "not_recorded";

export type DemoWorkforceRecordTuple = [
  employeeId: string,
  checkIn: string | null,
  checkOut: string | null,
  dayStatus: DemoDayStatus,
  arrivalStatus: DemoArrivalStatus,
  departureStatus: DemoDepartureStatus,
  geofenceResult: DemoGeofenceResult,
];

export interface DemoWorkforceEmployee {
  id: string;
  employeeCode: string;
  nameTh: string;
  nameEn: string;
  nameZh: string;
  department: string;
  position: string;
  role: Employee["role"];
  baseSalary: number;
  lineBound: boolean;
  supervisorId: string | null;
  shiftGroup: string | null;
  hireDate: string;
  employmentType: Employee["employment_type"];
}

export interface DemoWorkforceDay {
  date: string;
  records: DemoWorkforceRecordTuple[];
}

export interface DemoWorkforceLeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveRequest["leave_type"];
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveRequest["status"];
  createdAt: string;
  decidedAt: string | null;
}

export interface DemoWorkforceOvertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  status: OvertimeRequest["status"];
  reason: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface DemoWorkforcePayroll {
  id: string;
  employeeId: string;
  month: string;
  basePay: number;
  otPay: number;
  allowancePay: number;
  bonusPay: number;
  otherIncome: number;
  employeeSso: number;
  employerSso: number;
  withholdingTax: number;
  otherDeductions: number;
  grossPay: number;
  taxableIncome: number;
  annualizedTaxableIncome: number;
  annualTax: number;
  netPay: number;
  status: Payroll["calculation_status"];
  calculatedAt: string;
}

export interface DemoWorkforceDataset {
  schemaVersion: "1.0";
  sourceId: typeof DEMO_WORKFORCE_SOURCE_ID;
  generatedAt: string;
  organization: {
    id: string;
    name: string;
    businessName: string;
    businessType: NonNullable<Organization["business_type"]>;
    timezone: string;
    geofence: {
      enabled: boolean;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    };
  };
  period: {
    startDate: string;
    endDate: string;
    weekdayCount: number;
  };
  shift: {
    id: string;
    name: string;
    start: string;
    end: string;
    breakMinutes: number;
  };
  recordColumns: [
    "employeeId",
    "checkIn",
    "checkOut",
    "dayStatus",
    "arrivalStatus",
    "departureStatus",
    "geofenceResult",
  ];
  employees: DemoWorkforceEmployee[];
  daily: DemoWorkforceDay[];
  leaveRequests: DemoWorkforceLeaveRequest[];
  overtimeRequests: DemoWorkforceOvertimeRequest[];
  payroll: DemoWorkforcePayroll[];
}

export interface DemoDailyRosterRow {
  date: string;
  employeeId: string;
  employeeCode: string;
  nameTh: string;
  nameEn: string;
  department: string;
  position: string;
  shiftStart: string;
  shiftEnd: string;
  checkIn: string | null;
  checkOut: string | null;
  dayStatus: DemoDayStatus;
  arrivalStatus: DemoArrivalStatus;
  departureStatus: DemoDepartureStatus;
  geofenceResult: DemoGeofenceResult;
}

export interface DemoEmployeeAttendanceStats {
  employeeId: string;
  employeeCode: string;
  nameTh: string;
  nameEn: string;
  department: string;
  position: string;
  scheduledDays: number;
  recordedWorkdays: number;
  leaveDays: number;
  absentDays: number;
  beforeShiftArrivals: number;
  onTimeArrivals: number;
  lateArrivals: number;
  earlyDepartures: number;
  onTimeDepartures: number;
  afterShiftDepartures: number;
  averageCheckIn: string | null;
  averageCheckOut: string | null;
  /** Negative means before shift start; positive means after shift start. */
  averageArrivalOffsetMinutes: number | null;
  /** Negative means before shift end; positive means after shift end. */
  averageDepartureOffsetMinutes: number | null;
  averageWorkedHours: number | null;
  attendanceRate: number;
  punctualityRate: number;
}

export interface DemoWorkforceRange {
  startDate?: string;
  endDate?: string;
}

export interface DemoWorkforceAnalyticsOptions {
  orgId?: string;
  scope?: WorkforceAnalytics["scope"];
  startDate?: string;
  endDate?: string;
}

const EXPECTED_COLUMNS = [
  "employeeId",
  "checkIn",
  "checkOut",
  "dayStatus",
  "arrivalStatus",
  "departureStatus",
  "geofenceResult",
].join("|");
const CLOCK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const CORE_EMPLOYEE_IDENTITIES = Array.from({ length: 10 }, (_, index) => ({
  id: `33333333-3333-3333-3333-3333333333${String(index + 1).padStart(2, "0")}`,
  code: `EMP${String(index + 1).padStart(3, "0")}`,
}));

let validatedDataset: DemoWorkforceDataset | null = null;

function datePlus(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isWeekday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function expectedWeekdays(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  for (let date = startDate; date <= endDate; date = datePlus(date, 1)) {
    if (isWeekday(date)) result.push(date);
  }
  return result;
}

function assertDataset(dataset: DemoWorkforceDataset): void {
  if (dataset.sourceId !== DEMO_WORKFORCE_SOURCE_ID) {
    throw new Error("Demo workforce source identifier is invalid.");
  }
  if (dataset.organization.id !== DEMO_WORKFORCE_ORG_ID) {
    throw new Error("Demo workforce organization identifier is invalid.");
  }
  if (
    dataset.organization.name !== DEMO_WORKFORCE_COMPANY_NAME ||
    dataset.organization.businessName !== DEMO_WORKFORCE_COMPANY_NAME
  ) {
    throw new Error("Demo workforce organization name is invalid.");
  }
  if (dataset.period.startDate !== "2026-05-16" || dataset.period.endDate !== "2026-07-15") {
    throw new Error("Demo workforce period must be 2026-05-16 through 2026-07-15.");
  }
  if (dataset.recordColumns.join("|") !== EXPECTED_COLUMNS) {
    throw new Error("Demo workforce record columns do not match the loader contract.");
  }
  if (
    dataset.shift.id !== DEMO_WORKFORCE_SHIFT_ID ||
    !CLOCK_TIME_PATTERN.test(dataset.shift.start) ||
    !CLOCK_TIME_PATTERN.test(dataset.shift.end)
  ) {
    throw new Error("Demo workforce shift contains an invalid clock time.");
  }
  if (dataset.employees.length !== 10) {
    throw new Error("Demo workforce dataset must contain exactly 10 employees.");
  }

  const employeeIds = new Set(dataset.employees.map((employee) => employee.id));
  if (employeeIds.size !== dataset.employees.length) {
    throw new Error("Demo workforce employee identifiers must be unique.");
  }
  const employeeCodes = new Set(dataset.employees.map((employee) => employee.employeeCode));
  if (employeeCodes.size !== dataset.employees.length) {
    throw new Error("Demo workforce employee codes must be unique.");
  }
  for (const [index, expected] of CORE_EMPLOYEE_IDENTITIES.entries()) {
    const employee = dataset.employees[index];
    if (employee.id !== expected.id || employee.employeeCode !== expected.code) {
      throw new Error(`Demo workforce employee ${index + 1} does not match the core seed identity.`);
    }
    if (employee.supervisorId && !employeeIds.has(employee.supervisorId)) {
      throw new Error(`Demo workforce employee ${employee.employeeCode} has an invalid supervisor.`);
    }
  }

  const weekdays = expectedWeekdays(dataset.period.startDate, dataset.period.endDate);
  if (weekdays.length !== 43 || dataset.period.weekdayCount !== weekdays.length) {
    throw new Error("Demo workforce period must contain exactly 43 weekdays.");
  }
  if (dataset.daily.length !== weekdays.length) {
    throw new Error("Demo workforce dataset must contain one row for every weekday.");
  }

  const generatedAt = Date.parse(dataset.generatedAt);
  if (!Number.isFinite(generatedAt)) {
    throw new Error("Demo workforce generatedAt timestamp is invalid.");
  }

  for (const [index, day] of dataset.daily.entries()) {
    if (day.date !== weekdays[index]) {
      throw new Error(`Demo workforce date sequence is incomplete at ${weekdays[index]}.`);
    }
    if (day.records.length !== dataset.employees.length) {
      throw new Error(`Demo workforce date ${day.date} must contain all 10 employees.`);
    }
    const recordedIds = new Set<string>();
    for (const record of day.records) {
      if (record.length !== 7 || !employeeIds.has(record[0])) {
        throw new Error(`Demo workforce date ${day.date} contains an invalid record.`);
      }
      if (recordedIds.has(record[0])) {
        throw new Error(`Demo workforce date ${day.date} contains a duplicate employee.`);
      }
      recordedIds.add(record[0]);
      const [, checkIn, checkOut, dayStatus, arrivalStatus, departureStatus] = record;
      if (dayStatus === "workday") {
        if (!checkIn || !checkOut || arrivalStatus === "not_applicable" || departureStatus === "not_applicable") {
          throw new Error(`Demo workforce workday ${day.date} is missing a time record.`);
        }
        if (!CLOCK_TIME_PATTERN.test(checkIn) || !CLOCK_TIME_PATTERN.test(checkOut)) {
          throw new Error(`Demo workforce workday ${day.date} contains an invalid clock time.`);
        }
        const checkInMinutes = timeMinutes(checkIn);
        const checkOutMinutes = timeMinutes(checkOut);
        const shiftStartMinutes = timeMinutes(dataset.shift.start);
        const shiftEndMinutes = timeMinutes(dataset.shift.end);
        if (
          (arrivalStatus === "late" && checkInMinutes <= shiftStartMinutes) ||
          (arrivalStatus === "before_shift" && checkInMinutes >= shiftStartMinutes) ||
          (departureStatus === "early_departure" && checkOutMinutes >= shiftEndMinutes) ||
          (departureStatus === "after_shift" && checkOutMinutes <= shiftEndMinutes)
        ) {
          throw new Error(`Demo workforce workday ${day.date} has a status/time contradiction.`);
        }
        if (Date.parse(`${day.date}T${checkOut}:00+07:00`) > generatedAt) {
          throw new Error(`Demo workforce workday ${day.date} occurs after generatedAt.`);
        }
      } else if (checkIn || checkOut || arrivalStatus !== "not_applicable" || departureStatus !== "not_applicable") {
        throw new Error(`Demo workforce non-workday ${day.date} contains an unexpected time record.`);
      }
    }
  }

  if (dataset.payroll.length !== 30) {
    throw new Error("Demo workforce dataset must contain three payroll months for every employee.");
  }
  const relatedEmployeeIds = [
    ...dataset.leaveRequests.map((request) => request.employeeId),
    ...dataset.overtimeRequests.map((request) => request.employeeId),
    ...dataset.payroll.map((payroll) => payroll.employeeId),
  ];
  if (relatedEmployeeIds.some((employeeId) => !employeeIds.has(employeeId))) {
    throw new Error("Demo workforce dataset contains an orphan employee reference.");
  }
  const payrollKeys = new Set(
    dataset.payroll.map((payroll) => `${payroll.employeeId}|${payroll.month}`),
  );
  if (payrollKeys.size !== dataset.payroll.length) {
    throw new Error("Demo workforce dataset contains duplicate employee/month payroll rows.");
  }

  const latestRows = dataset.daily.at(-1)?.records ?? [];
  const latestDayStatuses = new Set(latestRows.map((row) => row[3]));
  const latestArrivalStatuses = new Set(latestRows.map((row) => row[4]));
  const latestDepartureStatuses = new Set(latestRows.map((row) => row[5]));
  if (
    !latestDayStatuses.has("leave") ||
    !latestDayStatuses.has("absent") ||
    !latestArrivalStatuses.has("before_shift") ||
    !latestArrivalStatuses.has("late") ||
    !latestDepartureStatuses.has("early_departure") ||
    !latestDepartureStatuses.has("after_shift")
  ) {
    throw new Error("Demo workforce latest date must include every neutral example status.");
  }
}

/**
 * Stable server-side source used by dashboard analytics, Excel export, and the
 * workforce assistant. The JSON is validated once before it is returned.
 */
export function loadDemoWorkforceDataset(): DemoWorkforceDataset {
  if (!validatedDataset) {
    const candidate = demoWorkforceJson as unknown as DemoWorkforceDataset;
    assertDataset(candidate);
    validatedDataset = candidate;
  }
  return validatedDataset;
}

/** Enables the JSON source only for its explicitly configured access tenant. */
export function shouldUseDemoWorkforceSource(orgId?: string): boolean {
  return isExactDemoWorkforceOrg({
    enabled: process.env.DASHBOARD_WORKFORCE_JSON_DEMO === "true",
    configuredOrgId: process.env.DEMO_WORKFORCE_ORG_ID,
    requestedOrgId: orgId,
  });
}

export function getDemoWorkforceDates(): string[] {
  return loadDemoWorkforceDataset().daily.map((day) => day.date);
}

export function getDemoWorkforceDailyRoster(date?: string): DemoDailyRosterRow[] {
  const dataset = loadDemoWorkforceDataset();
  const selectedDate = date ?? dataset.period.endDate;
  const day = dataset.daily.find((row) => row.date === selectedDate);
  if (!day) throw new Error(`Demo workforce date ${selectedDate} is not available.`);
  const employeeById = new Map(dataset.employees.map((employee) => [employee.id, employee]));

  return day.records.map((record) => {
    const [employeeId, checkIn, checkOut, dayStatus, arrivalStatus, departureStatus, geofenceResult] = record;
    const employee = employeeById.get(employeeId);
    if (!employee) throw new Error(`Demo workforce employee ${employeeId} is not available.`);
    return {
      date: day.date,
      employeeId,
      employeeCode: employee.employeeCode,
      nameTh: employee.nameTh,
      nameEn: employee.nameEn,
      department: employee.department,
      position: employee.position,
      shiftStart: dataset.shift.start,
      shiftEnd: dataset.shift.end,
      checkIn,
      checkOut,
      dayStatus,
      arrivalStatus,
      departureStatus,
      geofenceResult,
    };
  });
}

function timeMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageTime(values: string[]): string | null {
  const minutes = average(values.map(timeMinutes));
  if (minutes == null) return null;
  const rounded = Math.round(minutes);
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + Number(value || 0), 0) * 100) / 100;
}

export function getDemoWorkforceEmployeeStats(
  range: DemoWorkforceRange = {},
): DemoEmployeeAttendanceStats[] {
  const dataset = loadDemoWorkforceDataset();
  const startDate = range.startDate ?? dataset.period.startDate;
  const endDate = range.endDate ?? dataset.period.endDate;
  const days = dataset.daily.filter((day) => day.date >= startDate && day.date <= endDate);

  return dataset.employees.map((employee) => {
    const records = days
      .map((day) => day.records.find((record) => record[0] === employee.id))
      .filter((record): record is DemoWorkforceRecordTuple => Boolean(record));
    const workdays = records.filter((record) => record[3] === "workday");
    const checkIns = workdays.map((record) => record[1]).filter((value): value is string => Boolean(value));
    const checkOuts = workdays.map((record) => record[2]).filter((value): value is string => Boolean(value));
    const workedHours = workdays
      .map((record) => {
        if (!record[1] || !record[2]) return null;
        return Math.max(0, (timeMinutes(record[2]) - timeMinutes(record[1]) - dataset.shift.breakMinutes) / 60);
      })
      .filter((value): value is number => value != null);
    const arrivalOffsets = checkIns.map(
      (value) => timeMinutes(value) - timeMinutes(dataset.shift.start),
    );
    const departureOffsets = checkOuts.map(
      (value) => timeMinutes(value) - timeMinutes(dataset.shift.end),
    );
    const absentDays = records.filter((record) => record[3] === "absent").length;
    const expectedAttendanceDays = workdays.length + absentDays;

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      nameTh: employee.nameTh,
      nameEn: employee.nameEn,
      department: employee.department,
      position: employee.position,
      scheduledDays: expectedAttendanceDays,
      recordedWorkdays: workdays.length,
      leaveDays: records.filter((record) => record[3] === "leave").length,
      absentDays,
      beforeShiftArrivals: workdays.filter((record) => record[4] === "before_shift").length,
      onTimeArrivals: workdays.filter((record) => record[4] === "on_time").length,
      lateArrivals: workdays.filter((record) => record[4] === "late").length,
      earlyDepartures: workdays.filter((record) => record[5] === "early_departure").length,
      onTimeDepartures: workdays.filter((record) => record[5] === "on_time").length,
      afterShiftDepartures: workdays.filter((record) => record[5] === "after_shift").length,
      averageCheckIn: averageTime(checkIns),
      averageCheckOut: averageTime(checkOuts),
      averageArrivalOffsetMinutes:
        arrivalOffsets.length > 0
          ? Math.round((sum(arrivalOffsets) / arrivalOffsets.length) * 10) / 10
          : null,
      averageDepartureOffsetMinutes:
        departureOffsets.length > 0
          ? Math.round((sum(departureOffsets) / departureOffsets.length) * 10) / 10
          : null,
      averageWorkedHours:
        workedHours.length > 0 ? Math.round((sum(workedHours) / workedHours.length) * 100) / 100 : null,
      attendanceRate: percent(workdays.length, expectedAttendanceDays),
      punctualityRate: percent(
        workdays.filter((record) => record[4] !== "late").length,
        workdays.length,
      ),
    };
  });
}

function scopedOrganization(dataset: DemoWorkforceDataset, orgId?: string): Organization {
  return {
    id: orgId ?? dataset.organization.id,
    name: dataset.organization.name,
    business_name: dataset.organization.businessName,
    business_name_norm: dataset.organization.businessName.toLocaleLowerCase("th-TH").replace(/\s+/g, " ").trim(),
    business_type: dataset.organization.businessType,
    timezone: dataset.organization.timezone,
    thai_tax_id: null,
    geofence_lat: dataset.organization.geofence.latitude,
    geofence_lng: dataset.organization.geofence.longitude,
    geofence_radius: dataset.organization.geofence.radiusMeters,
    geofence_enabled: dataset.organization.geofence.enabled,
    owner_employee_id:
      dataset.employees.find((employee) => employee.role === "executive")?.id ?? null,
    tier: "pro",
    seat_limit: 50,
    trial_started_at: "2026-05-01T00:00:00+07:00",
    trial_ends_at: null,
    is_active: true,
    plan_notes: "Deterministic workforce analytics demonstration dataset.",
    created_at: "2026-01-05T09:00:00+07:00",
  };
}

function rawEmployees(dataset: DemoWorkforceDataset, orgId: string): Employee[] {
  return dataset.employees.map((employee, index) => ({
    id: employee.id,
    org_id: orgId,
    line_user_id: employee.lineBound
      ? `U9${String(index + 1).padStart(31, "0")}`
      : null,
    employee_code: employee.employeeCode,
    name_th: employee.nameTh,
    name_en: employee.nameEn,
    name_zh: employee.nameZh,
    nickname: null,
    role: employee.role,
    department: employee.department,
    position: employee.position,
    job_title: employee.position,
    shift_group: employee.shiftGroup,
    base_salary: employee.baseSalary,
    bank_account: null,
    sso_number: `DEMO-SSO-${employee.employeeCode}`,
    tax_profile: {
      personal_allowance: 60000,
      spouse_allowance: 0,
      child_allowance: 0,
      parent_allowance: 0,
      insurance_deduction: 0,
      provident_fund_deduction: 0,
      other_deductions: 0,
    },
    account_status: "active",
    phone: null,
    national_id: null,
    date_of_birth: null,
    gender: null,
    nationality: "Thai",
    marital_status: null,
    hire_date: employee.hireDate,
    employment_type: employee.employmentType,
    address: null,
    emergency_contact: null,
    home_lat: null,
    home_lng: null,
    home_location_label: null,
    home_location_source: null,
    id_card_photo_url: null,
    bank_book_photo_url: null,
    profile_photo_url: null,
    line_picture_url: null,
    line_display_name: null,
    rejection_reason: null,
    submitted_at: `${employee.hireDate}T09:00:00+07:00`,
    approved_at: `${employee.hireDate}T10:00:00+07:00`,
    approved_by_id: employee.supervisorId,
    leave_supervisor_id: employee.supervisorId,
    ot_supervisor_id: employee.supervisorId,
    contact_supervisor_id: employee.supervisorId,
    is_supervisor: employee.role !== "employee",
    subordinate_ids: dataset.employees
      .filter((candidate) => candidate.supervisorId === employee.id)
      .map((candidate) => candidate.id),
    pdpa_consent_at: `${employee.hireDate}T09:00:00+07:00`,
    metadata: { demo_source_id: DEMO_WORKFORCE_SOURCE_ID },
    notes: null,
    created_at: `${employee.hireDate}T09:00:00+07:00`,
  }));
}

function rawAttendance(dataset: DemoWorkforceDataset): AttendanceLog[] {
  const result: AttendanceLog[] = [];
  let index = 1;
  for (const day of dataset.daily) {
    for (const record of day.records) {
      const [employeeId, checkIn, checkOut, dayStatus, arrivalStatus, departureStatus, geofenceResult] = record;
      if (dayStatus !== "workday" || !checkIn || !checkOut) continue;
      const shared = {
        employee_id: employeeId,
        latitude: geofenceResult === "inside" ? dataset.organization.geofence.latitude : null,
        longitude: geofenceResult === "inside" ? dataset.organization.geofence.longitude : null,
        ip_address: null,
        photo_url: null,
        reason: null,
        source: "liff" as const,
        device_label: "Demo mobile device",
        maps_url: null,
        geofence_distance_m: geofenceResult === "inside" ? 25 + (index % 140) : null,
        geofence_result: geofenceResult === "inside" ? ("inside" as const) : ("missing_location" as const),
      };
      result.push({
        ...shared,
        id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        timestamp: `${day.date}T${checkIn}:00+07:00`,
        type: "in",
        status: arrivalStatus === "late" ? "late" : "ontime",
      });
      index += 1;
      result.push({
        ...shared,
        id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        timestamp: `${day.date}T${checkOut}:00+07:00`,
        type: "out",
        status: departureStatus === "early_departure" ? "early" : "ontime",
      });
      index += 1;
    }
  }
  return result;
}

function rawEmployeeShifts(dataset: DemoWorkforceDataset): EmployeeShift[] {
  let index = 1;
  return dataset.daily.flatMap((day) =>
    day.records.map((record) => {
      const shift: EmployeeShift = {
        id: `91000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        employee_id: record[0],
        date: day.date,
        shift_id: dataset.shift.id,
        overtime_hours_calculated:
          record[2] && record[5] === "after_shift"
            ? Math.round(Math.max(0, timeMinutes(record[2]) - timeMinutes(dataset.shift.end)) / 6) / 10
            : 0,
      };
      index += 1;
      return shift;
    }),
  );
}

function rawLeaveRequests(dataset: DemoWorkforceDataset): LeaveRequest[] {
  const employeeById = new Map(dataset.employees.map((employee) => [employee.id, employee]));
  return dataset.leaveRequests.map((request) => {
    const supervisorId = employeeById.get(request.employeeId)?.supervisorId ?? null;
    return {
      id: request.id,
      employee_id: request.employeeId,
      leave_type: request.leaveType,
      start_date: request.startDate,
      end_date: request.endDate,
      days: request.days,
      status: request.status,
      supervisor_id: supervisorId,
      approver_id: request.status === "pending" ? null : supervisorId,
      reason: "คำขอที่บันทึกในชุดข้อมูลสาธิต",
      decision_reason: request.status === "rejected" ? "ตารางกำลังคนในวันที่ขอยังไม่พร้อม" : null,
      decided_at: request.decidedAt,
      line_card_message_id: null,
      created_at: request.createdAt,
    };
  });
}

function rawOvertimeRequests(dataset: DemoWorkforceDataset): OvertimeRequest[] {
  const employeeById = new Map(dataset.employees.map((employee) => [employee.id, employee]));
  return dataset.overtimeRequests.map((request) => {
    const supervisorId = employeeById.get(request.employeeId)?.supervisorId ?? null;
    return {
      id: request.id,
      employee_id: request.employeeId,
      date: request.date,
      hours: request.hours,
      reason: request.reason,
      status: request.status,
      supervisor_id: supervisorId,
      approver_id: request.status === "pending" ? null : supervisorId,
      decision_reason: request.status === "rejected" ? "ช่วงเวลาที่ขอซ้อนกับแผนกำลังคน" : null,
      decided_at: request.decidedAt,
      line_card_message_id: null,
      created_at: request.createdAt,
    };
  });
}

function rawPayrolls(dataset: DemoWorkforceDataset): Payroll[] {
  return dataset.payroll.map((payroll) => ({
    id: payroll.id,
    employee_id: payroll.employeeId,
    month_year: payroll.month,
    base_pay: payroll.basePay,
    ot_pay: payroll.otPay,
    ssf_deduction: payroll.employeeSso,
    tax_deduction: payroll.withholdingTax,
    allowance_pay: payroll.allowancePay,
    bonus_pay: payroll.bonusPay,
    other_income: payroll.otherIncome,
    other_deductions: payroll.otherDeductions,
    gross_pay: payroll.grossPay,
    employer_sso_contribution: payroll.employerSso,
    taxable_income: payroll.taxableIncome,
    annualized_taxable_income: payroll.annualizedTaxableIncome,
    annual_tax: payroll.annualTax,
    tax_method: "annualized_estimate",
    calculation_version: "TH-2026-DEMO-01",
    calculation_details: { demo_source_id: DEMO_WORKFORCE_SOURCE_ID },
    calculated_at: payroll.calculatedAt,
    calculation_status: payroll.status,
    reviewed_by_id: null,
    reviewed_at: payroll.status === "reviewed" ? payroll.calculatedAt : null,
    override_reason: null,
    net_pay: payroll.netPay,
    payslip_pdf_url: null,
    created_at: payroll.calculatedAt,
  }));
}

function approvalHours(createdAt: string, decidedAt: string | null): number | null {
  if (!decidedAt) return null;
  const milliseconds = new Date(decidedAt).getTime() - new Date(createdAt).getTime();
  return milliseconds >= 0 ? milliseconds / 3_600_000 : null;
}

/** Converts the static JSON source into the existing analytics model. */
export function buildDemoWorkforceAnalytics(
  requestedDays: number,
  options: DemoWorkforceAnalyticsOptions = {},
): WorkforceAnalytics {
  const dataset = loadDemoWorkforceDataset();
  const days = Number.isFinite(requestedDays)
    ? Math.min(180, Math.max(7, Math.round(requestedDays)))
    : 30;
  const rangeEnd = options.endDate ?? dataset.period.endDate;
  const requestedStart = options.startDate ?? datePlus(rangeEnd, -(days - 1));
  const rangeStart = options.startDate
    ? requestedStart
    : requestedStart < dataset.period.startDate
      ? dataset.period.startDate
      : requestedStart;
  const rangeDays = dataset.daily.filter((day) => day.date >= rangeStart && day.date <= rangeEnd);
  const rangeRecords = rangeDays.flatMap((day) => day.records);
  const expectedRecords = rangeRecords.filter((record) => record[3] !== "leave");
  const workdayRecords = rangeRecords.filter((record) => record[3] === "workday");
  const lateRecords = workdayRecords.filter((record) => record[4] === "late");

  const dailyAttendance: AnalyticsDailyAttendance[] = rangeDays.map((day) => {
    const scheduled = day.records.filter((record) => record[3] !== "leave").length;
    const present = day.records.filter((record) => record[3] === "workday").length;
    const late = day.records.filter((record) => record[3] === "workday" && record[4] === "late").length;
    return {
      date: day.date,
      scheduled,
      present,
      onTime: present - late,
      late,
      absent: day.records.filter((record) => record[3] === "absent").length,
      onLeave: day.records.filter((record) => record[3] === "leave").length,
      attendanceRate: percent(present, scheduled),
    };
  });

  const rangeLeave = dataset.leaveRequests.filter(
    (request) => request.startDate <= rangeEnd && request.endDate >= rangeStart,
  );
  const rangeOvertime = dataset.overtimeRequests.filter(
    (request) => request.date >= rangeStart && request.date <= rangeEnd,
  );
  const approvedLeave = rangeLeave.filter((request) => request.status === "approved");
  const approvedOvertime = rangeOvertime.filter((request) => request.status === "approved");
  const latestPayrollMonth = dataset.payroll.map((payroll) => payroll.month).sort().at(-1) ?? null;
  const latestPayroll = latestPayrollMonth
    ? dataset.payroll.filter((payroll) => payroll.month === latestPayrollMonth)
    : [];

  const departments = Array.from(new Set(dataset.employees.map((employee) => employee.department)))
    .map((department): AnalyticsDepartmentRow => {
      const ids = new Set(
        dataset.employees
          .filter((employee) => employee.department === department)
          .map((employee) => employee.id),
      );
      const records = rangeRecords.filter((record) => ids.has(record[0]));
      const expected = records.filter((record) => record[3] !== "leave");
      const present = records.filter((record) => record[3] === "workday");
      const late = present.filter((record) => record[4] === "late");
      const payroll = latestPayroll.filter((row) => ids.has(row.employeeId));
      return {
        department,
        headcount: ids.size,
        attendanceRate: percent(present.length, expected.length),
        lateRate: percent(late.length, present.length),
        approvedOtHours: sum(
          approvedOvertime.filter((request) => ids.has(request.employeeId)).map((request) => request.hours),
        ),
        latestGrossPay: sum(payroll.map((row) => row.grossPay)),
        latestNetPay: sum(payroll.map((row) => row.netPay)),
        averageKpi: null,
      };
    })
    .sort((a, b) => b.headcount - a.headcount || a.department.localeCompare(b.department, "th"));

  const payrollTrend = Array.from(new Set(dataset.payroll.map((payroll) => payroll.month)))
    .sort()
    .map((month): AnalyticsPayrollMonth => {
      const payroll = dataset.payroll.filter((row) => row.month === month);
      return {
        month,
        grossPay: sum(payroll.map((row) => row.grossPay)),
        netPay: sum(payroll.map((row) => row.netPay)),
        employeeSso: sum(payroll.map((row) => row.employeeSso)),
        employerSso: sum(payroll.map((row) => row.employerSso)),
        withholdingTax: sum(payroll.map((row) => row.withholdingTax)),
      };
    });

  const leaveTypes: LeaveRequest["leave_type"][] = ["annual", "sick", "personal", "maternity"];
  const leaveByType = leaveTypes.map((type): AnalyticsLeaveTypeRow => ({
    type,
    approvedDays: sum(
      rangeLeave.filter((request) => request.leaveType === type && request.status === "approved").map((request) => request.days),
    ),
    pendingDays: sum(
      rangeLeave.filter((request) => request.leaveType === type && request.status === "pending").map((request) => request.days),
    ),
    rejectedDays: sum(
      rangeLeave.filter((request) => request.leaveType === type && request.status === "rejected").map((request) => request.days),
    ),
  }));

  const geofenceRecords = workdayRecords.filter((record) => record[6] !== "not_recorded");
  const completedApprovalHours = [
    ...dataset.leaveRequests.map((request) => approvalHours(request.createdAt, request.decidedAt)),
    ...dataset.overtimeRequests.map((request) => approvalHours(request.createdAt, request.decidedAt)),
  ].filter((value): value is number => value != null);

  const organization = scopedOrganization(dataset, options.orgId);
  const employees = rawEmployees(dataset, organization.id);
  const employeeShifts = rawEmployeeShifts(dataset);
  const attendance = rawAttendance(dataset);
  const leaveRequests = rawLeaveRequests(dataset);
  const overtimeRequests = rawOvertimeRequests(dataset);
  const payrolls = rawPayrolls(dataset);
  const demoEmployeeAttendance = getDemoWorkforceEmployeeStats({
    startDate: rangeStart,
    endDate: rangeEnd,
  })
    .map((row) => ({
      employeeId: row.employeeId,
      employeeCode: row.employeeCode,
      name: row.nameTh,
      department: row.department,
      scheduledDays: row.scheduledDays,
      absentDays: row.absentDays,
      lateDays: row.lateArrivals,
      approvedOtHours: sum(
        approvedOvertime
          .filter((request) => request.employeeId === row.employeeId)
          .map((request) => request.hours),
      ),
      approvedLeaveDays: sum(
        approvedLeave
          .filter((request) => request.employeeId === row.employeeId)
          .map((request) => request.days),
      ),
    }))
    .sort(
      (a, b) =>
        a.department.localeCompare(b.department, "th") ||
        a.employeeCode.localeCompare(b.employeeCode) ||
        a.name.localeCompare(b.name, "th"),
    );

  return {
    organization,
    scope: options.scope ?? "organization",
    asOfDate: dataset.period.endDate,
    rangeStart,
    rangeEnd,
    days,
    summary: {
      activeHeadcount: dataset.employees.length,
      scheduledEmployeeDays: expectedRecords.length,
      presentEmployeeDays: workdayRecords.length,
      attendanceRate: percent(workdayRecords.length, expectedRecords.length),
      punctualityRate: percent(workdayRecords.length - lateRecords.length, workdayRecords.length),
      approvedOtHours: sum(approvedOvertime.map((request) => request.hours)),
      approvedLeaveDays: sum(approvedLeave.map((request) => request.days)),
      pendingApprovals:
        dataset.leaveRequests.filter((request) => request.status === "pending").length +
        dataset.overtimeRequests.filter((request) => request.status === "pending").length,
      averageApprovalHours:
        completedApprovalHours.length > 0
          ? Math.round((sum(completedApprovalHours) / completedApprovalHours.length) * 10) / 10
          : null,
      latestPayrollMonth,
      latestGrossPayroll: sum(latestPayroll.map((payroll) => payroll.grossPay)),
      latestNetPayroll: sum(latestPayroll.map((payroll) => payroll.netPay)),
      employerSsoCost: sum(latestPayroll.map((payroll) => payroll.employerSso)),
      recordedGeofencePassRate:
        geofenceRecords.length > 0
          ? percent(geofenceRecords.filter((record) => record[6] === "inside").length, geofenceRecords.length)
          : null,
      lineBindingRate: percent(
        dataset.employees.filter((employee) => employee.lineBound).length,
        dataset.employees.length,
      ),
      salaryCoverageRate: percent(
        dataset.employees.filter((employee) => employee.baseSalary > 0).length,
        dataset.employees.length,
      ),
    },
    dailyAttendance,
    departments,
    payrollTrend,
    leaveByType,
    employeeAttendance: demoEmployeeAttendance,
    dataQuality: [
      { key: "missing_salary", label: "Active employees without salary", count: 0 },
      {
        key: "missing_line",
        label: "Active employees not yet bound to LINE",
        count: dataset.employees.filter((employee) => !employee.lineBound).length,
      },
      { key: "missing_supervisor", label: "Employees without an approval supervisor", count: 0 },
      { key: "missing_shift", label: "Active employees without shift assignment", count: 0 },
    ],
    raw: {
      organization,
      employees,
      attendance,
      employeeShifts,
      leaveRequests,
      overtimeRequests,
      contactRequests: [],
      payrolls,
      performanceReviews: [],
    },
  };
}
