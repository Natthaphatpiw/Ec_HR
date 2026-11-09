import "server-only";

import { createHash } from "node:crypto";

function redisTimeoutMs(): number {
  const configured = Number(process.env.SESSION_REDIS_TIMEOUT_MS);
  return Number.isSafeInteger(configured) && configured > 0 ? Math.max(500, Math.min(5_000, configured)) : 2_000;
}

export class SessionStoreUnavailableError extends Error {
  constructor() {
    super("login_session_store_unavailable");
    this.name = "SessionStoreUnavailableError";
  }
}

type RedisConfig = { kind: "rest"; url: string; token: string } | { kind: "tcp"; url: string };

/** A partial configuration is an error, never an opt-out of session storage. */
export function redisSessionConfigured(): boolean {
  return ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN", "REDIS_URL"]
    .some((name) => Boolean(process.env[name]?.trim()));
}

function redisConfig(): RedisConfig {
  for (const [urlName, tokenName] of [["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"], ["KV_REST_API_URL", "KV_REST_API_TOKEN"]]) {
    const rawUrl = process.env[urlName]?.trim();
    const token = process.env[tokenName]?.trim();
    if (!rawUrl && !token) continue;
    if (!rawUrl || !token) throw new SessionStoreUnavailableError();
    try {
      const url = new URL(rawUrl);
      const localHttp = process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) throw new Error();
      return { kind: "rest", url: url.origin, token };
    } catch { throw new SessionStoreUnavailableError(); }
  }
  try {
    const url = new URL(process.env.REDIS_URL?.trim() || "");
    if (!["redis:", "rediss:"].includes(url.protocol) || !url.hostname) throw new Error();
    return { kind: "tcp", url: url.toString() };
  } catch { throw new SessionStoreUnavailableError(); }
}

/** Isolate stores shared by several projects, environments or LINE channels. */
export function sessionRedisNamespace(): string {
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "local-app";
  let appOrigin = rawAppUrl;
  try { appOrigin = new URL(rawAppUrl).origin; } catch { /* Namespace invalid configuration separately. */ }
  const boundary = [process.env.VERCEL_PROJECT_ID || "local-project", appOrigin, process.env.LINE_LOGIN_CHANNEL_ID?.trim() || "no-channel", process.env.VERCEL_ENV || process.env.NODE_ENV || "development"];
  const prefix = process.env.SESSION_REDIS_NAMESPACE?.trim().replace(/[^A-Za-z0-9:_-]/g, "-").slice(0, 64) || "ec-aihr:login:v1";
  return `${prefix}:${createHash("sha256").update(JSON.stringify(boundary)).digest("hex").slice(0, 24)}`;
}

interface TcpClient {
  readonly isOpen: boolean;
  readonly isReady: boolean;
  connect(): Promise<unknown>;
  sendCommand(args: string[]): Promise<unknown>;
  destroy(): void;
}
let tcpClient: TcpClient | undefined;
let tcpUrl: string | undefined;
let tcpConnection: Promise<TcpClient> | undefined;
let tcpGeneration = 0;

function discardTcpClient(client?: TcpClient) {
  if (client?.isOpen) {
    try { client.destroy(); } catch { /* A concurrent timeout may already have closed it. */ }
  }
  if (!client || tcpClient === client) {
    tcpGeneration++;
    tcpClient = undefined;
    tcpConnection = undefined;
    tcpUrl = undefined;
  }
}

async function connectedTcpClient(url: string): Promise<TcpClient> {
  if (tcpClient && tcpUrl === url && tcpClient.isReady) return tcpClient;
  if (tcpConnection && tcpUrl === url) return tcpConnection;
  discardTcpClient(tcpClient);
  const generation = tcpGeneration;
  tcpUrl = url;
  const pending = (async () => {
    const { createClient } = await import("redis");
    if (generation !== tcpGeneration) throw new SessionStoreUnavailableError();
    const client = createClient({ url, disableOfflineQueue: true, socket: { connectTimeout: redisTimeoutMs(), reconnectStrategy: false } });
    // Redis errors can contain connection information. Expose only a generic
    // store failure at this module's public boundary.
    client.on("error", () => {});
    tcpClient = client;
    await client.connect();
    if (generation !== tcpGeneration) {
      try { client.destroy(); } catch { /* The timeout already closed this client. */ }
      throw new SessionStoreUnavailableError();
    }
    return client;
  })();
  tcpConnection = pending;
  try { return await pending; }
  catch {
    if (tcpConnection === pending) discardTcpClient(tcpClient);
    throw new SessionStoreUnavailableError();
  } finally {
    // Only a connection currently being established is shared. Keeping a
    // resolved promise would reuse a dead client forever after a disconnect.
    if (tcpConnection === pending) tcpConnection = undefined;
  }
}

/** Server-only Redis command. Arguments and provider error bodies are not logged. */
export async function sessionRedisCommand(args: string[]): Promise<unknown> {
  if (!args.length || args.some((arg) => typeof arg !== "string")) throw new SessionStoreUnavailableError();
  const config = redisConfig();
  try {
    if (config.kind === "rest") {
      const response = await fetch(config.url, {
        method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(args), cache: "no-store", signal: AbortSignal.timeout(redisTimeoutMs()),
      });
      if (!response.ok) throw new SessionStoreUnavailableError();
      const text = await response.text();
      if (text.length > 131_072) throw new SessionStoreUnavailableError();
      const body = JSON.parse(text) as { result?: unknown; error?: unknown };
      if (!body || typeof body !== "object" || body.error || !("result" in body)) throw new SessionStoreUnavailableError();
      return body.result;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => (await connectedTcpClient(config.url)).sendCommand(args))(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => { discardTcpClient(tcpClient); reject(new SessionStoreUnavailableError()); }, redisTimeoutMs());
        }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
  } catch { throw new SessionStoreUnavailableError(); }
}
