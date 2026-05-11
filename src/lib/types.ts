export type Role = "employee" | "supervisor" | "hr" | "executive";
export type AttendanceType = "in" | "out";
export type AttendanceStatus = "ontime" | "late" | "absent" | "early";
export type LeaveType = "annual" | "sick" | "maternity" | "personal";
export type RequestStatus = "pending" | "approved" | "rejected";
export type AccountStatus = "pending_review" | "active" | "inactive";
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
  employee_code: string | null;
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
  account_status: AccountStatus;
  phone?: string | null;
  national_id?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  id_card_photo_url?: string | null;
  bank_book_photo_url?: string | null;
  profile_photo_url?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by_id?: string | null;
  leave_supervisor_id?: string | null;
  ot_supervisor_id?: string | null;
  contact_supervisor_id?: string | null;
  is_supervisor?: boolean;
  subordinate_ids?: string[];
  created_at: string;
}

export interface RegistrationInput {
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  name_th: string;
  name_en?: string;
  name_zh?: string;
  date_of_birth: string;
  national_id: string;
  phone: string;
  address: string;
  emergency_contact: string;
  department: string;
  position: string;
  shift_group?: string;
  bank_account?: string;
  id_card_photo_url?: string;
  bank_book_photo_url?: string;
  profile_photo_url?: string;
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
  supervisor_id: string | null;
  approver_id: string | null;
  reason: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  line_card_message_id: string | null;
  created_at: string;
}

export interface OvertimeRequest {
  id: string;
  employee_id: string;
  date: string;
  hours: number;
  reason: string | null;
  status: RequestStatus;
  supervisor_id: string | null;
  approver_id: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  line_card_message_id: string | null;
  created_at: string;
}

export interface ContactRequest {
  id: string;
  employee_id: string;
  supervisor_id: string | null;
  approver_id: string | null;
  requested_date: string;
  time_start: string;
  time_end: string;
  reason: string;
  status: RequestStatus;
  decision_reason: string | null;
  decided_at: string | null;
  line_card_message_id: string | null;
  created_at: string;
}

export type ScheduleEntryType = "work" | "overtime" | "leave";

export interface ScheduleEntry {
  id: string;
  employee_id: string;
  date: string;
  entry_type: ScheduleEntryType;
  hours: number;
  notes: string | null;
  created_by_id: string | null;
  is_supervisor_override: boolean;
  supervisor_assignment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAssignment {
  id: string;
  supervisor_id: string;
  date: string;
  entry_type: ScheduleEntryType;
  hours: number;
  notes: string | null;
  created_at: string;
}

export interface ScheduleChange {
  id: string;
  employee_id: string;
  date: string;
  entry_type: ScheduleEntryType;
  previous_hours: number | null;
  new_hours: number;
  changed_by_id: string | null;
  notified_at: string | null;
  created_at: string;
}

export type ActionTokenKind = "leave" | "overtime" | "contact" | "registration";
export type ActionTokenAction = "approve" | "reject";

export interface ActionToken {
  token: string;
  action: ActionTokenAction;
  kind: ActionTokenKind;
  request_id: string;
  intended_user_id: string | null;
  used_at: string | null;
  expires_at: string;
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
