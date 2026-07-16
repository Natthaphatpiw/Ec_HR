import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarDays,
  Clock3,
  Database,
  LockKeyhole,
  MapPinned,
  Users,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { AnalyticsExportMenu } from "@/components/analytics/analytics-export-menu";
import { DemoWorkforceDetails } from "@/components/analytics/demo-workforce-details";
import {
  DepartmentAttendanceChart,
  LeaveStatusChart,
  PayrollTrendChart,
  WorkforceAttendanceChart,
} from "@/components/analytics/workforce-charts";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveAnalyticsAccess } from "@/lib/analytics-access";
import {
  getWorkforceAnalytics,
  type WorkforceAnalytics,
} from "@/lib/analytics";
import {
  buildDemoWorkforceAnalytics,
  getDemoWorkforceDailyRoster,
  getDemoWorkforceDates,
  getDemoWorkforceEmployeeStats,
  shouldUseDemoWorkforceSource,
} from "@/lib/demo-workforce";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [7, 30, 90] as const;

type AnalyticsSearchParams = { days?: string | string[] };

function normalizeDays(value: string | string[] | undefined): number {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(candidate) ? Math.min(180, Math.max(7, Math.round(candidate))) : 30;
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const [{ days: rawDays }, t, locale, access] = await Promise.all([
    searchParams,
    getTranslations("dashboard.analytics"),
    getLocale(),
    resolveAnalyticsAccess(),
  ]);
  const days = normalizeDays(rawDays);

  if (!access.ok) {
    return (
      <>
        <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
        <main className="flex-1 px-6 py-6">
          <Card className="mx-auto max-w-xl">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-orange-400">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-navy-900">{t("accessDeniedTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-navy-500">
                {t("accessDeniedDescription")}
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const useDemoWorkforce = shouldUseDemoWorkforceSource(access.orgId);
  let analytics: WorkforceAnalytics;
  try {
    analytics = useDemoWorkforce
      ? buildDemoWorkforceAnalytics(days, {
          orgId: access.orgId,
          scope: access.scope,
        })
      : await getWorkforceAnalytics({
          orgId: access.orgId,
          days,
          employeeIds: access.employeeIds,
          scope: access.scope,
        });
  } catch (error) {
    console.error("[analytics] dashboard failed to load", error);
    return (
      <>
        <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
        <main className="flex-1 px-6 py-6">
          <Card className="mx-auto max-w-xl border-orange-200">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <AlertTriangle className="h-7 w-7 text-orange-500" />
              <h2 className="mt-3 text-lg font-semibold text-navy-900">{t("loadErrorTitle")}</h2>
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
  const leaveChartData = analytics.leaveByType.map((row) => ({
    ...row,
    type: t(`leaveTypes.${row.type}`),
  }));
  const demoDates = useDemoWorkforce
    ? getDemoWorkforceDates().filter(
        (value) => value >= analytics.rangeStart && value <= analytics.rangeEnd,
      )
    : [];
  const demoDailyRows = useDemoWorkforce
    ? Object.fromEntries(
        demoDates.map((value) => [value, getDemoWorkforceDailyRoster(value)]),
      )
    : {};
  const demoEmployeeStats = useDemoWorkforce
    ? getDemoWorkforceEmployeeStats({
        startDate: analytics.rangeStart,
        endDate: analytics.rangeEnd,
      })
    : [];

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="mb-2 truncate text-sm font-semibold text-navy-900">
              {analytics.organization.business_name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-navy-200 bg-navy-900 text-white">
                {access.scope === "team" ? t("scopeTeam") : t("scopeOrganization")}
              </Badge>
              <Badge variant="muted">
                {formatDate(analytics.rangeStart)} – {formatDate(analytics.rangeEnd)}
              </Badge>
              <span className="text-xs text-navy-500">
                {t("updatedThrough", { date: formatDate(analytics.asOfDate) })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-navy-200 bg-white p-0.5 shadow-soft">
              {RANGE_OPTIONS.map((range) => (
                <Button
                  key={range}
                  asChild
                  size="sm"
                  variant={days === range ? "secondary" : "ghost"}
                  className="h-7 px-3"
                >
                  <Link href={`/dashboard/analytics?days=${range}`}>{t("daysOption", { days: range })}</Link>
                </Button>
              ))}
            </div>
            <AnalyticsExportMenu days={days} />
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("activeHeadcount")}
            value={integer.format(analytics.summary.activeHeadcount)}
            helper={t("people")}
            icon={Users}
          />
          <MetricCard
            label={t("attendanceRate")}
            value={`${number.format(analytics.summary.attendanceRate)}%`}
            helper={t("employeeDays", {
              present: integer.format(analytics.summary.presentEmployeeDays),
              scheduled: integer.format(analytics.summary.scheduledEmployeeDays),
            })}
            icon={Activity}
            accent
          />
          <MetricCard
            label={t("punctualityRate")}
            value={`${number.format(analytics.summary.punctualityRate)}%`}
            helper={t("ofRecordedCheckins")}
            icon={Clock3}
          />
          <MetricCard
            label={t("pendingApprovals")}
            value={integer.format(analytics.summary.pendingApprovals)}
            helper={
              analytics.summary.averageApprovalHours == null
                ? t("approvalTimeUnavailable")
                : t("averageApprovalTime", { hours: number.format(analytics.summary.averageApprovalHours) })
            }
            icon={CalendarDays}
          />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t("attendanceTrendTitle")}</CardTitle>
              <CardDescription>{t("attendanceTrendDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkforceAttendanceChart
                data={analytics.dailyAttendance}
                locale={locale}
                labels={{ attendance: t("attendanceRate"), punctuality: t("punctualityRate") }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("operatingPulseTitle")}</CardTitle>
              <CardDescription>{t("operatingPulseDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PulseRow
                icon={Clock3}
                label={t("approvedOtHours")}
                value={t("hoursValue", { value: number.format(analytics.summary.approvedOtHours) })}
              />
              <PulseRow
                icon={CalendarDays}
                label={t("approvedLeaveDays")}
                value={t("daysValue", { value: number.format(analytics.summary.approvedLeaveDays) })}
              />
              <PulseRow
                icon={MapPinned}
                label={t("recordedGeofencePassRate")}
                value={
                  analytics.summary.recordedGeofencePassRate == null
                    ? t("notAvailable")
                    : `${number.format(analytics.summary.recordedGeofencePassRate)}%`
                }
              />
              <PulseRow
                icon={Banknote}
                label={t("employerSsoCost")}
                value={currency.format(analytics.summary.employerSsoCost)}
              />
              <div className="grid grid-cols-2 gap-3 border-t border-navy-100 pt-4">
                <CoverageMetric label={t("lineBinding")} value={analytics.summary.lineBindingRate} />
                <CoverageMetric label={t("salaryCoverage")} value={analytics.summary.salaryCoverageRate} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("departmentAttendanceTitle")}</CardTitle>
              <CardDescription>
                {useDemoWorkforce
                  ? t("demo.departmentAttendanceDescription")
                  : t("departmentAttendanceDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.departments.length > 0 ? (
                <DepartmentAttendanceChart
                  data={analytics.departments}
                  attendanceLabel={t("attendanceRate")}
                />
              ) : (
                <EmptyState label={t("noData")} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("payrollTrendTitle")}</CardTitle>
              <CardDescription>{t("payrollTrendDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.payrollTrend.length > 0 ? (
                <PayrollTrendChart
                  data={analytics.payrollTrend}
                  locale={locale}
                  labels={{ gross: t("grossPayroll"), net: t("netPayroll") }}
                />
              ) : (
                <EmptyState label={t("noData")} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>
                {useDemoWorkforce ? t("demo.departmentTableTitle") : t("departmentTableTitle")}
              </CardTitle>
              <CardDescription>
                {useDemoWorkforce
                  ? t("demo.departmentTableDescription")
                  : t("departmentTableDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">{t("department")}</TableHead>
                    <TableHead className="text-right">{t("headcount")}</TableHead>
                    <TableHead className="text-right">{t("attendanceRate")}</TableHead>
                    <TableHead className="text-right">{t("lateRate")}</TableHead>
                    <TableHead className="text-right">{t("approvedOtHours")}</TableHead>
                    <TableHead className="text-right">{t("netPayroll")}</TableHead>
                    {!useDemoWorkforce && (
                      <TableHead className="pr-6 text-right">{t("averageKpi")}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.departments.map((row) => (
                    <TableRow key={row.department}>
                      <TableCell className="pl-6 font-medium">{row.department}</TableCell>
                      <TableCell className="text-right tabular-nums">{integer.format(row.headcount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{number.format(row.attendanceRate)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{number.format(row.lateRate)}%</TableCell>
                      <TableCell className="text-right tabular-nums">{number.format(row.approvedOtHours)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", useDemoWorkforce && "pr-6")}>
                        {currency.format(row.latestNetPay)}
                      </TableCell>
                      {!useDemoWorkforce && (
                        <TableCell className="pr-6 text-right tabular-nums">
                          {row.averageKpi == null ? t("notAvailable") : number.format(row.averageKpi)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("leaveStatusTitle")}</CardTitle>
              <CardDescription>{t("leaveStatusDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveStatusChart
                data={leaveChartData}
                labels={{ approved: t("approved"), pending: t("pending"), rejected: t("rejected") }}
              />
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          {useDemoWorkforce ? (
            <div className="xl:col-span-2">
              <DemoWorkforceDetails
                locale={locale}
                dates={demoDates}
                defaultDate={analytics.rangeEnd}
                dailyRows={demoDailyRows}
                employeeStats={demoEmployeeStats}
              />
            </div>
          ) : (
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>{t("employeeAttendanceTitle")}</CardTitle>
                <CardDescription>{t("employeeAttendanceDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">{t("employee")}</TableHead>
                      <TableHead>{t("department")}</TableHead>
                      <TableHead className="text-right">{t("scheduledDays")}</TableHead>
                      <TableHead className="text-right">{t("absentDays")}</TableHead>
                      <TableHead className="text-right">{t("lateDays")}</TableHead>
                      <TableHead className="text-right">{t("approvedLeaveDays")}</TableHead>
                      <TableHead className="text-right">{t("approvedOtHours")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.employeeAttendance.slice(0, 10).map((row) => (
                      <TableRow key={row.employeeId}>
                        <TableCell className="pl-6">
                          <p className="font-medium text-navy-900">{row.name}</p>
                          <p className="text-xs text-navy-500">{row.employeeCode}</p>
                        </TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell className="text-right tabular-nums">{integer.format(row.scheduledDays)}</TableCell>
                        <TableCell className="text-right tabular-nums">{integer.format(row.absentDays)}</TableCell>
                        <TableCell className="text-right tabular-nums">{integer.format(row.lateDays)}</TableCell>
                        <TableCell className="text-right tabular-nums">{number.format(row.approvedLeaveDays)}</TableCell>
                        <TableCell className="pr-6 text-right tabular-nums">
                          {number.format(row.approvedOtHours)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("dataQualityTitle")}</CardTitle>
                <CardDescription>{t("dataQualityDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.dataQuality.map((issue) => (
                  <div key={issue.key} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-navy-700">
                      <Database className="h-4 w-4 shrink-0 text-navy-400" />
                      <span>{t(`qualityIssues.${issue.key}`)}</span>
                    </div>
                    <span
                      className={cn(
                        "min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-semibold tabular-nums",
                        issue.count > 0
                          ? "bg-orange-100 text-orange-700"
                          : "bg-navy-50 text-navy-600",
                      )}
                    >
                      {integer.format(issue.count)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle>{t("methodologyTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-5 text-navy-600">
                <p>{t("methodologyAttendance")}</p>
                {!useDemoWorkforce && <p>{t("methodologyEmployeeAttendance")}</p>}
                <p>{t("methodologyPayroll")}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Users;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-navy-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-navy-900 tabular-nums">{value}</p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              accent ? "bg-orange-400 text-white" : "bg-navy-900 text-orange-400",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 text-xs text-navy-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function PulseRow({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-navy-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-navy-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function CoverageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-navy-500">{label}</span>
        <span className="font-semibold text-navy-900 tabular-nums">{value.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
        <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex h-64 items-center justify-center text-sm text-navy-500">{label}</div>;
}
