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
}

const SESSION_ERROR_MESSAGES: Record<string, string> = {
  line_login_not_configured: "ระบบเชื่อมต่อ LINE ยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบแล้วลองใหม่",
  liff_session_not_configured: "ระบบเข้าสู่ระบบยังไม่พร้อม กรุณาแจ้งผู้ดูแลระบบแล้วลองใหม่",
  line_verification_unavailable: "ไม่สามารถติดต่อ LINE ได้ในขณะนี้ กรุณาลองใหม่",
  invalid_id_token: "การเข้าสู่ระบบ LINE หมดอายุหรือไม่ถูกต้อง กรุณาปิดหน้านี้แล้วเปิดจาก LINE อีกครั้ง",
  id_token_required: "ไม่พบข้อมูลยืนยันจาก LINE กรุณาปิดหน้านี้แล้วเปิดจาก LINE อีกครั้ง",
  line_verification_required: "กรุณาเปิดหน้านี้ผ่านลิงก์ LIFF ใน LINE หากยังเข้าไม่ได้ให้แจ้งผู้ดูแลระบบ",
};

export class LiffSessionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(SESSION_ERROR_MESSAGES[code] ?? "เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่");
    this.name = "LiffSessionError";
    this.code = code;
    this.status = status;
  }
}

async function establishServerSession(input: { idToken?: string; demo?: boolean }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch("/api/liff/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch {
    throw new LiffSessionError("session_unavailable", 0);
  } finally {
    clearTimeout(timeout);
  }
  const result = (await response.json().catch(() => ({}))) as LiffSessionResponse;
  if (!response.ok || !result.profile) {
    throw new LiffSessionError(result.error ?? "session_unavailable", response.status);
  }
  return result;
}

async function establishExplicitDemoSession() {
  return establishServerSession({ demo: true });
}

export async function initLiff(liffId?: string): Promise<{
  ready: boolean;
  isLoggedIn: boolean;
  profile?: LiffProfile;
  isInClient: boolean;
  demoMode: boolean;
}> {
  const id = (liffId ?? process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN)?.trim();
  if (!id) {
    const demo = await establishExplicitDemoSession();
    return {
      ready: true,
      isLoggedIn: true,
      isInClient: false,
      demoMode: true,
      profile: demo.profile,
    };
  }
  try {
    await liff.init({ liffId: id });
    if (!liff.isLoggedIn()) {
      liff.login();
      return { ready: false, isLoggedIn: false, isInClient: liff.isInClient(), demoMode: false };
    }
  } catch (err) {
    // Only SDK bootstrap failures outside LINE may use the server-authorized
    // demo. A session verification/configuration error must retain its cause.
    if (liff.isInClient()) throw err;
    try {
      const demo = await establishExplicitDemoSession();
      console.warn("LIFF init failed; explicit server demo mode is active:", err);
      return {
        ready: true,
        isLoggedIn: true,
        isInClient: false,
        demoMode: true,
        profile: demo.profile,
      };
    } catch {
      throw err;
    }
  }

  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error("LINE ไม่ได้ส่งข้อมูลยืนยันการเข้าสู่ระบบ กรุณาให้ผู้ดูแลเปิดสิทธิ์ openid ของแอป LIFF แล้วเปิดหน้านี้ใหม่");
  }
  const verified = await establishServerSession({ idToken });
  return {
    ready: true,
    isLoggedIn: true,
    isInClient: liff.isInClient(),
    demoMode: false,
    profile: verified.profile,
  };
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
