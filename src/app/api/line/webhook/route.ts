import { NextResponse } from "next/server";
import { runAgent } from "@/lib/mastra/agent";
import { consumeActionToken, getEmployeeByLineId } from "@/lib/data";
import {
  type LineEvent,
  replyFlex,
  replyText,
  verifyLineSignature,
} from "@/lib/line/client";
import { applyDecision } from "@/lib/line/approvals";
import { buildDecisionResultCard, rejectionReasonQuickReply } from "@/lib/line/flex";
import {
  hasPendingRejection,
  setPendingRejection,
  takePendingRejection,
} from "@/lib/line/pending-rejection";
import type { ActionTokenKind } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ ok: true, service: "ec-aihr.line.webhook" });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (process.env.LINE_CHANNEL_SECRET) {
    if (!verifyLineSignature(raw, signature)) {
      return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(raw) as { events?: LineEvent[] };
  const events = body.events ?? [];

  await Promise.all(events.map(handleEvent));

  return NextResponse.json({ ok: true, processed: events.length });
}

async function handleEvent(ev: LineEvent) {
  // Debug: every webhook event prints the userId so you can compare it
  // against employees.line_user_id in Supabase.
  console.log("[LINE webhook]", {
    type: ev.type,
    userId: ev.source?.userId,
    sourceType: ev.source?.type,
    messageType: ev.message?.type,
    postbackData: ev.postback?.data?.slice(0, 80),
  });
  if (ev.type === "postback") return handlePostback(ev);
  if (ev.type === "message" && ev.message?.type === "text") return handleTextMessage(ev);
  if (ev.type === "follow") {
    // User just added the OA as a friend — log so we know when this happens
    console.log("[LINE webhook] follow event — user is now a friend", { userId: ev.source?.userId });
  }
  if (ev.type === "unfollow") {
    console.log("[LINE webhook] unfollow event", { userId: ev.source?.userId });
  }
}

// =========================================================================
// Postback: supervisor pressed Approve / Reject on a Flex card
// =========================================================================

async function handlePostback(ev: LineEvent) {
  const replyToken = ev.replyToken;
  const userId = ev.source?.userId;
  const data = ev.postback?.data ?? "";
  if (!replyToken || !userId) return;

  const params = new URLSearchParams(data);
  const action = params.get("action");
  const kind = params.get("kind") as ActionTokenKind | null;
  const tokenStr = params.get("token");

  if (!action || !kind || !tokenStr) {
    await replyText(replyToken, "ลิงก์ไม่ถูกต้อง");
    return;
  }

  const me = await getEmployeeByLineId(userId);
  const consumed = await consumeActionToken(tokenStr, me?.id ?? null);
  if (!consumed.ok) {
    await replyText(replyToken, `ไม่สามารถดำเนินการได้: ${consumed.reason}`);
    return;
  }

  if (action === "approve") {
    const result = await applyDecision(kind, consumed.token.request_id, "approved", me?.id ?? "system");
    if (!result.ok) {
      await replyText(replyToken, `ไม่สามารถอนุมัติได้: ${result.reason}`);
      return;
    }
    await replyFlex(
      replyToken,
      buildDecisionResultCard({
        kind,
        status: "approved",
        title: kindTitle(kind),
        detail: "บันทึกการอนุมัติเรียบร้อย ระบบแจ้งพนักงานแล้ว",
      }),
    );
    return;
  }

  if (action === "reject") {
    setPendingRejection(userId, kind, consumed.token.request_id);
    await replyText(
      replyToken,
      "กรุณาพิมพ์เหตุผลที่ไม่อนุมัติเป็นข้อความถัดไป (มีเวลา 5 นาที)",
      rejectionReasonQuickReply(),
    );
    return;
  }

  await replyText(replyToken, "ไม่รู้จัก action นี้");
}

// =========================================================================
// Text message: either rejection-reason follow-up OR pass to AI agent
// =========================================================================

async function handleTextMessage(ev: LineEvent) {
  const replyToken = ev.replyToken;
  const userId = ev.source?.userId;
  const text = ev.message?.text ?? "";
  if (!replyToken) return;

  // 1. Is the user mid-rejection?
  if (userId && hasPendingRejection(userId)) {
    const pending = takePendingRejection(userId);
    if (pending) {
      const me = await getEmployeeByLineId(userId);
      const result = await applyDecision(
        pending.kind,
        pending.requestId,
        "rejected",
        me?.id ?? "system",
        text.trim(),
      );
      if (!result.ok) {
        await replyText(replyToken, `บันทึกไม่สำเร็จ: ${result.reason}`);
        return;
      }
      await replyFlex(
        replyToken,
        buildDecisionResultCard({
          kind: pending.kind,
          status: "rejected",
          title: kindTitle(pending.kind),
          detail: "บันทึกการไม่อนุมัติเรียบร้อย ระบบแจ้งพนักงานแล้ว",
          reason: text.trim(),
        }),
      );
      return;
    }
  }

  // 2. Otherwise route to the AI agent
  const employee = userId ? await getEmployeeByLineId(userId) : undefined;
  const result = await runAgent(text, {
    employeeCode: employee?.employee_code ?? undefined,
    channel: "line",
  });
  await replyText(replyToken, result.response);
}

function kindTitle(kind: ActionTokenKind): string {
  switch (kind) {
    case "leave":        return "คำขอลา";
    case "overtime":     return "คำขอ OT";
    case "contact":      return "ขอเข้าพบ";
    case "registration": return "ใบสมัครพนักงาน";
  }
}
