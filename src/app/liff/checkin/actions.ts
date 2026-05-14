"use server";

import {
  getEmployeeByLineId,
  getLastAttendanceLog,
  recordAttendance,
} from "@/lib/data";
import type { AttendanceLog, AttendanceType } from "@/lib/types";

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
