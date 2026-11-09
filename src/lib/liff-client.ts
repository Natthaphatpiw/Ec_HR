"use client";

import liff from "@line/liff";

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LiffSessionResponse {
  profile?: LiffProfile;
  demoMode?: boolean;
  error?: string;
  expiresAt?: number;
  storage?: "redis" | "cookie";
}

interface LiffInitResult {
  ready: boolean;
  isLoggedIn: boolean;
  profile?: LiffProfile;
  isInClient: boolean;
  demoMode: boolean;
}

const SESSION_ERROR_MESSAGES: Record<string, string> = {
  line_login_not_configured: "ระบบเชื่อมต่อ LINE ยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบแล้วลองใหม่",
  liff_session_not_configured: "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบแล้วลองใหม่",
  line_verification_unavailable: "ไม่สามารถติดต่อ LINE ได้ในขณะนี้ กรุณาลองใหม่",
  invalid_id_token: "การเข้าสู่ระบบ LINE หมดอายุหรือไม่ถูกต้อง กรุณาปิดหน้านี้แล้วเปิดจาก LINE อีกครั้ง",
  id_token_required: "ไม่พบข้อมูลยืนยันจาก LINE กรุณาปิดหน้านี้แล้วเปิดจาก LINE อีกครั้ง",
  line_verification_required: "กรุณาเปิดหน้านี้ผ่านลิงก์ LIFF ใน LINE หากยังเข้าไม่ได้ให้แจ้งผู้ดูแลระบบ",
  session_store_unavailable: "ระบบเก็บสถานะเข้าสู่ระบบไม่พร้อมใช้งาน กรุณาลองใหม่หรือติดต่อผู้ดูแล",
  session_reset: "ออกจากระบบแล้ว กรุณาเปิดหน้าเข้าสู่ระบบใหม่",
};

export class LiffSessionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(Object.hasOwn(SESSION_ERROR_MESSAGES, code)
      ? SESSION_ERROR_MESSAGES[code]
      : "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่");
    this.name = "LiffSessionError";
    this.code = code;
    this.status = status;
  }
}

let sessionGeneration = 0;
let resumeInFlight: Promise<LiffSessionResponse | null> | undefined;
let resetInFlight: Promise<void> | undefined;
const initInFlight = new Map<string, Promise<LiffInitResult>>();
const activeSessionRequests = new Set<AbortController>();

function ensureCurrentSession(generation: number) {
  if (generation !== sessionGeneration) throw new LiffSessionError("session_reset", 401);
}

async function requestServerSession(
  method: "GET" | "POST" | "DELETE",
  generation: number,
  input?: { idToken?: string; demo?: boolean; action?: "logout" },
): Promise<LiffSessionResponse | null> {
  ensureCurrentSession(generation);
  const controller = new AbortController();
  activeSessionRequests.add(controller);
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("/api/liff/session", {
      method,
      ...(method === "GET" ? {} : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input ?? {}),
      }),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const parsed: unknown = await response.json().catch(() => ({}));
    ensureCurrentSession(generation);
    const result = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as LiffSessionResponse
      : {};
    if (method === "GET" && response.status === 401 && result.error === "session_required") return null;
    if (!response.ok || (method !== "DELETE" && !result.profile?.userId)) {
      throw new LiffSessionError(
        typeof result.error === "string" ? result.error : "session_unavailable",
        response.status,
      );
    }
    return result;
  } catch (error) {
    ensureCurrentSession(generation);
    if (error instanceof LiffSessionError) throw error;
    throw new LiffSessionError("session_unavailable", 0);
  } finally {
    clearTimeout(timeout);
    activeSessionRequests.delete(controller);
  }
}

function resumeServerSession(generation: number): Promise<LiffSessionResponse | null> {
  if (resumeInFlight) return resumeInFlight;
  const pending = requestServerSession("GET", generation).finally(() => {
    if (resumeInFlight === pending) resumeInFlight = undefined;
  });
  resumeInFlight = pending;
  return pending;
}

function readySession(session: LiffSessionResponse, isInClient: boolean): LiffInitResult {
  return {
    ready: true,
    isLoggedIn: true,
    isInClient,
    demoMode: session.demoMode === true,
    profile: session.profile,
  };
}

async function bootstrapLiff(id: string, generation: number): Promise<LiffInitResult> {
  // Start the cookie session request immediately. Keep its rejection handled
  // while the SDK resolves LINE's primary/secondary redirect processing.
  const resume = resumeServerSession(generation).then(
    (session) => ({ session, error: undefined }),
    (error: unknown) => ({ session: null, error }),
  );
  if (!id) {
    const cached = await resume;
    ensureCurrentSession(generation);
    if (cached.error) throw cached.error;
    if (cached.session) return readySession(cached.session, liff.isInClient());
    const demo = await requestServerSession("POST", generation, { demo: true });
    return readySession(demo!, false);
  }

  try {
    await liff.init({ liffId: id });
    ensureCurrentSession(generation);
    if (!liff.isLoggedIn()) {
      // The service session can outlive the SDK token in an external browser.
      // It remains the login authority until its own expiry or explicit logout.
      if (!liff.isInClient()) {
        const cached = await resume;
        ensureCurrentSession(generation);
        if (cached.error) throw cached.error;
        if (cached.session) return readySession(cached.session, false);
      }
      liff.login();
      return { ready: false, isLoggedIn: false, isInClient: liff.isInClient(), demoMode: false };
    }
  } catch (err) {
    ensureCurrentSession(generation);
    const cached = await resume;
    ensureCurrentSession(generation);
    if (cached.error) throw cached.error;
    // An external browser may keep its verified app session even when the
    // LINE SDK is unavailable. Inside LINE, SDK identity checks still run.
    if (liff.isInClient()) throw err;
    if (cached.session) return readySession(cached.session, false);
    try {
      const demo = await requestServerSession("POST", generation, { demo: true });
      console.warn("LIFF init failed; explicit server demo mode is active:", err);
      return readySession(demo!, false);
    } catch (error) {
      ensureCurrentSession(generation);
      if (error instanceof LiffSessionError && error.code !== "line_verification_required") throw error;
      throw err;
    }
  }

  const cached = await resume;
  ensureCurrentSession(generation);
  if (cached.error) throw cached.error;
  let currentSubject: string | undefined;
  try {
    currentSubject = liff.getDecodedIDToken()?.sub;
  } catch {
    // A missing decoded subject must take the raw-token verification path.
  }
  if (cached.session && currentSubject === cached.session.profile?.userId) {
    return readySession(cached.session, liff.isInClient());
  }

  // Decoded claims are an identity-change hint only. New or different users
  // must send the raw token to the server before obtaining an app session.
  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error("LINE ไม่ได้ส่งข้อมูลยืนยันการเข้าสู่ระบบ กรุณาให้ผู้ดูแลเปิดสิทธิ์ openid ของแอป LIFF แล้วเปิดหน้านี้ใหม่");
  }
  const verified = await requestServerSession("POST", generation, { idToken });
  return readySession(verified!, liff.isInClient());
}

export function initLiff(liffId?: string): Promise<LiffInitResult> {
  if (resetInFlight) return resetInFlight.then(() => initLiff(liffId));
  const id = (liffId ?? process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN)?.trim() ?? "";
  const existing = initInFlight.get(id);
  if (existing) return existing;
  const generation = sessionGeneration;
  const pending = bootstrapLiff(id, generation).finally(() => {
    if (initInFlight.get(id) === pending) initInFlight.delete(id);
  });
  initInFlight.set(id, pending);
  return pending;
}

export function resetLiffSession(): Promise<void> {
  if (resetInFlight) return resetInFlight;
  sessionGeneration++;
  for (const controller of activeSessionRequests) controller.abort();
  activeSessionRequests.clear();
  initInFlight.clear();
  resumeInFlight = undefined;
  const pending = requestServerSession("DELETE", sessionGeneration, { action: "logout" })
    .then(() => undefined)
    .finally(() => {
      if (resetInFlight === pending) resetInFlight = undefined;
    });
  resetInFlight = pending;
  return pending;
}

export function liffCloseWindow() {
  if (liff.isInClient()) {
    try {
      liff.closeWindow();
    } catch {
      // ignore
    }
  }
}
