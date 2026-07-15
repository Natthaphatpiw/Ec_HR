import "server-only";
import { cookies } from "next/headers";
import { createSignedSession, verifySignedSession } from "@/lib/signed-session";

export const LIFF_SESSION_COOKIE = "liff_user_id";
export const LIFF_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

// This deterministic key is permitted only for the explicitly selected demo
// environment. Production always requires a private LIFF_SESSION_SECRET.
const EXPLICIT_DEMO_SIGNING_KEY = "ec-aihr-explicit-demo-session-signing-key";

export function isExplicitDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

function getLiffSessionSecret(): string | undefined {
  const configured = process.env.LIFF_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  return isExplicitDemoMode() ? EXPLICIT_DEMO_SIGNING_KEY : undefined;
}

export async function getLiffUserIdFromCookie(): Promise<string | undefined> {
  const secret = getLiffSessionSecret();
  if (!secret) return undefined;

  const cookieStore = await cookies();
  const session = await verifySignedSession(
    cookieStore.get(LIFF_SESSION_COOKIE)?.value,
    secret,
    "liff",
  );
  return session?.role === "liff" ? session.sub : undefined;
}

export async function setLiffSession(
  lineUserId: string,
  requestedMaxAgeSeconds = LIFF_SESSION_MAX_AGE_SECONDS,
): Promise<void> {
  const secret = getLiffSessionSecret();
  if (!secret) throw new Error("LIFF_SESSION_SECRET is not configured");
  const maxAge = Math.max(
    1,
    Math.min(
      LIFF_SESSION_MAX_AGE_SECONDS,
      Math.floor(Number.isFinite(requestedMaxAgeSeconds) ? requestedMaxAgeSeconds : 1),
    ),
  );

  const token = await createSignedSession(
    {
      sub: lineUserId,
      purpose: "liff",
      role: "liff",
      expiresInSeconds: maxAge,
    },
    secret,
  );
  const cookieStore = await cookies();
  cookieStore.set(LIFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}
