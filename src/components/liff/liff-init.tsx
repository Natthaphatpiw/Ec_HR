"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { initLiff } from "@/lib/liff-client";

/**
 * First-touch LIFF bootstrap. Runs on the LIFF page when no `liff_user_id`
 * cookie is present yet — calls liff.init(), captures the userId, writes it
 * to a cookie, then refreshes so the server component can re-render with
 * the real user.
 */
export function LiffInit({ liffId, hint }: { liffId?: string; hint?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"booting" | "no-profile" | "error">("booting");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    initLiff(liffId).then((res) => {
      if (cancelled) return;
      if (!res.profile?.userId) {
        setStatus("no-profile");
        return;
      }
      const value = encodeURIComponent(res.profile.userId);
      document.cookie = `liff_user_id=${value}; path=/; max-age=28800; samesite=lax`;
      router.refresh();
    }).catch((err: unknown) => {
      if (cancelled) return;
      setStatus("error");
      setDetail(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
    };
  }, [liffId, router]);

  if (status === "no-profile") {
    return (
      <Card>
        <CardContent className="space-y-2 p-8 text-center">
          <h3 className="text-base font-semibold text-navy-900">ไม่พบโปรไฟล์ LINE</h3>
          <p className="text-sm text-navy-500">
            กรุณาเปิดหน้านี้ผ่านลิงก์ LIFF ในแอป LINE
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardContent className="space-y-2 p-8 text-center">
          <h3 className="text-base font-semibold text-red-600">เชื่อมต่อ LINE ไม่สำเร็จ</h3>
          <p className="text-xs text-navy-500">{detail ?? "ไม่ทราบสาเหตุ"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-center gap-3 p-10 text-sm text-navy-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{hint ?? "กำลังเชื่อมต่อ LINE…"}</span>
      </CardContent>
    </Card>
  );
}
