"use server";

import { createLeaveRequest, getEmployeeById, getEmployeeByLineId, getLeaveBalance } from "@/lib/data";
import { notifySupervisorOfLeave } from "@/lib/line/approvals";
import type { LeaveType } from "@/lib/types";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface LeaveSubmitResult {
  ok: boolean;
  message: string;
  requestId?: string;
  notified?: boolean;
}

async function resolveEmployee(formData: FormData) {
  const lineUserId = String(formData.get("lineUserId") ?? "").trim();
  if (lineUserId) {
    const e = await getEmployeeByLineId(lineUserId);
    if (e) return e;
  }
  const employeeId = String(formData.get("employeeId") ?? "").trim() || DEMO_EMPLOYEE_ID;
  return getEmployeeById(employeeId);
}

export async function submitLeaveRequest(formData: FormData): Promise<LeaveSubmitResult> {
  const employee = await resolveEmployee(formData);
  if (!employee) {
    return { ok: false, message: "ไม่พบบัญชีพนักงาน — กรุณาลงทะเบียนที่ /liff/register ก่อน" };
  }
  if (employee.account_status !== "active") {
    return { ok: false, message: "บัญชียังไม่ active — รอ HR อนุมัติก่อน" };
  }

  const leaveType = String(formData.get("leaveType") ?? "annual") as LeaveType;
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!startDate || !endDate) return { ok: false, message: "กรุณาเลือกวันที่" };
  if (endDate < startDate) return { ok: false, message: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม" };

  const days = diffDays(startDate, endDate) + 1;

  const req = await createLeaveRequest({
    employee_id: employee.id,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    days,
    reason,
  });

  const push = await notifySupervisorOfLeave(req.id);
  if (!push.ok) {
    // Surface so the user knows the LINE step failed (request still saved).
    return {
      ok: true,
      message: `บันทึกคำขอแล้ว แต่ส่ง LINE ให้หัวหน้าไม่สำเร็จ: ${("reason" in push && push.reason) || "unknown"}`,
      requestId: req.id,
      notified: false,
    };
  }
  return {
    ok: true,
    message: "ส่งคำขอไปยังหัวหน้าเรียบร้อย",
    requestId: req.id,
    notified: true,
  };
}

export async function fetchMyLeaveBalance(lineUserId: string) {
  if (!lineUserId) return null;
  const e = await getEmployeeByLineId(lineUserId);
  if (!e) return null;
  return getLeaveBalance(e.id);
}

function diffDays(a: string, b: string): number {
  const t1 = Date.parse(a + "T00:00:00Z");
  const t2 = Date.parse(b + "T00:00:00Z");
  return Math.round((t2 - t1) / 86400000);
}
