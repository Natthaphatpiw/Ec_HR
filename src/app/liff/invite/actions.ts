"use server";

import { getEmployeeByLineId, regenerateReusableInvite } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export interface RegenerateResult {
  ok: boolean;
  token?: string;
  message?: string;
}

/**
 * Revoke the current supervisor's active invite and mint a fresh one. Resolves
 * the caller from the LINE session cookie and rejects non-supervisors.
 */
export async function regenerateMyInvite(): Promise<RegenerateResult> {
  const uid = await getLiffUserIdFromCookie();
  if (!uid) return { ok: false, message: "ไม่พบเซสชัน LINE" };
  const me = await getEmployeeByLineId(uid);
  if (!me || !me.is_supervisor) return { ok: false, message: "เฉพาะหัวหน้างานเท่านั้น" };
  const invite = await regenerateReusableInvite(me.org_id, me.id);
  return { ok: true, token: invite.token };
}
