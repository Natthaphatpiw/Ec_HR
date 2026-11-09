import "server-only";
import { createHash } from "node:crypto";
import { redisSessionConfigured, sessionRedisCommand, sessionRedisNamespace } from "@/lib/session-redis";
export interface VerifiedLineIdentity {
  profile: { userId: string; displayName: string; pictureUrl?: string };
  expiresAt: number;
}
function validIdentity(value: unknown): value is VerifiedLineIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as VerifiedLineIdentity;
  return Boolean(identity.profile && typeof identity.profile.userId === "string" && /^U[0-9a-f]{32}$/i.test(identity.profile.userId) &&
    typeof identity.profile.displayName === "string" && identity.profile.displayName.length <= 512 &&
    (identity.profile.pictureUrl === undefined || (typeof identity.profile.pictureUrl === "string" && identity.profile.pictureUrl.length <= 2048)) &&
    Number.isInteger(identity.expiresAt) && identity.expiresAt > Math.floor(Date.now() / 1000));
}
/** Cache successful verification, never raw LINE credentials or app permissions. */
export async function verifyLineIdToken(idToken: string, channelId: string, nonce?: string): Promise<VerifiedLineIdentity | null> {
  const cacheKey = `${sessionRedisNamespace()}:line-token:${createHash("sha256").update(JSON.stringify([channelId, nonce ?? "", idToken])).digest("hex")}`;
  const useRedis = redisSessionConfigured();
  if (useRedis) {
    const cached = await sessionRedisCommand(["GET", cacheKey]);
    if (typeof cached === "string") {
      try { const identity: unknown = JSON.parse(cached); if (validIdentity(identity)) return identity; }
      catch { /* Invalid cached data never authenticates a request. */ }
    }
  }
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId, ...(nonce ? { nonce } : {}) }),
    cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) throw new Error("line_verification_unavailable");
    return null;
  }
  const payload = await response.json();
  const now = Math.floor(Date.now() / 1000);
  if (!payload || payload.iss !== "https://access.line.me" || payload.aud !== channelId ||
    (nonce !== undefined && payload.nonce !== nonce) || typeof payload.sub !== "string" ||
    !/^U[0-9a-f]{32}$/i.test(payload.sub) || !Number.isInteger(payload.exp) || payload.exp <= now) return null;
  const identity: VerifiedLineIdentity = {
    profile: { userId: payload.sub, displayName: typeof payload.name === "string" ? payload.name.slice(0, 512) : "LINE User",
      ...(typeof payload.picture === "string" && payload.picture.length <= 2048 ? { pictureUrl: payload.picture } : {}) },
    expiresAt: payload.exp,
  };
  if (useRedis) await sessionRedisCommand(["SET", cacheKey, JSON.stringify(identity), "EX", String(Math.min(300, payload.exp - now))]);
  return identity;
}
