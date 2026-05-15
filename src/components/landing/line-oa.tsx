import Image from "next/image";
import { CheckCircle2, MessageCircle } from "lucide-react";

const MENU_ITEMS = [
  { label: "ขอลางาน", sub: "ดูโควต้าคงเหลือทันที" },
  { label: "ขอ OT", sub: "คำนวณค่าล่วงเวลาให้อัตโนมัติ" },
  { label: "สลิปเงินเดือน", sub: "ดูย้อนหลังได้ทุกเดือน" },
  { label: "ประวัติ / ตารางงาน", sub: "drag-drop จัดสัปดาห์เอง" },
  { label: "เข้า-ออกงาน", sub: "GPS + IP + รูป 3 ชั้น" },
  { label: "ติดต่อหัวหน้า / AI", sub: "ขอนัด หรือถาม AI ผู้ช่วย" },
];

export function LandingLineOa() {
  return (
    <section className="border-b border-navy-100 bg-white py-20 sm:py-24">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-6 order-2 space-y-6 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <MessageCircle className="h-3 w-3" />
              ทำงานจาก LINE 100% — ไม่มีแอปแยก
            </div>

            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-navy-900 sm:text-4xl">
              เพิ่มเพื่อนใน LINE ทีเดียว
              <br />
              <span className="text-orange-500">6 ฟีเจอร์ HR โผล่ขึ้นมาให้กดทันที</span>
            </h2>

            <p className="text-base leading-relaxed text-navy-600 sm:text-lg">
              ไม่ต้องโหลดแอป ไม่ต้องล็อกอิน ไม่ต้องสอน — <span className="font-semibold text-navy-900">Rich Menu</span>{" "}
              บน LINE Official Account ของเราเป็นประตูเข้าระบบ HR ทั้งหมดที่ทีมคุณต้องใช้ทุกวัน
            </p>

            <ul className="grid gap-3 sm:grid-cols-2">
              {MENU_ITEMS.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{item.label}</div>
                    <div className="text-xs text-navy-500">{item.sub}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-navy-100 bg-navy-50/40 p-4">
              <div className="text-xs text-navy-500">
                <div className="font-semibold uppercase tracking-wider text-navy-700">เพิ่มเพื่อน QR</div>
                <div>เห็น Rich Menu ครั้งแรกใน 1 วินาที</div>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-navy-700 shadow-soft">
                  0 บาทค่าเทรน
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-navy-700 shadow-soft">
                  5 นาทีพร้อมใช้
                </span>
              </div>
            </div>
          </div>

          <div className="relative order-1 lg:col-span-6 lg:order-2">
            <div className="pointer-events-none absolute inset-x-12 top-8 hidden h-[80%] rounded-[40px] bg-gradient-to-br from-orange-200 to-emerald-200 opacity-40 blur-3xl lg:block" />
            <div className="relative mx-auto w-fit overflow-hidden rounded-[36px] border-2 border-navy-900 bg-white shadow-card">
              <Image
                src="/screens/feature-line-card.png"
                alt="LINE Official Account Rich Menu ของ EC AIHR แสดง 6 ฟีเจอร์: ขอลางาน, ขอ OT, สลิปเงินเดือน, ประวัติ/ตารางงาน, เข้า-ออกงาน, ติดต่อหัวหน้า/AI"
                width={360}
                height={780}
                className="h-[640px] w-[300px] object-cover sm:h-[700px] sm:w-[320px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
