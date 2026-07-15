import { NextResponse } from "next/server";
import { isExplicitDemoMode, setLiffSession } from "@/lib/liff-session";

const LINE_ID_TOKEN_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
// Explicit browser fallback uses the seeded organization owner (EMP008). A
// verified LINE login never uses this identity and keeps its own LINE subject.
const DEMO_LINE_USER_ID = "U6789012345abcdef6789012345abcdef";

interface LineIdTokenPayload {
  iss?: unknown;
  sub?: unknown;
  aud?: unknown;
  exp?: unknown;
  name?: unknown;
  picture?: unknown;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function verifyLineIdToken(idToken: string, channelId: string) {
  const response = await fetch(LINE_ID_TOKEN_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn(`[api/liff/session] LINE rejected an ID token with status ${response.status}`);
    return null;
  }

  const payload = (await response.json()) as LineIdTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== "https://access.line.me" ||
    payload.aud !== channelId ||
    typeof payload.sub !== "string" ||
    !/^U[0-9a-f]{32}$/i.test(payload.sub) ||
    typeof payload.exp !== "number" ||
    payload.exp <= now
  ) {
    return null;
  }

  return {
    profile: {
      userId: payload.sub,
      displayName: typeof payload.name === "string" ? payload.name : "LINE User",
      pictureUrl: typeof payload.picture === "string" ? payload.picture : undefined,
    },
    expiresInSeconds: Math.max(1, Math.min(8 * 60 * 60, payload.exp - now)),
  };
}

export async function POST(request: Request) {
  let body: { idToken?: unknown; demo?: unknown };
  try {
    body = (await request.json()) as { idToken?: unknown; demo?: unknown };
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  if (body.demo === true) {
    if (!isExplicitDemoMode()) return json({ error: "line_verification_required" }, 401);

    await setLiffSession(DEMO_LINE_USER_ID);
    return json({
      profile: {
        userId: DEMO_LINE_USER_ID,
        displayName: "Pariya Chalat (Demo Owner)",
      },
      demoMode: true,
    });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
  if (!idToken || idToken.length > 8192) return json({ error: "id_token_required" }, 400);
  if (!channelId) return json({ error: "line_login_not_configured" }, 503);
  if (!process.env.LIFF_SESSION_SECRET || process.env.LIFF_SESSION_SECRET.length < 32) {
    return json({ error: "liff_session_not_configured" }, 503);
  }

  try {
    const verified = await verifyLineIdToken(idToken, channelId);
    if (!verified) return json({ error: "invalid_id_token" }, 401);

    // Preserve the verified LINE subject in every environment. Explicit demo
    // accounts can be assigned to seeded roles through DEMO_LIFF_EMPLOYEE_MAP.
    await setLiffSession(verified.profile.userId, verified.expiresInSeconds);
    return json({ profile: verified.profile, demoMode: false });
  } catch (error) {
    console.error(
      "[api/liff/session] LINE verification request failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "line_verification_unavailable" }, 502);
  }
}
