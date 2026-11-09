import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { sessionRedisCommand, sessionRedisNamespace, SessionStoreUnavailableError } from "@/lib/session-redis";

export interface LoginProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

export interface StoredLiffSession {
  v: 1;
  profile: LoginProfile;
  demoMode: boolean;
  createdAt: number;
  absoluteExpiresAt: number;
  lastActivityAt: number;
  idleTtlSeconds: number;
}

function boundedSeconds(raw: string | undefined, fallback: number, maximum: number): number {
  const value = Number(raw);
  return raw?.trim() && Number.isSafeInteger(value) && value >= 60 ? Math.min(value, maximum) : Math.min(fallback, maximum);
}

export function getLiffLoginPolicy() {
  const maxAgeSeconds = boundedSeconds(process.env.LIFF_LOGIN_MAX_AGE_SECONDS, 7 * 24 * 60 * 60, 30 * 24 * 60 * 60);
  const idleTtlSeconds = boundedSeconds(process.env.LIFF_LOGIN_IDLE_TTL_SECONDS, 24 * 60 * 60, maxAgeSeconds);
  return { maxAgeSeconds, idleTtlSeconds };
}

export function normalizeLoginProfile(profile: LoginProfile): LoginProfile {
  if (!/^U[0-9a-f]{32}$/i.test(profile.userId)) throw new Error("invalid_login_profile");
  const displayName = typeof profile.displayName === "string" ? profile.displayName.trim().slice(0, 200) || "LINE User" : "LINE User";
  let pictureUrl: string | undefined;
  if (typeof profile.pictureUrl === "string" && profile.pictureUrl.length <= 2_048) {
    try { const url = new URL(profile.pictureUrl); if (url.protocol === "https:" && !url.username && !url.password) pictureUrl = url.toString(); } catch { /* Profile images are optional. */ }
  }
  return { userId: profile.userId, displayName, ...(pictureUrl ? { pictureUrl } : {}) };
}

function sessionKey(sid: string): string {
  return `${sessionRedisNamespace()}:session:${createHash("sha256").update(sid).digest("hex")}`;
}

export async function createStoredLiffSession(profile: LoginProfile, options: { demoMode?: boolean; maxAgeSeconds?: number } = {}) {
  const policy = getLiffLoginPolicy();
  const now = Math.floor(Date.now() / 1000);
  const requested = options.maxAgeSeconds;
  const lifetime = typeof requested === "number" && Number.isFinite(requested) ? Math.max(1, Math.min(policy.maxAgeSeconds, Math.floor(requested))) : policy.maxAgeSeconds;
  const record: StoredLiffSession = {
    v: 1, profile: normalizeLoginProfile(profile), demoMode: options.demoMode === true,
    createdAt: now, absoluteExpiresAt: now + lifetime, lastActivityAt: now,
    idleTtlSeconds: Math.min(policy.idleTtlSeconds, lifetime),
  };
  const sid = randomBytes(32).toString("hex");
  const result = await sessionRedisCommand(["SET", sessionKey(sid), JSON.stringify(record), "EX", String(record.idleTtlSeconds), "NX"]);
  if (result !== "OK") throw new SessionStoreUnavailableError();
  return { sid, record };
}

// EC_AIHR_LIFF_READ_TOUCH: one atomic read, expiry check and bounded idle renewal.
// Active traffic only rewrites once per five minutes; a touch never moves the
// absolute deadline. Redis automatically removes idle records.
const READ_TOUCH_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local ok, s = pcall(cjson.decode, raw)
if not ok or type(s) ~= 'table' or s.v ~= 1 or type(s.createdAt) ~= 'number' or type(s.absoluteExpiresAt) ~= 'number' or type(s.lastActivityAt) ~= 'number' or type(s.idleTtlSeconds) ~= 'number' then
  redis.call('DEL', KEYS[1]); return false
end
if s.createdAt <= 0 or s.absoluteExpiresAt <= s.createdAt or s.lastActivityAt < s.createdAt or s.idleTtlSeconds <= 0 or s.createdAt % 1 ~= 0 or s.absoluteExpiresAt % 1 ~= 0 or s.lastActivityAt % 1 ~= 0 or s.idleTtlSeconds % 1 ~= 0 then
  redis.call('DEL', KEYS[1]); return false
end
local now = tonumber(ARGV[1])
local absolute = math.min(s.absoluteExpiresAt, s.createdAt + tonumber(ARGV[3]))
local idle = math.min(s.idleTtlSeconds, tonumber(ARGV[4]))
if s.createdAt > now + 60 or s.lastActivityAt > now + 60 or idle <= 0 or now >= absolute or now >= s.lastActivityAt + idle then
  redis.call('DEL', KEYS[1]); return false
end
local touchEvery = math.min(tonumber(ARGV[2]), math.max(1, math.floor(idle / 4)))
if now - s.lastActivityAt >= touchEvery or absolute ~= s.absoluteExpiresAt or idle ~= s.idleTtlSeconds then
  s.lastActivityAt = now
  s.absoluteExpiresAt = absolute
  s.idleTtlSeconds = idle
  raw = cjson.encode(s)
  redis.call('SET', KEYS[1], raw, 'EX', math.max(1, math.floor(math.min(idle, absolute - now))))
end
return raw
`;

function validRecord(value: unknown): value is StoredLiffSession {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredLiffSession>;
  const profile = record.profile;
  return record.v === 1 && typeof record.demoMode === "boolean" && Boolean(profile) &&
    typeof profile?.userId === "string" && /^U[0-9a-f]{32}$/i.test(profile.userId) &&
    typeof profile.displayName === "string" && profile.displayName.length > 0 && profile.displayName.length <= 200 &&
    [record.createdAt, record.absoluteExpiresAt, record.lastActivityAt, record.idleTtlSeconds].every((n) => typeof n === "number" && Number.isSafeInteger(n) && n > 0) &&
    record.absoluteExpiresAt! > record.createdAt! && record.lastActivityAt! >= record.createdAt!;
}

export async function readStoredLiffSession(sid: string): Promise<StoredLiffSession | null> {
  if (!/^[a-f0-9]{64}$/.test(sid)) return null;
  const policy = getLiffLoginPolicy();
  const now = Math.floor(Date.now() / 1000);
  const raw = await sessionRedisCommand(["EVAL", READ_TOUCH_SCRIPT, "1", sessionKey(sid), String(now), "300", String(policy.maxAgeSeconds), String(policy.idleTtlSeconds)]);
  if (raw === null || raw === false || raw === undefined) return null;
  try {
    const record: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!validRecord(record) || record.absoluteExpiresAt <= now || record.lastActivityAt + record.idleTtlSeconds <= now) return null;
    return { ...record, profile: normalizeLoginProfile(record.profile) };
  } catch { return null; }
}

export async function deleteStoredLiffSession(sid: string): Promise<void> {
  if (/^[a-f0-9]{64}$/.test(sid)) await sessionRedisCommand(["DEL", sessionKey(sid)]);
}
