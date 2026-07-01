import Link from "next/link";
import { ArrowRight, Link2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NeedsRegistration({ status }: { status?: "new" | "pending" | "rejected" }) {
  const title =
    status === "pending"   ? "ใบสมัครอยู่ระหว่างพิจารณา" :
    status === "rejected"  ? "ใบสมัครไม่ผ่านการพิจารณา" :
    "ยินดีต้อนรับสู่ EC AIHR";
  const body =
    status === "pending"  ? "ฝ่าย HR / หัวหน้าจะแจ้งผลทาง LINE เมื่อพิจารณาเสร็จ" :
    status === "rejected" ? "ติดต่อ HR หรือหัวหน้าเพื่ออุทธรณ์" :
    "หัวหน้า / เจ้าของกิจการเปิดบริษัทที่นี่ — ทดลองฟรี 10 คน × 30 วัน";

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
          {status === "rejected" ? (
            <ShieldCheck className="h-6 w-6 text-navy-700" />
          ) : (
            <Users className="h-6 w-6 text-navy-700" />
          )}
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{title}</h3>
          <p className="mt-1 text-sm text-navy-500">{body}</p>
        </div>
        {(!status || status === "new") && (
          <div className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/liff/register-supervisor">
                <Users className="h-4 w-4" />
                ลงทะเบียนเป็นหัวหน้า / เจ้าของกิจการ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-start gap-2 rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-left text-[12px] leading-relaxed text-navy-600">
              <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" />
              <span>
                เป็นพนักงาน? เข้าร่วมบริษัทได้โดยเปิด "ลิงก์คำเชิญ" หรือสแกน QR
                ที่หัวหน้าของคุณแชร์ให้
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
