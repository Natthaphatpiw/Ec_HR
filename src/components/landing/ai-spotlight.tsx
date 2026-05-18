import { BrainCircuit, Languages, LineChart, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const CAPABILITIES = [
  {
    icon: LineChart,
    title: "วิเคราะห์ pattern การเข้างาน",
    body: "ระบุพนักงานเสี่ยง absent, ทำนายโอกาสมาสายล่วงหน้า, สรุป KPI ของแต่ละทีม",
  },
  {
    icon: MessagesSquare,
    title: "ตอบคำถาม HR แบบมนุษย์",
    body: '"EMP005 มีวันลาเหลือเท่าไร", "ใครสายวันนี้บ้าง", "ออกสลิปเดือนพฤษภาคมให้หน่อย"',
  },
  {
    icon: Languages,
    title: "3 ภาษาในตัว",
    body: "ตอบเป็นภาษาที่พนักงานเลือก ไทย / อังกฤษ / จีน — ร่างประกาศ broadcast ให้ได้ในทุกภาษา",
  },
  {
    icon: BrainCircuit,
    title: "แนะนำการจัดกะ",
    body: "ขอให้ AI ช่วยจัดกะรายสัปดาห์ ระบบจะเสนอแผน 3 แบบ พร้อมข้อดี-ข้อเสีย",
  },
];

export function LandingAiSpotlight() {
  return (
    <section className="relative overflow-hidden border-b border-navy-100 bg-navy-900 py-20 text-white sm:py-24">
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-orange-400 blur-3xl animate-blob" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-orange-500 blur-3xl animate-blob [animation-delay:-6s]" />
      </div>

      <div className="container-page relative">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <ScrollReveal direction="right" className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/40 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-200">
              <Sparkles className="h-3 w-3" />
              EC AIHR · Claude Sonnet 4.6
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              AI ที่เข้าใจ HR คนไทย
              <br />
              <span className="text-orange-300">พัฒนาโดยทีม HR + AI Engineers</span>
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-navy-200">
              ไม่ใช่ chatbot ถาม-ตอบทั่วไป แต่เป็น HR Analyst ที่อ่าน database ของบริษัทคุณได้แบบเรียลไทม์
              คุยภาษาคน วิเคราะห์ทันที พร้อมแนะนำการตัดสินใจ
            </p>

            <div className="grid gap-4 pt-4 sm:grid-cols-2">
              {CAPABILITIES.map((c) => (
                <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <c.icon className="h-5 w-5 text-orange-300" />
                  <div className="mt-3 text-sm font-semibold text-white">{c.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-navy-200">{c.body}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-4 text-xs text-navy-300">
              <ShieldCheck className="h-4 w-4 text-orange-300" />
              <span>ข้อมูลแยก tenant ต่อบริษัท · RLS policies ใน Supabase · audit log ครบ</span>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left" delay={200} className="lg:col-span-5">
            <div className="relative mx-auto w-fit">
              <div className="absolute inset-0 -m-4 rounded-[40px] bg-orange-400/20 blur-2xl animate-blob" />
              <div className="relative overflow-hidden rounded-[36px] border-2 border-orange-300/40 bg-white shadow-card animate-float">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/screens/ai-chat.png"
                  alt="หน้าแชทกับ AI Assistant ของ EC AIHR"
                  width={320}
                  height={693}
                  className="h-[640px] w-[300px] object-cover"
                />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
