"use server";

import {
  getEmployeeByLineId,
  getLastAttendanceLog,
  getOrganization,
  recordAttendance,
} from "@/lib/data";
import type { AttendanceLog, AttendanceType } from "@/lib/types";
import { haversineMeters } from "@/lib/utils";

export interface CheckinStatus {
  employeeId: string | null;
  lastLog: PublicAttendance | null;
  /** True when the last log was an "in" — UI should prompt for "out" next */
  hasOpenSession: boolean;
}

interface PublicAttendance {
  id: string;
  type: AttendanceType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
}

function publicLog(log: AttendanceLog | undefined): PublicAttendance | null {
  if (!log) return null;
  return {
    id: log.id,
    type: log.type,
    timestamp: log.timestamp,
    latitude: log.latitude,
    longitude: log.longitude,
  };
}

export async function loadCheckinStatus(lineUserId: string): Promise<CheckinStatus> {
  if (!lineUserId) return { employeeId: null, lastLog: null, hasOpenSession: false };
  const e = await getEmployeeByLineId(lineUserId);
  if (!e) return { employeeId: null, lastLog: null, hasOpenSession: false };
  const last = await getLastAttendanceLog(e.id);
  return {
    employeeId: e.id,
    lastLog: publicLog(last),
    hasOpenSession: last?.type === "in",
  };
}

export interface CheckinResult {
  ok: boolean;
  message: string;
  status?: CheckinStatus;
}

export async function clockAction(input: {
  lineUserId: string;
  type: AttendanceType;
  latitude?: number;
  longitude?: number;
  reason?: string;
}): Promise<CheckinResult> {
  if (!input.lineUserId) {
    return { ok: false, message: "ไม่พบข้อมูล LINE — โปรดเปิดผ่านแอป LINE" };
  }
  const employee = await getEmployeeByLineId(input.lineUserId);
  if (!employee) {
    return { ok: false, message: "ยังไม่ลงทะเบียน — โปรดลงทะเบียนก่อน" };
  }
  if (employee.account_status !== "active") {
    return { ok: false, message: "บัญชียังไม่ active — รอ HR / หัวหน้าอนุมัติ" };
  }

  const organization = await getOrganization(employee.org_id);
  if (organization.geofence_enabled) {
    const centerLat = finiteNumber(organization.geofence_lat);
    const centerLng = finiteNumber(organization.geofence_lng);
    const radiusM = finiteNumber(organization.geofence_radius);
    if (centerLat === null || centerLng === null || radiusM === null || radiusM <= 0) {
      return {
        ok: false,
        message: "องค์กรเปิดตรวจระยะ แต่ยังตั้งค่าจุดทำงานไม่ครบ กรุณาติดต่อหัวหน้าหรือ HR",
      };
    }

    const latitude = finiteNumber(input.latitude ?? null);
    const longitude = finiteNumber(input.longitude ?? null);
    if (latitude === null || longitude === null) {
      return {
        ok: false,
        message: "บริษัทเปิดใช้ geofence กรุณาอนุญาต GPS ก่อนกดเข้าและออกงาน",
      };
    }

    const distanceM = haversineMeters(latitude, longitude, centerLat, centerLng);
    if (distanceM > radiusM) {
      return {
        ok: false,
        message: `คุณอยู่ห่างจุดทำงาน ${Math.round(distanceM).toLocaleString("th-TH")} เมตร เกินรัศมีที่อนุญาต ${Math.round(radiusM).toLocaleString("th-TH")} เมตร`,
      };
    }
  }

  const res = await recordAttendance({
    employee_id: employee.id,
    type: input.type,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    reason: input.reason ?? null,
  });
  if (!res.ok) {
    return { ok: false, message: res.message };
  }
  const fresh = await loadCheckinStatus(input.lineUserId);
  return { ok: true, message: res.message, status: fresh };
}

function finiteNumber(value: number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
