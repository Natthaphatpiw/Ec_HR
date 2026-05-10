import {
  getEmployeeByCode,
  getEmployeeByLineId,
  getEmployeeName,
  getLeaveBalance,
  listAttendanceForEmployee,
  listAttendanceLogs,
  listEmployees,
  listLeaveRequests,
  listOvertimeRequests,
  listPayrollsForEmployee,
} from "@/lib/data";

export interface AgentTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  run: (input: Record<string, unknown>) => Promise<unknown>;
}

export const TOOLS: AgentTool[] = [
  {
    name: "get_employee",
    description:
      "Look up an employee by their employee_code (e.g. 'EMP001') or LINE user id. Returns name, role, department, position.",
    input_schema: {
      type: "object",
      properties: {
        employee_code: { type: "string", description: "Employee code like EMP001" },
        line_user_id: { type: "string", description: "LINE user ID starting with 'U'" },
      },
    },
    run: async (input) => {
      const code = input.employee_code as string | undefined;
      const lineId = input.line_user_id as string | undefined;
      const e = code
        ? await getEmployeeByCode(code)
        : lineId
          ? await getEmployeeByLineId(lineId)
          : undefined;
      if (!e) return { error: "Employee not found" };
      return {
        employee_code: e.employee_code,
        name: getEmployeeName(e, "en"),
        name_th: e.name_th,
        role: e.role,
        department: e.department,
        position: e.position,
        base_salary: e.base_salary,
        line_bound: !!e.line_user_id,
      };
    },
  },
  {
    name: "list_attendance",
    description:
      "List recent attendance logs for one employee (by code) or all employees on a date. Returns time, type (in/out), status (ontime/late).",
    input_schema: {
      type: "object",
      properties: {
        employee_code: { type: "string" },
        date: { type: "string", description: "ISO date YYYY-MM-DD; if omitted returns today" },
        limit: { type: "number", default: 10 },
      },
    },
    run: async (input) => {
      const limit = (input.limit as number) ?? 10;
      const date = (input.date as string) ?? "2026-05-09";
      if (input.employee_code) {
        const emp = await getEmployeeByCode(input.employee_code as string);
        if (!emp) return { error: "Employee not found" };
        const logs = (await listAttendanceForEmployee(emp.id)).slice(0, limit);
        return logs.map((l) => ({
          date: l.timestamp.slice(0, 10),
          time: l.timestamp.slice(11, 16),
          type: l.type,
          status: l.status,
        }));
      }
      const all = await listAttendanceLogs();
      const filtered = all.filter((l) => l.timestamp.startsWith(date)).slice(0, limit);
      const employees = await listEmployees();
      const empMap = new Map(employees.map((e) => [e.id, e]));
      return filtered.map((l) => {
        const e = empMap.get(l.employee_id);
        return {
          employee_code: e?.employee_code,
          name: e ? getEmployeeName(e, "en") : "?",
          time: l.timestamp.slice(11, 16),
          type: l.type,
          status: l.status,
        };
      });
    },
  },
  {
    name: "get_leave_balance",
    description: "Get an employee's annual / sick / personal leave balance",
    input_schema: {
      type: "object",
      properties: { employee_code: { type: "string" } },
      required: ["employee_code"],
    },
    run: async (input) => {
      const emp = await getEmployeeByCode(input.employee_code as string);
      if (!emp) return { error: "Employee not found" };
      const b = getLeaveBalance(emp.id);
      return {
        employee_code: emp.employee_code,
        annual: { used: b.annual.used, remaining: b.annual.total - b.annual.used },
        sick: { used: b.sick.used, remaining: b.sick.total - b.sick.used },
        personal: { used: b.personal.used, remaining: b.personal.total - b.personal.used },
      };
    },
  },
  {
    name: "list_pending_approvals",
    description: "Return all pending leave and overtime requests across the org",
    input_schema: { type: "object", properties: {} },
    run: async () => {
      const [leaves, ots, employees] = await Promise.all([
        listLeaveRequests(),
        listOvertimeRequests(),
        listEmployees(),
      ]);
      const empMap = new Map(employees.map((e) => [e.id, e]));
      return {
        leaves: leaves
          .filter((l) => l.status === "pending")
          .map((l) => ({
            employee: empMap.get(l.employee_id)?.employee_code,
            type: l.leave_type,
            from: l.start_date,
            to: l.end_date,
            days: l.days,
            reason: l.reason,
          })),
        overtime: ots
          .filter((o) => o.status === "pending")
          .map((o) => ({
            employee: empMap.get(o.employee_id)?.employee_code,
            date: o.date,
            hours: o.hours,
            reason: o.reason,
          })),
      };
    },
  },
  {
    name: "get_payroll_summary",
    description: "Get payroll summary for an employee (latest 6 months) or for one specific month",
    input_schema: {
      type: "object",
      properties: {
        employee_code: { type: "string" },
        month_year: { type: "string", description: "Format YYYY-MM" },
      },
    },
    run: async (input) => {
      const code = input.employee_code as string | undefined;
      if (!code) return { error: "employee_code required" };
      const emp = await getEmployeeByCode(code);
      if (!emp) return { error: "Employee not found" };
      const payrolls = await listPayrollsForEmployee(emp.id);
      const filtered = input.month_year
        ? payrolls.filter((p) => p.month_year === input.month_year)
        : payrolls.slice(0, 6);
      return filtered.map((p) => ({
        month: p.month_year,
        base_pay: p.base_pay,
        ot_pay: p.ot_pay,
        ssf: p.ssf_deduction,
        tax: p.tax_deduction,
        net_pay: p.net_pay,
      }));
    },
  },
  {
    name: "suggest_shift_schedule",
    description:
      "Suggest a shift schedule for the upcoming week. Returns a list of recommendations the manager can apply.",
    input_schema: {
      type: "object",
      properties: {
        department: { type: "string" },
        days: { type: "number", default: 7 },
      },
    },
    run: async (input) => {
      const dept = (input.department as string) ?? "Production";
      const employees = await listEmployees();
      const team = employees.filter((e) => e.department === dept);
      return {
        department: dept,
        suggestions: [
          `Add 2 evening-shift slots Friday for ${team[0]?.employee_code} and ${team[1]?.employee_code} (lowest OT this month)`,
          "Rotate Group B off Saturday — they've worked 6 consecutive days",
          "Pre-approve OT for May 14 to cover overlapping leave requests",
        ],
      };
    },
  },
  {
    name: "predict_absenteeism",
    description: "Predict absenteeism risk for tomorrow based on history",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "ISO date YYYY-MM-DD" } },
    },
    run: async () => {
      return {
        date: "2026-05-10",
        risk: "moderate",
        flagged_employees: [
          { code: "EMP010", reason: "Late 3 times this week" },
          { code: "EMP007", reason: "Unbound LINE account, no clock-in last 2 days" },
        ],
        suggested_action: "Send a check-in nudge via LINE OA at 06:30",
      };
    },
  },
  {
    name: "draft_announcement",
    description:
      "Draft a LINE announcement message in the requested language. Returns a string ready to broadcast.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        language: { type: "string", enum: ["en", "th", "zh"], default: "th" },
      },
      required: ["topic"],
    },
    run: async (input) => {
      const topic = input.topic as string;
      const lang = (input.language as string) ?? "th";
      const templates: Record<string, string> = {
        en: `Hi team, ${topic}. Please confirm by replying YES in this chat. — HR`,
        th: `เรียนทีมงาน เรื่อง ${topic} กรุณาตอบกลับ YES ในแชทนี้เพื่อยืนยัน — ฝ่ายบุคคล`,
        zh: `各位同事,关于${topic},请在此聊天中回复 YES 确认。— 人力资源部`,
      };
      return { language: lang, message: templates[lang] ?? templates.en };
    },
  },
];

export function getToolByName(name: string): AgentTool | undefined {
  return TOOLS.find((t) => t.name === name);
}
