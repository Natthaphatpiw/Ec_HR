"use server";

import {
  getEmployeeById,
  getEmployeeByLineId,
  getProfileEditPermission,
  listTeamForSupervisor,
  updateEmployeeProfile,
  type ProfileEditableFields,
} from "@/lib/data";
import type { Employee, HomeLocationSource } from "@/lib/types";

export interface ProfileBundle {
  me: PublicEmployee;
  team: PublicEmployee[];
}

export interface PublicEmployee {
  id: string;
  name_th: string | null;
  name_en: string | null;
  nickname: string | null;
  role: Employee["role"];
  account_status: Employee["account_status"];
  department: string | null;
  position: string | null;
  job_title: string | null;
  shift_group: string | null;
  phone: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  address: string | null;
  emergency_contact: string | null;
  bank_account: string | null;
  base_salary: number | null;
  hire_date: string | null;
  employment_type: Employee["employment_type"];
  gender: Employee["gender"];
  marital_status: Employee["marital_status"];
  home_lat: number | null;
  home_lng: number | null;
  home_location_label: string | null;
  home_location_source: Employee["home_location_source"];
  profile_photo_url: string | null;
  is_supervisor: boolean;
  org_id: string;
  employee_code: string | null;
}

function publicEmployee(e: Employee): PublicEmployee {
  return {
    id: e.id,
    name_th: e.name_th,
    name_en: e.name_en,
    nickname: e.nickname,
    role: e.role,
    account_status: e.account_status,
    department: e.department,
    position: e.position,
    job_title: e.job_title,
    shift_group: e.shift_group,
    phone: e.phone,
    date_of_birth: e.date_of_birth,
    national_id: e.national_id,
    address: e.address,
    emergency_contact: e.emergency_contact,
    bank_account: e.bank_account,
    base_salary: e.base_salary,
    hire_date: e.hire_date,
    employment_type: e.employment_type,
    gender: e.gender,
    marital_status: e.marital_status,
    home_lat: e.home_lat,
    home_lng: e.home_lng,
    home_location_label: e.home_location_label,
    home_location_source: e.home_location_source,
    profile_photo_url: e.profile_photo_url,
    is_supervisor: e.is_supervisor,
    org_id: e.org_id,
    employee_code: e.employee_code,
  };
}

export async function loadProfileBundle(lineUserId: string): Promise<ProfileBundle | null> {
  if (!lineUserId) return null;
  const me = await getEmployeeByLineId(lineUserId);
  if (!me) return null;
  const team = me.is_supervisor ? await listTeamForSupervisor(me.id) : [];
  return {
    me: publicEmployee(me),
    team: team.map(publicEmployee),
  };
}

export async function loadEmployeeForEdit(
  actorLineUserId: string,
  targetId: string,
): Promise<{ ok: true; target: PublicEmployee; permission: "self" | "supervisor" | "hr" } | { ok: false; reason: string }> {
  const actor = await getEmployeeByLineId(actorLineUserId);
  if (!actor) return { ok: false, reason: "not registered" };
  const perm = await getProfileEditPermission(actor.id, targetId);
  if (perm === "denied") return { ok: false, reason: "no permission" };
  const target = await getEmployeeById(targetId);
  if (!target) return { ok: false, reason: "not found" };
  return { ok: true, target: publicEmployee(target), permission: perm };
}

export interface ProfilePatchResult {
  ok: boolean;
  message: string;
  employee?: PublicEmployee;
}

function optionalString(value: FormDataEntryValue | null): string | undefined {
  if (value == null) return undefined;
  const v = String(value).trim();
  return v ? v : undefined;
}

function optionalNumber(value: FormDataEntryValue | null): number | null | undefined {
  if (value == null) return undefined;
  const raw = String(value).trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseHomeSource(raw: string | undefined): HomeLocationSource | undefined {
  if (!raw) return undefined;
  const allowed: HomeLocationSource[] = ["gps", "maps_url", "manual"];
  return (allowed as string[]).includes(raw) ? (raw as HomeLocationSource) : undefined;
}

export async function submitProfilePatch(
  actorLineUserId: string,
  targetId: string,
  formData: FormData,
): Promise<ProfilePatchResult> {
  const actor = await getEmployeeByLineId(actorLineUserId);
  if (!actor) return { ok: false, message: "ไม่พบบัญชีของคุณในระบบ" };

  const patch: ProfileEditableFields = {
    name_th: optionalString(formData.get("nameTh")),
    name_en: optionalString(formData.get("nameEn")),
    nickname: optionalString(formData.get("nickname")),
    phone: optionalString(formData.get("phone")),
    address: optionalString(formData.get("address")),
    emergency_contact: optionalString(formData.get("emergencyContact")),
    bank_account: optionalString(formData.get("bankAccount")),
    department: optionalString(formData.get("department")),
    position: optionalString(formData.get("position")),
    job_title: optionalString(formData.get("jobTitle")),
    shift_group: optionalString(formData.get("shiftGroup")),
    base_salary: optionalNumber(formData.get("baseSalary")),
    home_lat: optionalNumber(formData.get("homeLat")),
    home_lng: optionalNumber(formData.get("homeLng")),
    home_location_label: optionalString(formData.get("homeLocationLabel")),
    home_location_source: parseHomeSource(optionalString(formData.get("homeLocationSource"))),
  };
  const reason = optionalString(formData.get("reason"));

  const res = await updateEmployeeProfile(actor.id, targetId, patch, reason);
  if (!res.ok || !res.employee) {
    return { ok: false, message: res.message };
  }
  return { ok: true, message: res.message, employee: publicEmployee(res.employee) };
}
