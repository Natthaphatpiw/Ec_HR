"use server";

import { createContactRequest } from "@/lib/data";
import { notifySupervisorOfContact } from "@/lib/line/approvals";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface ContactSubmitResult {
  ok: boolean;
  message: string;
  requestId?: string;
  notified?: boolean;
}

export async function submitContactRequest(formData: FormData): Promise<ContactSubmitResult> {
  const employeeId = String(formData.get("employeeId") ?? "").trim() || DEMO_EMPLOYEE_ID;
  const date = String(formData.get("date") ?? "").trim();
  const timeStart = String(formData.get("timeStart") ?? "").trim();
  const timeEnd = String(formData.get("timeEnd") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!date) return { ok: false, message: "กรุณาเลือกวันที่" };
  if (!timeStart || !timeEnd) return { ok: false, message: "กรุณาระบุช่วงเวลา" };
  if (timeEnd <= timeStart) return { ok: false, message: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม" };
  if (reason.length < 5) return { ok: false, message: "กรุณาระบุเหตุผลให้ชัดเจน (อย่างน้อย 5 ตัวอักษร)" };

  const req = await createContactRequest({
    employee_id: employeeId,
    requested_date: date,
    time_start: timeStart,
    time_end: timeEnd,
    reason,
  });

  const push = await notifySupervisorOfContact(req.id);
  return {
    ok: true,
    message: "ส่งคำขอเข้าพบไปยังหัวหน้าเรียบร้อย",
    requestId: req.id,
    notified: push.ok,
  };
}
