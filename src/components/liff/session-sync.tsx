"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { initLiff, launchedLiffId } from "@/lib/liff-client";

/**
 * Feature pages render straight from the server session and never wait for
 * the LINE SDK. This runs once per LINE launch, in the background, to confirm
 * that session still belongs to the LINE account that opened the app, and
 * re-renders the page when a different account is now signed in.
 */
export function LiffSessionSync({ serverUserId }: { serverUserId?: string }) {
  const router = useRouter();
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current || !serverUserId) return;
    checked.current = true;
    // Only a fresh LINE launch names its LIFF app. Anything else keeps the
    // server session as is rather than guessing an app and switching to it.
    const liffId = launchedLiffId();
    if (!liffId) return;
    initLiff(liffId)
      .then((result) => {
        if (result.profile?.userId && result.profile.userId !== serverUserId) router.refresh();
      })
      .catch(() => {
        // The server session stays in charge; guarded pages report real failures.
      });
  }, [serverUserId, router]);

  return null;
}
