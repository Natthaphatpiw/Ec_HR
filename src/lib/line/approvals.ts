import {
  approveRegistration,
  createActionToken,
  decideContactRequest,
  decideLeaveRequest,
  decideOvertimeRequest,
  getContactRequestById,
  getEmployeeById,
  getLeaveRequestById,
  getOvertimeRequestById,
  getSupervisorForEmployee,
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
  const card = buildLeaveApprovalCard({
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
  const card = buildOvertimeApprovalCard({
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
      title: `คำขอลา ${updated.leave_type}`,
      detail: `${updated.start_date} ถึง ${updated.end_date} (${updated.days} วัน)`,
      reason: updated.decision_reason,
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
      title: "คำขอทำโอที",
      detail: `${updated.date} · ${updated.hours} ชม.`,
      reason: updated.decision_reason,
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
      title: "ขอเข้าพบหัวหน้า",
      detail: `${updated.requested_date} · ${updated.time_start} – ${updated.time_end}`,
      reason: updated.decision_reason,
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
      // Postback "approve" is a fast-track that auto-assigns a code.
      const code = await nextEmployeeCode();
      const updated = await approveRegistration(requestId, approverId, {
        employee_code: code,
        role: "employee",
      });
      if (!updated?.line_user_id) {
        return { ok: true, kind, status: decision, notified: false };
      }
      const card = buildDecisionResultCard({
        kind,
        status: "approved",
        title: "ใบสมัครพนักงาน",
        detail: `ยินดีต้อนรับ! รหัสพนักงานของคุณคือ ${code}`,
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
      title: "ใบสมัครพนักงาน",
      detail: "ทาง HR พิจารณาแล้วยังไม่สามารถรับเข้าทำงานได้ในขณะนี้",
      reason: updated.rejection_reason,
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

// Re-export for convenience
export { getSupervisorForEmployee };
