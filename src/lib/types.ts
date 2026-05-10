export type Role = "employee" | "supervisor" | "hr" | "executive";
export type AttendanceType = "in" | "out";
export type AttendanceStatus = "ontime" | "late" | "absent" | "early";
export type LeaveType = "annual" | "sick" | "maternity" | "personal";
export type RequestStatus = "pending" | "approved" | "rejected";
export type Locale = "en" | "th" | "zh";

export interface Organization {
  id: string;
  name: string;
  timezone: string;
  thai_tax_id: string | null;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius: number;
  created_at: string;
}

export interface Employee {
  id: string;
  org_id: string;
  line_user_id: string | null;
  employee_code: string;
  name_th: string | null;
  name_en: string | null;
  name_zh: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  shift_group: string | null;
  base_salary: number | null;
  bank_account: string | null;
  sso_number: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  org_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}

export interface EmployeeShift {
  id: string;
  employee_id: string;
  date: string;
  shift_id: string;
  overtime_hours_calculated: number;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  timestamp: string;
  type: AttendanceType;
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
  status: AttendanceStatus;
  photo_url: string | null;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  status: RequestStatus;
  approver_id: string | null;
  reason: string | null;
  created_at: string;
}

export interface OvertimeRequest {
  id: string;
  employee_id: string;
  date: string;
  hours: number;
  reason: string | null;
  status: RequestStatus;
  created_at: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  month_year: string;
  base_pay: number;
  ot_pay: number;
  ssf_deduction: number;
  tax_deduction: number;
  net_pay: number;
  payslip_pdf_url: string | null;
  created_at: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  review_date: string;
  kpi_score: number;
  notes: string | null;
}

export interface Notification {
  id: string;
  employee_id: string;
  line_message_id: string | null;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AIAgentInteraction {
  id: string;
  employee_id: string | null;
  channel: "line" | "dashboard" | "liff";
  user_message: string;
  agent_response: string;
  tools_used: unknown;
  created_at: string;
}
