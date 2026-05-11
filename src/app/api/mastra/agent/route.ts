import { NextResponse } from "next/server";
import { runAgent } from "@/lib/mastra/agent";
import { getEmployeeById } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { message, employeeId, channel } = (await req.json()) as {
      message?: string;
      employeeId?: string;
      channel?: string;
    };
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    let employeeCode: string | undefined;
    if (employeeId) {
      const emp = await getEmployeeById(employeeId);
      employeeCode = emp?.employee_code ?? undefined;
    }
    const result = await runAgent(message, { employeeCode, channel });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
