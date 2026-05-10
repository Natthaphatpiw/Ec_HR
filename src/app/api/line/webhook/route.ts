import { NextResponse } from "next/server";
import { runAgent } from "@/lib/mastra/agent";
import { getEmployeeByLineId } from "@/lib/data";
import { type LineEvent, replyMessage, verifyLineSignature } from "@/lib/line/client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, service: "linforge-hr.line.webhook" });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  // In dev / demo without channel secret, skip verification
  if (process.env.LINE_CHANNEL_SECRET) {
    if (!verifyLineSignature(raw, signature)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(raw) as { events?: LineEvent[] };
  const events = body.events ?? [];

  await Promise.all(
    events.map(async (ev) => {
      if (ev.type !== "message" || ev.message?.type !== "text") return;
      const text = ev.message.text ?? "";
      const userId = ev.source?.userId;
      const replyToken = ev.replyToken;
      if (!replyToken) return;

      const employee = userId ? await getEmployeeByLineId(userId) : undefined;
      const result = await runAgent(text, {
        employeeCode: employee?.employee_code,
        channel: "line",
      });
      await replyMessage(replyToken, result.response);
    }),
  );

  return NextResponse.json({ ok: true, processed: events.length });
}
