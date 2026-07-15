"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DASHBOARD_SESSION_COOKIE,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
  getDashboardAuthState,
} from "@/lib/dashboard-auth-config";
import { createSignedSession } from "@/lib/signed-session";

function sameCredential(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

function safeNextPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/dashboard") && !path.startsWith("//") ? path : "/dashboard";
}

export async function loginAction(formData: FormData): Promise<never> {
  const auth = getDashboardAuthState();
  const nextPath = safeNextPath(formData.get("next"));

  if (auth.status === "disabled") redirect(nextPath);
  if (auth.status === "misconfigured") redirect(`/login?error=config&next=${encodeURIComponent(nextPath)}`);

  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const usernameMatches = sameCredential(username, auth.username);
  const passwordMatches = sameCredential(password, auth.password);
  if (!usernameMatches || !passwordMatches) {
    redirect(`/login?error=credentials&next=${encodeURIComponent(nextPath)}`);
  }

  const token = await createSignedSession(
    {
      sub: auth.username,
      purpose: "dashboard",
      role: "owner",
      expiresInSeconds: DASHBOARD_SESSION_MAX_AGE_SECONDS,
    },
    auth.secret,
  );
  const cookieStore = await cookies();
  cookieStore.set(DASHBOARD_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DASHBOARD_SESSION_MAX_AGE_SECONDS,
  });

  redirect(nextPath);
}

export async function logoutAction(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete(DASHBOARD_SESSION_COOKIE);
  redirect("/login");
}
