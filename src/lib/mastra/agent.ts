import { TOOLS, getToolByName } from "./tools";

export interface AgentResult {
  response: string;
  tools_used: string[];
}

const SYSTEM_PROMPT = `You are ForgeHR Assistant, a helpful HR copilot for ThaiAuto Factory using LinForge HR.

You have access to live tools that read employee data, attendance, leave requests, payroll, and shifts from the company database. Use them whenever the user asks about specific data.

Rules:
- Answer concisely. Use bullet lists when listing 3+ items.
- Always cite the data source (which tool or table) when stating numeric facts.
- Never invent employee codes, payroll figures, or attendance status. If a tool returns no data, say so.
- For approval decisions, present options but never auto-approve — defer to the supervisor.
- Respond in the user's language (Thai/English/Chinese).
- Never use emojis.

You are running for the org "ThaiAuto Factory" in timezone Asia/Bangkok. Today is 2026-05-09.`;

const MODEL_ID = "claude-sonnet-4-6";

function detectIntent(message: string): { tool: string; input: Record<string, unknown> } | null {
  const m = message.toLowerCase();
  const codeMatch = message.match(/EMP\d{3}/i);
  const code = codeMatch?.[0]?.toUpperCase();

  if (m.includes("balance") || m.includes("สิทธิลา") || m.includes("假期") || m.includes("余额")) {
    return { tool: "get_leave_balance", input: { employee_code: code ?? "EMP001" } };
  }
  if (m.includes("late") || m.includes("สาย") || m.includes("迟到")) {
    return { tool: "list_attendance", input: { date: "2026-05-09" } };
  }
  if (m.includes("attendance") || m.includes("ตอกบัตร") || m.includes("打卡") || m.includes("clock")) {
    return { tool: "list_attendance", input: { employee_code: code ?? undefined } };
  }
  if (m.includes("payroll") || m.includes("payslip") || m.includes("salary") || m.includes("net pay") || m.includes("เงินเดือน") || m.includes("薪") || m.includes("工资")) {
    return { tool: "get_payroll_summary", input: { employee_code: code ?? "EMP001" } };
  }
  if (m.includes("schedule") || m.includes("shift") || m.includes("ตารางกะ") || m.includes("排班") || m.includes("班次")) {
    return { tool: "suggest_shift_schedule", input: { department: "Production" } };
  }
  if (m.includes("approval") || m.includes("pending") || m.includes("รออนุมัติ") || m.includes("待审批")) {
    return { tool: "list_pending_approvals", input: {} };
  }
  if (m.includes("absent") || m.includes("predict") || m.includes("ขาดงาน") || m.includes("缺勤")) {
    return { tool: "predict_absenteeism", input: {} };
  }
  if (m.includes("draft") || m.includes("announcement") || m.includes("broadcast") || m.includes("ประกาศ") || m.includes("公告")) {
    return { tool: "draft_announcement", input: { topic: "monthly safety reminder", language: "th" } };
  }
  if (code) {
    return { tool: "get_employee", input: { employee_code: code } };
  }
  return null;
}

function fallbackFormat(toolName: string, result: unknown): string {
  if (toolName === "get_leave_balance" && typeof result === "object" && result) {
    const r = result as { employee_code: string; annual: { remaining: number; used: number }; sick: { remaining: number; used: number }; personal: { remaining: number; used: number } };
    if ("error" in (r as Record<string, unknown>)) return `I couldn't find that employee.`;
    return `${r.employee_code} leave balance:\n- Annual: ${r.annual.remaining}d remaining (${r.annual.used} used)\n- Sick: ${r.sick.remaining}d remaining (${r.sick.used} used)\n- Personal: ${r.personal.remaining}d remaining (${r.personal.used} used)`;
  }
  if (toolName === "list_attendance" && Array.isArray(result)) {
    if (result.length === 0) return "No attendance records found for that date.";
    const lines = (result as { name?: string; employee_code?: string; time: string; type: string; status: string }[])
      .slice(0, 8)
      .map((l) => `- ${l.time} · ${l.type.toUpperCase()} · ${l.name ?? l.employee_code} · ${l.status}`);
    return `Today's attendance (${result.length} records):\n${lines.join("\n")}`;
  }
  if (toolName === "get_payroll_summary" && Array.isArray(result)) {
    const lines = (result as { month: string; net_pay: number; ot_pay: number; base_pay: number }[])
      .slice(0, 3)
      .map((p) => `- ${p.month}: net ฿${p.net_pay.toLocaleString()} (base ${p.base_pay.toLocaleString()} + OT ${p.ot_pay.toLocaleString()})`);
    return `Payroll summary:\n${lines.join("\n")}`;
  }
  if (toolName === "suggest_shift_schedule" && typeof result === "object" && result) {
    const r = result as { department: string; suggestions: string[] };
    return `Shift suggestions for ${r.department}:\n${r.suggestions.map((s) => `- ${s}`).join("\n")}`;
  }
  if (toolName === "list_pending_approvals" && typeof result === "object" && result) {
    const r = result as { leaves: unknown[]; overtime: unknown[] };
    return `Pending approvals: ${r.leaves.length} leave + ${r.overtime.length} overtime requests waiting for review.`;
  }
  if (toolName === "predict_absenteeism" && typeof result === "object" && result) {
    const r = result as {
      date: string;
      risk: string;
      flagged_employees: { code: string; reason: string }[];
      suggested_action: string;
    };
    return `Absenteeism risk for ${r.date}: ${r.risk}.\nFlagged:\n${r.flagged_employees.map((e) => `- ${e.code}: ${e.reason}`).join("\n")}\n\nSuggested action: ${r.suggested_action}`;
  }
  if (toolName === "draft_announcement" && typeof result === "object" && result) {
    const r = result as { language: string; message: string };
    return `Draft (${r.language}):\n\n${r.message}`;
  }
  if (toolName === "get_employee" && typeof result === "object" && result) {
    const r = result as Record<string, unknown>;
    if (r.error) return String(r.error);
    return `${r.name} (${r.employee_code}) — ${r.position}, ${r.department}. Role: ${r.role}. ${r.line_bound ? "LINE bound." : "LINE not bound."}`;
  }
  return JSON.stringify(result, null, 2);
}

async function runAnthropic(message: string, employeeCode?: string): Promise<AgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("no-key");

  const userPrefix = employeeCode ? `[Asking on behalf of ${employeeCode}] ` : "";
  const toolDefs = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const messages: { role: "user" | "assistant"; content: unknown }[] = [
    { role: "user", content: userPrefix + message },
  ];
  const toolsUsed: string[] = [];

  for (let step = 0; step < 6; step++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: toolDefs,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}`);
    const data = (await res.json()) as {
      stop_reason: string;
      content: Array<
        | { type: "text"; text: string }
        | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
      >;
    };

    if (data.stop_reason === "end_turn" || data.stop_reason === "stop_sequence") {
      const text = data.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n")
        .trim();
      return { response: text || "(No response)", tools_used: toolsUsed };
    }

    if (data.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: data.content });
      const toolResults: { type: "tool_result"; tool_use_id: string; content: string }[] = [];
      for (const block of data.content) {
        if (block.type !== "tool_use") continue;
        const tool = getToolByName(block.name);
        if (!tool) continue;
        toolsUsed.push(block.name);
        const result = await tool.run(block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }

  return { response: "Agent reached step limit without final answer.", tools_used: toolsUsed };
}

async function runFallback(message: string, employeeCode?: string): Promise<AgentResult> {
  const intent = detectIntent(message);
  if (!intent) {
    return {
      response:
        "I can help with attendance, leave balances, payroll summaries, schedule suggestions, pending approvals, absenteeism predictions, and draft announcements. Try asking 'show me today's attendance' or 'what is EMP001's leave balance?'.",
      tools_used: [],
    };
  }
  if (employeeCode && !intent.input.employee_code && intent.tool !== "list_attendance") {
    intent.input.employee_code = employeeCode;
  }
  const tool = getToolByName(intent.tool);
  if (!tool) {
    return { response: `Unknown tool: ${intent.tool}`, tools_used: [] };
  }
  const result = await tool.run(intent.input);
  return {
    response: fallbackFormat(intent.tool, result),
    tools_used: [intent.tool],
  };
}

export async function runAgent(
  message: string,
  context: { employeeCode?: string; channel?: string } = {},
): Promise<AgentResult> {
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      return await runAnthropic(message, context.employeeCode);
    }
  } catch (err) {
    console.warn("Anthropic call failed, using fallback:", err);
  }
  return runFallback(message, context.employeeCode);
}
