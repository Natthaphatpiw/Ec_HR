import type { Metadata } from "next";
import { LiffBottomNav } from "@/components/liff/bottom-nav";
import { LiffSessionSync } from "@/components/liff/session-sync";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export const metadata: Metadata = {
  title: "EC AIHR · LIFF",
};

export default async function LiffLayout({ children }: { children: React.ReactNode }) {
  const serverUserId = await getLiffUserIdFromCookie();
  return (
    <div className="mx-auto min-h-screen max-w-md bg-navy-50/50 pb-20">
      <LiffSessionSync serverUserId={serverUserId} />
      {children}
      <LiffBottomNav />
    </div>
  );
}
