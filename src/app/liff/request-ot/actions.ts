"use server";

import { createOvertimeRequest } from "@/lib/data";
import { notifySupervisorOfOvertime } from "@/lib/line/approvals";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface OvertimeSubmitResult {
  ok: boolean;
  message: string;
  requestId?: string;
  notified?: boolean;
}

export async function submitOvertimeRequest(formData: FormData): Promise<OvertimeSubmitResult> {
  const employeeId = String(formData.get("employeeId") ?? "").trim() || DEMO_EMPLOYEE_ID;
  const date = String(formData.get("date") ?? "").trim();
  const hours = parseFloat(String(formData.get("hours") ?? "0"));
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!date) return { ok: false, message: "กรุณาเลือกวันที่" };
  if (!Number.isFinite(hours) || hours <= 0) return { ok: false, message: "จำนวนชั่วโมงไม่ถูกต้อง" };
  if (hours > 12) return { ok: false, message: "เกินเพดาน OT (12 ชม. ต่อวัน)" };

  const req = await createOvertimeRequest({
    employee_id: employeeId,
    date,
    hours,
    reason,
  });

  const push = await notifySupervisorOfOvertime(req.id);
  return {
    ok: true,
    message: "ส่งคำขอ OT ไปยังหัวหน้าเรียบร้อย",
    requestId: req.id,
    notified: push.ok,
  };
}
