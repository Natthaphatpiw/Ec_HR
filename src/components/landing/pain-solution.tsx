import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

const PAIRS: { pain: string; solution: string; sub: string }[] = [
  {
    pain: "พนักงานลืมส่งใบลา หาฟอร์มไม่เจอ",
    solution: "ส่งใบลาผ่าน LINE ใน 3 วินาที",
    sub: "เปิด LIFF กรอกฟอร์ม กดส่ง — แทบไม่ต้องเทรน",
  },
  {
    pain: "หัวหน้าอนุมัติช้า ลูกน้องรอเก้อ",
    solution: "Flex card เข้ามือถือ กดอนุมัติทันที",
    sub: "ไม่ต้องเปิดเว็บ ไม่ต้องล็อกอินใหม่",
  },
  {
    pain: "พนักงานโกงเวลา / ปั๊มบัตรแทนกัน",
    solution: "GPS + IP + รูปยืนยัน 3 ชั้น",
    sub: "Geofence ตรวจระยะ พร้อม IP whitelist ของโรงงาน",
  },
  {
    pain: "Excel 10 แผ่น ตามไม่ทัน ตัวเลขไม่ตรง",
    solution: "ทุกอย่างในฐานข้อมูลเดียว ดูสด",
    sub: "เราดูแล Supabase ให้ ไม่ต้องจ้าง IT มาตั้ง server",
  },
];

export function LandingPainSolution() {
  return (
    <section className="border-b border-navy-100 bg-white py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-700">
            ปัญหาที่ HR เจอทุกวัน
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            หยุดเสียเวลากับงานเอกสาร
            <br />
            <span className="text-orange-500">เริ่มใช้ LINE ที่ทุกคนมีอยู่แล้ว</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PAIRS.map((p) => (
            <div
              key={p.pain}
              className="grid gap-0 overflow-hidden rounded-2xl border border-navy-100 shadow-soft sm:grid-cols-[1fr_auto_1fr]"
            >
              <div className="flex flex-col gap-2 bg-navy-50/40 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-500">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  ก่อน
                </div>
                <p className="text-sm font-medium text-navy-700">{p.pain}</p>
              </div>
              <div className="hidden items-center justify-center bg-white px-2 sm:flex">
                <ArrowRight className="h-4 w-4 text-orange-400" />
              </div>
              <div className="flex flex-col gap-2 bg-orange-50/50 p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  หลัง
                </div>
                <p className="text-sm font-semibold text-navy-900">{p.solution}</p>
                <p className="text-xs text-navy-500">{p.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
