import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-navy-100">
      <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
      <div
        className="absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 bg-gradient-to-br from-orange-100 via-white to-white blur-3xl opacity-60"
        aria-hidden
      />

      <div className="container-page relative grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7 flex flex-col gap-8 animate-fade-in">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            <Sparkles className="h-3 w-3" />
            HR SaaS ที่ทำงานบน LINE · พัฒนาโดยทีม HR + AI Engineers
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-[64px]">
            ลา · OT · เช็คอิน · สลิป · ตารางงาน
            <br />
            <span className="text-orange-500">จบในแชท LINE ที่ทีมคุณใช้ทุกวัน</span>
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-navy-600 sm:text-xl">
            ระบบ HR ครบทั้งวงจร พร้อม AI ผู้ช่วยส่วนตัว
            <span className="font-semibold text-navy-900"> ไม่ต้องโหลดแอปใหม่ ไม่ต้องเทรนพนักงาน </span>
            แค่เพิ่ม LINE OA เป็นเพื่อน เริ่มใช้ได้เลยภายใน 5 นาที
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="xl" className="shadow-card">
              <Link href="/liff/checkin">
                <MessageCircle className="h-5 w-5" />
                ทดลองใช้ฟรี 30 วัน
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="#pricing">ดูราคาแพ็คเกจ</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-navy-100 pt-8 sm:grid-cols-4 max-w-2xl">
            <Stat value="5 นาที" label="สมัครเสร็จ พร้อมใช้" />
            <Stat value="0 บาท" label="ค่าเทรนพนักงาน" />
            <Stat value="7 ระบบ" label="จบใน LINE OA เดียว" />
            <Stat value="3 ภาษา" label="ไทย / อังกฤษ / จีน" />
          </div>
        </div>

        <div className="lg:col-span-5 relative animate-fade-in">
          <PhoneStack />
        </div>
      </div>

      <div className="border-t border-navy-100 bg-navy-50/40">
        <div className="container-page py-6">
          <p className="text-center text-sm font-medium tracking-wider text-navy-500">
            “ระบบที่ดี ระเบียบที่ง่าย เพียงคลิ้กๆ ก็จบ”
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight text-navy-900">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-navy-500">{label}</div>
    </div>
  );
}

function PhoneStack() {
  return (
    <div className="relative mx-auto h-[600px] w-[320px] sm:h-[640px] sm:w-[340px]">
      <div className="absolute -left-12 top-16 hidden rotate-[-8deg] overflow-hidden rounded-[36px] border border-navy-200 bg-white shadow-card sm:block">
        <Image
          src="/screens/leave-approval-card.png"
          alt="LINE Flex card อนุมัติใบลา"
          width={280}
          height={607}
          className="h-[480px] w-[225px] object-cover"
          priority
        />
      </div>
      <div className="absolute -right-8 top-0 z-10 overflow-hidden rounded-[36px] border-2 border-navy-900 bg-white shadow-card">
        <Image
          src="/screens/leave-form.png"
          alt="ฟอร์มขอลาใน LIFF"
          width={320}
          height={693}
          className="h-[600px] w-[280px] object-cover sm:h-[640px] sm:w-[300px]"
          priority
        />
      </div>
    </div>
  );
}
