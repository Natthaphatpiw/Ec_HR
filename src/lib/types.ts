export type Role = "employee" | "supervisor" | "hr" | "executive";
export type AttendanceType = "in" | "out";
export type AttendanceStatus = "ontime" | "late" | "absent" | "early";
export type AttendanceSource = "liff" | "web" | "line_bot" | "admin_correction";
export type LeaveType = "annual" | "sick" | "maternity" | "personal";
export type RequestStatus = "pending" | "approved" | "rejected";
export type AccountStatus = "pending_review" | "active" | "inactive" | "awaiting_supervisor";
export type Locale = "en" | "th" | "zh";
export type OrgTier = "free" | "starter" | "pro" | "enterprise";
export type BusinessType = "factory" | "restaurant" | "retail" | "clinic" | "service" | "logistics" | "construction" | "office" | "other";
export type EmploymentType = "full_time" | "part_time" | "contractor" | "intern" | "daily_wage" | "other";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "other";
export type HomeLocationSource = "gps" | "maps_url" | "manual";

export interface Organization {
  id: string;
  name: string;
  business_name: string;
  business_name_norm: string;
  business_type: BusinessType | null;
  timezone: string;
  thai_tax_id: string | null;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius: number;
  owner_employee_id: string | null;
  tier: OrgTier;
  seat_limit: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  is_active: boolean;
  plan_notes: string | null;
  created_at: string;
}

/**
 * Supervisor-generated invite link (v4_org_invites). Resolves a public
 * opaque `token` to an `org_id` + inviting supervisor so employees join the
 * exact tenant without typing the business name.
 */
export interface OrgInvite {
  id: string;
  org_id: string;
  token: string;
  created_by: string | null;
  set_supervisor_id: string | null;
  role_to_grant: Role;
  grant_leave: boolean;
  grant_overtime: boolean;
  grant_contact: boolean;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  revoked_at: string | null;
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
  nickname: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  job_title: string | null;
  shift_group: string | null;
  base_salary: number | null;
  bank_account: string | null;
  sso_number: string | null;
  account_status: AccountStatus;
  phone: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  nationality: string | null;
  marital_status: MaritalStatus | null;
  hire_date: string | null;
  employment_type: EmploymentType;
  address: string | null;
  emergency_contact: string | null;
  home_lat: number | null;
  home_lng: number | null;
  home_location_label: string | null;
  home_location_source: HomeLocationSource | null;
  id_card_photo_url: string | null;
  bank_book_photo_url: string | null;
  profile_photo_url: string | null;
  line_picture_url: string | null;
  line_display_name: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by_id: string | null;
  leave_supervisor_id: string | null;
  ot_supervisor_id: string | null;
  contact_supervisor_id: string | null;
  is_supervisor: boolean;
  subordinate_ids: string[];
  pdpa_consent_at: string | null;
  metadata: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

export interface SupervisorGrant {
  leave: boolean;
  overtime: boolean;
  contact: boolean;
}

export interface SubordinateLink {
  /** Free-form name typed by the supervisor — used for fuzzy lookup */
  name: string;
  /** Resolved employee id once a match is found in the same org */
  employee_id?: string;
  /** Permissions the supervisor will hold over this subordinate */
  grant: SupervisorGrant;
}

export interface RegistrationInput {
  /** LINE identity */
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  /**
   * Tenancy. Supervisor/owner registration provides `business_name`
   * (joins existing org or creates a new one). Employee registration is
   * invite-only: it provides `invite_token` instead, which resolves the
   * exact org + inviting supervisor server-side.
   */
  business_name?: string;
  business_type?: BusinessType;
  /** Employee flow: opaque org-invite token (see OrgInvite). */
  invite_token?: string;
  /** Personal */
  name_th: string;
  name_en?: string;
  name_zh?: string;
  nickname?: string;
  date_of_birth?: string;
  national_id?: string;
  phone: string;
  gender?: Gender;
  /** Contact */
  address?: string;
  emergency_contact?: string;
  /** Job (all optional in SaaS — different businesses care about different fields) */
  department?: string;
  position?: string;
  job_title?: string;
  shift_group?: string;
  employment_type?: EmploymentType;
  hire_date?: string;
  base_salary?: number;
  bank_account?: string;
  /** Home location (used by attendance for transparency, not enforcement) */
  home_lat?: number;
  home_lng?: number;
  home_location_label?: string;
  home_location_source?: HomeLocationSource;
  /** Docs (optional) */
  id_card_photo_url?: string;
  bank_book_photo_url?: string;
  profile_photo_url?: string;
  /** PDPA */
  pdpa_consent: boolean;
  /** Role-specific (employee branch) */
  add_supervisor?: boolean;
  supervisor_name?: string;
  supervisor_grant?: SupervisorGrant;
  /** Role-specific (supervisor branch) */
  is_supervisor?: boolean;
  subordinates?: SubordinateLink[];
}

export interface SocialSecurityConfig {
  id: string;
  country: string;
  effective_from: string;
  effective_to: string | null;
  rate_pct: number;
  wage_floor: number;
  wage_ceiling: number;
  max_contribution: number;
  notes: string | null;
  created_at: string;
}

export interface ProfileEditAudit {
  id: string;
  org_id: string;
  target_id: string;
  edited_by: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
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
