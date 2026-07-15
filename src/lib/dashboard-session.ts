import "server-only";

import { cookies } from "next/headers";
import {
  DASHBOARD_SESSION_COOKIE,
  getDashboardAuthState,
} from "@/lib/dashboard-auth-config";
import { verifySignedSession, type SignedSessionPayload } from "@/lib/signed-session";

export async function getDashboardOwnerSession(): Promise<SignedSessionPayload | null> {
  const auth = getDashboardAuthState();
  if (auth.status !== "enabled") return null;

  const cookieStore = await cookies();
  const session = await verifySignedSession(
    cookieStore.get(DASHBOARD_SESSION_COOKIE)?.value,
    auth.secret,
    "dashboard",
  );

  return session?.role === "owner" ? session : null;
}

export async function isDashboardOwnerAuthorized(): Promise<boolean> {
  const auth = getDashboardAuthState();
  if (auth.status === "disabled") return true;
  if (auth.status === "misconfigured") return false;
  return Boolean(await getDashboardOwnerSession());
}
