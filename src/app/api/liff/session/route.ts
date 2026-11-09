import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createLiffSession, deleteLiffSession, isExplicitDemoMode, readLiffSession } from "@/lib/liff-session";
import { verifyLineIdToken } from "@/lib/line-id-token";
import { redisSessionConfigured, SessionStoreUnavailableError } from "@/lib/session-redis";
import { isSameOriginRequest } from "@/lib/request-origin";
import { DASHBOARD_SESSION_COOKIE } from "@/lib/dashboard-auth-config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const DEMO_LINE_USER_ID = "U6789012345abcdef6789012345abcdef";
function json(body: unknown, status = 200, started = performance.now()) {
  return NextResponse.json(body, { status, headers: {
    "Cache-Control": "private, no-store", "Vary": "Cookie",
    "X-Login-Session-Store": redisSessionConfigured() ? "redis" : "cookie",
    "Server-Timing": `auth;dur=${Math.max(0, performance.now() - started).toFixed(1)}`,
  } });
}
export async function GET() {
  const started = performance.now();
  try {
    const session = await readLiffSession();
    return session ? json(session, 200, started) : json({ error: "session_required" }, 401, started);
  } catch {
    console.error("[api/liff/session] Login session storage is unavailable.");
    return json({ error: "session_store_unavailable" }, 503, started);
  }
}
export async function POST(request: Request) {
  const started = performance.now();
  if (!isSameOriginRequest(request)) return json({ error: "invalid_origin" }, 403, started);
  let body: { idToken?: unknown; demo?: unknown };
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400, started); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "invalid_request" }, 400, started);
  if (body.demo === true && !isExplicitDemoMode()) return json({ error: "line_verification_required" }, 401, started);
  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
  if (body.demo !== true) {
    if (!idToken || idToken.length > 8192) return json({ error: "id_token_required" }, 400, started);
    if (!channelId) {
      console.error("[api/liff/session] Missing LINE_LOGIN_CHANNEL_ID; configure the LINE Login channel and redeploy.");
      return json({ error: "line_login_not_configured" }, 503, started);
    }
    if (!process.env.LIFF_SESSION_SECRET || process.env.LIFF_SESSION_SECRET.trim().length < 32) {
      console.error("[api/liff/session] LIFF_SESSION_SECRET must contain at least 32 non-padding characters.");
      return json({ error: "liff_session_not_configured" }, 503, started);
    }
  }
  try {
    if (body.demo === true) return json(await createLiffSession({ userId: DEMO_LINE_USER_ID, displayName: "Pariya Chalat (Demo Owner)" }, { demoMode: true }), 200, started);
    const verified = await verifyLineIdToken(idToken, channelId);
    if (!verified) return json({ error: "invalid_id_token" }, 401, started);
    return json(await createLiffSession(verified.profile), 200, started);
  } catch (error) {
    if (error instanceof SessionStoreUnavailableError) {
      console.error("[api/liff/session] Login Redis is unavailable; check its connection and write-capable credentials.");
      return json({ error: "session_store_unavailable" }, 503, started);
    }
    console.error("[api/liff/session] LINE session could not be established.");
    return json({ error: "line_verification_unavailable" }, 502, started);
  }
}
export async function DELETE(request: Request) {
  const started = performance.now();
  if (!isSameOriginRequest(request)) return json({ error: "invalid_origin" }, 403, started);
  try {
    await deleteLiffSession();
    (await cookies()).delete(DASHBOARD_SESSION_COOKIE);
    return json({ ok: true }, 200, started);
  } catch {
    (await cookies()).delete(DASHBOARD_SESSION_COOKIE);
    return json({ error: "session_store_unavailable" }, 503, started);
  }
}
