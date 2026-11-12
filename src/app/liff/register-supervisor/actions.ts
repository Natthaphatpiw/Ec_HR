"use server";

import {
  getRegistrationStatus,
  listApprovalAdminsForOrg,
  registerSupervisor,
} from "@/lib/data";
import { buildInviteUrl } from "@/lib/invite";
import { notifyHrOfRegistration } from "@/lib/line/approvals";
import { getRegistrationIdentity } from "@/lib/registration-session";
import type {
  BusinessType,
  Employee,
  Gender,
  HomeLocationSource,
  RegistrationInput,
  SubordinateLink,
  SupervisorGrant,
} from "@/lib/types";

export interface SupervisorRegistrationStateResponse {
  state: "new" | "pending" | "active" | "rejected" | "session_required" | "session_unavailable" | "unavailable";
  message?: string;
  employee?: {
    name: string;
    department: string | null;
    position: string | null;
    submittedAt?: string | null;
    rejectionReason?: string | null;
  };
}

function publicEmployee(e: Employee): SupervisorRegistrationStateResponse["employee"] {
  return {
    name: e.name_th ?? e.name_en ?? "",
    department: e.department,
    position: e.position,
    submittedAt: e.submitted_at ?? null,
    rejectionReason: e.rejection_reason ?? null,
  };
}

export async function checkSupervisorRegistrationState(
  lineUserId: string,
): Promise<SupervisorRegistrationStateResponse> {
  const identity = await getRegistrationIdentity(lineUserId);
  if (!identity.ok) return { state: identity.reason, message: identity.message };
  try {
    const status = await getRegistrationStatus(identity.lineUserId);
    if (status.state === "new") return { state: "new" };
    return { state: status.state, employee: publicEmployee(status.employee) };
  } catch {
    console.error("[supervisor registration] status lookup unavailable");
    return { state: "unavailable", message: "ตรวจสอบสถานะการลงทะเบียนไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
  }
}

export interface SupervisorSubmitResult {
  ok: boolean;
  message: string;
  duplicate?: "line_user_id" | "national_id";
  unresolvedSubordinateNames?: string[];
  /** True when this registrant became the owner of a brand-new company. */
  activated?: boolean;
  /** Reusable company invite (owner only) — QR/link to share with the team. */
  inviteToken?: string;
  inviteUrl?: string;
  businessName?: string;
}

function required(value: FormDataEntryValue | null, name: string): string {
  const v = String(value ?? "").trim();
  if (!v) throw new Error(`${name} is required`);
  return v;
}

function optional(value: FormDataEntryValue | null): string | undefined {
  const v = String(value ?? "").trim();
  return v ? v : undefined;
}

function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseBusinessType(raw: string | undefined): BusinessType | undefined {
  if (!raw) return undefined;
  const allowed: BusinessType[] = [
    "factory","restaurant","retail","clinic","service","logistics","construction","office","other",
  ];
  return (allowed as string[]).includes(raw) ? (raw as BusinessType) : undefined;
}

function parseGender(raw: string | undefined): Gender | undefined {
  if (!raw) return undefined;
  const allowed: Gender[] = ["male","female","other","prefer_not_to_say"];
  return (allowed as string[]).includes(raw) ? (raw as Gender) : undefined;
}

function parseHomeSource(raw: string | undefined): HomeLocationSource | undefined {
  if (!raw) return undefined;
  const allowed: HomeLocationSource[] = ["gps","maps_url","manual"];
  return (allowed as string[]).includes(raw) ? (raw as HomeLocationSource) : undefined;
}

function parseSubordinates(formData: FormData): SubordinateLink[] {
  // The form sends subordinates as JSON in a single hidden field so we don't
  // have to dance around dynamic FormData keys.
  const raw = String(formData.get("subordinatesJson") ?? "");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row): SubordinateLink | null => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const name = typeof r.name === "string" ? r.name : "";
        if (!name.trim()) return null;
        const g = (r.grant as Record<string, unknown>) ?? {};
        const grant: SupervisorGrant = {
          leave: !!g.leave,
          overtime: !!g.overtime,
          contact: !!g.contact,
        };
        return { name, grant };
      })
      .filter((x): x is SubordinateLink => x !== null);
  } catch {
    return [];
  }
}

export async function submitSupervisorRegistration(
  formData: FormData,
): Promise<SupervisorSubmitResult> {
  if (!(formData instanceof FormData)) return { ok: false, message: "ข้อมูลลงทะเบียนไม่ถูกต้อง" };
  const identity = await getRegistrationIdentity(formData.get("lineUserId"));
  if (!identity.ok) return { ok: false, message: identity.message };

  let input: RegistrationInput;
  try {
    input = {
      line_user_id:       identity.lineUserId,
      display_name:       String(formData.get("displayName") ?? "").trim(),
      picture_url:        optional(formData.get("pictureUrl")),
      business_name:      required(formData.get("businessName"), "business_name"),
      business_type:      parseBusinessType(optional(formData.get("businessType"))),
      name_th:            required(formData.get("nameTh"), "name_th"),
      name_en:            optional(formData.get("nameEn")),
      nickname:           optional(formData.get("nickname")),
      date_of_birth:      optional(formData.get("dateOfBirth")),
      national_id:        optional(formData.get("nationalId")),
      phone:              required(formData.get("phone"), "phone"),
      gender:             parseGender(optional(formData.get("gender"))),
      address:            optional(formData.get("address")),
      emergency_contact:  optional(formData.get("emergencyContact")),
      department:         optional(formData.get("department")),
      position:           optional(formData.get("position")),
      job_title:          optional(formData.get("jobTitle")),
      shift_group:        optional(formData.get("shiftGroup")),
      hire_date:          optional(formData.get("hireDate")),
      base_salary:        optionalNumber(formData.get("baseSalary")),
      bank_account:       optional(formData.get("bankAccount")),
      home_lat:           optionalNumber(formData.get("homeLat")),
      home_lng:           optionalNumber(formData.get("homeLng")),
      home_location_label: optional(formData.get("homeLocationLabel")),
      home_location_source: parseHomeSource(optional(formData.get("homeLocationSource"))),
      profile_photo_url:   optional(formData.get("profilePhotoUrl")),
      pdpa_consent:       formData.get("pdpaConsent") === "on",
      is_supervisor:      true,
      subordinates:       parseSubordinates(formData),
    };
  } catch {
    return { ok: false, message: "กรุณากรอกชื่อบริษัท ชื่อผู้สมัคร และเบอร์โทรก่อนส่งใบสมัคร" };
  }

  if (input.national_id && !/^\d{13}$/.test(input.national_id)) {
    return { ok: false, message: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก" };
  }
  if (!/^[+\-\d\s]{6,}$/.test(input.phone)) {
    return { ok: false, message: "เบอร์โทรไม่ถูกต้อง" };
  }
  if (!input.pdpa_consent) {
    return { ok: false, message: "โปรดยอมรับเงื่อนไข PDPA ก่อนสมัคร" };
  }

  try {
    const result = await registerSupervisor(input);
    if (!result.ok || !result.employee) {
      return {
        ok: false,
        message: result.message,
        duplicate: result.duplicate,
        unresolvedSubordinateNames: result.unresolvedSubordinateNames,
      };
    }

    // Brand-new company: owner was auto-activated. Hand back the reusable invite
    // (QR/link) so the client can show the "share with your team" screen.
    if (result.activated && result.invite) {
      return {
        ok: true,
        message: "Account activated.",
        activated: true,
        inviteToken: result.invite.token,
        inviteUrl: buildInviteUrl(result.invite.token),
        businessName: result.organization?.business_name ?? result.organization?.name,
      };
    }

    // Joined an existing company: pending approval by the owner / HR.
    const admins = await listApprovalAdminsForOrg(result.employee.org_id);
    const externalAdmins = admins.filter((a) => a.id !== result.employee!.id);
    if (externalAdmins.length > 0) {
      await notifyHrOfRegistration(result.employee.id, externalAdmins);
    }

    return { ok: true, message: "Application submitted.", activated: false };
  } catch {
    console.error("[supervisor registration] submission failed");
    return { ok: false, message: "ระบบลงทะเบียนไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง" };
  }
}
