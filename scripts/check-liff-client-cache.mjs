import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

// Run the actual client wrapper against a synthetic SDK and session endpoint.
// Credentials, employee records and real network calls are never used.
const filename = fileURLToPath(new URL("../src/lib/liff-client.ts", import.meta.url));
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const USER_A = `U${"a".repeat(32)}`;
const USER_B = `U${"b".repeat(32)}`;
const LIFF_ID = "1000000000-register";
const RAW_ID_TOKEN = "synthetic-token-never-sent-to-LINE";
const totals = { scenarios: 0, sdkInitializations: 0, sessionRequests: 0 };

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

const flush = () => new Promise(setImmediate);

function abortError() {
  const error = new Error("Synthetic request aborted");
  error.name = "AbortError";
  return error;
}

async function gated(gate, signal) {
  if (signal.aborted) throw abortError();
  if (!gate) return;
  let listener;
  try {
    await Promise.race([
      gate.promise,
      new Promise((_, reject) => {
        listener = () => reject(abortError());
        signal.addEventListener("abort", listener, { once: true });
      }),
    ]);
  } finally {
    if (listener) signal.removeEventListener("abort", listener);
  }
}

function fixture(options = {}) {
  const requests = [];
  const sdkIds = [];
  const events = [];
  const state = {
    cachedUser: USER_A,
    sdkUser: USER_A,
    getStatus: 200,
    getError: "session_required",
    postStatus: 200,
    postError: "invalid_id_token",
    isInClient: true,
    loggedIn: true,
    ...options,
  };
  let logins = 0;
  let rawTokenReads = 0;
  let urlWrites = 0;
  const profile = (userId) => ({ userId, displayName: "Synthetic User" });
  const metadata = () => ({ expiresAt: Math.floor(Date.now() / 1000) + 3600, storage: "redis", demoMode: false });
  const location = {};
  for (const [field, value] of Object.entries({
    search: "?liff.state=%2Fregister%3Finvite%3Dsynthetic&code=synthetic-oauth-code",
    hash: state.hash ?? "#access_token=synthetic-access-token&id_token=synthetic-id-token",
    pathname: "/liff",
    href: "https://app.invalid/liff?liff.state=synthetic#id_token=synthetic",
  })) {
    Object.defineProperty(location, field, {
      get: () => value,
      set: () => { urlWrites++; throw new Error("Client must let the SDK process LIFF redirect URLs"); },
    });
  }
  const window = { location, atob: (value) => Buffer.from(value, "base64").toString("binary") };
  const noClientAuthStore = () => { throw new Error("Do not persist service login authority in browser storage"); };
  for (const object of [window]) {
    Object.defineProperty(object, "localStorage", { get: noClientAuthStore });
    Object.defineProperty(object, "sessionStorage", { get: noClientAuthStore });
  }
  const sdk = {
    async init({ liffId }) {
      totals.sdkInitializations++;
      sdkIds.push(liffId);
      events.push("sdk:init");
      // Observe the redirect inputs as LINE would. The wrapper must not rewrite
      // them or bypass init simply because its service cookie exists.
      assert.match(window.location.search, /liff\.state=/);
      assert.match(window.location.hash, /id_token=/);
      if (state.sdkGate) await state.sdkGate.promise;
      if (state.sdkError) throw state.sdkError;
    },
    isLoggedIn: () => state.loggedIn,
    isInClient: () => state.isInClient,
    getDecodedIDToken: () => state.sdkUser ? { sub: state.sdkUser } : null,
    getIDToken: () => { rawTokenReads++; return RAW_ID_TOKEN; },
    login: () => { logins++; events.push("sdk:login"); },
  };
  const context = vm.createContext({
    exports: {}, process: { env: { NEXT_PUBLIC_LIFF_ID_CHECKIN: "1000000000-checkin" } },
    window, AbortController, setTimeout, clearTimeout, Error,
    console: { warn() {} },
    require(name) {
      assert.equal(name, "@line/liff");
      return { __esModule: true, default: sdk };
    },
    async fetch(url, request) {
      assert.equal(url, "/api/liff/session");
      assert.equal(request.cache, "no-store");
      assert.equal(request.credentials, "same-origin");
      assert.ok(request.signal instanceof AbortSignal);
      const body = request.body ? JSON.parse(request.body) : undefined;
      requests.push({ method: request.method, body, signal: request.signal });
      totals.sessionRequests++;
      events.push(`session:${request.method}`);
      if (request.method === "GET") {
        await gated(state.getGate, request.signal);
        return new Response(JSON.stringify(state.getStatus === 200
          ? { profile: profile(state.cachedUser), ...metadata() }
          : { error: state.getStatus === 401 ? "session_required" : state.getError }), { status: state.getStatus });
      }
      if (request.method === "POST") {
        assert.equal(body.idToken, RAW_ID_TOKEN);
        assert.equal(body.demo, undefined, "Verified-session failures must not become demo login attempts");
        await gated(state.postGate, request.signal);
        return new Response(JSON.stringify(state.postStatus === 200
          ? { profile: profile(state.verifiedUser ?? state.sdkUser ?? USER_A), ...metadata() }
          : { error: state.postError }), { status: state.postStatus });
      }
      assert.equal(request.method, "DELETE");
      assert.equal(request.headers["Content-Type"], "application/json");
      await gated(state.deleteGate, request.signal);
      return new Response(null, { status: 204 });
    },
  });
  Object.defineProperty(context, "localStorage", { get: noClientAuthStore });
  Object.defineProperty(context, "sessionStorage", { get: noClientAuthStore });
  vm.runInContext(compiled, context, { filename });
  return {
    client: context.exports, requests, sdkIds, events, state,
    get logins() { return logins; }, get rawTokenReads() { return rawTokenReads; }, get urlWrites() { return urlWrites; },
  };
}

async function scenario(run) { await run(); totals.scenarios++; }
const methods = (fixture) => fixture.requests.map(({ method }) => method);

await scenario(async () => {
  const sdkGate = deferred(), getGate = deferred();
  const f = fixture({ sdkGate, getGate });
  let completed = false;
  const pending = f.client.initLiff(LIFF_ID).then((result) => { completed = true; return result; });
  assert.deepEqual(new Set(f.events), new Set(["session:GET", "sdk:init"]), "SDK init and session request must both start before either completes");
  sdkGate.resolve();
  await flush();
  assert.equal(completed, false);
  getGate.resolve();
  assert.equal((await pending).profile.userId, USER_A);
  assert.deepEqual(methods(f), ["GET"]);
  assert.equal(f.rawTokenReads, 0);
  assert.equal(f.urlWrites, 0);
});

await scenario(async () => {
  const f = fixture({ sdkUser: USER_B });
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_B);
  assert.deepEqual(methods(f), ["GET", "POST"]);
  assert.equal(f.rawTokenReads, 1);
});

await scenario(async () => {
  const f = fixture({ sdkUser: null });
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_A);
  assert.deepEqual(methods(f), ["GET", "POST"]);
  assert.equal(f.rawTokenReads, 1);
});

await scenario(async () => {
  const f = fixture({ getStatus: 401 });
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_A);
  assert.deepEqual(methods(f), ["GET", "POST"]);
});

await scenario(async () => {
  const f = fixture();
  assert.equal((await f.client.initLiff("")).profile.userId, USER_A);
  assert.deepEqual(methods(f), ["GET"]);
  assert.equal(f.sdkIds.length, 0, "An explicitly absent LIFF ID must not initialize CHECKIN");
});

await scenario(async () => {
  const getGate = deferred();
  const f = fixture({ getGate });
  const first = f.client.initLiff(LIFF_ID);
  const duplicate = f.client.initLiff(LIFF_ID);
  const otherId = f.client.initLiff("1000000000-leave");
  assert.deepEqual(f.sdkIds, [LIFF_ID], "A page asking for another LIFF app must not switch the webview's LIFF app");
  assert.deepEqual(methods(f), ["GET"], "Concurrent callers share the in-flight cookie session read");
  getGate.resolve();
  await Promise.all([first, duplicate, otherId]);
  f.state.cachedUser = USER_B;
  f.state.sdkUser = USER_B;
  assert.equal((await f.client.initLiff("1000000000-leave")).profile.userId, USER_B, "Completed init results must not become a persistent identity cache");
  assert.deepEqual(f.sdkIds, [LIFF_ID], "The SDK is initialized once per webview");
  assert.deepEqual(methods(f), ["GET", "GET"]);
});

await scenario(async () => {
  // LINE names the app it opened in the launch fragment. That app wins over
  // the LIFF ID of whichever page happens to render first.
  const context = Buffer.from(JSON.stringify({ liffId: "1000000000-launched" })).toString("base64url");
  const f = fixture({ hash: `#access_token=synthetic-access-token&context_token=synthetic.${context}.signature&id_token=synthetic-id-token` });
  assert.equal(f.client.launchedLiffId(), "1000000000-launched");
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_A);
  assert.deepEqual(f.sdkIds, ["1000000000-launched"]);
  assert.equal(f.urlWrites, 0);
});

await scenario(async () => {
  const f = fixture({ hash: "#access_token=synthetic-access-token&context_token=not-a-context&id_token=synthetic-id-token" });
  assert.equal(f.client.launchedLiffId(), undefined);
  await f.client.initLiff(LIFF_ID);
  assert.deepEqual(f.sdkIds, [LIFF_ID], "An unreadable launch fragment falls back to the page's LIFF ID");
});

await scenario(async () => {
  const f = fixture({ sdkError: new Error("Synthetic SDK failure"), isInClient: true });
  await assert.rejects(f.client.initLiff(LIFF_ID), /Synthetic SDK failure/);
  f.state.sdkError = undefined;
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_A);
  assert.deepEqual(f.sdkIds, [LIFF_ID, LIFF_ID], "A failed SDK init must stay retryable");
});

await scenario(async () => {
  const f = fixture({ getStatus: 503, getError: "session_store_unavailable" });
  await assert.rejects(f.client.initLiff(LIFF_ID), (error) => error.code === "session_store_unavailable" && error.status === 503);
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ getStatus: 401, postStatus: 401 });
  await assert.rejects(f.client.initLiff(LIFF_ID), (error) => error.code === "invalid_id_token" && error.status === 401);
  assert.deepEqual(methods(f), ["GET", "POST"]);
});

await scenario(async () => {
  const sdkGate = deferred(), getGate = deferred(), deleteGate = deferred();
  const f = fixture({ sdkGate, getGate, deleteGate });
  const pending = f.client.initLiff(LIFF_ID);
  const stale = assert.rejects(pending, (error) => error.code === "session_reset");
  const firstReset = f.client.resetLiffSession();
  const duplicateReset = f.client.resetLiffSession();
  assert.equal(f.requests[0].signal.aborted, true);
  assert.deepEqual(methods(f), ["GET", "DELETE"]);
  sdkGate.resolve();
  await stale;
  assert.deepEqual(methods(f), ["GET", "DELETE"], "Stale SDK completion must not create a new session after logout");
  deleteGate.resolve();
  await Promise.all([firstReset, duplicateReset]);
  getGate.resolve();
  f.state.cachedUser = USER_B;
  f.state.sdkUser = USER_B;
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_B);
  assert.deepEqual(methods(f), ["GET", "DELETE", "GET"]);
});

await scenario(async () => {
  const postGate = deferred();
  const f = fixture({ getStatus: 401, postGate });
  const pending = f.client.initLiff(LIFF_ID);
  const stale = assert.rejects(pending, (error) => error.code === "session_reset");
  await flush();
  assert.deepEqual(methods(f), ["GET", "POST"]);
  await Promise.all([f.client.resetLiffSession(), stale]);
  assert.equal(f.requests[1].signal.aborted, true);
  postGate.resolve();
  await flush();
  assert.deepEqual(methods(f), ["GET", "POST", "DELETE"], "An aborted verification response cannot be returned as a fresh login");
});

await scenario(async () => {
  const f = fixture({ sdkError: new Error("Synthetic SDK failure"), isInClient: false });
  assert.equal((await f.client.initLiff(LIFF_ID)).profile.userId, USER_A);
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ sdkError: new Error("Synthetic SDK failure"), isInClient: false, getStatus: 503, getError: "session_store_unavailable" });
  await assert.rejects(f.client.initLiff(LIFF_ID), (error) => error.code === "session_store_unavailable");
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ sdkError: new Error("Synthetic SDK failure"), isInClient: true });
  await assert.rejects(f.client.initLiff(LIFF_ID), /Synthetic SDK failure/);
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ loggedIn: false, sdkUser: null, isInClient: false });
  const result = await f.client.initLiff(LIFF_ID);
  assert.equal(result.ready, true);
  assert.equal(result.profile.userId, USER_A);
  assert.equal(result.isInClient, false);
  assert.equal(f.logins, 0, "An external browser's valid app session must not depend on an unexpired SDK token");
  assert.equal(f.rawTokenReads, 0);
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ loggedIn: false, sdkUser: null, isInClient: false, getStatus: 401 });
  const result = await f.client.initLiff(LIFF_ID);
  assert.equal(result.ready, false);
  assert.equal(result.profile, undefined);
  assert.equal(f.logins, 1);
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ loggedIn: false, sdkUser: null, isInClient: false, getStatus: 503, getError: "session_store_unavailable" });
  await assert.rejects(f.client.initLiff(LIFF_ID), (error) => error.code === "session_store_unavailable" && error.status === 503);
  assert.equal(f.logins, 0, "A session storage failure must not silently start a different login flow");
  assert.equal(f.rawTokenReads, 0);
  assert.deepEqual(methods(f), ["GET"]);
});

await scenario(async () => {
  const f = fixture({ loggedIn: false });
  const result = await f.client.initLiff(LIFF_ID);
  assert.equal(result.ready, false);
  assert.equal(result.profile, undefined);
  assert.equal(f.logins, 1);
  assert.deepEqual(methods(f), ["GET"]);
});

console.log(`LIFF client cache checks passed: ${totals.scenarios} scenarios, ${totals.sdkInitializations} SDK initializations, ${totals.sessionRequests} session requests; all network mocked.`);
