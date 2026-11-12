import "server-only";

import { readLiffSession } from "@/lib/liff-session";

type RegistrationIdentity =
  | { ok: true; lineUserId: string }
  | { ok: false; reason: "session_required" | "session_unavailable"; message: string };

export async function getRegistrationIdentity(browserUserId: unknown): Promise<RegistrationIdentity> {
  try {
    const session = typeof browserUserId === "string" && browserUserId ? await readLiffSession() : null;
    if (session && session.profile.userId === browserUserId) {
      return { ok: true, lineUserId: session.profile.userId };
    }
    return {
      ok: false,
      reason: "session_required",
      message: "ไม่สามารถยืนยันบัญชี LINE ได้ กรุณาเปิดลิงก์ลงทะเบียนจากแอป LINE อีกครั้ง",
    };
  } catch {
    console.error("[registration] session lookup unavailable");
    return {
      ok: false,
      reason: "session_unavailable",
      message: "ระบบยืนยันการเข้าสู่ระบบไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง",
    };
  }
}
