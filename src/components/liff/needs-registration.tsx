import Link from "next/link";
import { ArrowRight, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NeedsRegistration({ status }: { status?: "new" | "pending" | "rejected" }) {
  const title =
    status === "pending"   ? "ใบสมัครอยู่ระหว่างพิจารณา" :
    status === "rejected"  ? "ใบสมัครไม่ผ่านการพิจารณา" :
    "ยินดีต้อนรับสู่ LinForge HR";
  const body =
    status === "pending"  ? "ฝ่าย HR / หัวหน้าจะแจ้งผลทาง LINE เมื่อพิจารณาเสร็จ" :
    status === "rejected" ? "ติดต่อ HR หรือหัวหน้าเพื่ออุทธรณ์" :
    "เลือกประเภทบัญชีที่เหมาะกับคุณเพื่อเริ่มใช้งาน — ทดลองฟรี 10 คน × 30 วัน";

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
          {status === "rejected" ? (
            <ShieldCheck className="h-6 w-6 text-navy-700" />
          ) : (
            <UserPlus className="h-6 w-6 text-navy-700" />
          )}
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{title}</h3>
          <p className="mt-1 text-sm text-navy-500">{body}</p>
        </div>
        {(!status || status === "new") && (
          <div className="grid grid-cols-1 gap-2">
            <Button asChild size="lg" className="w-full">
              <Link href="/liff/register">
                <UserPlus className="h-4 w-4" />
                ลงทะเบียนเป็นพนักงาน
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/liff/register-supervisor">
                <Users className="h-4 w-4" />
                ลงทะเบียนเป็นหัวหน้า / เจ้าของกิจการ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
