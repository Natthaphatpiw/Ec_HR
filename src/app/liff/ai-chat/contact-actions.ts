"use server";

import { createContactRequest, getEmployeeById, getEmployeeByLineId } from "@/lib/data";
import { notifySupervisorOfContact } from "@/lib/line/approvals";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface ContactSubmitResult {
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

export async function submitContactRequest(formData: FormData): Promise<ContactSubmitResult> {
  const employee = await resolveEmployee(formData);
  if (!employee) {
    return { ok: false, message: "ไม่พบบัญชีพนักงาน — กรุณาลงทะเบียนที่ /liff/register ก่อน" };
  }
  if (employee.account_status !== "active") {
    return { ok: false, message: "บัญชียังไม่ active — รอ HR อนุมัติก่อน" };
  }

  const date = String(formData.get("date") ?? "").trim();
  const timeStart = String(formData.get("timeStart") ?? "").trim();
  const timeEnd = String(formData.get("timeEnd") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!date) return { ok: false, message: "กรุณาเลือกวันที่" };
  if (!timeStart || !timeEnd) return { ok: false, message: "กรุณาระบุช่วงเวลา" };
  if (timeEnd <= timeStart) return { ok: false, message: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม" };
  if (reason.length < 5) return { ok: false, message: "กรุณาระบุเหตุผลให้ชัดเจน (อย่างน้อย 5 ตัวอักษร)" };

  const req = await createContactRequest({
    employee_id: employee.id,
    requested_date: date,
    time_start: timeStart,
    time_end: timeEnd,
    reason,
  });

  const push = await notifySupervisorOfContact(req.id);
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
    message: "ส่งคำขอเข้าพบไปยังหัวหน้าเรียบร้อย",
    requestId: req.id,
    notified: true,
  };
}
