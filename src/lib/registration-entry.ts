import "server-only";

import { redirect } from "next/navigation";
import { getRegistrationStatus } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

/**
 * Registration pages double as LIFF entry points (invite links, Rich Menu).
 * A member who is already active is sent straight to the app, before any
 * registration screen renders or the LINE SDK starts.
 */
export async function redirectActiveMemberHome(): Promise<void> {
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) return;
  let active = false;
  try {
    active = (await getRegistrationStatus(lineUserId)).state === "active";
  } catch {
    // The registration form reports data outages itself.
  }
  if (active) redirect("/liff");
}
