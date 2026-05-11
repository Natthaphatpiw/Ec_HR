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

export async function replyMessage(replyToken: string, text: string) {
  if (!token()) {
    console.log("[LINE demo reply]", { replyToken, text });
    return { ok: true, demo: true };
  }
  const res = await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  return res.json();
}

export async function pushMessage(to: string, text: string) {
  if (!token()) {
    console.log("[LINE demo push]", { to, text });
    return { ok: true, demo: true };
  }
  const res = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  });
  return res.json();
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

export async function pushFlex(to: string, message: FlexMessage) {
  if (!token()) {
    console.log("[LINE demo push flex]", { to, altText: message.altText });
    return { ok: true, demo: true, messageId: `demo-${Date.now()}` };
  }
  const res = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ to, messages: [message] }),
  });
  return res.json();
}

export async function replyFlex(replyToken: string, message: FlexMessage) {
  if (!token()) {
    console.log("[LINE demo reply flex]", { replyToken, altText: message.altText });
    return { ok: true, demo: true };
  }
  const res = await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages: [message] }),
  });
  return res.json();
}

export async function replyText(replyToken: string, text: string, quickReply?: unknown) {
  if (!token()) {
    console.log("[LINE demo reply text]", { replyToken, text, quickReply });
    return { ok: true, demo: true };
  }
  const message: Record<string, unknown> = { type: "text", text };
  if (quickReply) message.quickReply = quickReply;
  const res = await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages: [message] }),
  });
  return res.json();
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
