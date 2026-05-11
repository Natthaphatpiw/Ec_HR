"use server";

import {
  getRegistrationStatus,
  listHrEmployees,
  registerEmployee,
} from "@/lib/data";
import { notifyHrOfRegistration } from "@/lib/line/approvals";
import type { Employee, RegistrationInput } from "@/lib/types";

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

export async function submitRegistration(formData: FormData): Promise<SubmitResult> {
  let input: RegistrationInput;
  try {
    input = {
      line_user_id:        required(formData.get("lineUserId"), "lineUserId"),
      display_name:        String(formData.get("displayName") ?? "").trim(),
      picture_url:         optional(formData.get("pictureUrl")),
      name_th:             required(formData.get("nameTh"), "name_th"),
      name_en:             optional(formData.get("nameEn")),
      name_zh:             optional(formData.get("nameZh")),
      date_of_birth:       required(formData.get("dateOfBirth"), "date_of_birth"),
      national_id:         required(formData.get("nationalId"), "national_id"),
      phone:               required(formData.get("phone"), "phone"),
      address:             required(formData.get("address"), "address"),
      emergency_contact:   required(formData.get("emergencyContact"), "emergency_contact"),
      department:          required(formData.get("department"), "department"),
      position:            required(formData.get("position"), "position"),
      shift_group:         optional(formData.get("shiftGroup")),
      bank_account:        optional(formData.get("bankAccount")),
      id_card_photo_url:   optional(formData.get("idCardPhotoUrl")),
      bank_book_photo_url: optional(formData.get("bankBookPhotoUrl")),
      profile_photo_url:   optional(formData.get("profilePhotoUrl")),
    };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  if (!/^\d{13}$/.test(input.national_id)) {
    return { ok: false, message: "National ID must be 13 digits" };
  }
  if (!/^[+\-\d\s]{6,}$/.test(input.phone)) {
    return { ok: false, message: "Invalid phone number" };
  }

  const result = await registerEmployee(input);
  if (!result.ok || !result.employee) {
    return { ok: false, message: result.message, duplicate: result.duplicate };
  }

  const hr = await listHrEmployees();
  await notifyHrOfRegistration(result.employee.id, hr);

  return { ok: true, message: "Application submitted." };
}
