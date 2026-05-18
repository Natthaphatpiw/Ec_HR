import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CalendarRange,
  Camera,
  ClipboardCheck,
  MapPin,
  QrCode,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "./scroll-reveal";

interface Step {
  no: number;
  badge: string;
  title: string;
  body: string;
  bullets?: string[];
  icon: React.ComponentType<{ className?: string }>;
  images: { src: string; alt: string }[];
  imageStyle?: "qr" | "phone" | "phone-pair";
  /** flip image to the left on alternating rows */
  flip?: boolean;
}

const STEPS: Step[] = [
  {
    no: 1,
    badge: "1 · เพิ่มเพื่อน",
    title: "สแกน QR Code เพิ่ม LINE OA",
    body: "เปิดแอป LINE → ไปที่ Home → กดเครื่องหมาย + → สแกน QR → คุณก็จะเจอ Official Account ของ EC AIHR พร้อมใช้งาน",
    bullets: [
      "ไม่ต้องโหลดแอปอะไรเพิ่ม — ใช้ LINE ที่มีอยู่แล้ว",
      "QR เดียวกันสำหรับทั้งหัวหน้าและพนักงาน",
      "เปิดบนมือถือทุกเครื่องที่มี LINE ได้เลย",
    ],
    icon: QrCode,
    images: [{ src: "/screens/line-qr-add-friend.png", alt: "QR Code เพิ่มเพื่อน LINE OA EC AIHR" }],
    imageStyle: "qr",
  },
  {
    no: 2,
    badge: "2 · กดเพิ่มเพื่อน",
    title: "ยืนยันการเพิ่มเพื่อนใน LINE",
    body: "หลังสแกน QR จะเห็นโปรไฟล์ Official Account แตะ “Add as friend” / “เพิ่มเพื่อน” ระบบจะเด้งทักทายคุณทันที",
    bullets: [
      "ยืนยันชื่อ OA: EC AIHR · Smart HR for Modern Workforce",
      "กด Add แค่ครั้งเดียวต่อบัญชี LINE",
      "ไม่มีการเก็บค่าธรรมเนียมการเพิ่มเพื่อน",
    ],
    icon: UserPlus,
    images: [
      { src: "/screens/start-1.png", alt: "หน้า Add Friend ของ LINE OA" },
      { src: "/screens/start-2.png", alt: "ยืนยันการเพิ่มเพื่อนใน LINE" },
    ],
    imageStyle: "phone-pair",
    flip: true,
  },
  {
    no: 3,
    badge: "3 · เปิดข้อความต้อนรับ",
    title: "เลือกบทบาท: หัวหน้า หรือ พนักงาน",
    body: "ระบบจะส่งข้อความต้อนรับพร้อมลิงก์สำหรับสมัครลงทะเบียน — แยกชัดเจนระหว่างลิงก์สำหรับ “ตัวเจ้านาย/หัวหน้า” และ “พนักงานทั่วไป”",
    bullets: [
      "ลิงก์สีน้ำเงิน “สำหรับตัวเจ้านาย” → กลายเป็น HR/Owner เซ็ตค่าโรงงาน",
      "ลิงก์สีน้ำเงิน “สำหรับพนักงาน” → เข้าโหมดพนักงานทั่วไป",
      "Rich Menu ด้านล่างจอเป็นทางลัดไปทุก ฟีเจอร์ HR",
    ],
    icon: ClipboardCheck,
    images: [{ src: "/screens/start-3.png", alt: "หน้าจอข้อความต้อนรับและลิงก์สมัครลงทะเบียน" }],
    imageStyle: "phone",
  },
  {
    no: 4,
    badge: "4 · กรอกข้อมูลพนักงาน",
    title: "ฟอร์มสมัครงาน 4 ขั้นตอน · ไม่ถึง 2 นาที",
    body: "ระบบดึง LINE userId มาให้อัตโนมัติ คุณกรอกแค่ข้อมูลพื้นฐาน + แนบรูปบัตร/สมุดบัญชี HR จะอนุมัติให้ภายใน 1–2 วันทำการ",
    bullets: [
      "ข้อมูลส่วนตัว → ที่อยู่ → ตำแหน่ง → เอกสาร",
      "อัปโหลดรูปบัตรประชาชน + สมุดบัญชี (เก็บบน Supabase Storage)",
      "เห็นความคืบหน้าทุกขั้นตอน · ออกแบบรองรับมือถือเป็นหลัก",
    ],
    icon: Users,
    images: [
      { src: "/screens/start-4.png", alt: "หน้าฟอร์มลงทะเบียนขั้นที่ 1" },
      { src: "/screens/start-5.png", alt: "หน้าฟอร์มลงทะเบียนขั้นที่ 2" },
    ],
    imageStyle: "phone-pair",
    flip: true,
  },
  {
    no: 5,
    badge: "5 · ใช้งานจริง — ขอลา",
    title: "ขอลาผ่านฟอร์ม → หัวหน้าได้การ์ดอนุมัติใน LINE",
    body: "พนักงานเปิด LIFF ขอลา กรอก 4 ช่อง กดส่ง — หัวหน้าจะได้รับ Flex card ใน LINE พร้อมปุ่ม “อนุมัติ / ไม่อนุมัติ” กดได้ทันที พนักงานได้ผลกลับเป็นการ์ดในแชทเช่นกัน",
    bullets: [
      "ฟอร์มแสดงโควต้าลาคงเหลือก่อนกดส่ง",
      "Flex card หัวหน้าโชว์สถิติการลาประจำปี + reference code",
      "ปฏิเสธ → ระบบขอเหตุผลผ่าน Quick Reply อัตโนมัติ",
    ],
    icon: ClipboardCheck,
    images: [
      { src: "/screens/leave-form.png", alt: "หน้าฟอร์มขอลา" },
      { src: "/screens/leave-approval-card.png", alt: "การ์ดอนุมัติใบลาใน LINE" },
    ],
    imageStyle: "phone-pair",
  },
  {
    no: 6,
    badge: "6 · เข้า-ออกงาน",
    title: "เช็คอินด้วย GPS + IP + รูปยืนยัน",
    body: "หน้าจอเช็คอินตรวจระยะกับ geofence ของโรงงาน + IP whitelist ของ Wi-Fi + ถ่ายรูปประกอบ (optional) — ป้องกันการปั๊มบัตรแทนกันโดยอัตโนมัติ",
    bullets: [
      "เห็น Distance / Radius / Accuracy แบบสด ก่อนกดเข้างาน",
      "ทำงานทั้งใน LINE in-app browser และเบราว์เซอร์ปกติ",
      "ทุกการ clock-in / clock-out มี audit trail",
    ],
    icon: MapPin,
    images: [{ src: "/screens/clock-in.png", alt: "หน้าจอเช็คอินพร้อม geofence" }],
    imageStyle: "phone",
    flip: true,
  },
  {
    no: 7,
    badge: "7 · จัดการตารางงาน",
    title: "ตารางของฉัน · ตารางของลูกน้อง — สลับใน 1 ปุ่ม",
    body: "พนักงานจัดตารางตัวเองแบบ tap-to-edit ใน grid 7×3 (ทำงาน · OT · ลา) · ส่วนหัวหน้าเห็นกล่องของลูกน้องในมุมมองเดียวกัน สร้าง assignment + multi-select ติ๊กชื่อทั้งทีมพร้อมกัน · ระบบ push LINE แจ้งทุกคนอัตโนมัติ",
    bullets: [
      "Grid 7×3 (จันทร์-อาทิตย์ × ทำงาน/OT/ลา) แตะกล่องเพื่อตั้งชั่วโมง",
      "กล่องที่ supervisor ล็อก → พนักงานแก้ไม่ได้ ป้องกัน conflict",
      "Supervisor edit → trigger ส่ง Flex card แจ้งพนักงานทันที พร้อมปุ่มเปิดดูตารางตัวเอง",
    ],
    icon: CalendarRange,
    images: [
      { src: "/screens/schedule-self.png", alt: "จัดตารางงานของตัวเอง" },
      { src: "/screens/schedule-team.png", alt: "จัดตารางงานของลูกน้อง (มุมมองหัวหน้า)" },
    ],
    imageStyle: "phone-pair",
  },
];

export function LandingGettingStarted() {
  return (
    <section
      id="getting-started"
      className="relative overflow-hidden border-b border-navy-100 bg-gradient-to-b from-white via-orange-50/30 to-white py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-orange-200/50 blur-3xl animate-blob" />
        <div className="absolute -right-20 top-1/2 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl animate-blob [animation-delay:-6s]" />
      </div>

      <div className="container-page relative">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3 w-3" />
              เริ่มทดลองใช้ฟรี 30 วัน · ไม่ต้องผูกบัตร
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 sm:text-5xl">
              เริ่มใช้ใน <span className="text-orange-500">7 ขั้นตอน</span>
              <br />
              <span className="text-2xl font-medium text-navy-600 sm:text-3xl">
                ตั้งแต่สแกน QR จนพนักงานคนแรกใช้งานจริง
              </span>
            </h2>
            <p className="mt-4 text-base text-navy-600 sm:text-lg">
              ทุกขั้นตอนมีภาพหน้าจอจริงให้ดู — เห็นแล้วทำตามได้เลยโดยไม่ต้องโทรถามทีมเซ็ตอัพ
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-16 space-y-16 sm:space-y-24">
          {STEPS.map((step) => (
            <StepBlock key={step.no} step={step} />
          ))}
        </div>

        <ScrollReveal delay={100}>
          <div className="mt-20 overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-emerald-50 p-8 text-center sm:p-12">
            <h3 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
              พร้อมเริ่มใน 5 นาที?
            </h3>
            <p className="mt-2 text-sm text-navy-600 sm:text-base">
              สแกน QR ด้านบน หรือกดปุ่มด้านล่างเพื่อทดลองใช้งานจริงในเดโม่
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="xl" className="animate-pulse-glow">
                <Link href="/liff/checkin">
                  ทดลองใช้ฟรี 30 วัน
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="#pricing">ดูราคาแพ็คเกจ</Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function StepBlock({ step }: { step: Step }) {
  const Icon = step.icon;
  const flipClass = step.flip ? "lg:flex-row-reverse" : "lg:flex-row";

  return (
    <ScrollReveal>
      <article className={`relative flex flex-col gap-10 lg:items-center lg:gap-16 ${flipClass}`}>
        {/* vertical connector dot + line (decorative) */}
        <div className="pointer-events-none absolute -left-2 top-0 hidden h-full w-px lg:block">
          <div className="sticky top-1/2 -translate-y-1/2">
            <div className="flex h-10 w-10 -translate-x-[19px] items-center justify-center rounded-full border border-orange-200 bg-white text-xs font-bold text-orange-600 shadow-soft animate-bounce-soft">
              {step.no.toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <ScrollReveal delay={100} direction="left">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
              <Icon className="h-3.5 w-3.5" />
              {step.badge}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200} direction="left">
            <h3 className="text-2xl font-semibold leading-tight text-navy-900 sm:text-3xl">
              {step.title}
            </h3>
          </ScrollReveal>
          <ScrollReveal delay={300} direction="left">
            <p className="text-base leading-relaxed text-navy-600">{step.body}</p>
          </ScrollReveal>
          {step.bullets && (
            <ScrollReveal delay={400} direction="left">
              <ul className="space-y-2">
                {step.bullets.map((b, i) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-navy-700 animate-fade-in-up"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}
        </div>

        <ScrollReveal delay={250} direction={step.flip ? "right" : "left"} className="flex-1">
          <StepImage step={step} />
        </ScrollReveal>
      </article>

      {/* mobile-only down arrow between steps */}
      <div className="mt-10 flex justify-center lg:hidden">
        <ArrowDown className="h-5 w-5 text-orange-400 animate-bounce-soft" />
      </div>
    </ScrollReveal>
  );
}

function StepImage({ step }: { step: Step }) {
  if (step.imageStyle === "qr") {
    const img = step.images[0];
    return (
      <div className="relative mx-auto w-fit">
        <div className="absolute inset-0 -m-6 rounded-3xl bg-gradient-to-br from-orange-200/60 to-emerald-200/60 blur-2xl animate-blob" />
        <div className="relative rounded-3xl border-2 border-navy-900 bg-white p-6 shadow-card animate-float">
          <Image
            src={img.src}
            alt={img.alt}
            width={320}
            height={500}
            className="h-[380px] w-[280px] object-contain"
          />
          <div className="mt-3 text-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-navy-500">LINE Official Account</div>
            <div className="text-sm font-bold text-navy-900">EC AIHR · Smart HR</div>
          </div>
        </div>
        <div className="absolute -right-4 -top-4 rotate-12 rounded-xl bg-orange-400 px-3 py-1.5 text-xs font-bold text-white shadow-card">
          สแกนเลย!
        </div>
      </div>
    );
  }

  if (step.imageStyle === "phone") {
    const img = step.images[0];
    return (
      <div className="relative mx-auto w-fit">
        <div className="absolute inset-0 -m-6 rounded-[40px] bg-gradient-to-br from-orange-200/50 to-emerald-200/40 blur-2xl animate-blob" />
        <div className="relative overflow-hidden rounded-[36px] border-2 border-navy-900 bg-white shadow-card animate-float">
          <Image
            src={img.src}
            alt={img.alt}
            width={320}
            height={693}
            className="h-[560px] w-[260px] object-cover sm:h-[600px] sm:w-[280px]"
          />
        </div>
      </div>
    );
  }

  // phone-pair
  return (
    <div className="relative mx-auto h-[520px] w-[320px] sm:h-[600px] sm:w-[380px]">
      <div className="absolute inset-0 -m-6 rounded-[40px] bg-gradient-to-br from-orange-200/40 to-emerald-200/40 blur-2xl animate-blob" />
      <div className="absolute -left-4 top-8 z-0 overflow-hidden rounded-[32px] border border-navy-200 bg-white shadow-card animate-float-slow">
        <Image
          src={step.images[0].src}
          alt={step.images[0].alt}
          width={240}
          height={520}
          className="h-[440px] w-[210px] object-cover sm:h-[480px] sm:w-[230px]"
        />
      </div>
      <div className="absolute -right-2 top-0 z-10 overflow-hidden rounded-[36px] border-2 border-navy-900 bg-white shadow-card animate-float [animation-delay:-1s]">
        <Image
          src={step.images[1].src}
          alt={step.images[1].alt}
          width={260}
          height={560}
          className="h-[480px] w-[220px] object-cover sm:h-[540px] sm:w-[240px]"
        />
      </div>
    </div>
  );
}
