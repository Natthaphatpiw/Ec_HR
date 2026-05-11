import crypto from "node:crypto";

const LINE_API = "https://api.line.me/v2/bot";

function token() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
}

export function verifyLineSignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false;
  const computed = crypto.createHmac("sha256", secret).update(body).digest("base64");
  // timing-safe compare
  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface LineApiResult {
  ok: boolean;
  demo?: boolean;
  status?: number;
  message?: string;
  messageId?: string;
  details?: unknown;
  raw?: string;
  [key: string]: unknown;
}

async function lineFetch(endpoint: string, body: unknown, label: string): Promise<LineApiResult> {
  const res = await fetch(`${LINE_API}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!res.ok) {
    console.error(`[LINE ${label}] HTTP ${res.status}`, parsed);
    return { ok: false, status: res.status, ...parsed };
  }
  return { ok: true, ...parsed };
}

export async function replyMessage(replyToken: string, text: string): Promise<LineApiResult> {
  if (!token()) {
    console.log("[LINE demo reply]", { replyToken, text });
    return { ok: true, demo: true };
  }
  return lineFetch("/message/reply", { replyToken, messages: [{ type: "text", text }] }, "reply");
}

export async function pushMessage(to: string, text: string): Promise<LineApiResult> {
  if (!token()) {
    console.log("[LINE demo push]", { to, text });
    return { ok: true, demo: true };
  }
  return lineFetch("/message/push", { to, messages: [{ type: "text", text }] }, "push");
}

// ---- Flex message helpers ------------------------------------------------

export interface FlexBubble {
  type: "bubble";
  size?: "nano" | "micro" | "kilo" | "mega" | "giga";
  header?: Record<string, unknown>;
  body?: Record<string, unknown>;
  footer?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

export interface FlexMessage {
  type: "flex";
  altText: string;
  contents: FlexBubble | { type: "carousel"; contents: FlexBubble[] };
}

export async function pushFlex(to: string, message: FlexMessage): Promise<LineApiResult> {
  if (!token()) {
    console.log("[LINE demo push flex]", { to, altText: message.altText });
    return { ok: true, demo: true, messageId: `demo-${Date.now()}` };
  }
  return lineFetch("/message/push", { to, messages: [message] }, "pushFlex");
}

export async function replyFlex(replyToken: string, message: FlexMessage): Promise<LineApiResult> {
  if (!token()) {
    console.log("[LINE demo reply flex]", { replyToken, altText: message.altText });
    return { ok: true, demo: true };
  }
  return lineFetch("/message/reply", { replyToken, messages: [message] }, "replyFlex");
}

export async function replyText(replyToken: string, text: string, quickReply?: unknown): Promise<LineApiResult> {
  if (!token()) {
    console.log("[LINE demo reply text]", { replyToken, text, quickReply });
    return { ok: true, demo: true };
  }
  const msg: Record<string, unknown> = { type: "text", text };
  if (quickReply) msg.quickReply = quickReply;
  return lineFetch("/message/reply", { replyToken, messages: [msg] }, "replyText");
}

// ---- Webhook event types -------------------------------------------------

export interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type: string; text?: string; id?: string };
  postback?: { data: string; params?: Record<string, string> };
  timestamp?: number;
}
