import type {
  ActionToken,
  AIAgentInteraction,
  AttendanceLog,
  ContactRequest,
  Employee,
  EmployeeShift,
  LeaveRequest,
  Notification,
  Organization,
  OrgInvite,
  OvertimeRequest,
  Payroll,
  PerformanceReview,
  ProfileEditAudit,
  ScheduleAssignment,
  ScheduleChange,
  ScheduleEntry,
  Shift,
  SocialSecurityConfig,
} from "./types";
import { calculateThaiPayroll } from "./payroll/thai-payroll";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const SHIFT_MORNING = "22222222-2222-2222-2222-222222222201";
const SHIFT_EVENING = "22222222-2222-2222-2222-222222222202";
const SHIFT_NIGHT = "22222222-2222-2222-2222-222222222203";

// SaaS roots are populated in-memory. New tenants registering at runtime will
// be appended; the seed org is the Northstar demo factory and is bumped to
// "enterprise" so demo flows never trip the trial gate.
export const ORGANIZATIONS: Organization[] = [
  {
    id: ORG_ID,
    name: "บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด",
    business_name: "บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด",
    business_name_norm: "บริษัท นอร์ธสตาร์ อิเล็กทรอนิกส์ จำกัด",
    business_type: "factory",
    timezone: "Asia/Bangkok",
    thai_tax_id: "1234567890123",
    geofence_lat: 13.740198598326677,
    geofence_lng: 100.56227944249513,
    geofence_radius: 250,
    geofence_enabled: true,
    owner_employee_id: "33333333-3333-3333-3333-333333333308",
    tier: "enterprise",
    seat_limit: 999,
    trial_started_at: "2025-01-01T00:00:00Z",
    trial_ends_at: "2030-12-31T23:59:59Z",
    is_active: true,
    plan_notes: "Demo tenant (seeded)",
    created_at: "2025-01-01T00:00:00Z",
  },
];

// Backwards-compatibility export — many call sites still import the original
// `ORGANIZATION` singleton. Keep it pointing at the first row so dashboard
// stats/UI keep rendering unchanged.
export const ORGANIZATION: Organization = ORGANIZATIONS[0];

export const SHIFTS: Shift[] = [
  { id: SHIFT_MORNING, org_id: ORG_ID, name: "Morning Shift", start_time: "08:00:00", end_time: "17:00:00", break_minutes: 60 },
  { id: SHIFT_EVENING, org_id: ORG_ID, name: "Evening Shift", start_time: "16:00:00", end_time: "01:00:00", break_minutes: 60 },
  { id: SHIFT_NIGHT, org_id: ORG_ID, name: "Night Shift", start_time: "00:00:00", end_time: "08:00:00", break_minutes: 60 },
];

function demoEmployeeDefaults(): Pick<
  Employee,
  | "nickname"
  | "job_title"
  | "phone"
  | "national_id"
  | "date_of_birth"
  | "gender"
  | "nationality"
  | "marital_status"
  | "hire_date"
  | "employment_type"
  | "address"
  | "emergency_contact"
  | "home_lat"
  | "home_lng"
  | "home_location_label"
  | "home_location_source"
  | "id_card_photo_url"
  | "bank_book_photo_url"
  | "profile_photo_url"
  | "line_picture_url"
  | "line_display_name"
  | "rejection_reason"
  | "submitted_at"
  | "approved_at"
  | "approved_by_id"
  | "tax_profile"
  | "pdpa_consent_at"
  | "metadata"
  | "notes"
> {
  return {
    nickname: null,
    job_title: null,
    phone: null,
    national_id: null,
    date_of_birth: null,
    gender: null,
    nationality: "TH",
    marital_status: null,
    hire_date: null,
    employment_type: "full_time",
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
    submitted_at: null,
    approved_at: null,
    approved_by_id: null,
    tax_profile: {
      personal_allowance: 60000,
      spouse_allowance: 0,
      child_allowance: 0,
      parent_allowance: 0,
      insurance_deduction: 0,
      provident_fund_deduction: 0,
      other_deductions: 0,
    },
    pdpa_consent_at: "2025-01-01T00:00:00Z",
    metadata: {},
    notes: null,
  };
}

export const EMPLOYEES: Employee[] = [
  {
    id: "33333333-3333-3333-3333-333333333301",
    org_id: ORG_ID,
    line_user_id: "U1234567890abcdef1234567890abcdef",
    employee_code: "EMP001",
    name_th: "สมชาย ใจดี",
    name_en: "Somchai Jaidee",
    name_zh: "宋猜·哉迪",
    role: "employee",
    department: "Production",
    position: "Operator",
    shift_group: "A",
    base_salary: 15000,
    bank_account: "123-4-56789-0",
    sso_number: "SSO-001",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333302",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333306",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333302",
    is_supervisor: false,
    subordinate_ids: [],
    created_at: "2024-06-01T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333302",
    org_id: ORG_ID,
    line_user_id: "U2345678901abcdef2345678901abcdef",
    employee_code: "EMP002",
    name_th: "สมหญิง รักงาน",
    name_en: "Somying Rakngan",
    name_zh: "宋盈·拉甘",
    role: "supervisor",
    department: "Production",
    position: "Line Leader",
    shift_group: "A",
    base_salary: 25000,
    bank_account: "123-4-56789-1",
    sso_number: "SSO-002",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333304",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333304",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333308",
    is_supervisor: true,
    subordinate_ids: ["33333333-3333-3333-3333-333333333301", "33333333-3333-3333-3333-333333333303", "33333333-3333-3333-3333-333333333307", "33333333-3333-3333-3333-333333333310"],
    created_at: "2023-03-15T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333303",
    org_id: ORG_ID,
    line_user_id: "U3456789012abcdef3456789012abcdef",
    employee_code: "EMP003",
    name_th: "วิชัย เก่งกล้า",
    name_en: "Wichai Kengkla",
    name_zh: "维猜·肯卡拉",
    role: "employee",
    department: "Production",
    position: "Operator",
    shift_group: "A",
    base_salary: 15000,
    bank_account: "123-4-56789-2",
    sso_number: "SSO-003",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333302",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333306",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333302",
    is_supervisor: false,
    subordinate_ids: [],
    created_at: "2024-08-10T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333304",
    org_id: ORG_ID,
    line_user_id: null,
    employee_code: "EMP004",
    name_th: "นันทนา สุขใจ",
    name_en: "Nantana Sukjai",
    name_zh: "南塔娜·苏哉",
    role: "hr",
    department: "HR",
    position: "HR Manager",
    shift_group: null,
    base_salary: 35000,
    bank_account: "123-4-56789-3",
    sso_number: "SSO-004",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333308",
    ot_supervisor_id: null,
    contact_supervisor_id: "33333333-3333-3333-3333-333333333308",
    is_supervisor: true,
    subordinate_ids: ["33333333-3333-3333-3333-333333333302", "33333333-3333-3333-3333-333333333305", "33333333-3333-3333-3333-333333333306", "33333333-3333-3333-3333-333333333309"],
    created_at: "2022-09-01T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333305",
    org_id: ORG_ID,
    line_user_id: "U4567890123abcdef4567890123abcdef",
    employee_code: "EMP005",
    name_th: "กฤษณ์ ฉลาด",
    name_en: "Krit Chalat",
    name_zh: "克里·查拉",
    role: "employee",
    department: "Maintenance",
    position: "Technician",
    shift_group: "A",
    base_salary: 18000,
    bank_account: "123-4-56789-4",
    sso_number: "SSO-005",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333304",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333304",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333304",
    is_supervisor: false,
    subordinate_ids: [],
    created_at: "2024-01-05T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333306",
    org_id: ORG_ID,
    line_user_id: "U5678901234abcdef5678901234abcdef",
    employee_code: "EMP006",
    name_th: "อรทัย สดใส",
    name_en: "Orathai Sodsai",
    name_zh: "奥拉泰·索赛",
    role: "supervisor",
    department: "Production",
    position: "Supervisor",
    shift_group: "A",
    base_salary: 28000,
    bank_account: "123-4-56789-5",
    sso_number: "SSO-006",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333304",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333304",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333308",
    is_supervisor: true,
    subordinate_ids: ["33333333-3333-3333-3333-333333333301", "33333333-3333-3333-3333-333333333303", "33333333-3333-3333-3333-333333333307", "33333333-3333-3333-3333-333333333310"],
    created_at: "2022-11-20T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333307",
    org_id: ORG_ID,
    line_user_id: null,
    employee_code: "EMP007",
    name_th: "ธนพล แข็งแรง",
    name_en: "Thanapol Khaengraeng",
    name_zh: "塔那蓬·肯让",
    role: "employee",
    department: "Production",
    position: "Operator",
    shift_group: "A",
    base_salary: 15000,
    bank_account: "123-4-56789-6",
    sso_number: "SSO-007",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333302",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333306",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333302",
    is_supervisor: false,
    subordinate_ids: [],
    created_at: "2025-02-14T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333308",
    org_id: ORG_ID,
    line_user_id: "U6789012345abcdef6789012345abcdef",
    employee_code: "EMP008",
    name_th: "ปริยา ฉลาด",
    name_en: "Pariya Chalat",
    name_zh: "帕莉雅·查拉",
    role: "executive",
    department: "Management",
    position: "Factory Owner",
    shift_group: null,
    base_salary: 80000,
    bank_account: "123-4-56789-7",
    sso_number: "SSO-008",
    account_status: "active",
    leave_supervisor_id: null,
    ot_supervisor_id: null,
    contact_supervisor_id: null,
    is_supervisor: true,
    subordinate_ids: ["33333333-3333-3333-3333-333333333302", "33333333-3333-3333-3333-333333333306"],
    created_at: "2020-01-01T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333309",
    org_id: ORG_ID,
    line_user_id: "U7890123456abcdef7890123456abcdef",
    employee_code: "EMP009",
    name_th: "เอกชัย มั่นคง",
    name_en: "Ekachai Mankong",
    name_zh: "艾卡猜·曼孔",
    role: "employee",
    department: "Warehouse",
    position: "Staff",
    shift_group: "A",
    base_salary: 14000,
    bank_account: "123-4-56789-8",
    sso_number: "SSO-009",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333304",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333304",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333304",
    is_supervisor: false,
    subordinate_ids: [],
    created_at: "2024-07-01T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
  {
    id: "33333333-3333-3333-3333-333333333310",
    org_id: ORG_ID,
    line_user_id: null,
    employee_code: "EMP010",
    name_th: "ลลิตา เก่ง",
    name_en: "Lalita Keng",
    name_zh: "拉莉塔·肯",
    role: "employee",
    department: "Production",
    position: "Operator",
    shift_group: "A",
    base_salary: 15000,
    bank_account: "123-4-56789-9",
    sso_number: "SSO-010",
    account_status: "active",
    leave_supervisor_id: "33333333-3333-3333-3333-333333333302",
    ot_supervisor_id: "33333333-3333-3333-3333-333333333306",
    contact_supervisor_id: "33333333-3333-3333-3333-333333333302",
    is_supervisor: false,
    subordinate_ids: [],
    created_at: "2025-04-12T00:00:00Z",
    ...demoEmployeeDefaults(),
  },
];

function todayMinus(days: number): string {
  const d = new Date("2026-05-09T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function timestampMinus(days: number, hour: number, minute: number): string {
  const d = new Date("2026-05-09T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour - 7, minute, 0, 0);
  return d.toISOString();
}

const workingEmployees = EMPLOYEES.filter((e) => e.role === "employee" || e.role === "supervisor");

export const EMPLOYEE_SHIFTS: EmployeeShift[] = workingEmployees.flatMap((e) =>
  Array.from({ length: 14 }, (_, i) => ({
    id: `es-${e.employee_code}-${i}`,
    employee_id: e.id,
    date: todayMinus(i),
    shift_id: e.shift_group === "C" ? SHIFT_NIGHT : e.shift_group === "B" ? SHIFT_EVENING : SHIFT_MORNING,
    overtime_hours_calculated: i % 5 === 0 ? 2 : 0,
  })),
);

const seededRandom = (() => {
  let state = 1234567;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
})();

export const ATTENDANCE_LOGS: AttendanceLog[] = workingEmployees.flatMap((e) => {
  const logs: AttendanceLog[] = [];
  for (let i = 0; i < 30; i++) {
    if (seededRandom() < 0.05) continue;
    const lateMinutes = seededRandom() < 0.18 ? Math.floor(seededRandom() * 25) + 5 : 0;
    const status = lateMinutes > 0 ? "late" : "ontime";
    logs.push({
      id: `att-${e.employee_code}-${i}-in`,
      employee_id: e.id,
      timestamp: timestampMinus(i, 8, lateMinutes),
      type: "in",
      latitude: 13.740198598326677 + seededRandom() * 0.0008,
      longitude: 100.56227944249513 + seededRandom() * 0.0008,
      ip_address: "192.168.1." + (50 + Math.floor(seededRandom() * 100)),
      status,
      photo_url: null,
      geofence_distance_m: 42,
      geofence_result: "disabled",
    });
    logs.push({
      id: `att-${e.employee_code}-${i}-out`,
      employee_id: e.id,
      timestamp: timestampMinus(i, 17, Math.floor(seededRandom() * 30)),
      type: "out",
      latitude: 13.740198598326677 + seededRandom() * 0.0008,
      longitude: 100.56227944249513 + seededRandom() * 0.0008,
      ip_address: "192.168.1." + (50 + Math.floor(seededRandom() * 100)),
      status: "ontime",
      photo_url: null,
      geofence_distance_m: 45,
      geofence_result: "disabled",
    });
  }
  return logs;
});

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "leave-001",
    employee_id: "33333333-3333-3333-3333-333333333301",
    leave_type: "annual",
    start_date: todayMinus(-5),
    end_date: todayMinus(-7),
    days: 3,
    status: "approved",
    approver_id: "33333333-3333-3333-3333-333333333304",
    reason: "Family trip to Chiang Mai",
    supervisor_id: "33333333-3333-3333-3333-333333333302",
    decision_reason: null,
    decided_at: "2026-05-08T10:00:00Z",
    line_card_message_id: null,
    created_at: timestampMinus(10, 9, 30),
  },
  {
    id: "leave-002",
    employee_id: "33333333-3333-3333-3333-333333333303",
    leave_type: "sick",
    start_date: todayMinus(3),
    end_date: todayMinus(3),
    days: 1,
    status: "approved",
    approver_id: "33333333-3333-3333-3333-333333333302",
    reason: "Fever",
    supervisor_id: "33333333-3333-3333-3333-333333333302",
    decision_reason: null,
    decided_at: "2026-05-08T10:00:00Z",
    line_card_message_id: null,
    created_at: timestampMinus(4, 7, 0),
  },
  {
    id: "leave-003",
    employee_id: "33333333-3333-3333-3333-333333333305",
    leave_type: "personal",
    start_date: todayMinus(-10),
    end_date: todayMinus(-10),
    days: 1,
    status: "pending",
    approver_id: null,
    reason: "Family event",
    supervisor_id: "33333333-3333-3333-3333-333333333304",
    decision_reason: null,
    decided_at: null,
    line_card_message_id: null,
    created_at: timestampMinus(2, 14, 15),
  },
  {
    id: "leave-004",
    employee_id: "33333333-3333-3333-3333-333333333307",
    leave_type: "annual",
    start_date: todayMinus(-14),
    end_date: todayMinus(-16),
    days: 3,
    status: "pending",
    approver_id: null,
    reason: "Vacation",
    supervisor_id: "33333333-3333-3333-3333-333333333302",
    decision_reason: null,
    decided_at: null,
    line_card_message_id: null,
    created_at: timestampMinus(1, 11, 0),
  },
  {
    id: "leave-005",
    employee_id: "33333333-3333-3333-3333-333333333310",
    leave_type: "sick",
    start_date: todayMinus(7),
    end_date: todayMinus(6),
    days: 2,
    status: "approved",
    approver_id: "33333333-3333-3333-3333-333333333306",
    reason: "Migraine",
    supervisor_id: "33333333-3333-3333-3333-333333333302",
    decision_reason: null,
    decided_at: "2026-05-08T10:00:00Z",
    line_card_message_id: null,
    created_at: timestampMinus(8, 8, 45),
  },
];

export const OVERTIME_REQUESTS: OvertimeRequest[] = [
  {
    id: "ot-001",
    employee_id: "33333333-3333-3333-3333-333333333303",
    date: todayMinus(2),
    hours: 3,
    reason: "Production rush order",
    status: "approved",
    supervisor_id: "33333333-3333-3333-3333-333333333306",
    approver_id: "33333333-3333-3333-3333-333333333306",
    decision_reason: null,
    decided_at: "2026-05-08T10:00:00Z",
    line_card_message_id: null,
    created_at: timestampMinus(3, 18, 0),
  },
  {
    id: "ot-002",
    employee_id: "33333333-3333-3333-3333-333333333301",
    date: todayMinus(1),
    hours: 2,
    reason: "Extra delivery batch",
    status: "approved",
    supervisor_id: "33333333-3333-3333-3333-333333333306",
    approver_id: "33333333-3333-3333-3333-333333333306",
    decision_reason: null,
    decided_at: "2026-05-08T10:00:00Z",
    line_card_message_id: null,
    created_at: timestampMinus(2, 17, 30),
  },
  {
    id: "ot-003",
    employee_id: "33333333-3333-3333-3333-333333333305",
    date: todayMinus(0),
    hours: 4,
    reason: "Equipment maintenance",
    status: "pending",
    supervisor_id: "33333333-3333-3333-3333-333333333304",
    approver_id: null,
    decision_reason: null,
    decided_at: null,
    line_card_message_id: null,
    created_at: timestampMinus(0, 10, 0),
  },
  {
    id: "ot-004",
    employee_id: "33333333-3333-3333-3333-333333333309",
    date: todayMinus(5),
    hours: 2.5,
    reason: "Inventory count",
    status: "approved",
    supervisor_id: "33333333-3333-3333-3333-333333333304",
    approver_id: "33333333-3333-3333-3333-333333333304",
    decision_reason: null,
    decided_at: "2026-05-08T10:00:00Z",
    line_card_message_id: null,
    created_at: timestampMinus(6, 16, 30),
  },
  {
    id: "ot-005",
    employee_id: "33333333-3333-3333-3333-333333333307",
    date: todayMinus(-2),
    hours: 3,
    reason: "Additional schedule coverage",
    status: "pending",
    supervisor_id: "33333333-3333-3333-3333-333333333306",
    approver_id: null,
    decision_reason: null,
    decided_at: null,
    line_card_message_id: null,
    created_at: timestampMinus(0, 14, 20),
  },
];

const DEMO_SSO_2026 = {
  id: "sso-th-phase1",
  rate_pct: 5,
  wage_floor: 1650,
  wage_ceiling: 17500,
  max_contribution: 875,
} as const;

export const PAYROLLS: Payroll[] = workingEmployees.flatMap((e) => {
  const base = e.base_salary ?? 0;
  const april = calculateThaiPayroll({
    basePay: base,
    overtimePay: 4500,
    ssoConfig: DEMO_SSO_2026,
    taxProfile: e.tax_profile,
    payrollMonth: 4,
  });
  const may = calculateThaiPayroll({
    basePay: base,
    overtimePay: 3200,
    ssoConfig: DEMO_SSO_2026,
    taxProfile: e.tax_profile,
    payrollMonth: 5,
  });
  return [
    {
      id: `payroll-${e.employee_code}-2026-04`,
      employee_id: e.id,
      month_year: "2026-04",
      base_pay: base,
      ot_pay: 4500,
      ssf_deduction: april.employeeSso,
      tax_deduction: april.monthlyWithholdingTax,
      allowance_pay: 0,
      bonus_pay: 0,
      other_income: 0,
      other_deductions: 0,
      gross_pay: april.grossPay,
      employer_sso_contribution: april.employerSso,
      taxable_income: april.grossPay,
      annualized_taxable_income: april.annualizedTaxableIncome,
      annual_tax: april.annualTax,
      tax_method: "thai_pit_annualized_por_96_2543",
      calculation_version: april.calculationVersion,
      calculation_details: { ...april.calculationDetails, source: "demo" },
      calculated_at: "2026-04-30T18:00:00Z",
      calculation_status: "paid",
      reviewed_by_id: "33333333-3333-3333-3333-333333333304",
      reviewed_at: "2026-04-30T17:30:00Z",
      override_reason: null,
      net_pay: april.netPay,
      payslip_pdf_url: null,
      created_at: "2026-04-30T18:00:00Z",
    },
    {
      id: `payroll-${e.employee_code}-2026-05`,
      employee_id: e.id,
      month_year: "2026-05",
      base_pay: base,
      ot_pay: 3200,
      ssf_deduction: may.employeeSso,
      tax_deduction: may.monthlyWithholdingTax,
      allowance_pay: 0,
      bonus_pay: 0,
      other_income: 0,
      other_deductions: 0,
      gross_pay: may.grossPay,
      employer_sso_contribution: may.employerSso,
      taxable_income: may.grossPay,
      annualized_taxable_income: may.annualizedTaxableIncome,
      annual_tax: may.annualTax,
      tax_method: "thai_pit_annualized_por_96_2543",
      calculation_version: may.calculationVersion,
      calculation_details: { ...may.calculationDetails, source: "demo" },
      calculated_at: "2026-05-08T18:00:00Z",
      calculation_status: "reviewed",
      reviewed_by_id: "33333333-3333-3333-3333-333333333304",
      reviewed_at: "2026-05-08T17:30:00Z",
      override_reason: null,
      net_pay: may.netPay,
      payslip_pdf_url: null,
      created_at: "2026-05-08T18:00:00Z",
    },
  ];
});

export const PERFORMANCE_REVIEWS: PerformanceReview[] = [
  { id: "perf-001", employee_id: "33333333-3333-3333-3333-333333333301", review_date: todayMinus(30), kpi_score: 92, notes: "Excellent performance on production line" },
  { id: "perf-002", employee_id: "33333333-3333-3333-3333-333333333302", review_date: todayMinus(28), kpi_score: 95, notes: "Strong leadership and team coordination" },
  { id: "perf-003", employee_id: "33333333-3333-3333-3333-333333333303", review_date: todayMinus(25), kpi_score: 88, notes: "Reliable, improving on quality metrics" },
  { id: "perf-004", employee_id: "33333333-3333-3333-3333-333333333305", review_date: todayMinus(60), kpi_score: 90, notes: "Solid technical work, mentors junior staff" },
  { id: "perf-005", employee_id: "33333333-3333-3333-3333-333333333306", review_date: todayMinus(20), kpi_score: 93, notes: "Drives consistent throughput across team" },
];

export const NOTIFICATIONS: Notification[] = [
  {
    id: "notif-001",
    employee_id: "33333333-3333-3333-3333-333333333301",
    line_message_id: "msg-001",
    type: "leave_approved",
    message: "Your leave request from May 14 to May 16 has been approved.",
    read: false,
    created_at: timestampMinus(0, 9, 0),
  },
  {
    id: "notif-002",
    employee_id: "33333333-3333-3333-3333-333333333302",
    line_message_id: "msg-002",
    type: "approval_pending",
    message: "EMP005 submitted an OT request for today (4 hours).",
    read: false,
    created_at: timestampMinus(0, 10, 5),
  },
  {
    id: "notif-003",
    employee_id: "33333333-3333-3333-3333-333333333304",
    line_message_id: "msg-003",
    type: "absence_alert",
    message: "EMP010 has not clocked in. Shift started 30 minutes ago.",
    read: true,
    created_at: timestampMinus(0, 8, 30),
  },
];

export const ALL_DEPARTMENTS = Array.from(new Set(EMPLOYEES.map((e) => e.department).filter(Boolean))) as string[];

// =========================================================================
// Approval-flow entities (Phase 2/3)
// =========================================================================

export const CONTACT_REQUESTS: ContactRequest[] = [];

export const SCHEDULE_ENTRIES: ScheduleEntry[] = [
  // Pre-populate the current week (Mon 11/05/2026 – Sun 17/05/2026) for EMP001
  // so the schedule UI has something to render in demo mode.
  {
    id: "sched-001",
    employee_id: "33333333-3333-3333-3333-333333333301",
    date: "2026-05-11",
    entry_type: "work",
    hours: 8,
    notes: null,
    created_by_id: "33333333-3333-3333-3333-333333333301",
    is_supervisor_override: false,
    supervisor_assignment_id: null,
    created_at: "2026-05-09T08:00:00Z",
    updated_at: "2026-05-09T08:00:00Z",
  },
  {
    id: "sched-002",
    employee_id: "33333333-3333-3333-3333-333333333301",
    date: "2026-05-12",
    entry_type: "work",
    hours: 8,
    notes: null,
    created_by_id: "33333333-3333-3333-3333-333333333301",
    is_supervisor_override: false,
    supervisor_assignment_id: null,
    created_at: "2026-05-09T08:00:00Z",
    updated_at: "2026-05-09T08:00:00Z",
  },
  {
    id: "sched-003",
    employee_id: "33333333-3333-3333-3333-333333333301",
    date: "2026-05-13",
    entry_type: "overtime",
    hours: 3,
    notes: "Volunteered for night batch",
    created_by_id: "33333333-3333-3333-3333-333333333301",
    is_supervisor_override: false,
    supervisor_assignment_id: null,
    created_at: "2026-05-09T08:00:00Z",
    updated_at: "2026-05-09T08:00:00Z",
  },
];

export const SCHEDULE_ASSIGNMENTS: ScheduleAssignment[] = [];

export const SCHEDULE_CHANGES: ScheduleChange[] = [];

export const ACTION_TOKENS: ActionToken[] = [];

// Supervisor-generated invite links (v4_org_invites). Populated at runtime
// when a supervisor/owner registers or opens the "invite team" page.
export const ORG_INVITES: OrgInvite[] = [];

// =========================================================================
// Multi-tenant + 2026 SSO additions
// =========================================================================

export const SOCIAL_SECURITY_CONFIGS: SocialSecurityConfig[] = [
  {
    id: "sso-th-phase1",
    country: "TH",
    effective_from: "2026-01-01",
    effective_to: "2028-12-31",
    rate_pct: 5,
    wage_floor: 1650,
    wage_ceiling: 17500,
    max_contribution: 875,
    notes: "Section 33 — Phase 1 (2026-2028)",
    created_at: "2025-12-11T00:00:00Z",
  },
  {
    id: "sso-th-phase2",
    country: "TH",
    effective_from: "2029-01-01",
    effective_to: "2031-12-31",
    rate_pct: 5,
    wage_floor: 1650,
    wage_ceiling: 20000,
    max_contribution: 1000,
    notes: "Section 33 — Phase 2 (2029-2031)",
    created_at: "2025-12-11T00:00:00Z",
  },
  {
    id: "sso-th-phase3",
    country: "TH",
    effective_from: "2032-01-01",
    effective_to: null,
    rate_pct: 5,
    wage_floor: 1650,
    wage_ceiling: 23000,
    max_contribution: 1150,
    notes: "Section 33 — Phase 3 (2032 onwards)",
    created_at: "2025-12-11T00:00:00Z",
  },
];

export const PROFILE_EDIT_AUDIT: ProfileEditAudit[] = [];

// Persisted for the lifetime of the demo server process. Production uses the
// Supabase ai_agent_interactions table through the shared data layer.
export const AI_AGENT_INTERACTIONS: AIAgentInteraction[] = [];
