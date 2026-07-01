"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildInviteQrPath, buildInviteUrl } from "@/lib/invite";
import { cn } from "@/lib/utils";
import { regenerateMyInvite } from "@/app/liff/invite/actions";

export function InvitePanel({
  token: initialToken,
}: {
  token: string;
  businessName: string;
}) {
  const [token, setToken] = useState(initialToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const shareUrl = buildInviteUrl(token);
  const qr = buildInviteQrPath(token);

  function copy() {
    if (!navigator.clipboard) {
      toast.error("อุปกรณ์ไม่รองรับการคัดลอก");
      return;
    }
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("คัดลอกลิงก์แล้ว");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function regenerate() {
    startTransition(async () => {
      const res = await regenerateMyInvite();
      if (!res.ok || !res.token) {
        toast.error(res.message ?? "สร้างลิงก์ใหม่ไม่สำเร็จ");
        return;
      }
      setToken(res.token);
      toast.success("สร้างลิงก์ใหม่แล้ว — ลิงก์เดิมใช้ไม่ได้อีก");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto w-fit rounded-2xl border border-navy-100 bg-white p-3 shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={token}
              src={qr}
              alt="invite QR"
              width={220}
              height={220}
              className="h-[220px] w-[220px]"
            />
          </div>

          <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-left">
            <div className="text-[11px] uppercase tracking-wider text-navy-500">ลิงก์คำเชิญ</div>
            <div className="mt-1 break-all text-xs text-navy-700">{shareUrl}</div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button type="button" size="lg" onClick={copy}>
              <Copy className="h-4 w-4" />
              {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={regenerate} disabled={pending}>
              <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
              สร้างลิงก์ใหม่ (ยกเลิกลิงก์เดิม)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-[12px] leading-relaxed text-navy-600">
        วิธีใช้: ส่งลิงก์นี้ในกลุ่ม LINE ของทีม หรือให้พนักงานสแกน QR —
        เมื่อพนักงานกรอกข้อมูลเสร็จ คุณจะได้การ์ดอนุมัติทาง LINE เพื่อยืนยันแต่ละคน
      </div>
    </div>
  );
}
