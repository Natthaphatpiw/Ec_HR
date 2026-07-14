"use server";

import { revalidatePath } from "next/cache";
import {
  getDefaultOrganizationId,
  getEmployeeByLineId,
  isDemoMode,
  updateOrganizationGeofence,
} from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export interface GeofenceSettingsResult {
  ok: boolean;
  message: string;
}

function parseRequiredNumber(
  formData: FormData,
  field: string,
  label: string,
): number {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) throw new Error(`กรุณาระบุ${label}`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${label}ไม่ถูกต้อง`);
  return value;
}

async function resolveAuthorizedOrganizationId(): Promise<string> {
  if (isDemoMode()) return getDefaultOrganizationId();

  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    throw new Error("ไม่พบ LINE session กรุณาเปิดระบบผ่าน LINE แล้วลองใหม่");
  }

  const actor = await getEmployeeByLineId(lineUserId);
  if (!actor || actor.account_status !== "active") {
    throw new Error("บัญชีนี้ยังไม่มีสิทธิ์แก้ไขการตั้งค่าองค์กร");
  }

  const canManage =
    actor.is_supervisor ||
    actor.role === "supervisor" ||
    actor.role === "hr" ||
    actor.role === "executive";
  if (!canManage) {
    throw new Error("เฉพาะหัวหน้างาน HR หรือผู้บริหารเท่านั้นที่แก้ไข geofence ได้");
  }

  return actor.org_id;
}

export async function saveGeofenceSettings(
  formData: FormData,
): Promise<GeofenceSettingsResult> {
  try {
    const orgId = await resolveAuthorizedOrganizationId();
    const latitude = parseRequiredNumber(formData, "latitude", "ละติจูด");
    const longitude = parseRequiredNumber(formData, "longitude", "ลองจิจูด");
    const radiusM = parseRequiredNumber(formData, "radiusM", "รัศมี");

    if (latitude < -90 || latitude > 90) {
      return { ok: false, message: "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90" };
    }
    if (longitude < -180 || longitude > 180) {
      return { ok: false, message: "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180" };
    }
    if (radiusM < 10 || radiusM > 10_000) {
      return { ok: false, message: "รัศมีต้องอยู่ระหว่าง 10 ถึง 10,000 เมตร" };
    }

    const enabledValue = String(formData.get("enabled") ?? "false");
    const enabled = enabledValue === "true" || enabledValue === "on" || enabledValue === "1";

    await updateOrganizationGeofence(orgId, {
      enabled,
      latitude,
      longitude,
      radiusM,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/attendance");
    revalidatePath("/liff/checkin");

    return {
      ok: true,
      message: enabled
        ? `เปิดใช้ geofence รัศมี ${Math.round(radiusM).toLocaleString("th-TH")} เมตรแล้ว`
        : "ปิดการบังคับตรวจระยะแล้ว ระบบจะยังบันทึกพิกัดเพื่อใช้ตรวจสอบย้อนหลัง",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "บันทึกการตั้งค่าไม่สำเร็จ",
    };
  }
}
