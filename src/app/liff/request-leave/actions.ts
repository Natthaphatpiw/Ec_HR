"use server";

import { createLeaveRequest } from "@/lib/data";
import { notifySupervisorOfLeave } from "@/lib/line/approvals";
import type { LeaveType } from "@/lib/types";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface LeaveSubmitResult {
  ok: boolean;
  message: string;
  requestId?: string;
  notified?: boolean;
}

export async function submitLeaveRequest(formData: FormData): Promise<LeaveSubmitResult> {
  const employeeId = String(formData.get("employeeId") ?? "").trim() || DEMO_EMPLOYEE_ID;
  const leaveType = String(formData.get("leaveType") ?? "annual") as LeaveType;
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!startDate || !endDate) return { ok: false, message: "กรุณาเลือกวันที่" };
  if (endDate < startDate) return { ok: false, message: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม" };

  const days = diffDays(startDate, endDate) + 1;

  const req = await createLeaveRequest({
    employee_id: employeeId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    days,
    reason,
  });

  const push = await notifySupervisorOfLeave(req.id);
  return {
    ok: true,
    message: "ส่งคำขอไปยังหัวหน้าเรียบร้อย",
    requestId: req.id,
    notified: push.ok,
  };
}

function diffDays(a: string, b: string): number {
  const t1 = Date.parse(a + "T00:00:00Z");
  const t2 = Date.parse(b + "T00:00:00Z");
  return Math.round((t2 - t1) / 86400000);
}
