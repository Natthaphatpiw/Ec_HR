import {
  ACTION_TOKENS,
  AI_AGENT_INTERACTIONS,
  ATTENDANCE_LOGS,
  CONTACT_REQUESTS,
  EMPLOYEES,
  EMPLOYEE_SHIFTS,
  LEAVE_REQUESTS,
  NOTIFICATIONS,
  ORGANIZATION,
  ORGANIZATIONS,
  ORG_INVITES,
  OVERTIME_REQUESTS,
  PAYROLLS,
  PERFORMANCE_REVIEWS,
  PROFILE_EDIT_AUDIT,
  SCHEDULE_ASSIGNMENTS,
  SCHEDULE_CHANGES,
  SCHEDULE_ENTRIES,
  SHIFTS,
  SOCIAL_SECURITY_CONFIGS,
} from "./demo-data";
import { hasSupabaseConfig, supabaseAdmin } from "./supabase/admin";
import type {
  ActionToken,
  ActionTokenAction,
  ActionTokenKind,
  AIAgentInteraction,
  AttendanceLog,
  AttendanceSource,
  AttendanceType,
  BusinessType,
  ContactRequest,
  Employee,
  EmployeeShift,
  HomeLocationSource,
  LeaveRequest,
  LeaveType,
  Notification,
  Organization,
  OrgInvite,
  OvertimeRequest,
  Payroll,
  PerformanceReview,
  ProfileEditAudit,
  RegistrationInput,
  RequestStatus,
  ScheduleAssignment,
  ScheduleChange,
  ScheduleEntry,
  ScheduleEntryType,
  Shift,
  SocialSecurityConfig,
  SubordinateLink,
  SupervisorGrant,
} from "./types";
import { haversineMeters } from "./utils";

const ORG_ID = "11111111-1111-1111-1111-111111111111";
const TRIAL_DAYS = 30;
const TRIAL_SEAT_LIMIT = 10;

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

export function isDemoMode(): boolean {
  return isDemo();
}

export function getDefaultOrganizationId(): string {
  return process.env.DASHBOARD_ORG_ID?.trim() || ORG_ID;
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
// Organization (multi-tenant)
// =========================================================================

export function normalizeBusinessName(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function getOrganization(orgId?: string): Promise<Organization> {
  const id = orgId ?? getDefaultOrganizationId();
  if (isDemo()) return ORGANIZATIONS.find((o) => o.id === id) ?? ORGANIZATION;
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getOrganization: ${error.message}`);
  return (data as Organization) ?? ORGANIZATION;
}

/**
 * Strict org lookup by id — returns undefined for an unknown id instead of
 * falling back to the demo ORGANIZATION singleton like getOrganization does.
 * Used by the invite-redemption path so a bad token can never silently
 * register someone into the demo tenant.
 */
export async function getOrganizationById(id: string): Promise<Organization | undefined> {
  if (isDemo()) return ORGANIZATIONS.find((o) => o.id === id);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getOrganizationById: ${error.message}`);
  return (data as Organization) ?? undefined;
}

export async function findOrganizationByBusinessName(name: string): Promise<Organization | undefined> {
  const norm = normalizeBusinessName(name);
  if (!norm) return undefined;
  if (isDemo()) return ORGANIZATIONS.find((o) => o.business_name_norm === norm);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("organizations")
    .select("*")
    .eq("business_name_norm", norm)
    .maybeSingle();
  if (error) throw new Error(`findOrganizationByBusinessName: ${error.message}`);
  return (data as Organization) ?? undefined;
}

export async function createOrganization(input: {
  business_name: string;
  business_type?: BusinessType;
  timezone?: string;
}): Promise<Organization> {
  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const row: Organization = {
    id: newId("org"),
    name: input.business_name,
    business_name: input.business_name,
    business_name_norm: normalizeBusinessName(input.business_name),
    business_type: input.business_type ?? "other",
    timezone: input.timezone ?? "Asia/Bangkok",
    thai_tax_id: null,
    geofence_lat: null,
    geofence_lng: null,
    geofence_radius: 150,
    geofence_enabled: false,
    owner_employee_id: null,
    tier: "free",
    seat_limit: TRIAL_SEAT_LIMIT,
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEnds.toISOString(),
    is_active: true,
    plan_notes: null,
    created_at: now.toISOString(),
  };
  if (isDemo()) {
    ORGANIZATIONS.push(row);
    return row;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("organizations")
    .insert({
      name: row.name,
      business_name: row.business_name,
      business_name_norm: row.business_name_norm,
      business_type: row.business_type,
      timezone: row.timezone,
      geofence_radius: row.geofence_radius,
      tier: row.tier,
      seat_limit: row.seat_limit,
      trial_started_at: row.trial_started_at,
      trial_ends_at: row.trial_ends_at,
      is_active: row.is_active,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createOrganization: ${error.message}`);
  return data as Organization;
}

export interface OrganizationGeofenceInput {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusM: number;
}

export async function updateOrganizationGeofence(
  orgId: string,
  input: OrganizationGeofenceInput,
): Promise<Organization> {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
  if (!Number.isFinite(input.radiusM) || input.radiusM < 10 || input.radiusM > 10_000) {
    throw new Error("Geofence radius must be between 10 and 10,000 metres.");
  }

  const patch = {
    geofence_enabled: input.enabled,
    geofence_lat: input.latitude,
    geofence_lng: input.longitude,
    geofence_radius: Math.round(input.radiusM),
  };

  if (isDemo()) {
    const org = ORGANIZATIONS.find((row) => row.id === orgId);
    if (!org) throw new Error("Organization not found.");
    Object.assign(org, patch);
    return org;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("organizations")
    .update(patch)
    .eq("id", orgId)
    .select("*")
    .single();
  if (error) throw new Error(`updateOrganizationGeofence: ${error.message}`);
  return data as Organization;
}

export interface OrgTrialStatus {
  ok: boolean;
  org: Organization;
  reason?: "expired" | "seats_full" | "deactivated";
  daysLeft: number;
  seatsUsed: number;
  seatsLimit: number;
}

export async function getOrgTrialStatus(orgId: string): Promise<OrgTrialStatus> {
  const org = await getOrganization(orgId);
  const seatsUsed = (await listEmployeesForOrg(orgId)).filter(
    (e) => e.account_status === "active" || e.account_status === "pending_review",
  ).length;
  const seatsLimit = org.seat_limit ?? TRIAL_SEAT_LIMIT;
  const trialEnds = org.trial_ends_at ? new Date(org.trial_ends_at).getTime() : Infinity;
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((trialEnds - now) / (24 * 60 * 60 * 1000)));

  if (!org.is_active) {
    return { ok: false, org, reason: "deactivated", daysLeft, seatsUsed, seatsLimit };
  }
  if (org.tier === "free" && trialEnds < now) {
    return { ok: false, org, reason: "expired", daysLeft, seatsUsed, seatsLimit };
  }
  return { ok: true, org, daysLeft, seatsUsed, seatsLimit };
}

export async function canAcceptNewSeat(orgId: string): Promise<{ ok: boolean; reason?: "expired" | "seats_full" | "deactivated"; trial: OrgTrialStatus }> {
  const trial = await getOrgTrialStatus(orgId);
  if (!trial.ok) return { ok: false, reason: trial.reason, trial };
  if (trial.seatsUsed >= trial.seatsLimit) {
    return { ok: false, reason: "seats_full", trial };
  }
  return { ok: true, trial };
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

export async function listEmployeesForOrg(orgId: string): Promise<Employee[]> {
  if (isDemo()) return EMPLOYEES.filter((e) => e.org_id === orgId);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("employees").select("*").eq("org_id", orgId);
  if (error) throw new Error(`listEmployeesForOrg: ${error.message}`);
  return (data ?? []) as Employee[];
}

/** Fuzzy "same person" match within an org — tolerant of whitespace/case. */
export async function findEmployeeByNameInOrg(
  orgId: string,
  name: string,
): Promise<Employee | undefined> {
  const norm = name.trim().toLowerCase();
  if (!norm) return undefined;
  const rows = await listEmployeesForOrg(orgId);
  return rows.find((e) => {
    const candidates = [e.name_th, e.name_en, e.name_zh, e.nickname, e.employee_code]
      .filter((v): v is string => !!v)
      .map((s) => s.trim().toLowerCase());
    return candidates.some((c) => c === norm || c.includes(norm) || norm.includes(c));
  });
}

export async function getEmployeeById(id: string): Promise<Employee | undefined> {
  if (isDemo()) return EMPLOYEES.find((e) => e.id === id);
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("employees").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getEmployeeById: ${error.message}`);
  return (data as Employee) ?? undefined;
}

export async function getEmployeeByLineId(lineUserId: string): Promise<Employee | undefined> {
  if (isDemo()) {
    const seeded = EMPLOYEES.find((e) => e.line_user_id === lineUserId);
    if (seeded) return seeded;

    // A sales demo can bind verified real LINE subjects to one of the seeded
    // employees without replacing the verified subject in the LIFF session.
    // Keep this server-only: the mapping can contain real LINE user IDs.
    const rawMapping = process.env.DEMO_LIFF_EMPLOYEE_MAP?.trim();
    if (!rawMapping) return undefined;
    try {
      const parsed = JSON.parse(rawMapping) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
      const employeeRef = (parsed as Record<string, unknown>)[lineUserId];
      if (typeof employeeRef !== "string") return undefined;
      const normalized = employeeRef.trim().toUpperCase();
      return EMPLOYEES.find(
        (employee) =>
          employee.id === employeeRef.trim() || employee.employee_code?.toUpperCase() === normalized,
      );
    } catch {
      console.warn("DEMO_LIFF_EMPLOYEE_MAP must be a JSON object of LINE user ID to employee code");
      return undefined;
    }
  }
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

export async function listHrEmployees(orgId?: string): Promise<Employee[]> {
  if (isDemo()) {
    return EMPLOYEES.filter(
      (e) => e.role === "hr" && e.line_user_id && (orgId ? e.org_id === orgId : true),
    );
  }
  const sb = supabaseAdmin();
  let q = sb.from("employees").select("*").eq("role", "hr").not("line_user_id", "is", null);
  if (orgId) q = q.eq("org_id", orgId);
  const { data, error } = await q;
  if (error) throw new Error(`listHrEmployees: ${error.message}`);
  return (data ?? []) as Employee[];
}

/**
 * Notification fallback for new tenants: the first registrant of a brand-new
 * tenant is both employee and "boss" — there's no HR. In that case, every
 * supervisor in the org becomes a notify target. If still empty, the owner.
 */
export async function listApprovalAdminsForOrg(orgId: string): Promise<Employee[]> {
  const hr = await listHrEmployees(orgId);
  if (hr.length > 0) return hr;
  const all = await listEmployeesForOrg(orgId);
  const sups = all.filter((e) => e.is_supervisor && e.line_user_id);
  if (sups.length > 0) return sups;
  return all.filter((e) => e.line_user_id);
}

export async function listTeamForSupervisor(supervisorId: string): Promise<Employee[]> {
  // Team = UNION of the supervisor's subordinate_ids roster AND anyone whose
  // leave/ot/contact approval pointer targets them. Unioning (rather than
  // preferring one) keeps the board correct even if subordinate_ids is
  // incomplete (e.g. a lost-update race left an id off the array).
  const supervisor = await getEmployeeById(supervisorId);
  const explicit = supervisor?.subordinate_ids ?? [];
  const byFk = (e: Employee) =>
    e.leave_supervisor_id === supervisorId ||
    e.ot_supervisor_id === supervisorId ||
    e.contact_supervisor_id === supervisorId;

  if (isDemo()) {
    const dedup = new Map<string, Employee>();
    for (const e of EMPLOYEES) {
      if (explicit.includes(e.id) || byFk(e)) dedup.set(e.id, e);
    }
    return Array.from(dedup.values());
  }

  const sb = supabaseAdmin();
  const dedup = new Map<string, Employee>();
  if (explicit.length > 0) {
    const { data, error } = await sb.from("employees").select("*").in("id", explicit);
    if (error) throw new Error(`listTeamForSupervisor (subordinate_ids): ${error.message}`);
    for (const e of (data ?? []) as Employee[]) dedup.set(e.id, e);
  }
  const { data, error } = await sb
    .from("employees")
    .select("*")
    .or(
      `leave_supervisor_id.eq.${supervisorId},ot_supervisor_id.eq.${supervisorId},contact_supervisor_id.eq.${supervisorId}`,
    );
  if (error) throw new Error(`listTeamForSupervisor: ${error.message}`);
  for (const e of (data ?? []) as Employee[]) dedup.set(e.id, e);
  return Array.from(dedup.values());
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
// Org invites (supervisor-first registration)
// =========================================================================

function newInviteToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreateInviteInput {
  orgId: string;
  supervisorId: string;
  grant?: SupervisorGrant;
  role?: Employee["role"];
  expiresAt?: string | null;
  maxUses?: number | null;
}

export async function createOrgInvite(input: CreateInviteInput): Promise<OrgInvite> {
  const grant = input.grant ?? { leave: true, overtime: true, contact: true };
  const now = new Date().toISOString();
  const row: OrgInvite = {
    id: newId("invite"),
    org_id: input.orgId,
    token: newInviteToken(),
    created_by: input.supervisorId,
    set_supervisor_id: input.supervisorId,
    role_to_grant: input.role ?? "employee",
    grant_leave: grant.leave,
    grant_overtime: grant.overtime,
    grant_contact: grant.contact,
    expires_at: input.expiresAt ?? null,
    max_uses: input.maxUses ?? null,
    use_count: 0,
    is_active: true,
    revoked_at: null,
    created_at: now,
  };
  if (isDemo()) {
    ORG_INVITES.push(row);
    return row;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_invites")
    .insert({
      org_id: row.org_id,
      token: row.token,
      created_by: row.created_by,
      set_supervisor_id: row.set_supervisor_id,
      role_to_grant: row.role_to_grant,
      grant_leave: row.grant_leave,
      grant_overtime: row.grant_overtime,
      grant_contact: row.grant_contact,
      expires_at: row.expires_at,
      max_uses: row.max_uses,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createOrgInvite: ${error.message}`);
  return data as OrgInvite;
}

/** The supervisor's existing active reusable invite, or a freshly-created one. */
export async function getOrCreateReusableInvite(
  orgId: string,
  supervisorId: string,
): Promise<OrgInvite> {
  if (isDemo()) {
    const existing = ORG_INVITES.find(
      (i) => i.org_id === orgId && i.set_supervisor_id === supervisorId && i.is_active,
    );
    return existing ?? createOrgInvite({ orgId, supervisorId });
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("org_invites")
    .select("*")
    .eq("org_id", orgId)
    .eq("set_supervisor_id", supervisorId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getOrCreateReusableInvite: ${error.message}`);
  return (data as OrgInvite) ?? createOrgInvite({ orgId, supervisorId });
}

/** Revoke the supervisor's active invite(s) and mint a fresh one. */
export async function regenerateReusableInvite(
  orgId: string,
  supervisorId: string,
): Promise<OrgInvite> {
  if (isDemo()) {
    for (const i of ORG_INVITES) {
      if (i.org_id === orgId && i.set_supervisor_id === supervisorId && i.is_active) {
        i.is_active = false;
        i.revoked_at = new Date().toISOString();
      }
    }
    return createOrgInvite({ orgId, supervisorId });
  }
  const sb = supabaseAdmin();
  await sb
    .from("org_invites")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("set_supervisor_id", supervisorId)
    .eq("is_active", true);
  return createOrgInvite({ orgId, supervisorId });
}

export interface ResolvedInvite {
  invite: OrgInvite;
  org: Organization;
  supervisor?: Employee;
}

/**
 * Validate + resolve a public invite token. Returns undefined when the token
 * is unknown, revoked, expired, exhausted (use_count >= max_uses), or its org
 * no longer exists.
 */
export async function getOrgInviteByToken(token: string): Promise<ResolvedInvite | undefined> {
  const norm = token.trim();
  if (!norm) return undefined;
  let invite: OrgInvite | undefined;
  if (isDemo()) {
    invite = ORG_INVITES.find((i) => i.token === norm);
  } else {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("org_invites")
      .select("*")
      .eq("token", norm)
      .maybeSingle();
    if (error) throw new Error(`getOrgInviteByToken: ${error.message}`);
    invite = (data as OrgInvite) ?? undefined;
  }
  if (!invite || !invite.is_active) return undefined;
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return undefined;
  if (invite.max_uses != null && invite.use_count >= invite.max_uses) return undefined;
  const org = await getOrganizationById(invite.org_id);
  if (!org) return undefined;
  const supervisor = invite.set_supervisor_id
    ? await getEmployeeById(invite.set_supervisor_id)
    : undefined;
  return { invite, org, supervisor };
}

async function consumeOrgInvite(inviteId: string): Promise<void> {
  if (isDemo()) {
    const inv = ORG_INVITES.find((i) => i.id === inviteId);
    if (inv) inv.use_count += 1;
    return;
  }
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_invites")
    .select("use_count")
    .eq("id", inviteId)
    .maybeSingle();
  const current = (data?.use_count as number | undefined) ?? 0;
  await sb.from("org_invites").update({ use_count: current + 1 }).eq("id", inviteId);
}

// =========================================================================
// Registration (multi-tenant SaaS)
// =========================================================================

export interface RegisterResult {
  ok: boolean;
  message: string;
  employee?: Employee;
  organization?: Organization;
  /** The supervisor an invited employee was auto-linked to (for notifications). */
  supervisor?: Employee;
  /** Reusable company invite minted when a brand-new org owner is activated. */
  invite?: OrgInvite;
  /** True when the registrant was auto-activated (brand-new company owner). */
  activated?: boolean;
  duplicate?: "line_user_id" | "national_id";
  trial?: OrgTrialStatus;
  unresolvedSupervisorName?: string;
  unresolvedSubordinateNames?: string[];
}

/** Next global employee code (EMP001, EMP002, …). Codes are globally unique. */
async function nextEmployeeCode(): Promise<string> {
  const all = await listEmployees();
  const codes = all
    .map((e) => e.employee_code)
    .filter((c): c is string => !!c && /^EMP\d+$/.test(c))
    .map((c) => parseInt(c.slice(3), 10));
  const max = codes.length ? Math.max(...codes) : 0;
  return `EMP${String(max + 1).padStart(3, "0")}`;
}

/**
 * Activate the first registrant of a brand-new org as its owner. Nobody else
 * exists to approve them, so a business owner registering their own company is
 * auto-approved: status→active, gets an employee code, and becomes the org's
 * owner_employee_id. Required for the supervisor-first flow (an inactive owner
 * could never reach guardLiffPage-gated pages to invite their team).
 *
 * SECURITY: refuses to activate when the org already has ANY other non-inactive
 * member. Only registerSupervisor calls this, and only for a freshly-CREATED
 * org, but this guard is the last line of defense against seizing ownership of
 * an established tenant (e.g. a legacy/seeded org whose owner_employee_id is
 * NULL). Returns undefined (no activation) when it declines.
 */
async function activateOwner(employeeId: string, orgId: string): Promise<Employee | undefined> {
  const others = (await listEmployeesForOrg(orgId)).filter(
    (e) => e.id !== employeeId && e.account_status !== "inactive",
  );
  if (others.length > 0) return undefined;
  const now = new Date().toISOString();
  const updated = await updateEmployeeRow(employeeId, {
    account_status: "active",
    employee_code: await nextEmployeeCode(),
    approved_at: now,
    approved_by_id: employeeId,
  });
  if (isDemo()) {
    const o = ORGANIZATIONS.find((x) => x.id === orgId);
    if (o) o.owner_employee_id = employeeId;
  } else {
    const sb = supabaseAdmin();
    await sb.from("organizations").update({ owner_employee_id: employeeId }).eq("id", orgId);
  }
  return updated;
}

function makeNewEmployeeRow(
  orgId: string,
  input: RegistrationInput,
  base: {
    role: Employee["role"];
    is_supervisor: boolean;
  },
): Omit<Employee, "id"> {
  const now = new Date().toISOString();
  return {
    org_id: orgId,
    line_user_id: input.line_user_id,
    line_display_name: input.display_name ?? null,
    line_picture_url: input.picture_url ?? null,
    employee_code: null,
    name_th: input.name_th,
    name_en: input.name_en ?? null,
    name_zh: input.name_zh ?? null,
    nickname: input.nickname ?? null,
    role: base.role,
    department: input.department ?? null,
    position: input.position ?? null,
    job_title: input.job_title ?? null,
    shift_group: input.shift_group ?? null,
    base_salary: input.base_salary ?? null,
    bank_account: input.bank_account ?? null,
    sso_number: null,
    tax_profile: {
      personal_allowance: 60000,
      spouse_allowance: 0,
      child_allowance: 0,
      parent_allowance: 0,
      insurance_deduction: 0,
      provident_fund_deduction: 0,
      other_deductions: 0,
    },
    account_status: "pending_review",
    phone: input.phone,
    national_id: input.national_id ?? null,
    date_of_birth: input.date_of_birth ?? null,
    gender: input.gender ?? null,
    nationality: "TH",
    marital_status: null,
    hire_date: input.hire_date ?? null,
    employment_type: input.employment_type ?? "full_time",
    address: input.address ?? null,
    emergency_contact: input.emergency_contact ?? null,
    home_lat: input.home_lat ?? null,
    home_lng: input.home_lng ?? null,
    home_location_label: input.home_location_label ?? null,
    home_location_source: input.home_location_source ?? null,
    id_card_photo_url: input.id_card_photo_url ?? null,
    bank_book_photo_url: input.bank_book_photo_url ?? null,
    profile_photo_url: input.profile_photo_url ?? null,
    rejection_reason: null,
    submitted_at: now,
    approved_at: null,
    approved_by_id: null,
    leave_supervisor_id: null,
    ot_supervisor_id: null,
    contact_supervisor_id: null,
    is_supervisor: base.is_supervisor,
    subordinate_ids: [],
    pdpa_consent_at: input.pdpa_consent ? now : null,
    metadata: {},
    notes: null,
    created_at: now,
  };
}

// Tenant resolution for registration is inlined in registerSupervisor
// (find-first, create-only-after-validation) so a failed registration never
// leaves an orphan organization that a later same-name registrant could claim.

async function persistEmployee(row: Omit<Employee, "id">): Promise<Employee> {
  if (isDemo()) {
    const employee: Employee = { id: newId("emp"), ...row };
    EMPLOYEES.push(employee);
    return employee;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("employees").insert(row).select("*").single();
  if (error) throw new Error(`persistEmployee: ${error.message}`);
  return data as Employee;
}

async function updateEmployeeRow(
  id: string,
  patch: Partial<Employee>,
): Promise<Employee | undefined> {
  if (isDemo()) {
    const e = EMPLOYEES.find((x) => x.id === id);
    if (!e) return undefined;
    Object.assign(e, patch);
    return e;
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employees")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`updateEmployeeRow: ${error.message}`);
  return data as Employee;
}

function grantToFkPatch(supervisorId: string, grant: SupervisorGrant): Partial<Employee> {
  return {
    leave_supervisor_id: grant.leave ? supervisorId : null,
    ot_supervisor_id: grant.overtime ? supervisorId : null,
    contact_supervisor_id: grant.contact ? supervisorId : null,
  };
}

function unionSubordinates(prev: string[] | undefined, ...ids: string[]): string[] {
  const set = new Set([...(prev ?? []), ...ids]);
  return Array.from(set);
}

/**
 * Demo/fallback LINE profile id returned by initLiff when liff.init fails or no
 * LIFF id is configured. Registration server actions reject it in production so
 * a mis-initialized client can never persist a phantom employee.
 */
const DEMO_LINE_SENTINEL = "U1234567890abcdef1234567890abcdef";

/**
 * Atomically append an employee to a supervisor's subordinate roster and mark
 * them a supervisor. Uses the add_subordinate() Postgres function (single
 * UPDATE under the row lock) so concurrent invite redemptions can't lose an
 * id to a read-modify-write race. Demo mode mutates the shared array directly
 * (single-threaded, so no race).
 */
async function linkSubordinate(supervisorId: string, employeeId: string): Promise<void> {
  if (isDemo()) {
    const sup = EMPLOYEES.find((e) => e.id === supervisorId);
    if (sup) {
      sup.is_supervisor = true;
      sup.subordinate_ids = unionSubordinates(sup.subordinate_ids, employeeId);
    }
    return;
  }
  const sb = supabaseAdmin();
  const { error } = await sb.rpc("add_subordinate", {
    p_supervisor: supervisorId,
    p_new: employeeId,
  });
  if (error) throw new Error(`linkSubordinate: ${error.message}`);
}

interface PendingSubordinateGrant {
  employee_id: string;
  leave?: boolean;
  overtime?: boolean;
  contact?: boolean;
}

/**
 * Apply subordinate approval grants that were DEFERRED at registration time.
 * A supervisor who declares their team before being approved must not repoint
 * an existing employee's approver to an unapproved outsider — the grants are
 * stashed on metadata.pending_subordinate_grants and only wired here, once the
 * supervisor is approved (account_status→active).
 */
async function applyPendingSubordinateGrants(supervisor: Employee | undefined): Promise<void> {
  if (!supervisor) return;
  const meta = (supervisor.metadata ?? {}) as Record<string, unknown>;
  const pending = meta.pending_subordinate_grants as PendingSubordinateGrant[] | undefined;
  if (!pending || pending.length === 0) return;

  const linkedIds: string[] = [];
  for (const g of pending) {
    const merged: Partial<Employee> = {};
    if (g.leave) merged.leave_supervisor_id = supervisor.id;
    if (g.overtime) merged.ot_supervisor_id = supervisor.id;
    if (g.contact) merged.contact_supervisor_id = supervisor.id;
    if (Object.keys(merged).length > 0) {
      await updateEmployeeRow(g.employee_id, merged);
    }
    linkedIds.push(g.employee_id);
  }

  const nextMeta = { ...meta };
  delete nextMeta.pending_subordinate_grants;
  await updateEmployeeRow(supervisor.id, {
    is_supervisor: true,
    subordinate_ids: unionSubordinates(supervisor.subordinate_ids, ...linkedIds),
    metadata: nextMeta,
  });
}

/**
 * Employee registration entry point — INVITE-ONLY. Behavior:
 *   1. Resolve the org + inviting supervisor from input.invite_token
 *      (no business-name typing, no accidental new-tenant creation)
 *   2. Enforce trial seat cap on the invited org
 *   3. Insert the new employee row (account_status='pending_review')
 *   4. Auto-link the employee to the inviting supervisor per the invite's
 *      preset grants (leave/ot/contact FKs + subordinate_ids)
 *   5. Increment the invite's use_count
 * The inviting supervisor approves them afterwards via the existing LINE card.
 */
export async function registerEmployee(input: RegistrationInput): Promise<RegisterResult> {
  if (!isDemo() && input.line_user_id === DEMO_LINE_SENTINEL) {
    return { ok: false, message: "ไม่พบข้อมูล LINE กรุณาเปิดหน้านี้ในแอป LINE อีกครั้ง" };
  }

  // A previously-REJECTED (inactive) row on this LINE id is allowed to
  // re-apply (possibly into a different company via a new invite). Only an
  // active/pending row is a true duplicate.
  const existingByLine = await getEmployeeByLineId(input.line_user_id);
  if (existingByLine && existingByLine.account_status !== "inactive") {
    return {
      ok: false,
      message: "This LINE account is already registered.",
      duplicate: "line_user_id",
      employee: existingByLine,
    };
  }
  if (input.national_id) {
    const dup = await getEmployeeByNationalId(input.national_id);
    if (dup && dup.id !== existingByLine?.id && dup.account_status !== "inactive") {
      return { ok: false, message: "This national ID is already in our records.", duplicate: "national_id" };
    }
  }

  if (!input.invite_token?.trim()) {
    return { ok: false, message: "ต้องใช้ลิงก์คำเชิญจากหัวหน้าเพื่อลงทะเบียน" };
  }
  const resolved = await getOrgInviteByToken(input.invite_token);
  if (!resolved) {
    return { ok: false, message: "ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุ — โปรดขอลิงก์ใหม่จากหัวหน้า" };
  }
  const org = resolved.org;

  const seatCheck = await canAcceptNewSeat(org.id);
  if (!seatCheck.ok) {
    return {
      ok: false,
      message:
        seatCheck.reason === "seats_full"
          ? "บริษัทนี้เต็มโควต้าที่นั่งแล้ว — แจ้งหัวหน้าเพื่ออัพเกรดแพ็กเกจ"
          : seatCheck.reason === "expired"
          ? "บริษัทนี้ครบกำหนดทดลองใช้แล้ว — แจ้งหัวหน้าเพื่ออัพเกรด"
          : "บริษัทนี้ถูกระงับการใช้งาน",
      trial: seatCheck.trial,
      organization: org,
    };
  }

  const supervisor = resolved.supervisor;
  const grant: SupervisorGrant = {
    leave: resolved.invite.grant_leave,
    overtime: resolved.invite.grant_overtime,
    contact: resolved.invite.grant_contact,
  };

  // makeNewEmployeeRow builds the full field set (status='pending_review',
  // fresh submitted_at, cleared approval/rejection). Reuse it for both a brand
  // new insert and a re-application over a rejected row (keeping its id / seat).
  const row = makeNewEmployeeRow(org.id, input, {
    role: resolved.invite.role_to_grant,
    is_supervisor: resolved.invite.role_to_grant === "supervisor",
  });
  if (supervisor) {
    Object.assign(row, grantToFkPatch(supervisor.id, grant));
  }

  const employee =
    existingByLine && existingByLine.account_status === "inactive"
      ? await updateEmployeeRow(existingByLine.id, row)
      : await persistEmployee(row);
  if (!employee) {
    return { ok: false, message: "ลงทะเบียนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", organization: org };
  }

  // Auto-link to the inviting supervisor so the joiner shows up on their team
  // board and their leave/ot/contact requests route to that supervisor. Atomic
  // append guards against concurrent redemptions of the same reusable invite.
  if (supervisor) {
    await linkSubordinate(supervisor.id, employee.id);
  }

  await consumeOrgInvite(resolved.invite.id);

  return {
    ok: true,
    message: "Application submitted.",
    employee,
    organization: org,
    supervisor,
    trial: seatCheck.trial,
  };
}

/**
 * Supervisor registration entry point — symmetric to registerEmployee but
 * the caller acts as a future approver for any subordinates they list.
 */
export async function registerSupervisor(input: RegistrationInput): Promise<RegisterResult> {
  if (!isDemo() && input.line_user_id === DEMO_LINE_SENTINEL) {
    return { ok: false, message: "ไม่พบข้อมูล LINE กรุณาเปิดหน้านี้ในแอป LINE อีกครั้ง" };
  }
  if (input.line_user_id) {
    const existingByLine = await getEmployeeByLineId(input.line_user_id);
    if (existingByLine) {
      return {
        ok: false,
        message: "This LINE account is already registered.",
        duplicate: "line_user_id",
        employee: existingByLine,
      };
    }
  }
  if (input.national_id) {
    const dup = await getEmployeeByNationalId(input.national_id);
    if (dup) return { ok: false, message: "This national ID is already in our records.", duplicate: "national_id" };
  }

  if (!input.business_name?.trim()) {
    return { ok: false, message: "กรุณากรอกชื่อบริษัท / ธุรกิจ" };
  }

  // Resolve the tenant FIRST as a lookup only (do NOT create yet) so a failed
  // registration never leaves an orphan org, and so we can distinguish a brand
  // new company (created===true → owner auto-activation) from joining an
  // existing one (stays pending_review, approved by the owner).
  const existingOrg = await findOrganizationByBusinessName(input.business_name);

  // A brand-new company has no members yet, so declaring a team by name is
  // invalid there — the team joins via the invite link instead.
  const declaredSubs = (input.subordinates ?? []).filter((l) => l.name.trim());
  if (!existingOrg && declaredSubs.length > 0) {
    return {
      ok: false,
      message: "บริษัทใหม่ยังไม่มีพนักงานให้เพิ่มเป็นลูกน้อง — ลบรายชื่อออก แล้วเชิญทีมภายหลังผ่านลิงก์คำเชิญ",
      unresolvedSubordinateNames: declaredSubs.map((l) => l.name),
    };
  }

  // Resolve EVERY declared subordinate name (existing org only) BEFORE any
  // write — block if any didn't match.
  const resolved: Array<{ link: SubordinateLink; employee: Employee }> = [];
  if (existingOrg) {
    const unresolved: string[] = [];
    for (const link of declaredSubs) {
      const match = await findEmployeeByNameInOrg(existingOrg.id, link.name);
      if (!match) unresolved.push(link.name);
      else resolved.push({ link, employee: match });
    }
    if (unresolved.length > 0) {
      return {
        ok: false,
        message: `ไม่พบลูกน้องชื่อ ${unresolved
          .map((n) => `"${n}"`)
          .join(", ")} ในบริษัท ${existingOrg.business_name} — แก้ไขชื่อหรือเอาออกก่อนส่ง`,
        unresolvedSubordinateNames: unresolved,
        organization: existingOrg,
      };
    }
  }

  // Create the org only now that validation passed (no orphan on early return).
  const created = !existingOrg;
  const org =
    existingOrg ??
    (await createOrganization({
      business_name: input.business_name.trim(),
      business_type: input.business_type,
    }));

  const seatCheck = await canAcceptNewSeat(org.id);
  if (!seatCheck.ok) {
    return {
      ok: false,
      message:
        seatCheck.reason === "seats_full"
          ? "ทดลองใช้ครบโควต้า 10 คนแล้ว — ติดต่อทีมงานเพื่ออัพเกรด"
          : seatCheck.reason === "expired"
          ? "ครบกำหนดทดลองใช้ 30 วัน — ติดต่อทีมงานเพื่ออัพเกรด"
          : "บริษัทนี้ถูกระงับการใช้งาน",
      trial: seatCheck.trial,
      organization: org,
    };
  }

  const newRow = makeNewEmployeeRow(org.id, input, {
    role: "supervisor",
    is_supervisor: true,
  });
  newRow.subordinate_ids = resolved.map((r) => r.employee.id);
  // Defer the actual approval-FK rewiring on existing employees until this
  // supervisor is APPROVED — never repoint a real employee's approver to an
  // unapproved outsider. Stash the intended grants on metadata; approveRegistration
  // applies them. (A brand-new org has no resolved subordinates, so this is empty.)
  if (resolved.length > 0) {
    newRow.metadata = {
      ...(newRow.metadata ?? {}),
      pending_subordinate_grants: resolved.map((r) => ({
        employee_id: r.employee.id,
        leave: !!r.link.grant.leave,
        overtime: !!r.link.grant.overtime,
        contact: !!r.link.grant.contact,
      })),
    };
  }
  const supervisor = await persistEmployee(newRow);

  // Brand-new company: the registrant is the owner/boss. Auto-activate them
  // (nobody else can approve the first person) and mint their reusable company
  // invite link. A supervisor who joins an EXISTING org stays pending_review,
  // is approved by the owner/HR (which then wires their declared team), and
  // generates their own invite from /liff/invite once active.
  let activated = false;
  let invite: OrgInvite | undefined;
  if (created) {
    const activatedRow = await activateOwner(supervisor.id, org.id);
    if (activatedRow) {
      Object.assign(supervisor, activatedRow);
      activated = true;
      // A brand-new company has no pre-existing team, but honor any deferred
      // grants for completeness before handing over the invite.
      await applyPendingSubordinateGrants(supervisor);
      invite = await createOrgInvite({ orgId: org.id, supervisorId: supervisor.id });
    }
  }

  return {
    ok: true,
    message: activated ? "Account activated." : "Application submitted.",
    employee: supervisor,
    organization: org,
    trial: seatCheck.trial,
    activated,
    invite,
  };
}

// =========================================================================
// Profile editing (self + supervisor-of-target)
// =========================================================================

export interface ProfileEditableFields {
  name_th?: string;
  name_en?: string;
  name_zh?: string;
  nickname?: string;
  phone?: string;
  address?: string;
  emergency_contact?: string;
  bank_account?: string;
  date_of_birth?: string | null;
  gender?: Employee["gender"];
  marital_status?: Employee["marital_status"];
  hire_date?: string | null;
  employment_type?: Employee["employment_type"];
  department?: string;
  position?: string;
  job_title?: string;
  shift_group?: string;
  base_salary?: number | null;
  home_lat?: number | null;
  home_lng?: number | null;
  home_location_label?: string | null;
  home_location_source?: HomeLocationSource | null;
  profile_photo_url?: string | null;
  notes?: string | null;
}

export type ProfileEditPermission = "self" | "supervisor" | "hr" | "denied";

export async function getProfileEditPermission(
  actorId: string,
  targetId: string,
): Promise<ProfileEditPermission> {
  if (actorId === targetId) return "self";
  const actor = await getEmployeeById(actorId);
  const target = await getEmployeeById(targetId);
  if (!actor || !target) return "denied";
  if (actor.org_id !== target.org_id) return "denied";
  if (actor.role === "hr") return "hr";
  const isLead =
    target.leave_supervisor_id === actorId ||
    target.ot_supervisor_id === actorId ||
    target.contact_supervisor_id === actorId ||
    (actor.subordinate_ids ?? []).includes(target.id);
  return isLead ? "supervisor" : "denied";
}

export async function updateEmployeeProfile(
  actorId: string,
  targetId: string,
  patch: ProfileEditableFields,
  reason?: string,
): Promise<{ ok: boolean; message: string; employee?: Employee }> {
  const permission = await getProfileEditPermission(actorId, targetId);
  if (permission === "denied") return { ok: false, message: "ไม่มีสิทธิ์แก้ไขข้อมูลคนนี้" };
  const before = await getEmployeeById(targetId);
  if (!before) return { ok: false, message: "ไม่พบพนักงาน" };

  // Strip undefined keys so we don't accidentally null fields out
  const cleaned: Partial<Employee> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    (cleaned as Record<string, unknown>)[k] = v;
  }

  const updated = await updateEmployeeRow(targetId, cleaned);
  if (!updated) return { ok: false, message: "อัปเดตไม่สำเร็จ" };

  // Audit each changed field
  for (const key of Object.keys(cleaned)) {
    const oldVal = (before as unknown as Record<string, unknown>)[key];
    const newVal = (updated as unknown as Record<string, unknown>)[key];
    if (oldVal === newVal) continue;
    const audit: ProfileEditAudit = {
      id: newId("audit"),
      org_id: before.org_id,
      target_id: targetId,
      edited_by: actorId,
      field: key,
      old_value: oldVal == null ? null : String(oldVal),
      new_value: newVal == null ? null : String(newVal),
      reason: reason ?? null,
      created_at: new Date().toISOString(),
    };
    if (isDemo()) {
      PROFILE_EDIT_AUDIT.push(audit);
    } else {
      const sb = supabaseAdmin();
      await sb.from("profile_edit_audit").insert({
        org_id: audit.org_id,
        target_id: audit.target_id,
        edited_by: audit.edited_by,
        field: audit.field,
        old_value: audit.old_value,
        new_value: audit.new_value,
        reason: audit.reason,
      });
    }
  }

  return { ok: true, message: "บันทึกแล้ว", employee: updated };
}

export async function listProfileEditsForTarget(
  targetId: string,
  limit = 20,
): Promise<ProfileEditAudit[]> {
  if (isDemo()) {
    return PROFILE_EDIT_AUDIT.filter((a) => a.target_id === targetId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("profile_edit_audit")
    .select("*")
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listProfileEditsForTarget: ${error.message}`);
  return (data ?? []) as ProfileEditAudit[];
}

export async function getRegistrationStatus(lineUserId: string): Promise<
  | { state: "new" }
  | { state: "pending"; employee: Employee }
  | { state: "active"; employee: Employee }
  | { state: "rejected"; employee: Employee }
> {
  const e = await getEmployeeByLineId(lineUserId);
  if (!e) return { state: "new" };
  if (e.account_status === "pending_review" || e.account_status === "awaiting_supervisor")
    return { state: "pending", employee: e };
  if (e.account_status === "inactive") return { state: "rejected", employee: e };
  return { state: "active", employee: e };
}

export async function approveRegistration(
  employeeId: string,
  approverId: string,
  patch: { employee_code: string; role?: Employee["role"]; base_salary?: number },
): Promise<Employee | undefined> {
  const before = await getEmployeeById(employeeId);
  if (!before) return undefined;
  // Preserve the applicant's existing role (e.g. a supervisor stays a
  // supervisor) unless the approver explicitly overrides it — the LINE
  // fast-track approval used to force 'employee', demoting supervisors.
  const nextRole = patch.role ?? before.role;
  const now = new Date().toISOString();

  let updated: Employee | undefined;
  if (isDemo()) {
    const e = EMPLOYEES.find((x) => x.id === employeeId);
    if (!e) return undefined;
    e.account_status = "active";
    e.employee_code = patch.employee_code;
    e.role = nextRole;
    if (typeof patch.base_salary === "number") e.base_salary = patch.base_salary;
    e.approved_at = now;
    e.approved_by_id = approverId;
    updated = e;
  } else {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("employees")
      .update({
        account_status: "active",
        employee_code: patch.employee_code,
        role: nextRole,
        base_salary: patch.base_salary ?? before.base_salary ?? null,
        approved_at: now,
        approved_by_id: approverId,
      })
      .eq("id", employeeId)
      .select("*")
      .single();
    if (error) throw new Error(`approveRegistration: ${error.message}`);
    updated = data as Employee;
  }

  // Now that the supervisor is active, wire any team they declared at
  // registration (deferred to avoid repointing employees to an unapproved
  // approver). No-op for a plain employee.
  await applyPendingSubordinateGrants(updated);
  return updated;
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

export async function listShifts(orgId = getDefaultOrganizationId()): Promise<Shift[]> {
  if (isDemo()) return SHIFTS.filter((shift) => shift.org_id === orgId);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("shifts")
    .select("*")
    .eq("org_id", orgId)
    .order("start_time");
  if (error) throw new Error(`listShifts: ${error.message}`);
  return (data ?? []) as Shift[];
}

export async function listEmployeeShifts(
  orgId = getDefaultOrganizationId(),
): Promise<EmployeeShift[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return EMPLOYEE_SHIFTS.filter((shift) => allowed.has(shift.employee_id));
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("employee_shifts")
    .select("*")
    .in("employee_id", ids)
    .order("date", { ascending: false });
  if (error) throw new Error(`listEmployeeShifts: ${error.message}`);
  return (data ?? []) as EmployeeShift[];
}

// =========================================================================
// Attendance (read in production for personal history)
// =========================================================================

export async function listAttendanceLogs(
  orgId = getDefaultOrganizationId(),
): Promise<AttendanceLog[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return ATTENDANCE_LOGS.filter((log) => allowed.has(log.employee_id)).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("attendance_logs")
    .select("*")
    .in("employee_id", ids)
    .order("timestamp", { ascending: false });
  if (error) throw new Error(`listAttendanceLogs: ${error.message}`);
  return (data ?? []) as AttendanceLog[];
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

export async function listLeaveRequestsForOrg(orgId: string): Promise<LeaveRequest[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return LEAVE_REQUESTS.filter((request) => allowed.has(request.employee_id)).sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leave_requests")
    .select("*")
    .in("employee_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listLeaveRequestsForOrg: ${error.message}`);
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

export async function listOvertimeRequestsForOrg(orgId: string): Promise<OvertimeRequest[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return OVERTIME_REQUESTS.filter((request) => allowed.has(request.employee_id)).sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("overtime_requests")
    .select("*")
    .in("employee_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listOvertimeRequestsForOrg: ${error.message}`);
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

export async function listContactRequestsForOrg(orgId: string): Promise<ContactRequest[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return CONTACT_REQUESTS.filter((request) => allowed.has(request.employee_id)).sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("contact_requests")
    .select("*")
    .in("employee_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listContactRequestsForOrg: ${error.message}`);
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
    if (t.intended_user_id && t.intended_user_id !== intendedUserId) {
      return { ok: false, reason: "token is not intended for this approver" };
    }
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
  if (t.intended_user_id && t.intended_user_id !== intendedUserId) {
    return { ok: false, reason: "token is not intended for this approver" };
  }
  const consumedAt = new Date().toISOString();
  const { data: consumed, error: uerr } = await sb
    .from("line_action_tokens")
    .update({ used_at: consumedAt })
    .eq("token", tokenStr)
    .is("used_at", null)
    .gt("expires_at", consumedAt)
    .select("token, action, kind:request_kind, request_id, intended_user_id, used_at, expires_at, created_at")
    .maybeSingle();
  if (uerr) throw new Error(`consumeActionToken update: ${uerr.message}`);
  if (!consumed) return { ok: false, reason: "token already used or expired" };
  return { ok: true, token: consumed as unknown as ActionToken };
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

export async function listPayrolls(
  orgId = getDefaultOrganizationId(),
): Promise<Payroll[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return PAYROLLS.filter((payroll) => allowed.has(payroll.employee_id)).sort((a, b) =>
      b.month_year.localeCompare(a.month_year),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("payrolls")
    .select("*")
    .in("employee_id", ids)
    .order("month_year", { ascending: false });
  if (error) throw new Error(`listPayrolls: ${error.message}`);
  return (data ?? []) as Payroll[];
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

export async function listPerformanceReviews(
  orgId = getDefaultOrganizationId(),
): Promise<PerformanceReview[]> {
  const employees = await listEmployeesForOrg(orgId);
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return [];
  if (isDemo()) {
    const allowed = new Set(ids);
    return PERFORMANCE_REVIEWS.filter((review) => allowed.has(review.employee_id)).sort((a, b) =>
      b.review_date.localeCompare(a.review_date),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("performance_reviews")
    .select("*")
    .in("employee_id", ids)
    .order("review_date", { ascending: false });
  if (error) throw new Error(`listPerformanceReviews: ${error.message}`);
  return (data ?? []) as PerformanceReview[];
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
// Dashboard analytics (tenant-scoped in both demo and Supabase modes)
// =========================================================================

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingApprovals: number;
  attendanceRate: number;
  lateToday: number;
}

export async function getDashboardStats(
  orgId = getDefaultOrganizationId(),
): Promise<DashboardStats> {
  const [employees, logs, leaves, overtime] = await Promise.all([
    listEmployeesForOrg(orgId),
    listAttendanceLogs(orgId),
    listLeaveRequestsForOrg(orgId),
    listOvertimeRequestsForOrg(orgId),
  ]);
  const today =
    logs.find((log) => log.type === "in")?.timestamp.slice(0, 10) ??
    (isDemo() ? "2026-05-09" : new Date().toISOString().slice(0, 10));
  const active = employees.filter((employee) => employee.account_status === "active");
  const attendanceEligible = active.filter((employee) => employee.role !== "executive");
  const todayLogs = logs.filter(
    (l) => l.timestamp.startsWith(today) && l.type === "in",
  );
  const present = new Set(todayLogs.map((l) => l.employee_id)).size;
  const late = todayLogs.filter((l) => l.status === "late").length;
  const onLeave = leaves.filter(
    (l) => l.status === "approved" && l.start_date <= today && l.end_date >= today,
  ).length;
  const pending =
    leaves.filter((l) => l.status === "pending").length +
    overtime.filter((o) => o.status === "pending").length;
  const total = attendanceEligible.length;
  return {
    totalEmployees: active.length,
    presentToday: present,
    onLeaveToday: onLeave,
    pendingApprovals: pending,
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
    lateToday: late,
  };
}

export async function getAttendanceTrend(
  days = 7,
  orgId = getDefaultOrganizationId(),
): Promise<
  { date: string; present: number; late: number; absent: number }[]
> {
  const trend: { date: string; present: number; late: number; absent: number }[] = [];
  const [employeeRows, logs] = await Promise.all([
    listEmployeesForOrg(orgId),
    listAttendanceLogs(orgId),
  ]);
  const employees = employeeRows.filter(
    (employee) => employee.account_status === "active" && employee.role !== "executive",
  ).length;
  const anchor =
    logs.find((log) => log.type === "in")?.timestamp.slice(0, 10) ??
    (isDemo() ? "2026-05-09" : new Date().toISOString().slice(0, 10));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(`${anchor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLogs = logs.filter((l) => l.timestamp.startsWith(dateStr) && l.type === "in");
    const present = new Set(dayLogs.map((l) => l.employee_id)).size;
    const late = dayLogs.filter((l) => l.status === "late").length;
    const absent = Math.max(0, employees - present);
    trend.push({ date: dateStr, present, late, absent });
  }
  return trend;
}

export async function getDepartmentBreakdown(
  orgId = getDefaultOrganizationId(),
): Promise<{ department: string; count: number }[]> {
  const groups = new Map<string, number>();
  const employees = await listEmployeesForOrg(orgId);
  for (const e of employees.filter((employee) => employee.account_status === "active")) {
    const k = e.department ?? "Unassigned";
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([department, count]) => ({ department, count }));
}

// =========================================================================
// Thai Social Security (auto-calc on payslip)
// =========================================================================

export async function getActiveSsoConfig(
  country = "TH",
  asOf: Date = new Date(),
): Promise<SocialSecurityConfig | undefined> {
  const day = asOf.toISOString().slice(0, 10);
  if (isDemo()) {
    return SOCIAL_SECURITY_CONFIGS.find(
      (c) =>
        c.country === country &&
        c.effective_from <= day &&
        (!c.effective_to || c.effective_to >= day),
    );
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("social_security_config")
    .select("*")
    .eq("country", country)
    .lte("effective_from", day)
    .or(`effective_to.is.null,effective_to.gte.${day}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getActiveSsoConfig: ${error.message}`);
  return (data as SocialSecurityConfig) ?? undefined;
}

export interface SsoBreakdown {
  configId: string | null;
  ratePct: number;
  base: number;
  contribution: number;
  ceiling: number;
  floor: number;
  capped: boolean;
}

export async function calcEmployeeSso(
  salary: number | null | undefined,
  asOf: Date = new Date(),
): Promise<SsoBreakdown> {
  const cfg = await getActiveSsoConfig("TH", asOf);
  if (!cfg || !salary || salary <= 0) {
    return {
      configId: cfg?.id ?? null,
      ratePct: cfg?.rate_pct ?? 0,
      base: 0,
      contribution: 0,
      ceiling: cfg?.wage_ceiling ?? 0,
      floor: cfg?.wage_floor ?? 0,
      capped: false,
    };
  }
  const base = Math.min(Math.max(salary, cfg.wage_floor), cfg.wage_ceiling);
  const raw = Math.round((base * cfg.rate_pct) / 100);
  const contribution = Math.min(raw, cfg.max_contribution);
  return {
    configId: cfg.id,
    ratePct: cfg.rate_pct,
    base,
    contribution,
    ceiling: cfg.wage_ceiling,
    floor: cfg.wage_floor,
    capped: salary >= cfg.wage_ceiling,
  };
}

// =========================================================================
// Attendance v3 (optional server-enforced geofence, in/out pairing, reason)
// =========================================================================

export async function getLastAttendanceLog(employeeId: string): Promise<AttendanceLog | undefined> {
  if (isDemo()) {
    return ATTENDANCE_LOGS.filter((l) => l.employee_id === employeeId).sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    )[0];
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("attendance_logs")
    .select("*")
    .eq("employee_id", employeeId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLastAttendanceLog: ${error.message}`);
  return (data as AttendanceLog) ?? undefined;
}

export interface RecordAttendanceInput {
  employee_id: string;
  type: AttendanceType;
  latitude?: number | null;
  longitude?: number | null;
  reason?: string | null;
  source?: AttendanceSource;
}

export interface AttendanceGeofenceDecision {
  enabled: boolean;
  result: AttendanceLog["geofence_result"];
  distanceM: number | null;
  radiusM: number;
}

export interface RecordAttendanceResult {
  ok: boolean;
  message: string;
  log?: AttendanceLog;
  geofence?: AttendanceGeofenceDecision;
  /** When ok=false because of double-clock-in, surface the open session so UI can prompt to clock out */
  openSession?: AttendanceLog;
}

export async function recordAttendance(
  input: RecordAttendanceInput,
): Promise<RecordAttendanceResult> {
  const employee = await getEmployeeById(input.employee_id);
  if (!employee) return { ok: false, message: "ไม่พบข้อมูลพนักงาน" };
  const org = await getOrganizationById(employee.org_id);
  if (!org) return { ok: false, message: "ไม่พบข้อมูลองค์กร" };

  const hasSiteLocation = org.geofence_lat != null && org.geofence_lng != null;
  const hasDeviceLocation = input.latitude != null && input.longitude != null;
  const distanceM =
    hasSiteLocation && hasDeviceLocation
      ? haversineMeters(
          Number(org.geofence_lat),
          Number(org.geofence_lng),
          Number(input.latitude),
          Number(input.longitude),
        )
      : null;
  let geofenceResult: AttendanceLog["geofence_result"] = "disabled";

  if (org.geofence_enabled) {
    if (!hasSiteLocation) {
      geofenceResult = "unconfigured";
      return {
        ok: false,
        message: "องค์กรเปิดตรวจสอบสถานที่ แต่ยังไม่ได้ตั้งพิกัดสถานที่ทำงาน กรุณาติดต่อหัวหน้า",
        geofence: {
          enabled: true,
          result: geofenceResult,
          distanceM: null,
          radiusM: Number(org.geofence_radius),
        },
      };
    }
    if (!hasDeviceLocation) {
      geofenceResult = "missing_location";
      return {
        ok: false,
        message: "ต้องอนุญาตตำแหน่ง GPS ก่อนจึงจะบันทึกเวลาได้",
        geofence: {
          enabled: true,
          result: geofenceResult,
          distanceM: null,
          radiusM: Number(org.geofence_radius),
        },
      };
    }
    geofenceResult = Number(distanceM) <= Number(org.geofence_radius) ? "inside" : "outside";
    if (geofenceResult === "outside") {
      return {
        ok: false,
        message: `คุณอยู่นอกพื้นที่ทำงาน ระยะประมาณ ${Math.round(Number(distanceM))} เมตร (กำหนด ${Math.round(Number(org.geofence_radius))} เมตร)`,
        geofence: {
          enabled: true,
          result: geofenceResult,
          distanceM,
          radiusM: Number(org.geofence_radius),
        },
      };
    }
  }

  const geofence: AttendanceGeofenceDecision = {
    enabled: org.geofence_enabled,
    result: geofenceResult,
    distanceM,
    radiusM: Number(org.geofence_radius),
  };
  const last = await getLastAttendanceLog(input.employee_id);

  // Rule: cannot clock IN twice in a row — must clock OUT first
  if (input.type === "in" && last && last.type === "in") {
    return {
      ok: false,
      message:
        "คุณยังกดออกงานครั้งก่อนยังไม่ครบ กดออกงานก่อนถึงจะกดเข้างานใหม่ได้",
      openSession: last,
      geofence,
    };
  }
  // Rule: cannot clock OUT without a matching IN (would orphan the record).
  // Allow it WITH a reason so users who forgot can still close out the day.
  if (input.type === "out" && (!last || last.type === "out")) {
    if (!input.reason?.trim()) {
      return {
        ok: false,
        message:
          "ยังไม่พบการเข้างานที่ยังเปิดอยู่ — โปรดกดเข้างานก่อน หรือใส่เหตุผลเพื่อบันทึกย้อนหลัง",
        geofence,
      };
    }
  }

  const now = new Date().toISOString();
  // A reason marks a manual/exception record for downstream reports.
  const status: AttendanceLog["status"] = input.reason ? "late" : "ontime";

  const row: AttendanceLog = {
    id: newId("att"),
    employee_id: input.employee_id,
    timestamp: now,
    type: input.type,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    ip_address: null,
    status,
    photo_url: null,
    reason: input.reason ?? null,
    source: input.source ?? "liff",
    geofence_distance_m: distanceM,
    geofence_result: geofenceResult,
  };

  if (isDemo()) {
    ATTENDANCE_LOGS.unshift(row);
    return { ok: true, message: "บันทึกแล้ว", log: row, geofence };
  }
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("attendance_logs")
    .insert({
      employee_id: row.employee_id,
      timestamp: row.timestamp,
      type: row.type,
      latitude: row.latitude,
      longitude: row.longitude,
      status: row.status,
      reason: input.reason ?? null,
      source: input.source ?? "liff",
      geofence_distance_m: distanceM,
      geofence_result: geofenceResult,
    })
    .select("*")
    .single();
  if (error) return { ok: false, message: `recordAttendance: ${error.message}` };
  return { ok: true, message: "บันทึกแล้ว", log: data as AttendanceLog, geofence };
}

// =========================================================================
// Workforce assistant reports
// =========================================================================

export interface SaveWorkforceAssistantReportInput {
  orgId: string;
  employeeId?: string | null;
  userMessage: string;
  agentResponse: string;
  openaiResponseId: string;
  model: string;
  reportSlug: string;
  reportPayload: unknown;
  responseSource: "openai" | "deterministic";
}

export async function saveWorkforceAssistantReport(
  input: SaveWorkforceAssistantReportInput,
): Promise<AIAgentInteraction> {
  const row: AIAgentInteraction = {
    id: newId("ai-report"),
    org_id: input.orgId,
    employee_id: input.employeeId ?? null,
    channel: "dashboard",
    user_message: input.userMessage,
    agent_response: input.agentResponse,
    tools_used: { report_created: true },
    openai_response_id: input.openaiResponseId,
    model: input.model,
    report_slug: input.reportSlug,
    report_payload: input.reportPayload,
    response_source: input.responseSource,
    created_at: new Date().toISOString(),
  };

  if (isDemo()) {
    AI_AGENT_INTERACTIONS.unshift(row);
    return row;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("ai_agent_interactions")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(`saveWorkforceAssistantReport: ${error.message}`);
  return data as AIAgentInteraction;
}

export async function getWorkforceAssistantReport(
  orgId: string,
  reportSlug: string,
): Promise<AIAgentInteraction | undefined> {
  if (isDemo()) {
    return AI_AGENT_INTERACTIONS.find(
      (row) => row.org_id === orgId && row.report_slug === reportSlug,
    );
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("ai_agent_interactions")
    .select("*")
    .eq("org_id", orgId)
    .eq("report_slug", reportSlug)
    .maybeSingle();
  if (error) throw new Error(`getWorkforceAssistantReport: ${error.message}`);
  return (data as AIAgentInteraction | null) ?? undefined;
}

export async function hasWorkforceAssistantResponse(
  orgId: string,
  responseId: string,
): Promise<boolean> {
  if (isDemo()) {
    return AI_AGENT_INTERACTIONS.some(
      (row) => row.org_id === orgId && row.openai_response_id === responseId,
    );
  }

  const sb = supabaseAdmin();
  const { count, error } = await sb
    .from("ai_agent_interactions")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("openai_response_id", responseId);
  if (error) throw new Error(`hasWorkforceAssistantResponse: ${error.message}`);
  return Number(count ?? 0) > 0;
}
