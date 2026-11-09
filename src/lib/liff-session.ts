import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createSignedSession, verifySignedSession } from "@/lib/signed-session";
import { redisSessionConfigured, SessionStoreUnavailableError } from "@/lib/session-redis";
import { createStoredLiffSession, deleteStoredLiffSession, normalizeLoginProfile, readStoredLiffSession, type LoginProfile } from "@/lib/liff-session-store";

export const LIFF_SESSION_COOKIE = "liff_user_id";
// Stateless compatibility sessions keep the existing conservative lifetime.
export const LIFF_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const EXPLICIT_DEMO_SIGNING_KEY = "ec-aihr-explicit-demo-session-signing-key";

export interface LiffSessionView {
  profile: LoginProfile;
  demoMode: boolean;
  expiresAt: number;
  idleExpiresAt?: number;
  storage: "redis" | "cookie";
}

export function isExplicitDemoMode(): boolean { return process.env.DEMO_MODE === "true"; }

function getLiffSessionSecret(): string | undefined {
  const configured = process.env.LIFF_SESSION_SECRET;
  if (configured && configured.trim().length >= 32) return configured;
  return isExplicitDemoMode() ? EXPLICIT_DEMO_SIGNING_KEY : undefined;
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

async function readSessionUncached(): Promise<LiffSessionView | null> {
  const secret = getLiffSessionSecret();
  if (!secret) return null;
  const token = (await cookies()).get(LIFF_SESSION_COOKIE)?.value;
  const session = await verifySignedSession(token, secret, "liff");
  if (!session || session.role !== "liff") return null;
  if (session.sub.startsWith("r1:")) {
    // Opaque sessions cannot become stateless when Redis is disconnected.
    if (!redisSessionConfigured()) throw new SessionStoreUnavailableError();
    const record = await readStoredLiffSession(session.sub.slice(3));
    if (!record || (record.demoMode && !isExplicitDemoMode())) return null;
    return { profile: record.profile, demoMode: record.demoMode,
      expiresAt: Math.min(session.exp, record.absoluteExpiresAt), idleExpiresAt: Math.min(record.absoluteExpiresAt, record.lastActivityAt + record.idleTtlSeconds), storage: "redis" };
  }
  const demoMode = session.sub.startsWith("d1:");
  if (demoMode && !isExplicitDemoMode()) return null;
  const userId = demoMode ? session.sub.slice(3) : session.sub;
  if (!/^U[0-9a-f]{32}$/i.test(userId)) return null;
  // Legacy cookies have no stored profile. Authorization still loads the
  // current employee and organization from the database on every request.
  return { profile: { userId, displayName: "LINE User" }, demoMode, expiresAt: session.exp, storage: "cookie" };
}

/** Deduplicate reads within one server render, never across users or requests. */
export const readLiffSession = cache(readSessionUncached);

export async function getLiffUserIdFromCookie(): Promise<string | undefined> {
  try { return (await readLiffSession())?.profile.userId; }
  catch (error) {
    if (error instanceof SessionStoreUnavailableError) {
      console.error("[LIFF session] Login session storage is unavailable.");
      return undefined;
    }
    throw error;
  }
}

export async function createLiffSession(profile: LoginProfile, options: { demoMode?: boolean; maxAgeSeconds?: number } = {}): Promise<LiffSessionView> {
  const secret = getLiffSessionSecret();
  if (!secret) throw new Error("LIFF_SESSION_SECRET is not configured");
  if (options.demoMode && !isExplicitDemoMode()) throw new Error("line_verification_required");
  const normalized = normalizeLoginProfile(profile);
  const cookieStore = await cookies();
  if (redisSessionConfigured()) {
    const previous = await verifySignedSession(cookieStore.get(LIFF_SESSION_COOKIE)?.value, secret, "liff");
    const { sid, record } = await createStoredLiffSession(normalized, options);
    const maxAge = Math.max(1, record.absoluteExpiresAt - Math.floor(Date.now() / 1000));
    const token = await createSignedSession({ sub: `r1:${sid}`, purpose: "liff", role: "liff", expiresInSeconds: maxAge }, secret);
    cookieStore.set(LIFF_SESSION_COOKIE, token, cookieOptions(maxAge));
    // Persist the replacement first. A failed rotation must never delete the
    // browser's existing session before its new cookie can be issued.
    if (previous?.sub.startsWith("r1:") && previous.sub !== `r1:${sid}`) {
      try { await deleteStoredLiffSession(previous.sub.slice(3)); }
      catch { console.error("[LIFF session] Previous login session could not be revoked."); }
    }
    return { profile: normalized, demoMode: record.demoMode,
      expiresAt: record.absoluteExpiresAt, idleExpiresAt: Math.min(record.absoluteExpiresAt, record.lastActivityAt + record.idleTtlSeconds), storage: "redis" };
  }
  const requested = options.maxAgeSeconds ?? LIFF_SESSION_MAX_AGE_SECONDS;
  const maxAge = Math.max(1, Math.min(LIFF_SESSION_MAX_AGE_SECONDS, Math.floor(Number.isFinite(requested) ? requested : 1)));
  const token = await createSignedSession({ sub: options.demoMode ? `d1:${normalized.userId}` : normalized.userId, purpose: "liff", role: "liff", expiresInSeconds: maxAge }, secret);
  cookieStore.set(LIFF_SESSION_COOKIE, token, cookieOptions(maxAge));
  return { profile: normalized, demoMode: options.demoMode === true, expiresAt: Math.floor(Date.now() / 1000) + maxAge, storage: "cookie" };
}

/** Existing callers can continue creating an eight-hour signed session. */
export async function setLiffSession(lineUserId: string, requestedMaxAgeSeconds = LIFF_SESSION_MAX_AGE_SECONDS): Promise<void> {
  await createLiffSession({ userId: lineUserId, displayName: "LINE User" }, { maxAgeSeconds: requestedMaxAgeSeconds });
}

export async function deleteLiffSession(): Promise<void> {
  const cookieStore = await cookies();
  const secret = getLiffSessionSecret();
  try {
    const session = secret ? await verifySignedSession(cookieStore.get(LIFF_SESSION_COOKIE)?.value, secret, "liff") : null;
    if (session?.sub.startsWith("r1:")) await deleteStoredLiffSession(session.sub.slice(3));
  } finally {
    cookieStore.set(LIFF_SESSION_COOKIE, "", cookieOptions(0));
  }
}
