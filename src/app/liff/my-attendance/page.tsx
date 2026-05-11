import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarRange, History, Users } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { Card, CardContent } from "@/components/ui/card";
import { getRegistrationStatus } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export default async function MyAttendanceHubPage() {
  const t = await getTranslations("liff.myAttendance");
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_ATTENDANCE} />
        </main>
      </>
    );
  }
  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status={registration.state} />
        </main>
      </>
    );
  }
  const me = registration.employee;

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3 space-y-3">
        <div className="rounded-2xl bg-navy-900 p-5 text-white">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-navy-300">{t("hub.subtitle")}</p>
        </div>

        <HubButton
          href="/liff/my-attendance/history"
          icon={<History className="h-5 w-5" />}
          title={t("hub.historyTitle")}
          subtitle={t("hub.historySubtitle")}
        />

        <HubButton
          href="/liff/my-attendance/schedule"
          icon={<CalendarRange className="h-5 w-5" />}
          title={t("hub.scheduleTitle")}
          subtitle={t("hub.scheduleSubtitle")}
        />

        {me.is_supervisor && (
          <HubButton
            href="/liff/my-attendance/schedule?view=team"
            icon={<Users className="h-5 w-5" />}
            title="จัดการตารางลูกน้อง"
            subtitle={`${me.subordinate_ids?.length ?? 0} คนภายใต้คุณ`}
            accent
          />
        )}
      </main>
    </>
  );
}

function HubButton({
  href,
  icon,
  title,
  subtitle,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card
        className={
          accent
            ? "border-orange-300 bg-orange-50/40 transition-colors hover:bg-orange-50"
            : "transition-colors hover:border-orange-200 hover:bg-orange-50/30"
        }
      >
        <CardContent className="flex items-center gap-4 p-5">
          <div
            className={
              accent
                ? "flex h-11 w-11 items-center justify-center rounded-full bg-orange-400 text-white"
                : "flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-orange-400"
            }
          >
            {icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-navy-900">{title}</div>
            <div className="mt-0.5 text-xs text-navy-500">{subtitle}</div>
          </div>
          <span className="text-orange-400">›</span>
        </CardContent>
      </Card>
    </Link>
  );
}
