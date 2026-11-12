import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const USER = `U${"a".repeat(32)}`;
const OTHER = `U${"b".repeat(32)}`;
const SENSITIVE = "synthetic private database details that must not reach the browser or logs";
const employee = { id: "employee-id", org_id: "org-id", name_th: "Synthetic employee", department: "Demo", position: "Demo" };

function execute(source, filename, globals) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const context = vm.createContext({ exports: {}, FormData, ...globals });
  vm.runInContext(compiled, context, { filename });
  return context.exports;
}

function load(path, modules, logs) {
  const filename = fileURLToPath(new URL(path, import.meta.url));
  return execute(readFileSync(filename, "utf8"), filename, {
    console: { error: (...values) => logs.push(values.join(" ")) },
    require(name) {
      if (name === "server-only") return {};
      assert.ok(Object.hasOwn(modules, name), `Unexpected import ${name}`);
      return modules[name];
    },
  });
}

function fixture() {
  const logs = [], submitted = [], lookups = [];
  const state = { subject: USER, sessionDown: false, dataDown: false, invite: true, seatBlocked: false };
  const identity = load("../src/lib/registration-session.ts", {
    "@/lib/liff-session": { async readLiffSession() {
      if (state.sessionDown) throw new Error(SENSITIVE);
      return state.subject ? { profile: { userId: state.subject } } : null;
    } },
  }, logs);
  const database = {
    async getRegistrationStatus(userId) {
      lookups.push(["status", userId]);
      if (state.dataDown) throw new Error(SENSITIVE);
      return { state: "pending", employee };
    },
    async getOrgInviteByToken(token) {
      lookups.push(["invite", token]);
      if (state.dataDown) throw new Error(SENSITIVE);
      return state.invite ? { org: { id: "org-id", business_name: "Synthetic org" }, supervisor: employee } : undefined;
    },
    async canAcceptNewSeat() {
      if (state.dataDown) throw new Error(SENSITIVE);
      return state.seatBlocked ? { ok: false, reason: "expired" } : { ok: true };
    },
    async registerEmployee(input) {
      if (state.dataDown) throw new Error(SENSITIVE);
      submitted.push(["employee", input]);
      return { ok: true, employee };
    },
    async registerSupervisor(input) {
      if (state.dataDown) throw new Error(SENSITIVE);
      submitted.push(["supervisor", input]);
      return { ok: true, employee };
    },
    async listApprovalAdminsForOrg() { return []; },
  };
  const modules = {
    "@/lib/registration-session": identity,
    "@/lib/data": database,
    "@/lib/invite": { buildInviteUrl: () => "https://app.invalid/synthetic" },
    "@/lib/line/approvals": { async notifyHrOfRegistration() { throw new Error("No provider calls allowed"); } },
  };
  const registration = load("../src/app/liff/register/actions.ts", modules, logs);
  const supervisor = load("../src/app/liff/register-supervisor/actions.ts", modules, logs);
  return { registration, supervisor, state, logs, submitted, lookups };
}

function application(userId) {
  const form = new FormData();
  if (userId) form.set("lineUserId", userId);
  for (const [key, value] of Object.entries({ inviteToken: "synthetic-invite", businessName: "Synthetic org", nameTh: "Synthetic user", phone: "0000000000", pdpaConsent: "on" })) form.set(key, value);
  return form;
}

for (const role of ["employee", "supervisor"]) {
  const f = fixture();
  const status = role === "employee" ? f.registration.checkRegistrationState : f.supervisor.checkSupervisorRegistrationState;
  const submit = role === "employee" ? f.registration.submitRegistration : f.supervisor.submitSupervisorRegistration;
  assert.equal((await status(OTHER)).state, "session_required");
  assert.equal((await submit(application(OTHER))).ok, false);
  assert.equal((await submit(application(null))).ok, false);
  assert.equal(f.lookups.length, 0);
  assert.equal(f.submitted.length, 0);

  f.state.subject = null;
  assert.equal((await status(USER)).state, "session_required");
  f.state.subject = USER;
  f.state.sessionDown = true;
  assert.equal((await status(USER)).state, "session_unavailable");
  assert.equal((await submit(application(USER))).ok, false);
  assert.equal(f.lookups.length, 0);
  assert.equal(f.submitted.length, 0);
  f.state.sessionDown = false;

  f.state.dataDown = true;
  const unavailable = await status(USER);
  assert.equal(unavailable.state, "unavailable");
  assert.equal((await submit(application(USER))).ok, false);
  assert.ok(!JSON.stringify([unavailable, ...f.logs]).includes(SENSITIVE));
  assert.ok(!JSON.stringify(f.logs).includes(USER));
  f.state.dataDown = false;

  const found = await status(USER);
  assert.equal(found.state, "pending");
  assert.equal(found.employee.name, employee.name_th);
  assert.equal(found.employee.id, undefined);
  assert.equal((await submit(application(USER))).ok, true);
  assert.equal(f.submitted[0][0], role);
  assert.equal(f.submitted[0][1].line_user_id, USER);
}

{
  const f = fixture();
  assert.equal((await f.registration.checkInvite(null)).reason, "invalid");
  assert.equal((await f.registration.checkInvite(" ")).reason, "missing");
  assert.equal((await f.registration.checkInvite("x".repeat(257))).reason, "invalid");
  assert.equal(f.lookups.length, 0);
  f.state.subject = null;
  f.state.dataDown = true;
  const unavailable = await f.registration.checkInvite("synthetic-invite");
  assert.equal(unavailable.reason, "unavailable");
  assert.ok(!JSON.stringify([unavailable, ...f.logs]).includes(SENSITIVE));
  assert.ok(!JSON.stringify(f.logs).includes("synthetic-invite"));
  f.state.dataDown = false;
  f.state.invite = false;
  assert.equal((await f.registration.checkInvite("synthetic-invite")).reason, "invalid");
  f.state.invite = true;
  f.state.seatBlocked = true;
  const blocked = await f.registration.checkInvite(" synthetic-invite ");
  assert.equal(blocked.ok, true);
  assert.equal(blocked.seatBlocked, "expired");
  assert.deepEqual(f.lookups.at(-1), ["invite", "synthetic-invite"]);
}

// Execute the actual employee bootstrap effect to prove it uses the query
// restored by LIFF before the invite action and never surfaces raw rejections.
const formPath = fileURLToPath(new URL("../src/components/liff/register-form.tsx", import.meta.url));
const formSource = ts.createSourceFile(formPath, readFileSync(formPath, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effectSource;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(formSource) === "useEffect") effectSource ??= node.arguments[0].getText(formSource);
  ts.forEachChild(node, visit);
}
visit(formSource);
assert.ok(effectSource);

async function bootstrap(inviteAction) {
  const calls = [];
  const errors = [];
  const storage = new Map();
  let search = "?liff.state=synthetic";
  let ready = false;
  class LiffSessionError extends Error {}
  const { effect } = execute(`export const effect = ${effectSource}`, formPath, {
    process: { env: {} }, URLSearchParams, LiffSessionError,
    window: { location: { get search() { return search; } } },
    sessionStorage: { setItem: (key, value) => storage.set(key, value), getItem: (key) => storage.get(key) },
    async initLiff() {
      calls.push("init");
      search = "?invite=sdk-restored";
      return { ready: true, profile: { userId: USER, displayName: "Synthetic" } };
    },
    async checkRegistrationState() { return { state: "new" }; },
    async checkInvite(token) { calls.push(token); return inviteAction(token); },
    setLiffReady: (value) => { ready = value; },
    setLiffError: (value) => { if (value) errors.push(value); },
    setStateCheck() {}, setInviteChecked() {}, setLineUserId() {}, setDisplayName() {}, setPictureUrl() {},
    setProfilePreview() {}, setProfileUrl() {}, setInviteToken() {}, setInviteInfo() {},
  });
  effect();
  await new Promise(setImmediate);
  return { calls, errors, ready, savedInvite: storage.get("pending_invite") };
}

const restored = await bootstrap(() => ({ ok: true }));
assert.deepEqual(restored.calls, ["init", "sdk-restored"]);
assert.equal(restored.savedInvite, "sdk-restored");
assert.equal(restored.ready, true);
for (const inviteAction of [() => ({ ok: false, reason: "unavailable" }), () => { throw new Error(SENSITIVE); }]) {
  const failed = await bootstrap(inviteAction);
  assert.equal(failed.ready, false);
  assert.equal(failed.errors[0].source, "registration");
  assert.ok(!JSON.stringify(failed.errors).includes(SENSITIVE));
}

console.log("LIFF registration checks passed: verified identity, safe outage responses, invite and trial behavior, SDK-restored invite, and rejected-action fallback.");
