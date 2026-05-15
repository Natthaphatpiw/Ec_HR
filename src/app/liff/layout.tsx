import type { Metadata } from "next";
import { LiffBottomNav } from "@/components/liff/bottom-nav";

export const metadata: Metadata = {
  title: "EC AIHR · LIFF",
};

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-navy-50/50 pb-20">
      {children}
      <LiffBottomNav />
    </div>
  );
}
