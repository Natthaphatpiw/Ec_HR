"use server";

import {
  canAcceptNewSeat,
  getOrgInviteByToken,
  getRegistrationStatus,
  listApprovalAdminsForOrg,
  registerEmployee,
} from "@/lib/data";
import { notifyHrOfRegistration } from "@/lib/line/approvals";
import type {
  Employee,
  Gender,
  HomeLocationSource,
  RegistrationInput,
} from "@/lib/types";

export interface RegistrationStateResponse {
  state: "new" | "pending" | "active" | "rejected";
  employee?: {
    name: string;
    department: string | null;
    position: string | null;
    submittedAt?: string | null;
    rejectionReason?: string | null;
  };
}

function publicEmployee(e: Employee): RegistrationStateResponse["employee"] {
  return {
    name: e.name_th ?? e.name_en ?? "",
    department: e.department,
    position: e.position,
    submittedAt: e.submitted_at ?? null,
    rejectionReason: e.rejection_reason ?? null,
  };
}

export async function checkRegistrationState(
  lineUserId: string,
): Promise<RegistrationStateResponse> {
  if (!lineUserId) return { state: "new" };
  const status = await getRegistrationStatus(lineUserId);
  if (status.state === "new") return { state: "new" };
  return { state: status.state, employee: publicEmployee(status.employee) };
}

// =========================================================================
// Invite resolution (employee registration is invite-only)
// =========================================================================

export interface InviteInfoResponse {
  ok: boolean;
  /** Company the invite joins the employee into (read-only display). */
  businessName?: string;
  /** Inviting supervisor's name (read-only display). */
  supervisorName?: string;
  /** Set when the org can't currently accept a new seat. */
  seatBlocked?: "expired" | "seats_full" | "deactivated";
  /** Why the invite is not usable, when ok=false. */
  reason?: "missing" | "invalid";
}

export async function checkInvite(token: string): Promise<InviteInfoResponse> {
  if (!token?.trim()) return { ok: false, reason: "missing" };
  const resolved = await getOrgInviteByToken(token);
  if (!resolved) return { ok: false, reason: "invalid" };
  const seat = await canAcceptNewSeat(resolved.org.id);
  const sup = resolved.supervisor;
  return {
    ok: true,
    businessName: resolved.org.business_name ?? resolved.org.name,
    supervisorName: sup ? (sup.name_th ?? sup.name_en ?? sup.nickname ?? undefined) : undefined,
    seatBlocked: seat.ok ? undefined : seat.reason,
  };
}

export interface SubmitResult {
  ok: boolean;
  message: string;
  duplicate?: "line_user_id" | "national_id";
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

function parseGender(raw: string | undefined): Gender | undefined {
  if (!raw) return undefined;
  const allowed: Gender[] = ["male", "female", "other", "prefer_not_to_say"];
  return (allowed as string[]).includes(raw) ? (raw as Gender) : undefined;
}

function parseHomeSource(raw: string | undefined): HomeLocationSource | undefined {
  if (!raw) return undefined;
  const allowed: HomeLocationSource[] = ["gps", "maps_url", "manual"];
  return (allowed as string[]).includes(raw) ? (raw as HomeLocationSource) : undefined;
}

export async function submitRegistration(formData: FormData): Promise<SubmitResult> {
  let input: RegistrationInput;
  try {
    input = {
      line_user_id:        required(formData.get("lineUserId"), "lineUserId"),
      display_name:        String(formData.get("displayName") ?? "").trim(),
      picture_url:         optional(formData.get("pictureUrl")),
      invite_token:        required(formData.get("inviteToken"), "invite_token"),
      name_th:             required(formData.get("nameTh"), "name_th"),
      name_en:             optional(formData.get("nameEn")),
      nickname:            optional(formData.get("nickname")),
      date_of_birth:       optional(formData.get("dateOfBirth")),
      national_id:         optional(formData.get("nationalId")),
      phone:               required(formData.get("phone"), "phone"),
      gender:              parseGender(optional(formData.get("gender"))),
      address:             optional(formData.get("address")),
      emergency_contact:   optional(formData.get("emergencyContact")),
      department:          optional(formData.get("department")),
      position:            optional(formData.get("position")),
      job_title:           optional(formData.get("jobTitle")),
      shift_group:         optional(formData.get("shiftGroup")),
      employment_type:     undefined,
      hire_date:           optional(formData.get("hireDate")),
      base_salary:         optionalNumber(formData.get("baseSalary")),
      bank_account:        optional(formData.get("bankAccount")),
      home_lat:            optionalNumber(formData.get("homeLat")),
      home_lng:            optionalNumber(formData.get("homeLng")),
      home_location_label: optional(formData.get("homeLocationLabel")),
      home_location_source: parseHomeSource(optional(formData.get("homeLocationSource"))),
      profile_photo_url:   optional(formData.get("profilePhotoUrl")),
      pdpa_consent:        formData.get("pdpaConsent") === "on",
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
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
    const result = await registerEmployee(input);
    if (!result.ok || !result.employee) {
      return {
        ok: false,
        message: result.message,
        duplicate: result.duplicate,
      };
    }

    // Notify the inviting supervisor (they approve the joiner via the LINE card).
    // Fall back to any approval admin of the org if the supervisor has no LINE
    // binding, so the application never gets stuck with no reviewer.
    const supervisor = result.supervisor;
    if (supervisor?.line_user_id) {
      await notifyHrOfRegistration(result.employee.id, [supervisor]);
    } else {
      const admins = await listApprovalAdminsForOrg(result.employee.org_id);
      if (admins.length > 0) {
        await notifyHrOfRegistration(result.employee.id, admins);
      }
    }

    return { ok: true, message: "Application submitted." };
  } catch (err) {
    console.error("submitRegistration failed", err);
    return { ok: false, message: "เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง" };
  }
}
