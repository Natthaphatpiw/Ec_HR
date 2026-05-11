"use server";

import {
  createSupervisorAssignment,
  deleteScheduleEntry as deleteEntry,
  getEmployeeById,
  listPendingScheduleChanges,
  markScheduleChangeNotified,
  upsertScheduleEntry,
} from "@/lib/data";
import { pushFlex } from "@/lib/line/client";
import { buildScheduleChangeCard } from "@/lib/line/flex";
import type { ScheduleEntryType } from "@/lib/types";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export interface ScheduleSaveResult {
  ok: boolean;
  message?: string;
}

export async function saveScheduleEntry(input: {
  employeeId: string;
  date: string;
  entryType: ScheduleEntryType;
  hours: number;
  notes?: string | null;
  byId?: string;
  isSupervisorOverride?: boolean;
}): Promise<ScheduleSaveResult> {
  const byId = input.byId ?? DEMO_EMPLOYEE_ID;
  if (input.hours < 0 || input.hours > 24) {
    return { ok: false, message: "ชั่วโมงต้องอยู่ระหว่าง 0–24" };
  }
  await upsertScheduleEntry({
    employee_id: input.employeeId,
    date: input.date,
    entry_type: input.entryType,
    hours: input.hours,
    notes: input.notes ?? null,
    created_by_id: byId,
    is_supervisor_override: input.isSupervisorOverride === true,
  });
  await flushPendingScheduleNotifications();
  return { ok: true };
}

export async function removeScheduleEntry(input: {
  employeeId: string;
  date: string;
  entryType: ScheduleEntryType;
  byId?: string;
}): Promise<ScheduleSaveResult> {
  const byId = input.byId ?? DEMO_EMPLOYEE_ID;
  await deleteEntry(input.employeeId, input.date, input.entryType, byId);
  return { ok: true };
}

export async function saveSupervisorAssignment(input: {
  supervisorId: string;
  date: string;
  entryType: ScheduleEntryType;
  hours: number;
  notes?: string | null;
  employeeIds: string[];
}): Promise<ScheduleSaveResult> {
  if (input.employeeIds.length === 0) {
    return { ok: false, message: "กรุณาเลือกพนักงานอย่างน้อย 1 คน" };
  }
  await createSupervisorAssignment({
    supervisor_id: input.supervisorId,
    date: input.date,
    entry_type: input.entryType,
    hours: input.hours,
    notes: input.notes ?? null,
    employee_ids: input.employeeIds,
  });
  await flushPendingScheduleNotifications();
  return { ok: true, message: `อัพเดทตารางให้พนักงาน ${input.employeeIds.length} คน` };
}

// =========================================================================
// Drain the schedule_changes queue → push LINE Flex card to each employee.
// In production this would be a cron, but for demo we run it inline after
// every supervisor mutation so the LINE side stays in sync immediately.
// =========================================================================

async function flushPendingScheduleNotifications() {
  const pending = await listPendingScheduleChanges();
  for (const c of pending) {
    const emp = await getEmployeeById(c.employee_id);
    const changedBy = c.changed_by_id ? await getEmployeeById(c.changed_by_id) : null;
    if (!emp?.line_user_id) {
      await markScheduleChangeNotified(c.id);
      continue;
    }
    const card = buildScheduleChangeCard({
      date: c.date,
      entryType: c.entry_type,
      previousHours: c.previous_hours,
      newHours: c.new_hours,
      changedByName:
        changedBy?.name_th ?? changedBy?.name_en ?? changedBy?.employee_code ?? "Supervisor",
    });
    await pushFlex(emp.line_user_id, card);
    await markScheduleChangeNotified(c.id);
  }
}
