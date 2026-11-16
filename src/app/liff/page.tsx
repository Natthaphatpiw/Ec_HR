import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BarChart3,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  PlaneTakeoff,
  Receipt,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { LiffInit } from "@/components/liff/liff-init";
import { LinkPending } from "@/components/liff/link-pending";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { TrialBanner, TrialBlockedView } from "@/components/liff/trial-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getEmployeeName,
  getLeaveBalance,
  getOrganizationById,
  getOrgTrialStatus,
  getRegistrationStatus,
  listAttendanceForEmployee,
  listTeamForSupervisor,
} from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";
import type { Locale } from "@/i18n/config";
import { formatTime } from "@/lib/utils";

export default async function LiffHome() {
  const [tCommon, t, tCheckin, tAttendance, tLeave, tOt, tPayslip, tNav, locale] = await Promise.all([
    getTranslations("common"),
    getTranslations("liff.home"),
    getTranslations("liff.checkin"),
    getTranslations("liff.myAttendance"),
    getTranslations("liff.requestLeave"),
    getTranslations("liff.requestOt"),
    getTranslations("liff.payslip"),
    getTranslations("liff.nav"),
    getLocale(),
  ]);
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return (
      <>
        <LiffHeader />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN} />
        </main>
      </>
    );
  }

  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return (
      <>
        <LiffHeader />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status={registration.state} />
        </main>
      </>
    );
  }

  const me = registration.employee;
  const trial = await getOrgTrialStatus(me.org_id);
  if (!trial.ok) {
    return (
      <>
        <LiffHeader />
        <main className="px-4 pb-6 pt-3">
          <TrialBlockedView trial={trial} />
        </main>
      </>
    );
  }
  const [attendance, balance, team, organization] = await Promise.all([
    listAttendanceForEmployee(me.id),
    getLeaveBalance(me.id),
    me.is_supervisor ? listTeamForSupervisor(me.id) : Promise.resolve([]),
    getOrganizationById(me.org_id),
  ]);
  const lastIn = attendance.find((a) => a.type === "in");
  const myName = getEmployeeName(me, locale as Locale);
  const canViewAnalytics =
    me.is_supervisor ||
    me.role === "supervisor" ||
    me.role === "hr" ||
    me.role === "executive" ||
    organization?.owner_employee_id === me.id;

  return (
    <>
      <LiffHeader />
      <main className="px-4 pb-6 pt-3">
        <div className="mb-3">
          <TrialBanner trial={trial} />
        </div>
        <section className="mb-4 rounded-2xl bg-navy-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-400 text-lg font-semibold">
              {myName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-navy-300">{tCommon("today")}</div>
              <div className="truncate text-base font-semibold">{myName}</div>
              <div className="text-xs text-navy-300">
                {me.employee_code ?? "—"} · {me.department ?? "—"}
                {me.is_supervisor && (
                  <span className="ml-2 rounded-full bg-orange-400/20 px-2 py-0.5 text-[10px] font-medium text-orange-200">
                    {t("supervisor")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <KpiPill
              label={t("kpiAnnual")}
              value={t("daysShort", { count: balance.annual.total - balance.annual.used })}
            />
            <KpiPill
              label={t("kpiSick")}
              value={t("daysShort", { count: balance.sick.total - balance.sick.used })}
            />
            <KpiPill label={t("kpiTeam")} value={me.is_supervisor ? `${team.length}` : "—"} />
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <ActionTile
            href="/liff/checkin"
            icon={Clock}
            title={tCheckin("title")}
            desc={t("checkinDesc")}
            accent
          />
          <ActionTile
            href="/liff/request-leave"
            icon={PlaneTakeoff}
            title={tLeave("title")}
            desc={t("leaveDesc")}
          />
          <ActionTile href="/liff/request-ot" icon={TrendingUp} title={tOt("title")} desc="1.5x · 2x · 3x" />
          <ActionTile href="/liff/payslip" icon={Receipt} title={tPayslip("title")} desc={t("payslipDesc")} />
          <ActionTile
            href="/liff/my-attendance"
            icon={Calendar}
            title={tAttendance("title")}
            desc={me.is_supervisor ? t("attendanceTeamDesc") : t("attendanceDesc")}
          />
          <ActionTile href="/liff/profile" icon={User} title={tNav("profile")} desc={t("profileDesc")} />
          {canViewAnalytics && (
            <ActionTile
              href="/liff/analytics"
              icon={BarChart3}
              title={t("analyticsTitle")}
              desc={me.is_supervisor ? t("analyticsTeamDesc") : t("analyticsOrgDesc")}
            />
          )}
          <ActionTile href="/liff/ai-chat" icon={MessageCircle} title="EC AIHR" desc={t("aiDesc")} />
        </section>

        {lastIn && (
          <section className="mb-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs text-navy-500">{tCheckin("lastCheckIn")}</div>
                  <div className="mt-1 text-sm font-medium text-navy-900">
                    {formatTime(lastIn.timestamp)}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-navy-500">
                    <MapPin className="h-3 w-3" />
                    {lastIn.latitude != null ? Number(lastIn.latitude).toFixed(4) : "—"},{" "}
                    {lastIn.longitude != null ? Number(lastIn.longitude).toFixed(4) : "—"}
                  </div>
                </div>
                <Badge variant={lastIn.status === "ontime" ? "success" : "warning"}>
                  {tAttendance(lastIn.status)}
                </Badge>
              </CardContent>
            </Card>
          </section>
        )}

        {me.is_supervisor && team.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-500">
              {t("teamSummary")}
            </h3>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-orange-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-navy-900">
                        {me.department ?? "—"}
                      </div>
                      <div className="text-xs text-navy-500">{t("subordinates", { count: team.length })}</div>
                    </div>
                  </div>
                  <Link
                    href="/liff/my-attendance/schedule"
                    className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                  >
                    {t("schedule")} →
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </>
  );
}

function KpiPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-navy-300">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: typeof Clock;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-2 rounded-xl border p-4 transition-all active:scale-[0.98] ${
        accent
          ? "border-orange-300 bg-orange-50"
          : "border-navy-100 bg-white hover:border-orange-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            accent ? "bg-orange-400 text-white" : "bg-navy-900 text-orange-400"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <LinkPending />
      </div>
      <div>
        <div className="text-sm font-semibold text-navy-900">{title}</div>
        <div className="text-[11px] text-navy-500">{desc}</div>
      </div>
    </Link>
  );
}
