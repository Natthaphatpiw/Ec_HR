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

async function establishServerSession(input: { idToken?: string; demo?: boolean }) {
  const response = await fetch("/api/liff/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as LiffSessionResponse;
  if (!response.ok || !result.profile) {
    throw new Error(result.error ?? "Unable to establish a verified LINE session");
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
  const id = liffId ?? process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN;
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
    const idToken = liff.getIDToken();
    if (!idToken) {
      throw new Error("LINE did not issue an ID token. Enable the openid scope for this LIFF app.");
    }
    const verified = await establishServerSession({ idToken });
    return {
      ready: true,
      isLoggedIn: true,
      isInClient: liff.isInClient(),
      demoMode: false,
      profile: verified.profile,
    };
  } catch (err) {
    // The server permits this fallback only when DEMO_MODE=true. Production
    // therefore surfaces LIFF errors instead of silently impersonating a user.
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
