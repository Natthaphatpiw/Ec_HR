import Link from "next/link";
import { LogOut } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function LiffSignedOutPage() {
  return <><LiffHeader title="ออกจากระบบ" /><main className="px-4 py-6"><Card><CardContent className="space-y-4 p-6 text-center">
    <LogOut className="mx-auto h-8 w-8 text-navy-900" />
    <h1 className="text-lg font-semibold text-navy-900">ออกจากระบบแล้ว</h1>
    <p className="text-sm text-navy-500">หากใช้เครื่องร่วมกับผู้อื่น ควรปิดหน้านี้เมื่อใช้งานเสร็จ</p>
    <Button asChild className="w-full"><Link href="/liff">เข้าสู่ระบบอีกครั้ง</Link></Button>
  </CardContent></Card></main></>;
}
