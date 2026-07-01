import {
  approveRegistration,
  createActionToken,
  decideContactRequest,
  decideLeaveRequest,
  decideOvertimeRequest,
  getContactRequestById,
  getEmployeeById,
  getLeaveBalance,
  getLeaveRequestById,
  getOvertimeRequestById,
  getSupervisorForEmployee,
  listOvertimeForEmployee,
  recordNotification,
  rejectRegistration,
} from "../data";
import type { ActionTokenKind, Employee } from "../types";
import { pushFlex } from "./client";
import {
  buildContactApprovalCard,
  buildDecisionResultCard,
  buildLeaveApprovalCard,
  buildOvertimeApprovalCard,
  buildRegistrationReviewCard,
} from "./flex";

// =========================================================================
// Notify supervisor on a NEW request — sends the approval card with buttons
// =========================================================================

export async function notifySupervisorOfLeave(requestId: string) {
  const req = await getLeaveRequestById(requestId);
  if (!req || !req.supervisor_id) return { ok: false, reason: "no supervisor" };
  const employee = await getEmployeeById(req.employee_id);
  const supervisor = await getEmployeeById(req.supervisor_id);
  if (!employee || !supervisor || !supervisor.line_user_id) {
    return { ok: false, reason: "missing line user id" };
  }
  const approve = await createActionToken({
    action: "approve",
    kind: "leave",
    request_id: requestId,
    intended_user_id: supervisor.id,
  });
  const reject = await createActionToken({
    action: "reject",
    kind: "leave",
    request_id: requestId,
    intended_user_id: supervisor.id,
  });
  const balance = await getLeaveBalance(employee.id);
  const card = buildLeaveApprovalCard({
    request: req,
    employee,
    balance,
    approveToken: approve.token,
    rejectToken: reject.token,
  });
  const res = await pushFlex(supervisor.line_user_id, card);
  if (!res.ok) {
    const detail =
      typeof res.message === "string" ? res.message :
      typeof res.status === "number" ? `LINE API ${res.status}` :
      "LINE push failed";
    console.error("[approvals] push failed", {
      to: supervisor.line_user_id,
      supervisor_id: supervisor.id,
      supervisor_name: supervisor.name_th ?? supervisor.name_en,
      detail,
    });
    return { ok: false, reason: detail, supervisor };
  }
  return { ok: true, supervisor, res };
}

export async function notifySupervisorOfOvertime(requestId: string) {
  const req = await getOvertimeRequestById(requestId);
  if (!req || !req.supervisor_id) return { ok: false, reason: "no supervisor" };
  const employee = await getEmployeeById(req.employee_id);
  const supervisor = await getEmployeeById(req.supervisor_id);
  if (!employee || !supervisor || !supervisor.line_user_id) {
    return { ok: false, reason: "missing line user id" };
  }
  const approve = await createActionToken({
    action: "approve",
    kind: "overtime",
    request_id: requestId,
    intended_user_id: supervisor.id,
  });
  const reject = await createActionToken({
    action: "reject",
    kind: "overtime",
    request_id: requestId,
    intended_user_id: supervisor.id,
  });
  const monthKey = req.date.slice(0, 7);
  const otHistory = await listOvertimeForEmployee(employee.id);
  const monthlyOvertimeHours = otHistory
    .filter((o) => o.status === "approved" && o.date.startsWith(monthKey))
    .reduce((acc, o) => acc + Number(o.hours), 0);
  const card = buildOvertimeApprovalCard({
    request: req,
    employee,
    monthlyOvertimeHours,
    approveToken: approve.token,
    rejectToken: reject.token,
  });
  const res = await pushFlex(supervisor.line_user_id, card);
  if (!res.ok) {
    const detail =
      typeof res.message === "string" ? res.message :
      typeof res.status === "number" ? `LINE API ${res.status}` :
      "LINE push failed";
    console.error("[approvals] push failed", {
      to: supervisor.line_user_id,
      supervisor_id: supervisor.id,
      supervisor_name: supervisor.name_th ?? supervisor.name_en,
      detail,
    });
    return { ok: false, reason: detail, supervisor };
  }
  return { ok: true, supervisor, res };
}

export async function notifySupervisorOfContact(requestId: string) {
  const req = await getContactRequestById(requestId);
  if (!req || !req.supervisor_id) return { ok: false, reason: "no supervisor" };
  const employee = await getEmployeeById(req.employee_id);
  const supervisor = await getEmployeeById(req.supervisor_id);
  if (!employee || !supervisor || !supervisor.line_user_id) {
    return { ok: false, reason: "missing line user id" };
  }
  const approve = await createActionToken({
    action: "approve",
    kind: "contact",
    request_id: requestId,
    intended_user_id: supervisor.id,
  });
  const reject = await createActionToken({
    action: "reject",
    kind: "contact",
    request_id: requestId,
    intended_user_id: supervisor.id,
  });
  const card = buildContactApprovalCard({
    request: req,
    employee,
    approveToken: approve.token,
    rejectToken: reject.token,
  });
  const res = await pushFlex(supervisor.line_user_id, card);
  if (!res.ok) {
    const detail =
      typeof res.message === "string" ? res.message :
      typeof res.status === "number" ? `LINE API ${res.status}` :
      "LINE push failed";
    console.error("[approvals] push failed", {
      to: supervisor.line_user_id,
      supervisor_id: supervisor.id,
      supervisor_name: supervisor.name_th ?? supervisor.name_en,
      detail,
    });
    return { ok: false, reason: detail, supervisor };
  }
  return { ok: true, supervisor, res };
}

export async function notifyHrOfRegistration(employeeId: string, hrTargets: Employee[]) {
  const employee = await getEmployeeById(employeeId);
  if (!employee) return { ok: false, reason: "employee not found" };
  for (const hr of hrTargets) {
    if (!hr.line_user_id) continue;
    const approve = await createActionToken({
      action: "approve",
      kind: "registration",
      request_id: employeeId,
      intended_user_id: hr.id,
    });
    const reject = await createActionToken({
      action: "reject",
      kind: "registration",
      request_id: employeeId,
      intended_user_id: hr.id,
    });
    const card = buildRegistrationReviewCard({
      employee,
      approveToken: approve.token,
      rejectToken: reject.token,
    });
    await pushFlex(hr.line_user_id, card);
  }
  return { ok: true };
}

// =========================================================================
// Apply a decision and notify the employee (called from postback / FSM)
// =========================================================================

interface DecisionApplied {
  ok: true;
  kind: ActionTokenKind;
  status: "approved" | "rejected";
  notified: boolean;
}

interface DecisionFailed {
  ok: false;
  reason: string;
}

export async function applyDecision(
  kind: ActionTokenKind,
  requestId: string,
  decision: "approved" | "rejected",
  approverId: string,
  reason?: string | null,
): Promise<DecisionApplied | DecisionFailed> {
  if (kind === "leave") {
    const updated = await decideLeaveRequest(requestId, decision, approverId, reason);
    if (!updated) return { ok: false, reason: "leave request not found" };
    const employee = await getEmployeeById(updated.employee_id);
    if (!employee?.line_user_id) {
      return { ok: true, kind, status: decision, notified: false };
    }
    const card = buildDecisionResultCard({
      kind,
      status: decision,
      title: leaveTypeFormal(updated.leave_type),
      detail: `${updated.start_date} ถึง ${updated.end_date} รวม ${updated.days} วัน`,
      reason: updated.decision_reason,
      referenceId: updated.id,
      actionUrl: scheduleDeepLink(),
    });
    await pushFlex(employee.line_user_id, card);
    await recordNotification(
      employee.id,
      `leave_${decision}`,
      `คำขอลาของคุณ${decision === "approved" ? "ได้รับอนุมัติ" : "ไม่ได้รับอนุมัติ"}`,
    );
    return { ok: true, kind, status: decision, notified: true };
  }

  if (kind === "overtime") {
    const updated = await decideOvertimeRequest(requestId, decision, approverId, reason);
    if (!updated) return { ok: false, reason: "OT request not found" };
    const employee = await getEmployeeById(updated.employee_id);
    if (!employee?.line_user_id) {
      return { ok: true, kind, status: decision, notified: false };
    }
    const card = buildDecisionResultCard({
      kind,
      status: decision,
      title: "ทำงานล่วงเวลา",
      detail: `${updated.date} จำนวน ${updated.hours} ชั่วโมง`,
      reason: updated.decision_reason,
      referenceId: updated.id,
      actionUrl: scheduleDeepLink(),
    });
    await pushFlex(employee.line_user_id, card);
    await recordNotification(
      employee.id,
      `ot_${decision}`,
      `คำขอ OT ของคุณ${decision === "approved" ? "ได้รับอนุมัติ" : "ไม่ได้รับอนุมัติ"}`,
    );
    return { ok: true, kind, status: decision, notified: true };
  }

  if (kind === "contact") {
    const updated = await decideContactRequest(requestId, decision, approverId, reason);
    if (!updated) return { ok: false, reason: "contact request not found" };
    const employee = await getEmployeeById(updated.employee_id);
    if (!employee?.line_user_id) {
      return { ok: true, kind, status: decision, notified: false };
    }
    const card = buildDecisionResultCard({
      kind,
      status: decision,
      title: "นัดหมายเข้าพบหัวหน้างาน",
      detail: `${updated.requested_date} เวลา ${updated.time_start.slice(0,5)} – ${updated.time_end.slice(0,5)}`,
      reason: updated.decision_reason,
      referenceId: updated.id,
    });
    await pushFlex(employee.line_user_id, card);
    await recordNotification(
      employee.id,
      `contact_${decision}`,
      `คำขอเข้าพบของคุณ${decision === "approved" ? "ถูกตอบรับ" : "ถูกปฏิเสธ"}`,
    );
    return { ok: true, kind, status: decision, notified: true };
  }

  if (kind === "registration") {
    if (decision === "approved") {
      // For registration, supervisor still needs to fill role/code via dashboard.
      // Postback "approve" is a fast-track that auto-assigns a code. Do NOT pass
      // a role — approveRegistration preserves the applicant's existing role so
      // approving a pending supervisor doesn't demote them to 'employee'.
      const code = await nextEmployeeCode();
      const updated = await approveRegistration(requestId, approverId, {
        employee_code: code,
      });
      if (!updated?.line_user_id) {
        return { ok: true, kind, status: decision, notified: false };
      }
      const card = buildDecisionResultCard({
        kind,
        status: "approved",
        title: "ใบสมัครพนักงานใหม่",
        detail: `ยินดีต้อนรับเข้าสู่องค์กร รหัสพนักงานของคุณคือ ${code}`,
        referenceId: updated.id,
        actionUrl: appHome(),
      });
      await pushFlex(updated.line_user_id, card);
      return { ok: true, kind, status: decision, notified: true };
    }
    const updated = await rejectRegistration(requestId, approverId, reason ?? "ไม่ระบุเหตุผล");
    if (!updated?.line_user_id) {
      return { ok: true, kind, status: decision, notified: false };
    }
    const card = buildDecisionResultCard({
      kind,
      status: "rejected",
      title: "ใบสมัครพนักงานใหม่",
      detail: "ฝ่ายทรัพยากรบุคคลได้พิจารณาแล้ว ยังไม่สามารถรับเข้าทำงานในขณะนี้",
      reason: updated.rejection_reason,
      referenceId: updated.id,
    });
    await pushFlex(updated.line_user_id, card);
    return { ok: true, kind, status: decision, notified: true };
  }

  return { ok: false, reason: "unknown kind" };
}

async function nextEmployeeCode(): Promise<string> {
  const { listEmployees } = await import("../data");
  const all = await listEmployees();
  const codes = all
    .map((e) => e.employee_code)
    .filter((c): c is string => !!c && /^EMP\d+$/.test(c))
    .map((c) => parseInt(c.slice(3), 10));
  const max = codes.length ? Math.max(...codes) : 0;
  return `EMP${String(max + 1).padStart(3, "0")}`;
}

function leaveTypeFormal(t: string): string {
  switch (t) {
    case "annual":    return "ลาพักร้อน";
    case "sick":      return "ลาเนื่องจากเจ็บป่วย";
    case "maternity": return "ลาคลอด";
    case "personal":  return "ลากิจ";
    default:          return t;
  }
}

function scheduleDeepLink(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID_ATTENDANCE;
  if (liffId) return `https://liff.line.me/${liffId}/schedule`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ec-hr-one.vercel.app";
  return `${appUrl.replace(/\/$/, "")}/liff/my-attendance/schedule`;
}

function appHome(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN;
  if (liffId) return `https://liff.line.me/${liffId}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ec-hr-one.vercel.app";
  return `${appUrl.replace(/\/$/, "")}/liff`;
}

// Re-export for convenience
export { getSupervisorForEmployee };
