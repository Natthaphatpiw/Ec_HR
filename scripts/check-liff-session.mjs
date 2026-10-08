import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual route and client with synthetic LINE responses only.
// No real credentials, user accounts, database writes or outbound API calls.
function loadModule(path, { env = {}, modules = {}, fetch } = {}) {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const logs = [];
  const context = vm.createContext({
    exports: {}, process: { env }, Request, Response, Headers, URLSearchParams,
    AbortSignal, AbortController, setTimeout, clearTimeout, fetch,
    console: { error: (...args) => logs.push(args.join(" ")), warn: (...args) => logs.push(args.join(" ")) },
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  vm.runInContext(source, context, { filename });
  return { ...context.exports, logs };
}

const lineUserId = `U${"a".repeat(32)}`;
const channelId = "1000000000";
const idToken = "synthetic-test-token";
const validPayload = { iss: "https://access.line.me", aud: channelId, sub: lineUserId, exp: Math.floor(Date.now() / 1000) + 900, name: "Synthetic Employee" };
const configuredEnv = { DEMO_MODE: "false", LINE_LOGIN_CHANNEL_ID: channelId, LIFF_SESSION_SECRET: "s".repeat(64) };

function routeFixture(env = configuredEnv, reply = validPayload, upstreamStatus = 200) {
  const writes = [], requests = [];
  const route = loadModule("../src/app/api/liff/session/route.ts", {
    env,
    modules: {
      "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { ...init, headers: { ...init.headers, "Content-Type": "application/json" } }) } },
      "@/lib/liff-session": { isExplicitDemoMode: () => env.DEMO_MODE === "true", setLiffSession: async (...args) => writes.push(args) },
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (reply instanceof Error) throw reply;
      return new Response(JSON.stringify(reply), { status: upstreamStatus });
    },
  });
  return { ...route, writes, requests, post: (body) => route.POST(new Request("https://app.invalid/api/liff/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })) };
}

for (const [setting, error] of [["LINE_LOGIN_CHANNEL_ID", "line_login_not_configured"], ["LIFF_SESSION_SECRET", "liff_session_not_configured"]]) {
  const fixture = routeFixture({ ...configuredEnv, [setting]: "" });
  const response = await fixture.post({ idToken });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, error);
  assert.equal(fixture.requests.length, 0);
  assert.equal(fixture.writes.length, 0);
  assert.ok(fixture.logs.some((line) => line.includes(setting)));
  assert.ok(fixture.logs.every((line) => !line.includes(idToken) && !line.includes(configuredEnv.LIFF_SESSION_SECRET)));
}
for (const secret of ["short", " ".repeat(64)]) {
  assert.equal((await routeFixture({ ...configuredEnv, LIFF_SESSION_SECRET: secret }).post({ idToken })).status, 503);
}
const verified = routeFixture();
const verifiedResponse = await verified.post({ idToken });
assert.equal(verifiedResponse.status, 200);
assert.equal((await verifiedResponse.json()).profile.userId, lineUserId);
assert.equal(verified.writes[0][0], lineUserId);
assert.ok(verified.writes[0][1] > 0 && verified.writes[0][1] <= 900);
assert.equal(verified.requests[0].url, "https://api.line.me/oauth2/v2.1/verify");
assert.equal(verified.requests[0].options.body.get("client_id"), channelId);
assert.equal(verified.requests[0].options.body.get("id_token"), idToken);
assert.ok(verified.requests[0].options.signal instanceof AbortSignal);
for (const badClaims of [{ aud: "9999999999" }, { iss: "https://untrusted.invalid" }, { sub: "EMP001" }, { exp: 0 }]) {
  const fixture = routeFixture(configuredEnv, { ...validPayload, ...badClaims });
  assert.equal((await fixture.post({ idToken })).status, 401);
  assert.equal(fixture.writes.length, 0);
}
const rejected = routeFixture(configuredEnv, { error: "invalid_token" }, 400);
assert.equal((await rejected.post({ idToken })).status, 401);
const unavailable = routeFixture(configuredEnv, new Error("synthetic connection timeout"));
assert.equal((await unavailable.post({ idToken })).status, 502);
assert.equal(unavailable.writes.length, 0);
const productionDemo = routeFixture();
assert.equal((await productionDemo.post({ demo: true })).status, 401);
assert.equal(productionDemo.writes.length, 0);
assert.equal((await routeFixture({ ...configuredEnv, DEMO_MODE: "true" }).post({ demo: true })).status, 200);
for (const invalid of [null, [], {}, { idToken: 123 }, { idToken: "x".repeat(8193) }]) {
  assert.equal((await routeFixture().post(invalid)).status, 400);
}

function clientFixture({ status = 200, error, sdkError, inClient = true, loggedIn = true, token = idToken } = {}) {
  const requests = [], initializedIds = [];
  let logins = 0;
  const sdk = {
    init: async ({ liffId }) => { initializedIds.push(liffId); if (sdkError) throw sdkError; },
    isLoggedIn: () => loggedIn, isInClient: () => inClient, getIDToken: () => token,
    login: () => { logins++; },
  };
  const client = loadModule("../src/lib/liff-client.ts", {
    env: { NEXT_PUBLIC_LIFF_ID_CHECKIN: "1000000000-checkin" },
    modules: { "@line/liff": { __esModule: true, default: sdk } },
    fetch: async (_url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ body, options });
      return new Response(JSON.stringify(status === 200 ? { profile: { userId: lineUserId, displayName: "Synthetic Employee" }, demoMode: body.demo === true } : { error }), { status });
    },
  });
  return { ...client, requests, initializedIds, get logins() { return logins; } };
}
for (const [status, error] of [[503, "line_login_not_configured"], [503, "liff_session_not_configured"], [401, "invalid_id_token"], [502, "line_verification_unavailable"]]) {
  const client = clientFixture({ status, error });
  await assert.rejects(client.initLiff("1000000000-register"), (failure) => failure.code === error && failure.status === status && /LINE|ระบบ/.test(failure.message));
  assert.equal(client.requests.length, 1, "A failed verified session must not trigger a demo POST");
  assert.equal(client.requests[0].body.idToken, idToken);
  assert.equal(client.requests[0].body.demo, undefined);
}
const client = clientFixture();
assert.equal((await client.initLiff(" 1000000000-register ")).profile.userId, lineUserId);
assert.equal(client.initializedIds[0], "1000000000-register");
assert.equal(client.requests[0].options.credentials, "same-origin");
const redirect = clientFixture({ loggedIn: false });
assert.equal((await redirect.initLiff("1000000000-register")).ready, false);
assert.equal(redirect.logins, 1);
assert.equal(redirect.requests.length, 0);
const noOpenId = clientFixture({ token: null });
await assert.rejects(noOpenId.initLiff("1000000000-register"), /openid/);
assert.equal(noOpenId.requests.length, 0);
const sdkFailedInLine = clientFixture({ sdkError: new Error("synthetic SDK failure") });
await assert.rejects(sdkFailedInLine.initLiff("1000000000-register"), /synthetic SDK failure/);
assert.equal(sdkFailedInLine.requests.length, 0);
const explicitDemo = clientFixture();
assert.equal((await explicitDemo.initLiff("")).demoMode, true);
assert.equal(explicitDemo.initializedIds.length, 0, "An explicitly missing registration ID must not initialize CHECKIN");
assert.equal(explicitDemo.requests[0].body.demo, true);
const externalDemo = clientFixture({ sdkError: new Error("SDK unavailable in a local browser"), inClient: false });
assert.equal((await externalDemo.initLiff("1000000000-register")).demoMode, true);
assert.equal(externalDemo.requests[0].body.demo, true);
console.log("LIFF route/client checks passed: config, token verification, demo boundaries, redirects and error preservation.");
