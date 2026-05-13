import Link from "next/link";
import { ArrowRight, Check, MessageCircle, PhoneCall, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STARTER_INCLUDED = [
  "ระบบครบทั้ง 7 ฟีเจอร์ — ลา · OT · เช็คอิน · สลิป · ตารางงาน · AI · ขอเข้าพบ",
  "LINE OA setup + LIFF 7 apps + Messaging API + Rich Menu",
  "Database พื้นฐาน (Supabase) + audit log",
  "ติดตั้งให้ถึงโรงงาน · เทรนทีม HR 1 ครั้ง",
  "Support ทาง LINE + email — ตอบใน 24 ชม.",
  "ผู้ช่วย AI ภาษาไทย/อังกฤษ/จีน รวมในแพ็คเกจ",
];

export function LandingFinalCta() {
  return (
    <section id="pricing" className="relative overflow-hidden border-b border-navy-100 py-20 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-white" aria-hidden />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            แพ็คเกจสำหรับ SME
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
            เริ่มต้นเพียง <span className="text-orange-500">$100</span> ต่อเดือน
          </h2>
          <p className="mt-3 text-base text-navy-600 sm:text-lg">
            ทดลองใช้ฟรี 30 วัน — ไม่ต้องผูกบัตร ไม่มีค่า onboarding ซ่อน
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-navy-100 bg-navy-900 text-white shadow-card">
          <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-7">
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-300">
                LinForge HR · Starter
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-6xl font-bold tracking-tight text-white sm:text-7xl">$100</span>
                <span className="text-sm text-navy-300">/ เดือน</span>
              </div>
              <p className="mt-3 text-sm text-navy-300">
                สำหรับทีมเริ่มต้น ≤ 30 คน · บิลรายเดือน ยกเลิกได้ตลอด · ลด 20% ถ้าจ่ายรายปี
              </p>

              <ul className="mt-6 space-y-2.5">
                {STARTER_INCLUDED.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-navy-100">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-5">
              <Button asChild size="xl" className="w-full justify-center">
                <Link href="/liff/checkin">
                  <MessageCircle className="h-5 w-5" />
                  ทดลองใช้ฟรี 30 วัน
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="w-full justify-center border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="https://line.me/R/ti/p/@linforgehr">
                  <PhoneCall className="h-5 w-5" />
                  ปรึกษาฝ่ายขาย (LINE)
                </Link>
              </Button>
              <p className="text-center text-xs text-navy-300">
                หรือโทร 02-XXX-XXXX (จันทร์–ศุกร์ 9:00–18:00)
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/20 px-8 py-5 text-center text-sm text-navy-200 sm:px-12">
            “ลดเวลาทำเอกสาร HR ลง 70% ในเดือนแรก” — โรงงานชิ้นส่วนยานยนต์ในชลบุรี 120 คน
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="#contact-sales"
            className="group inline-flex items-center gap-2 text-xs text-navy-500 transition-colors hover:text-orange-600"
          >
            <Sparkles className="h-3 w-3" />
            <span>
              ทีมใหญ่กว่า 30 คน หรือต้องการ <span className="underline-offset-2 group-hover:underline">Managed Database + AI ขั้นสูง</span> — มีแพ็คเกจ Pro / Enterprise แยก
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
