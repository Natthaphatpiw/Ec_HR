// Local integration checks: actual Redis transport, Lua and signed cookies.
// Requires local Redis on 6397 and a compatible local REST endpoint on 6398.
// Override with LOGIN_TEST_REDIS_URL / LOGIN_TEST_REDIS_REST_URL. Remote hosts,
// application .env files, real credentials, LINE and Supabase are never used.
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requirePackage = createRequire(resolve(root, "package.json"));
const realRedis = requirePackage("redis");
const tcpUrl = process.env.LOGIN_TEST_REDIS_URL || "redis://127.0.0.1:6397";
const restUrl = process.env.LOGIN_TEST_REDIS_REST_URL || "http://127.0.0.1:6398";
for (const [value, protocols] of [[tcpUrl, ["redis:", "rediss:"]], [restUrl, ["http:", "https:"]]]) {
  const url = new URL(value);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && protocols.includes(url.protocol), "Tests accept localhost Redis endpoints only");
}
const runId = `login-test-${randomBytes(8).toString("hex")}`;
const profile = { userId: `U${"a".repeat(32)}`, displayName: "Synthetic LINE User", pictureUrl: "https://example.invalid/avatar.png" };
const secret = randomBytes(32).toString("hex");
const clients = new Set();
const bundles = [];

function bundle(envOverrides = {}) {
  let now = Date.now();
  let failTransport = false;
  let failCookieWrite = false;
  class FakeDate extends Date { static now() { return now; } }
  const env = { NODE_ENV: "test", DEMO_MODE: "false", NEXT_PUBLIC_APP_URL: "https://synthetic-app.invalid", LINE_LOGIN_CHANNEL_ID: "1000000000", LIFF_SESSION_SECRET: secret,
    LIFF_LOGIN_MAX_AGE_SECONDS: "3600", LIFF_LOGIN_IDLE_TTL_SECONDS: "600", SESSION_REDIS_NAMESPACE: runId, ...envOverrides };
  const cookies = new Map(), writes = [], commands = [], logs = [], cache = new Map(), ownedClients = new Set();
  const cookieStore = {
    get: (name) => cookies.has(name) ? { name, value: cookies.get(name) } : undefined,
    set: (name, value, options) => {
      if (failCookieWrite) throw new Error("synthetic cookie failure");
      writes.push({ name, value, options });
      if (options.maxAge === 0) cookies.delete(name); else cookies.set(name, value);
    },
  };
  function capture(args) {
    commands.push([...args]);
    if (failTransport) throw new Error("synthetic provider secret must not be exposed");
  }
  const wrappedRedis = {
    createClient(options) {
      const client = realRedis.createClient(options);
      clients.add(client);
      ownedClients.add(client);
      return { get isOpen() { return client.isOpen; }, get isReady() { return client.isReady; },
        on: (...args) => client.on(...args), connect: () => client.connect(), destroy: () => client.destroy(),
        sendCommand: (args) => { capture(args); return client.sendCommand(args); } };
    },
  };
  function load(relative) {
    const path = resolve(root, relative);
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} }; cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    function requireModule(name) {
      if (name === "server-only") return {};
      if (name === "react") return { cache: (fn) => fn };
      if (name === "next/headers") return { cookies: async () => cookieStore };
      if (name === "redis") return wrappedRedis;
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
      if (name.startsWith(".")) return load(resolve(dirname(path), `${name}.ts`));
      return requirePackage(name);
    }
    const context = vm.createContext({ require: requireModule, module, exports: module.exports, process: { env }, Date: FakeDate,
      crypto: globalThis.crypto, TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, btoa, atob,
      URL, AbortSignal, setTimeout, clearTimeout,
      fetch: async (url, options) => { assert.equal(new URL(url).origin, new URL(restUrl).origin); capture(JSON.parse(options.body)); return fetch(url, options); },
      console: { error: (...args) => logs.push(args.join(" ")), warn: (...args) => logs.push(args.join(" ")) },
    });
    vm.runInContext(source, context, { filename: path });
    return module.exports;
  }
  const result = { env, cookies, writes, commands, logs, load,
    advance: (seconds) => { now += seconds * 1000; }, now: () => Math.floor(now / 1000),
    dropConnection: () => { for (const client of ownedClients) if (client.isOpen) client.destroy(); },
    failTransport: (value) => { failTransport = value; }, failCookieWrite: (value) => { failCookieWrite = value; } };
  bundles.push(result);
  return result;
}

async function checkTransport(kind) {
  const b = bundle(kind === "tcp" ? { REDIS_URL: tcpUrl, SESSION_REDIS_NAMESPACE: `${runId}:tcp` } : {
    KV_REST_API_URL: restUrl, KV_REST_API_TOKEN: process.env.LOGIN_TEST_REDIS_REST_TOKEN || "local-test-only", SESSION_REDIS_NAMESPACE: `${runId}:rest`,
  });
  const transport = b.load("src/lib/session-redis.ts"), store = b.load("src/lib/liff-session-store.ts"), session = b.load("src/lib/liff-session.ts"), signing = b.load("src/lib/signed-session.ts");
  assert.equal(transport.redisSessionConfigured(), true);
  assert.equal(await transport.sessionRedisCommand(["ECHO", "local-login-check"]), "local-login-check");
  const originalNamespace = transport.sessionRedisNamespace();
  b.env.VERCEL_ENV = "another-environment";
  assert.notEqual(transport.sessionRedisNamespace(), originalNamespace);
  delete b.env.VERCEL_ENV;
  b.env.SESSION_REDIS_NAMESPACE += "/unsafe prefix";
  assert.ok(!transport.sessionRedisNamespace().includes("/") && !transport.sessionRedisNamespace().includes(" "));
  b.env.SESSION_REDIS_NAMESPACE = `${runId}:${kind}`;
  const created = await store.createStoredLiffSession({ ...profile, role: "hr", rawToken: "DO_NOT_STORE", bankAccount: "DO_NOT_STORE" });
  const key = b.commands.findLast((args) => args[0] === "SET")[1];
  assert.ok(key.endsWith(createHash("sha256").update(created.sid).digest("hex")));
  assert.ok(!key.includes(created.sid) && !key.includes(profile.userId));
  const raw = await transport.sessionRedisCommand(["GET", key]);
  assert.ok(!raw.includes("DO_NOT_STORE") && !raw.includes('"role"') && !raw.includes('"orgId"'));
  assert.equal(created.record.absoluteExpiresAt, b.now() + 3600);
  assert.equal(created.record.idleTtlSeconds, 600);
  assert.ok(Number(await transport.sessionRedisCommand(["TTL", key])) <= 600);
  const initialRead = await store.readStoredLiffSession(created.sid);
  assert.equal(initialRead.profile.userId, profile.userId);
  b.advance(301);
  const touched = await store.readStoredLiffSession(created.sid);
  assert.equal(touched.lastActivityAt, b.now());
  assert.equal(touched.absoluteExpiresAt, created.record.absoluteExpiresAt);
  b.advance(600);
  assert.equal(await store.readStoredLiffSession(created.sid), null, "Idle expiry must be enforced by the actual Lua script");
  assert.equal(await transport.sessionRedisCommand(["GET", key]), null);
  const absolute = await store.createStoredLiffSession(profile);
  for (let i = 0; i < 11; i++) { b.advance(301); assert.ok(await store.readStoredLiffSession(absolute.sid)); }
  b.advance(301);
  assert.equal(await store.readStoredLiffSession(absolute.sid), null, "Active reads must not extend the absolute deadline");
  const isolated = await store.createStoredLiffSession(profile);
  b.env.NEXT_PUBLIC_APP_URL = "https://another-app.invalid";
  assert.equal(await store.readStoredLiffSession(isolated.sid), null);
  b.env.NEXT_PUBLIC_APP_URL = "https://synthetic-app.invalid";
  assert.ok(await store.readStoredLiffSession(isolated.sid));
  await store.deleteStoredLiffSession(isolated.sid);
  assert.equal(await store.readStoredLiffSession(isolated.sid), null);
  const malformed = await store.createStoredLiffSession(profile);
  const malformedKey = b.commands.findLast((args) => args[0] === "SET")[1];
  await transport.sessionRedisCommand(["SET", malformedKey, "not-json", "EX", "60"]);
  assert.equal(await store.readStoredLiffSession(malformed.sid), null);
  assert.equal(await transport.sessionRedisCommand(["GET", malformedKey]), null);
  const corrupt = await store.createStoredLiffSession(profile);
  const corruptKey = b.commands.findLast((args) => args[0] === "SET")[1];
  await transport.sessionRedisCommand(["SET", corruptKey, JSON.stringify({ ...corrupt.record, createdAt: "invalid" }), "EX", "60"]);
  assert.equal(await store.readStoredLiffSession(corrupt.sid), null);
  assert.equal(await transport.sessionRedisCommand(["GET", corruptKey]), null);
  const shortened = await store.createStoredLiffSession(profile);
  b.env.LIFF_LOGIN_MAX_AGE_SECONDS = "120";
  b.advance(121);
  assert.equal(await store.readStoredLiffSession(shortened.sid), null, "A shorter current policy must apply to existing sessions");
  b.env.LIFF_LOGIN_MAX_AGE_SECONDS = "3600";
  if (kind === "tcp") {
    b.dropConnection();
    assert.equal(await transport.sessionRedisCommand(["ECHO", "reconnected"]), "reconnected", "A dead connection must not poison later requests");
  }

  b.cookies.set(session.LIFF_SESSION_COOKIE, await signing.createSignedSession({ sub: profile.userId, purpose: "liff", role: "liff", expiresInSeconds: 60 }, secret));
  assert.equal((await session.readLiffSession()).storage, "cookie", "Valid legacy cookies remain valid when Redis is connected");

  const first = await session.createLiffSession(profile);
  assert.equal(first.storage, "redis");
  assert.equal(first.expiresAt, b.now() + 3600);
  const oldCookie = b.cookies.get(session.LIFF_SESSION_COOKIE);
  const oldClaims = await signing.verifySignedSession(oldCookie, secret, "liff");
  assert.match(oldClaims.sub, /^r1:[a-f0-9]{64}$/);
  assert.equal(b.writes.at(-1).options.httpOnly, true);
  assert.equal(b.writes.at(-1).options.sameSite, "lax");
  assert.equal((await session.readLiffSession()).profile.userId, profile.userId);
  b.failCookieWrite(true);
  await assert.rejects(session.createLiffSession(profile));
  b.failCookieWrite(false);
  assert.ok(await store.readStoredLiffSession(oldClaims.sub.slice(3)), "Failed cookie issuance must not revoke the old login");
  await session.createLiffSession(profile);
  assert.equal(await store.readStoredLiffSession(oldClaims.sub.slice(3)), null, "Successful rotation revokes the previous session");
  const validCookie = b.cookies.get(session.LIFF_SESSION_COOKIE);
  b.cookies.set(session.LIFF_SESSION_COOKIE, `x${validCookie.slice(1)}`);
  assert.equal(await session.readLiffSession(), null);
  b.cookies.set(session.LIFF_SESSION_COOKIE, validCookie);
  const savedEnv = { ...b.env };
  delete b.env.REDIS_URL; delete b.env.KV_REST_API_URL; delete b.env.KV_REST_API_TOKEN;
  await assert.rejects(session.readLiffSession(), transport.SessionStoreUnavailableError, "Opaque Redis sessions must not downgrade when configuration is removed");
  Object.assign(b.env, savedEnv);
  b.failTransport(true);
  await assert.rejects(session.readLiffSession(), transport.SessionStoreUnavailableError);
  assert.equal(await session.getLiffUserIdFromCookie(), undefined);
  await assert.rejects(session.deleteLiffSession(), transport.SessionStoreUnavailableError);
  assert.equal(b.cookies.has(session.LIFF_SESSION_COOKIE), false, "A Redis outage must not prevent clearing the browser cookie");
  assert.ok(b.logs.every((line) => !line.includes(profile.userId) && !line.includes("DO_NOT_STORE") && !line.includes("synthetic provider secret")));
  b.failTransport(false);
  await session.createLiffSession(profile);
  const logoutClaims = await signing.verifySignedSession(b.cookies.get(session.LIFF_SESSION_COOKIE), secret, "liff");
  await session.deleteLiffSession();
  assert.equal(await session.readLiffSession(), null);
  assert.equal(await store.readStoredLiffSession(logoutClaims.sub.slice(3)), null);
}

try {
  await checkTransport("tcp");
  await checkTransport("rest");
  const legacy = bundle();
  const transport = legacy.load("src/lib/session-redis.ts"), session = legacy.load("src/lib/liff-session.ts"), signing = legacy.load("src/lib/signed-session.ts");
  assert.equal(transport.redisSessionConfigured(), false);
  assert.equal((await session.createLiffSession(profile)).storage, "cookie");
  assert.equal(legacy.writes.at(-1).options.maxAge, 28800);
  assert.equal((await session.readLiffSession()).profile.userId, profile.userId);
  legacy.advance(28800);
  assert.equal(await session.readLiffSession(), null);
  legacy.env.DEMO_MODE = "true";
  await session.createLiffSession(profile, { demoMode: true });
  assert.equal((await session.readLiffSession()).demoMode, true);
  legacy.env.DEMO_MODE = "false";
  assert.equal(await session.readLiffSession(), null, "Demo sessions must stop working outside explicit demo mode");
  legacy.cookies.set(session.LIFF_SESSION_COOKIE, await signing.createSignedSession({ sub: profile.userId, purpose: "dashboard", role: "owner", expiresInSeconds: 60 }, secret));
  assert.equal(await session.readLiffSession(), null);
  const partial = bundle({ UPSTASH_REDIS_REST_URL: restUrl });
  const partialTransport = partial.load("src/lib/session-redis.ts");
  assert.equal(partialTransport.redisSessionConfigured(), true);
  await assert.rejects(partialTransport.sessionRedisCommand(["PING"]), partialTransport.SessionStoreUnavailableError);
  console.log("Redis login integration checks passed: REST/TCP, real Lua expiry/touch, namespace isolation, opaque signed cookies, rotation, logout, legacy compatibility and fail-closed outages.");
} finally {
  // Delete this run's explicitly captured keys only; never flush a database.
  for (const b of bundles) {
    b.failTransport(false);
    const keys = [...new Set(b.commands.filter((args) => args[0] === "SET").map((args) => args[1]))];
    if (keys.length) {
      try { await b.load("src/lib/session-redis.ts").sessionRedisCommand(["DEL", ...keys]); } catch { /* Test-only keys also have short TTLs. */ }
    }
  }
  for (const client of clients) { if (client.isOpen) { try { client.destroy(); } catch { /* Already closed by a timeout. */ } } }
}
