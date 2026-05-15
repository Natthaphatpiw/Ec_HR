import {
  CloudCog,
  DatabaseZap,
  Globe,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wrench,
} from "lucide-react";

const REASONS = [
  {
    icon: MessageCircle,
    title: "ไม่ต้องโหลดแอปใหม่",
    body: "พนักงานทุกคนมี LINE อยู่แล้ว เพิ่ม OA เป็นเพื่อน เริ่มใช้ได้เลย — 0 บาทค่าเทรน",
  },
  {
    icon: Sparkles,
    title: "AI ที่เข้าใจ HR คนไทย",
    body: "พัฒนาโดยทีม HR + AI ใช้ Claude Sonnet 4.6 ตอบเป็นภาษาไทย/อังกฤษ/จีน",
  },
  {
    icon: DatabaseZap,
    title: "เราดูแลฐานข้อมูลให้",
    body: "Managed Supabase + RLS + audit log — คุณไม่ต้องจ้าง IT มาตั้ง server เอง",
  },
  {
    icon: ShieldCheck,
    title: "ป้องกันการโกงเวลา 3 ชั้น",
    body: "Geofence + IP whitelist + Photo verify — ทั้ง onsite และ remote ใช้ได้",
  },
  {
    icon: Smartphone,
    title: "ออกแบบ mobile-first",
    body: "UI กระชับ ใช้นิ้วเดียวได้จบ ผ่านการทดสอบกับโรงงานจริงในไทย",
  },
  {
    icon: CloudCog,
    title: "ติดตั้งใน 1 ชั่วโมง",
    body: "เซ็ต LINE OA + LIFF + database พร้อม seed data — เริ่มขึ้นระบบจริงในวันเดียว",
  },
  {
    icon: Globe,
    title: "รองรับโรงงาน + Remote",
    body: "Geofence สำหรับ onsite, photo-only สำหรับ remote, ปรับนโยบายได้ตามแผนก",
  },
  {
    icon: Wrench,
    title: "API + Webhook ปรับแต่งต่อได้",
    body: "เปิด Mastra agent tools + REST API ต่อกับ payroll/ERP ของคุณได้",
  },
];

export function LandingWhy() {
  return (
    <section className="border-b border-navy-100 bg-white py-20 sm:py-24" id="why">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
            ทำไมต้อง EC AIHR
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            ระบบ HR หลายเจ้า — เลือกของเราเพราะอะไร
          </h2>
          <p className="mt-4 text-base text-navy-600 sm:text-lg">
            เราโฟกัสที่ความเรียบง่ายของผู้ใช้ คุณภาพของข้อมูล และการดูแลที่ไม่ทอดทิ้งหลังขาย
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-navy-100 bg-white p-5 transition-colors hover:border-orange-200 hover:bg-orange-50/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-orange-400">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-navy-900">{r.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
