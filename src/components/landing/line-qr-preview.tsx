import { useTranslations } from "next-intl";
import { CheckCircle2, MapPin, MessageSquare } from "lucide-react";

export function LineQrPreview() {
  const t = useTranslations("landing.hero");
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-orange-200 via-orange-50 to-transparent blur-2xl opacity-60" aria-hidden />
      <div className="relative rounded-3xl border border-navy-100 bg-white p-2 shadow-card">
        <div className="rounded-2xl bg-navy-900 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500" />
              <div className="text-sm">
                <div className="font-medium">ThaiAuto HR Official</div>
                <div className="text-[11px] text-navy-300">LINE Official Account</div>
              </div>
            </div>
            <span className="rounded-full bg-orange-400/20 px-2 py-0.5 text-[10px] font-medium text-orange-300">
              LIVE
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <ChatBubble role="user">Clock me in</ChatBubble>
            <ChatBubble role="assistant">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Clocked in at 08:02 · ThaiAuto Factory
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-navy-300">
                <MapPin className="h-3 w-3" />
                13.7563°N, 100.5018°E · 142m inside geofence
              </div>
            </ChatBubble>
            <ChatBubble role="user">What is my leave balance?</ChatBubble>
            <ChatBubble role="assistant">
              <div className="text-[11px] text-navy-200">Annual: 7 days · Sick: 28 days</div>
            </ChatBubble>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs text-navy-200">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Type a message...</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 px-2 pb-3">
          <RichMenuPill label="Clock In" />
          <RichMenuPill label="Leave" />
          <RichMenuPill label="Payslip" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 text-xs text-navy-500">
        <QrSquare />
        <span>{t("qrLabel")}</span>
      </div>
    </div>
  );
}

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-orange-400 px-3.5 py-2 text-xs text-white">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-xs text-navy-900">
        {children}
      </div>
    </div>
  );
}

function RichMenuPill({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-navy-50 px-2 py-2 text-center text-[11px] font-medium text-navy-700">
      {label}
    </div>
  );
}

function QrSquare() {
  return (
    <div className="grid h-12 w-12 grid-cols-6 grid-rows-6 gap-px overflow-hidden rounded border border-navy-200 bg-white p-1">
      {Array.from({ length: 36 }).map((_, i) => {
        const filled = [0, 1, 2, 3, 5, 6, 11, 12, 18, 19, 23, 25, 28, 29, 31, 32, 33, 34, 35].includes(i);
        return <div key={i} className={filled ? "bg-navy-900" : "bg-transparent"} />;
      })}
    </div>
  );
}
