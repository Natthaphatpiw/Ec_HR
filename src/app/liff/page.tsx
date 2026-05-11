import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  PlaneTakeoff,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getEmployeeName,
  getLeaveBalance,
  listAttendanceForEmployee,
  listEmployees,
} from "@/lib/data";
import { formatTime } from "@/lib/utils";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export default async function LiffHome() {
  const [employees, attendance, tCommon] = await Promise.all([
    listEmployees(),
    listAttendanceForEmployee(DEMO_EMPLOYEE_ID),
    getTranslations("common"),
  ]);
  const me = employees.find((e) => e.id === DEMO_EMPLOYEE_ID)!;
  const balance = await getLeaveBalance(DEMO_EMPLOYEE_ID);
  const lastIn = attendance.find((a) => a.type === "in");

  return (
    <>
      <LiffHeader />
      <main className="px-4 pb-6 pt-3">
        <section className="mb-4 rounded-2xl bg-navy-900 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-400 text-lg font-semibold">
              {getEmployeeName(me, "en")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-navy-300">{tCommon("today")}</div>
              <div className="truncate text-base font-semibold">{getEmployeeName(me, "en")}</div>
              <div className="text-xs text-navy-300">
                {me.employee_code} · {me.department}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <KpiPill label="Annual" value={`${balance.annual.total - balance.annual.used}d`} />
            <KpiPill label="Sick" value={`${balance.sick.total - balance.sick.used}d`} />
            <KpiPill label="OT mo" value="5h" />
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <ActionTile
            href="/liff/checkin"
            icon={Clock}
            title="Clock In / Out"
            desc="GPS · Photo · IP"
            accent
          />
          <ActionTile
            href="/liff/request-leave"
            icon={PlaneTakeoff}
            title="Request Leave"
            desc="Annual · Sick"
          />
          <ActionTile href="/liff/request-ot" icon={TrendingUp} title="Request OT" desc="1.5x · 2x · 3x" />
          <ActionTile href="/liff/payslip" icon={Receipt} title="Payslip" desc="May 2026" />
          <ActionTile
            href="/liff/my-attendance"
            icon={Calendar}
            title="My Attendance"
            desc="This month"
          />
          <ActionTile href="/liff/ai-chat" icon={MessageCircle} title="ForgeHR AI" desc="Ask anything" />
        </section>

        {lastIn && (
          <section className="mb-4">
            <Card>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-xs text-navy-500">Last clock-in</div>
                  <div className="mt-1 text-sm font-medium text-navy-900">
                    {formatTime(lastIn.timestamp)} · ThaiAuto Factory
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-navy-500">
                    <MapPin className="h-3 w-3" />
                    {Number(lastIn.latitude).toFixed(4)}, {Number(lastIn.longitude).toFixed(4)}
                  </div>
                </div>
                <Badge variant={lastIn.status === "ontime" ? "success" : "warning"}>
                  {lastIn.status}
                </Badge>
              </CardContent>
            </Card>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-500">
            Team summary
          </h3>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-orange-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-navy-900">Production team</div>
                    <div className="text-xs text-navy-500">6 of 7 present today</div>
                  </div>
                </div>
                <Link
                  href="/liff/team"
                  className="text-xs font-semibold text-orange-500 hover:text-orange-600"
                >
                  View team →
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
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
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          accent ? "bg-orange-400 text-white" : "bg-navy-900 text-orange-400"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-navy-900">{title}</div>
        <div className="text-[11px] text-navy-500">{desc}</div>
      </div>
    </Link>
  );
}
