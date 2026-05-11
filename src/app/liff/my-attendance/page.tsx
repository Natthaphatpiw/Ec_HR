import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarRange, History } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { Card, CardContent } from "@/components/ui/card";

interface SearchParams {
  as?: string;
}

export default async function MyAttendanceHubPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("liff.myAttendance");
  const sp = await searchParams;
  const qs = sp.as ? `?as=${sp.as}` : "";

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3 space-y-3">
        <div className="rounded-2xl bg-navy-900 p-5 text-white">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-navy-300">{t("hub.subtitle")}</p>
        </div>

        <HubButton
          href={`/liff/my-attendance/history${qs}`}
          icon={<History className="h-5 w-5" />}
          title={t("hub.historyTitle")}
          subtitle={t("hub.historySubtitle")}
        />

        <HubButton
          href={`/liff/my-attendance/schedule${qs}`}
          icon={<CalendarRange className="h-5 w-5" />}
          title={t("hub.scheduleTitle")}
          subtitle={t("hub.scheduleSubtitle")}
        />
      </main>
    </>
  );
}

function HubButton({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-orange-200 hover:bg-orange-50/30">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-orange-400">
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
