import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NeedsRegistration({ status }: { status?: "new" | "pending" | "rejected" }) {
  const title =
    status === "pending"   ? "ใบสมัครอยู่ระหว่างพิจารณา" :
    status === "rejected"  ? "ใบสมัครไม่ผ่านการพิจารณา" :
    "ยังไม่มีบัญชีพนักงาน";
  const body =
    status === "pending"  ? "ฝ่าย HR จะแจ้งผลทาง LINE เมื่อพิจารณาเสร็จ" :
    status === "rejected" ? "ติดต่อ HR หากต้องการอุทธรณ์" :
    "กรุณาสมัครพนักงานใหม่เพื่อใช้งานระบบ";

  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
          <UserPlus className="h-6 w-6 text-navy-700" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{title}</h3>
          <p className="mt-1 text-sm text-navy-500">{body}</p>
        </div>
        {(!status || status === "new") && (
          <Button asChild size="lg" className="w-full">
            <Link href="/liff/register">
              ลงทะเบียนพนักงานใหม่
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
