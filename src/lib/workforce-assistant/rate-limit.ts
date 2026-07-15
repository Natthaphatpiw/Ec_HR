import "server-only";

import { createHash } from "crypto";
import { hasSupabaseConfig, supabaseAdmin } from "@/lib/supabase/admin";

interface RateBucket {
  timestamps: number[];
}

interface RatePolicy {
  windowMs: number;
  clientLimit: number;
  organizationLimit: number;
  organizationDailyLimit: number;
}

export interface WorkforceAssistantRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAtSeconds: number;
}

export interface WorkforceAssistantConcurrencyResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  release: () => void;
}

const globalRateLimit = globalThis as typeof globalThis & {
  __workforceAssistantRateBuckets?: Map<string, RateBucket>;
  __workforceAssistantRateChecks?: number;
  __workforceAssistantInFlight?: Map<string, number>;
};

const buckets =
  globalRateLimit.__workforceAssistantRateBuckets ?? new Map<string, RateBucket>();
globalRateLimit.__workforceAssistantRateBuckets = buckets;
const inFlight = globalRateLimit.__workforceAssistantInFlight ?? new Map<string, number>();
globalRateLimit.__workforceAssistantInFlight = inFlight;

function integerEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function policy(): RatePolicy {
  return {
    windowMs:
      integerEnv("WORKFORCE_ASSISTANT_RATE_LIMIT_WINDOW_SECONDS", 60, 10, 3600) * 1000,
    clientLimit: integerEnv("WORKFORCE_ASSISTANT_RATE_LIMIT_REQUESTS", 12, 1, 1000),
    organizationLimit: integerEnv(
      "WORKFORCE_ASSISTANT_RATE_LIMIT_ORG_REQUESTS",
      60,
      1,
      5000,
    ),
    organizationDailyLimit: integerEnv(
      "WORKFORCE_ASSISTANT_DAILY_ORG_REQUESTS",
      300,
      1,
      100000,
    ),
  };
}

function envEnabled(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export class WorkforceAssistantRateLimitUnavailableError extends Error {
  constructor() {
    super("Shared workforce assistant rate limit is unavailable");
    this.name = "WorkforceAssistantRateLimitUnavailableError";
  }
}

interface SharedQuotaRow {
  allowed: boolean;
  remaining: number;
  reset_at_seconds: number | string;
}

async function consumeSharedQuota(input: {
  scopeKey: string;
  limit: number;
  windowSeconds: number;
}): Promise<WorkforceAssistantRateLimitResult> {
  const { data, error } = await supabaseAdmin().rpc("consume_workforce_assistant_quota", {
    p_scope_key: input.scopeKey,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as SharedQuotaRow | null;
  if (!row || typeof row.allowed !== "boolean") throw new Error("Invalid shared quota response");
  const resetAtSeconds = Number(row.reset_at_seconds);
  const nowSeconds = Math.ceil(Date.now() / 1000);
  return {
    allowed: row.allowed,
    limit: input.limit,
    remaining: Math.max(0, Number(row.remaining) || 0),
    retryAfterSeconds: row.allowed ? 0 : Math.max(1, resetAtSeconds - nowSeconds),
    resetAtSeconds,
  };
}

async function checkSharedRateLimit(input: {
  organizationId: string;
  clientKey: string;
  currentPolicy: RatePolicy;
}): Promise<WorkforceAssistantRateLimitResult> {
  const windowSeconds = Math.floor(input.currentPolicy.windowMs / 1000);
  const clientDigest = createHash("sha256").update(input.clientKey).digest("hex").slice(0, 24);
  const quotas = [
    {
      scopeKey: `workforce:org:${input.organizationId}:daily`,
      limit: input.currentPolicy.organizationDailyLimit,
      windowSeconds: 24 * 60 * 60,
    },
    {
      scopeKey: `workforce:org:${input.organizationId}:window`,
      limit: input.currentPolicy.organizationLimit,
      windowSeconds,
    },
    {
      scopeKey: `workforce:client:${input.organizationId}:${clientDigest}`,
      limit: input.currentPolicy.clientLimit,
      windowSeconds,
    },
  ];

  const results: WorkforceAssistantRateLimitResult[] = [];
  for (const quota of quotas) {
    const result = await consumeSharedQuota(quota);
    results.push(result);
    if (!result.allowed) return result;
  }
  const client = results.at(-1)!;
  return {
    ...client,
    remaining: Math.min(...results.map((result) => result.remaining)),
    resetAtSeconds: Math.min(...results.map((result) => result.resetAtSeconds)),
  };
}

function activeTimestamps(key: string, cutoff: number): number[] {
  const active = (buckets.get(key)?.timestamps ?? []).filter((timestamp) => timestamp > cutoff);
  if (active.length > 0) buckets.set(key, { timestamps: active });
  else buckets.delete(key);
  return active;
}

function pruneOccasionally(cutoff: number): void {
  const checks = (globalRateLimit.__workforceAssistantRateChecks ?? 0) + 1;
  globalRateLimit.__workforceAssistantRateChecks = checks;
  if (checks % 100 !== 0 && buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (!bucket.timestamps.some((timestamp) => timestamp > cutoff)) buckets.delete(key);
  }
}

/**
 * Applies both a per-client allowance and an organization-wide ceiling. The
 * organization ceiling prevents a forged forwarding header from bypassing the
 * cost guard, while the client allowance keeps a shared demo login usable.
 */
export async function checkWorkforceAssistantRateLimit(input: {
  organizationId: string;
  clientKey: string;
  now?: number;
}): Promise<WorkforceAssistantRateLimitResult> {
  const currentPolicy = policy();

  if (envEnabled("WORKFORCE_ASSISTANT_SHARED_RATE_LIMIT")) {
    try {
      if (!hasSupabaseConfig()) throw new Error("Supabase is not configured");
      return await checkSharedRateLimit({ ...input, currentPolicy });
    } catch (error) {
      console.error(
        "[workforce-assistant] shared rate limit unavailable",
        error instanceof Error ? error.message : "unknown error",
      );
      if (envEnabled("WORKFORCE_ASSISTANT_SHARED_RATE_LIMIT_REQUIRED")) {
        throw new WorkforceAssistantRateLimitUnavailableError();
      }
    }
  }

  // This fallback is suitable for local development. Internet-facing,
  // multi-instance deployments should require the shared Supabase quota.
  const now = input.now ?? Date.now();
  const cutoff = now - currentPolicy.windowMs;
  pruneOccasionally(cutoff);

  const clientBucketKey = `client:${input.organizationId}:${input.clientKey}`;
  const organizationBucketKey = `organization:${input.organizationId}`;
  const clientTimestamps = activeTimestamps(clientBucketKey, cutoff);
  const organizationTimestamps = activeTimestamps(organizationBucketKey, cutoff);
  const clientBlocked = clientTimestamps.length >= currentPolicy.clientLimit;
  const organizationBlocked =
    organizationTimestamps.length >= currentPolicy.organizationLimit;

  if (clientBlocked || organizationBlocked) {
    const nextClient = clientBlocked ? clientTimestamps[0] + currentPolicy.windowMs : now;
    const nextOrganization = organizationBlocked
      ? organizationTimestamps[0] + currentPolicy.windowMs
      : now;
    const retryAt = Math.max(nextClient, nextOrganization);
    return {
      allowed: false,
      limit: currentPolicy.clientLimit,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((retryAt - now) / 1000)),
      resetAtSeconds: Math.ceil(retryAt / 1000),
    };
  }

  clientTimestamps.push(now);
  organizationTimestamps.push(now);
  buckets.set(clientBucketKey, { timestamps: clientTimestamps });
  buckets.set(organizationBucketKey, { timestamps: organizationTimestamps });
  const remaining = Math.min(
    currentPolicy.clientLimit - clientTimestamps.length,
    currentPolicy.organizationLimit - organizationTimestamps.length,
  );
  return {
    allowed: true,
    limit: currentPolicy.clientLimit,
    remaining: Math.max(0, remaining),
    retryAfterSeconds: 0,
    resetAtSeconds: Math.ceil((clientTimestamps[0] + currentPolicy.windowMs) / 1000),
  };
}

export function workforceAssistantClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
  return candidate.replace(/[^0-9a-f:._-]/gi, "").slice(0, 80) || "unknown";
}

/**
 * Bounds simultaneous model calls in addition to the sliding-window quota.
 * Release is idempotent so both stream cancellation and finally blocks can use it.
 */
export function acquireWorkforceAssistantConcurrency(input: {
  organizationId: string;
  clientKey: string;
}): WorkforceAssistantConcurrencyResult {
  const clientLimit = integerEnv(
    "WORKFORCE_ASSISTANT_MAX_CONCURRENT_REQUESTS",
    2,
    1,
    100,
  );
  const organizationLimit = integerEnv(
    "WORKFORCE_ASSISTANT_ORG_MAX_CONCURRENT_REQUESTS",
    6,
    1,
    500,
  );
  const retryAfterSeconds = integerEnv(
    "WORKFORCE_ASSISTANT_CONCURRENCY_RETRY_AFTER_SECONDS",
    3,
    1,
    60,
  );
  const clientBucketKey = `client:${input.organizationId}:${input.clientKey}`;
  const organizationBucketKey = `organization:${input.organizationId}`;
  const clientCount = inFlight.get(clientBucketKey) ?? 0;
  const organizationCount = inFlight.get(organizationBucketKey) ?? 0;
  const noop = () => undefined;

  if (clientCount >= clientLimit || organizationCount >= organizationLimit) {
    return {
      allowed: false,
      limit: clientLimit,
      remaining: 0,
      retryAfterSeconds,
      release: noop,
    };
  }

  inFlight.set(clientBucketKey, clientCount + 1);
  inFlight.set(organizationBucketKey, organizationCount + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    for (const key of [clientBucketKey, organizationBucketKey]) {
      const next = Math.max(0, (inFlight.get(key) ?? 1) - 1);
      if (next === 0) inFlight.delete(key);
      else inFlight.set(key, next);
    }
  };

  return {
    allowed: true,
    limit: clientLimit,
    remaining: Math.max(
      0,
      Math.min(clientLimit - clientCount - 1, organizationLimit - organizationCount - 1),
    ),
    retryAfterSeconds: 0,
    release,
  };
}
