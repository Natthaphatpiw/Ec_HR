import Link from "next/link";
import { Activity, AlertTriangle, Clock3, LockKeyhole, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AnalyticsExportMenu } from "@/components/analytics/analytics-export-menu";
import { WorkforceAttendanceChart } from "@/components/analytics/workforce-charts";
import { LiffHeader } from "@/components/liff/header";
import { guardLiffPage } from "@/components/liff/page-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAnalyticsAccess } from "@/lib/analytics-access";
import { getWorkforceAnalytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [7, 30, 90] as const;

type AnalyticsSearchParams = { days?: string | string[] };

function normalizeDays(value: string | string[] | undefined): number {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(candidate) ? Math.min(180, Math.max(7, Math.round(candidate))) : 30;
}

export default async function LiffAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const [{ days: rawDays }, t, locale] = await Promise.all([
    searchParams,
    getTranslations("dashboard.analytics"),
    getLocale(),
  ]);
  const days = normalizeDays(rawDays);
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_ATTENDANCE,
  });
  if (!guard.ok) return guard.view;

  const access = await resolveAnalyticsAccess();
  if (!access.ok) {
    return <LiffAccessDenied title={t("title")} heading={t("accessDeniedTitle")} body={t("accessDeniedDescription")} />;
  }

  let analytics;
  try {
    analytics = await getWorkforceAnalytics({
      orgId: access.orgId,
      days,
      employeeIds: access.employeeIds,
      scope: access.scope,
    });
  } catch (error) {
    console.error("[analytics] LIFF failed to load", error);
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <Card className="border-orange-200">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <AlertTriangle className="h-7 w-7 text-orange-500" />
              <h2 className="mt-3 text-base font-semibold text-navy-900">{t("loadErrorTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-navy-500">{t("loadErrorDescription")}</p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const currency = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (value: string) => date.format(new Date(`${value}T00:00:00Z`));

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="space-y-4 px-4 pb-6 pt-3">
        <section className="rounded-2xl bg-navy-900 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-navy-300">{analytics.organization.business_name}</p>
              <h1 className="mt-1 text-lg font-semibold">{t("workforceSnapshot")}</h1>
              <p className="mt-1 text-xs text-navy-300">
                {formatDate(analytics.rangeStart)} – {formatDate(analytics.rangeEnd)}
              </p>
            </div>
            <Badge className="shrink-0 border-orange-300 bg-orange-400 text-white">
              {access.scope === "team" ? t("scopeTeam") : t("scopeOrganization")}
            </Badge>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <LiffHeroMetric label={t("attendanceRate")} value={`${number.format(analytics.summary.attendanceRate)}%`} />
            <LiffHeroMetric label={t("activeHeadcount")} value={integer.format(analytics.summary.activeHeadcount)} />
          </div>
        </section>

        <section className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-3 rounded-md border border-navy-200 bg-white p-0.5 shadow-soft">
            {RANGE_OPTIONS.map((range) => (
              <Button
                key={range}
                asChild
                size="sm"
                variant={days === range ? "secondary" : "ghost"}
                className="h-8 px-1"
              >
                <Link href={`/liff/analytics?days=${range}`}>{t("daysOption", { days: range })}</Link>
              </Button>
            ))}
          </div>
          <AnalyticsExportMenu days={days} />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <LiffMetricCard
            icon={Clock3}
            label={t("punctualityRate")}
            value={`${number.format(analytics.summary.punctualityRate)}%`}
          />
          <LiffMetricCard
            icon={Activity}
            label={t("pendingApprovals")}
            value={integer.format(analytics.summary.pendingApprovals)}
            accent
          />
          <LiffMetricCard
            icon={Users}
            label={t("approvedOtHours")}
            value={t("hoursValue", { value: number.format(analytics.summary.approvedOtHours) })}
          />
          <LiffMetricCard
            icon={Users}
            label={t("latestNetPayroll")}
            value={currency.format(analytics.summary.latestNetPayroll)}
          />
        </section>

        <Card>
          <CardHeader className="p-5 pb-2">
            <CardTitle>{t("attendanceTrendTitle")}</CardTitle>
            <CardDescription>{t("attendanceTrendDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <WorkforceAttendanceChart
              compact
              data={analytics.dailyAttendance}
              locale={locale}
              labels={{ attendance: t("attendanceRate"), punctuality: t("punctualityRate") }}
            />
            <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-navy-500">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-orange-400" /> {t("attendanceRate")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-navy-900" /> {t("punctualityRate")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle>{t("departmentAttendanceTitle")}</CardTitle>
            <CardDescription>{t("departmentAttendanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            {analytics.departments.slice(0, 6).map((row) => (
              <div key={row.department}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-navy-800">{row.department}</span>
                  <span className="font-semibold text-navy-900 tabular-nums">
                    {number.format(row.attendanceRate)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
                  <div
                    className="h-full rounded-full bg-orange-400"
                    style={{ width: `${Math.min(100, row.attendanceRate)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-navy-400">
                  <span>{t("peopleValue", { value: integer.format(row.headcount) })}</span>
                  <span>{t("otHoursValue", { value: number.format(row.approvedOtHours) })}</span>
                </div>
              </div>
            ))}
            {analytics.departments.length === 0 && (
              <p className="py-6 text-center text-sm text-navy-500">{t("noData")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle>{t("riskTitle")}</CardTitle>
            <CardDescription>{t("riskDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {analytics.risks.slice(0, 5).map((row) => (
              <div key={row.employeeId} className="flex items-center gap-3 border-b border-navy-100 pb-3 last:border-0 last:pb-0">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
                    row.level === "high"
                      ? "bg-orange-400 text-white"
                      : row.level === "medium"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-navy-50 text-navy-700",
                  )}
                >
                  {row.riskScore}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">{row.name}</p>
                  <p className="truncate text-[11px] text-navy-500">
                    {row.department} · {t("absenceAndLate", { absent: row.absentDays, late: row.lateDays })}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "shrink-0",
                    row.level === "high"
                      ? "border-orange-400 bg-orange-400 text-white"
                      : row.level === "medium"
                        ? "border-orange-200 bg-orange-100 text-orange-700"
                        : "border-navy-200 bg-navy-50 text-navy-700",
                  )}
                >
                  {t(`riskLevels.${row.level}`)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 text-xs leading-5 text-navy-600">
          <p className="font-semibold text-navy-900">{t("methodologyTitle")}</p>
          <p className="mt-1">{t("methodologyRisk")}</p>
          <p className="mt-1">{t("updatedThrough", { date: formatDate(analytics.asOfDate) })}</p>
        </div>
      </main>
    </>
  );
}

function LiffAccessDenied({ title, heading, body }: { title: string; heading: string; body: string }) {
  return (
    <>
      <LiffHeader title={title} />
      <main className="px-4 pb-6 pt-3">
        <Card>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-orange-400">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-navy-900">{heading}</h2>
            <p className="mt-2 text-sm leading-6 text-navy-500">{body}</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function LiffHeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-navy-300">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  );
}

function LiffMetricCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accent ? "bg-orange-400 text-white" : "bg-navy-900 text-orange-400",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="mt-3 truncate text-[11px] text-navy-500">{label}</p>
        <p className="mt-1 truncate text-lg font-semibold text-navy-900 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
