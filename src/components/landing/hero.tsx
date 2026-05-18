import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";

const MARQUEE_TAGS = [
  "ลา · OT · เช็คอิน · สลิป · ตารางงาน",
  "AI ผู้ช่วย 3 ภาษา",
  "เพิ่ม LINE OA · 5 นาทีพร้อมใช้",
  "0 บาท ค่าเทรนพนักงาน",
  "Geofence + IP + รูปยืนยัน 3 ชั้น",
  "เริ่มต้น $100 / เดือน",
  "ทดลองฟรี 30 วัน · ไม่ผูกบัตร",
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-navy-100">
      {/* animated background blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-orange-200/60 blur-3xl animate-blob" />
        <div className="absolute top-32 -right-24 h-[480px] w-[480px] rounded-full bg-orange-100/60 blur-3xl animate-blob [animation-delay:-4s]" />
        <div className="absolute bottom-0 left-1/2 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-emerald-100/40 blur-3xl animate-blob [animation-delay:-8s]" />
      </div>
      <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />

      <div className="container-page relative grid gap-12 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7 flex flex-col gap-8">
          <ScrollReveal direction="down" delay={50}>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <Sparkles className="h-3 w-3 animate-pulse" />
              HR SaaS ที่ทำงานบน LINE · พัฒนาโดยทีม HR + AI Engineers
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-[64px]">
              ลา · OT · เช็คอิน · สลิป · ตารางงาน
              <br />
              <span className="relative inline-block">
                <span
                  className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-600 bg-clip-text text-transparent"
                  style={{ backgroundSize: "200% 100%" }}
                >
                  <span className="animate-shimmer bg-gradient-to-r from-orange-500 via-orange-300 to-orange-500 bg-clip-text text-transparent" style={{ backgroundSize: "200% 100%" }}>
                    จบในแชท LINE ที่ทีมคุณใช้ทุกวัน
                  </span>
                </span>
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={250}>
            <p className="max-w-2xl text-lg leading-relaxed text-navy-600 sm:text-xl">
              ระบบ HR ครบทั้งวงจร พร้อม AI ผู้ช่วยส่วนตัว
              <span className="font-semibold text-navy-900"> ไม่ต้องโหลดแอปใหม่ ไม่ต้องเทรนพนักงาน </span>
              แค่เพิ่ม LINE OA เป็นเพื่อน เริ่มใช้ได้เลยภายใน 5 นาที
            </p>
          </ScrollReveal>

          <ScrollReveal delay={350}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="xl" className="shadow-card animate-pulse-glow">
                <Link href="#getting-started">
                  <MessageCircle className="h-5 w-5" />
                  ทดลองใช้ฟรี 30 วัน
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="group">
                <Link href="#pricing">
                  ดูราคาแพ็คเกจ
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={450}>
            <div className="grid grid-cols-2 gap-6 border-t border-navy-100 pt-8 sm:grid-cols-4 max-w-2xl">
              <Stat value="5 นาที" label="สมัครเสร็จ พร้อมใช้" />
              <Stat value="0 บาท" label="ค่าเทรนพนักงาน" />
              <Stat value="7 ระบบ" label="จบใน LINE OA เดียว" />
              <Stat value="3 ภาษา" label="ไทย / อังกฤษ / จีน" />
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal direction="left" delay={300} className="lg:col-span-5 relative">
          <PhoneStack />
        </ScrollReveal>
      </div>

      {/* Marquee trust strip */}
      <div className="relative border-t border-navy-100 bg-navy-50/40">
        <div className="overflow-hidden">
          <div className="flex animate-marquee items-center gap-12 whitespace-nowrap py-5 [animation-duration:40s] hover:[animation-play-state:paused]">
            {[...MARQUEE_TAGS, ...MARQUEE_TAGS].map((tag, i) => (
              <span key={i} className="flex items-center gap-3 text-sm font-medium text-navy-500">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="container-page py-4">
          <p className="text-center text-sm font-semibold tracking-wider text-navy-700">
            “ระบบที่ดี ระเบียบที่ง่าย เพียงคลิ้กๆ ก็จบ”
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="group">
      <div className="text-2xl font-bold tracking-tight text-navy-900 transition-transform group-hover:scale-105">
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-navy-500">{label}</div>
    </div>
  );
}

function PhoneStack() {
  return (
    <div className="relative mx-auto h-[600px] w-[320px] sm:h-[640px] sm:w-[340px]">
      {/* floating badges around the phones */}
      <FloatingBadge
        className="absolute -left-6 top-6 hidden animate-float lg:flex"
        icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
        title="Geofence verified"
        body="ThaiAuto Factory · 142m"
      />
      <FloatingBadge
        className="absolute -right-2 bottom-24 hidden animate-float-reverse [animation-delay:-2s] lg:flex"
        icon={<Zap className="h-4 w-4 text-orange-500" />}
        title="Clock-in 08:02"
        body="EMP001 · ตรงเวลา"
      />

      {/* back phone tilted */}
      <div className="absolute -left-12 top-16 hidden overflow-hidden rounded-[36px] border border-navy-200 bg-white shadow-card animate-float-slow sm:block">
        <Image
          src="/screens/leave-approval-card.png"
          alt="LINE Flex card อนุมัติใบลา"
          width={280}
          height={607}
          className="h-[480px] w-[225px] object-cover"
          priority
        />
      </div>

      {/* front phone — main hero */}
      <div className="absolute -right-8 top-0 z-10 overflow-hidden rounded-[36px] border-2 border-navy-900 bg-white shadow-card animate-float [animation-delay:-1s]">
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

function FloatingBadge({
  className,
  icon,
  title,
  body,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className={`z-20 items-center gap-2 rounded-xl border border-navy-100 bg-white/95 p-3 shadow-card backdrop-blur ${className ?? ""}`}
    >
      <div className="rounded-md bg-emerald-50 p-1.5">{icon}</div>
      <div>
        <div className="text-xs font-semibold text-navy-900">{title}</div>
        <div className="text-[11px] text-navy-500">{body}</div>
      </div>
    </div>
  );
}
