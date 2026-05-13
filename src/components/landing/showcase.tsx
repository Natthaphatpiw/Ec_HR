import Image from "next/image";
import { CalendarRange, Camera, ClipboardList, MapPin, MessageSquare, Sparkles, Users } from "lucide-react";

interface FeatureSlide {
  badge: string;
  title: string;
  body: string;
  bullets: string[];
  image: string;
  alt: string;
  icon: React.ComponentType<{ className?: string }>;
  flip?: boolean;
}

const SLIDES: FeatureSlide[] = [
  {
    badge: "ฟอร์มลา",
    title: "ขอลา แค่กดในแชท LINE",
    body: "พนักงานเห็นโควต้าลาที่เหลือทันที กรอกฟอร์ม 4 ช่อง แล้วกดส่ง — ระบบจะส่ง Flex card ให้หัวหน้ากดอนุมัติใน LINE โดยตรง",
    bullets: [
      "ระบุประเภทลา / ช่วงวันที่ / เหตุผล ใน 30 วินาที",
      "เห็นสถานะคำขอแบบสด ในกล่องแชทเดียวกัน",
      "ไม่ต้องโทรตาม ไม่ต้องเปิดเว็บ",
    ],
    image: "/screens/leave-form.png",
    alt: "ฟอร์มขอลาใน LIFF",
    icon: ClipboardList,
  },
  {
    badge: "อนุมัติบน LINE",
    title: "หัวหน้ากดอนุมัติได้ทันที จากการ์ดที่ส่งเข้ามือถือ",
    body: "Flex card แสดงรายละเอียดคำขอ + สถิติการลาประจำปี กดปุ่ม “อนุมัติ” / “ไม่อนุมัติ” ตรงในแชท พนักงานได้ผลกลับเป็นการ์ดทันที",
    bullets: [
      "ดูยอดการลาคงเหลือก่อนตัดสินใจ",
      "ถ้าไม่อนุมัติ ระบุเหตุผลผ่าน Quick Reply",
      "บันทึก audit trail ในระบบครบทุกขั้นตอน",
    ],
    image: "/screens/leave-approval-card.png",
    alt: "การ์ดอนุมัติใบลาใน LINE",
    icon: MessageSquare,
    flip: true,
  },
  {
    badge: "เช็คอินป้องกันโกง",
    title: "GPS + IP + รูปยืนยัน 3 ชั้น ในการกดเดียว",
    body: "Geofence ตรวจตำแหน่งกับโรงงาน + IP whitelist ของ Wi-Fi ที่ทำงาน + ถ่ายรูปใบหน้าประกอบ — เหมาะทั้งงาน onsite และทีม remote",
    bullets: [
      "Distance / Radius / Accuracy แสดงสด ก่อนกดเข้างาน",
      "บันทึกตำแหน่งและ IP ทุกครั้ง audit ย้อนหลังได้",
      "รูปประจำตัวเป็น optional ตามนโยบายบริษัท",
    ],
    image: "/screens/clock-in.png",
    alt: "หน้าจอเช็คอิน-ออกงาน",
    icon: MapPin,
  },
  {
    badge: "จัดตารางตัวเอง",
    title: "Drag-drop ตารางทำงาน-OT-ลา ในมือถือ",
    body: "ดูสัปดาห์ปัจจุบันเป็นตาราง 7×3 พนักงานแตะกล่องเพื่อระบุชั่วโมงทำงานปกติ OT หรือวันลา — ส่งให้หัวหน้าได้ในคลิกเดียว",
    bullets: [
      "ตารางจันทร์-อาทิตย์ ดูง่าย ไม่ต้องเรียน",
      "เลื่อนสัปดาห์ก่อนหน้า/ถัดไปได้อิสระ",
      "กล่องที่ถูกหัวหน้าล็อกจะแก้ไม่ได้",
    ],
    image: "/screens/schedule-self.png",
    alt: "จัดตารางงานตัวเองรายสัปดาห์",
    icon: CalendarRange,
    flip: true,
  },
  {
    badge: "จัดการลูกน้อง",
    title: "หัวหน้าจัดตารางทั้งทีมในหน้าเดียว",
    body: "เห็นกล่องของลูกน้องทั้งสัปดาห์ในมุมมองเดียว สร้างกล่องใหม่แล้วติ๊กพนักงานหลายคนพร้อมกัน — ระบบ push LINE แจ้งทุกคนอัตโนมัติเมื่อตารางถูกแก้",
    bullets: [
      "เห็น count + ค่าเฉลี่ยชั่วโมงต่อกล่อง",
      "Override ใช้กล่องของหัวหน้าเป็นหลัก ปลอดภัยเรื่องลำดับชั้น",
      "แจ้งพนักงานผ่าน Flex card พร้อมปุ่มเปิดดูตาราง",
    ],
    image: "/screens/schedule-team.png",
    alt: "จัดตารางงานลูกน้องสำหรับหัวหน้า",
    icon: Users,
  },
  {
    badge: "AI Assistant",
    title: "ผู้ช่วย AI ของ HR ในกระเป๋าคุณ",
    body: "AI ที่อ่านข้อมูลการเข้างาน ลา OT สลิป และตารางกะของบริษัทได้ตลอดเวลา ถามภาษาคนเหมือนคุยกับผู้ช่วย — รองรับ ไทย / อังกฤษ / จีน",
    bullets: [
      "สรุปสถิติ, จัดอันดับ KPI, ทำนายการขาดงาน",
      "ร่างประกาศใน 3 ภาษาให้อัตโนมัติ",
      "พัฒนาบน Claude Sonnet 4.6 + Mastra agent framework",
    ],
    image: "/screens/ai-chat.png",
    alt: "แชทกับผู้ช่วย AI ForgeHR",
    icon: Sparkles,
    flip: true,
  },
  {
    badge: "ขอเข้าพบหัวหน้า",
    title: "นัดพบหัวหน้าโดยไม่ต้องเดินไปเคาะประตู",
    body: "ระบุวันที่ + ช่วงเวลา + หัวข้อที่อยากปรึกษา หัวหน้ายืนยันหรือเลื่อนนัดผ่าน Flex card ใน LINE — เก็บประวัติการเจอกันให้อัตโนมัติ",
    bullets: [
      "ฟอร์มกระชับ ใช้ได้ทุกตำแหน่ง",
      "หัวหน้ารับการ์ดทันทีในแชท ไม่พลาดนัด",
      "Audit trail สำหรับ HR review",
    ],
    image: "/screens/contact-supervisor.png",
    alt: "ฟอร์มขอนัดพบหัวหน้างาน",
    icon: Camera,
  },
];

export function LandingShowcase() {
  return (
    <section className="border-b border-navy-100 bg-navy-50/40 py-20 sm:py-24" id="features">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-700">
            7 ฟีเจอร์หลัก ใน 1 LINE OA
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            ทุกอย่างที่ทีม HR ทำซ้ำ ๆ ทุกวัน
            <br />
            <span className="text-orange-500">ย้ายเข้ามาอยู่บน LINE ที่พนักงานคุ้นมือ</span>
          </h2>
        </div>

        <div className="mt-16 space-y-20">
          {SLIDES.map((slide) => (
            <Slide key={slide.title} slide={slide} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Slide({ slide }: { slide: FeatureSlide }) {
  const Icon = slide.icon;
  const flipClass = slide.flip ? "lg:flex-row-reverse" : "lg:flex-row";
  return (
    <article className={`flex flex-col gap-10 lg:items-center lg:gap-16 ${flipClass}`}>
      <div className="flex-1 space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
          <Icon className="h-3.5 w-3.5" />
          {slide.badge}
        </div>
        <h3 className="text-2xl font-semibold leading-tight text-navy-900 sm:text-3xl">
          {slide.title}
        </h3>
        <p className="text-base leading-relaxed text-navy-600">{slide.body}</p>
        <ul className="space-y-2">
          {slide.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-navy-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex-1">
        <div className="absolute inset-x-12 -top-4 hidden h-full rounded-[40px] bg-gradient-to-br from-orange-100 to-navy-100 opacity-50 blur-2xl lg:block" />
        <div className="relative mx-auto w-fit overflow-hidden rounded-[36px] border-2 border-navy-900 bg-white shadow-card">
          <Image
            src={slide.image}
            alt={slide.alt}
            width={320}
            height={693}
            className="h-[560px] w-[260px] object-cover sm:h-[600px] sm:w-[280px]"
          />
        </div>
      </div>
    </article>
  );
}
