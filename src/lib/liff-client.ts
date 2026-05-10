"use client";

import liff from "@line/liff";

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export async function initLiff(liffId?: string): Promise<{
  ready: boolean;
  isLoggedIn: boolean;
  profile?: LiffProfile;
  isInClient: boolean;
  demoMode: boolean;
}> {
  const id = liffId ?? process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN;
  // Demo fallback when no LIFF ID configured
  if (!id) {
    return {
      ready: true,
      isLoggedIn: true,
      isInClient: false,
      demoMode: true,
      profile: {
        userId: "U1234567890abcdef1234567890abcdef",
        displayName: "Somchai Jaidee (Demo)",
        pictureUrl: undefined,
      },
    };
  }
  try {
    await liff.init({ liffId: id });
    if (!liff.isLoggedIn()) {
      liff.login();
      return { ready: false, isLoggedIn: false, isInClient: liff.isInClient(), demoMode: false };
    }
    const profile = await liff.getProfile();
    return {
      ready: true,
      isLoggedIn: true,
      isInClient: liff.isInClient(),
      demoMode: false,
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      },
    };
  } catch (err) {
    // Fall back to demo mode if LIFF init fails
    console.warn("LIFF init failed, falling back to demo:", err);
    return {
      ready: true,
      isLoggedIn: true,
      isInClient: false,
      demoMode: true,
      profile: {
        userId: "U1234567890abcdef1234567890abcdef",
        displayName: "Somchai Jaidee (Demo)",
      },
    };
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
