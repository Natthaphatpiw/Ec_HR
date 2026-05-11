"use server";

import { createOvertimeRequest, getEmployeeById, getEmployeeByLineId } from "@/lib/data";
import { notifySupervisorOfOvertime } from "@/lib/line/approvals";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface OvertimeSubmitResult {
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

export async function submitOvertimeRequest(formData: FormData): Promise<OvertimeSubmitResult> {
  const employee = await resolveEmployee(formData);
  if (!employee) {
    return { ok: false, message: "ไม่พบบัญชีพนักงาน — กรุณาลงทะเบียนที่ /liff/register ก่อน" };
  }
  if (employee.account_status !== "active") {
    return { ok: false, message: "บัญชียังไม่ active — รอ HR อนุมัติก่อน" };
  }

  const date = String(formData.get("date") ?? "").trim();
  const hours = parseFloat(String(formData.get("hours") ?? "0"));
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!date) return { ok: false, message: "กรุณาเลือกวันที่" };
  if (!Number.isFinite(hours) || hours <= 0) return { ok: false, message: "จำนวนชั่วโมงไม่ถูกต้อง" };
  if (hours > 12) return { ok: false, message: "เกินเพดาน OT (12 ชม. ต่อวัน)" };

  const req = await createOvertimeRequest({
    employee_id: employee.id,
    date,
    hours,
    reason,
  });

  const push = await notifySupervisorOfOvertime(req.id);
  if (!push.ok) {
    return {
      ok: true,
      message: `บันทึกคำขอแล้ว แต่ส่ง LINE ให้หัวหน้าไม่สำเร็จ: ${("reason" in push && push.reason) || "unknown"}`,
      requestId: req.id,
      notified: false,
    };
  }
  return {
    ok: true,
    message: "ส่งคำขอ OT ไปยังหัวหน้าเรียบร้อย",
    requestId: req.id,
    notified: true,
  };
}
