import {
  Activity,
  ClipboardCheck,
  Clock,
  PlaneTakeoff,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttendanceTrendChart } from "@/components/dashboard/attendance-trend-chart";
import { DepartmentChart } from "@/components/dashboard/department-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getAttendanceTrend,
  getDashboardStats,
  getDepartmentBreakdown,
  getEmployeeName,
  listAttendanceLogs,
  listEmployees,
  listLeaveRequests,
  listOvertimeRequests,
} from "@/lib/data";
import { formatTime } from "@/lib/utils";

export default async function DashboardOverviewPage() {
  const [t, stats, trend, breakdown, allEmployees, recentAttendance, leaves, ots] = await Promise.all([
    getTranslations("dashboard.overview"),
    getDashboardStats(),
    getAttendanceTrend(7),
    getDepartmentBreakdown(),
    listEmployees(),
    listAttendanceLogs(),
    listLeaveRequests(),
    listOvertimeRequests(),
  ]);

  const employeeMap = new Map(allEmployees.map((e) => [e.id, e]));
  const recentEvents = recentAttendance.slice(0, 6);
  const pendingApprovals = [
    ...leaves.filter((l) => l.status === "pending").map((l) => ({ kind: "leave" as const, ...l })),
    ...ots.filter((o) => o.status === "pending").map((o) => ({ kind: "ot" as const, ...o })),
  ].slice(0, 5);

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("totalEmployees")}
            value={String(stats.totalEmployees)}
            icon={Users}
            helper="Across 4 departments"
          />
          <StatCard
            label={t("presentToday")}
            value={String(stats.presentToday)}
            icon={Activity}
            delta={{ value: "+8%", trend: "up" }}
            helper={`${stats.attendanceRate}% attendance rate`}
          />
          <StatCard
            label={t("pendingApprovals")}
            value={String(stats.pendingApprovals)}
            icon={ClipboardCheck}
            helper="Leave + OT requests"
          />
          <StatCard
            label={t("lateToday")}
            value={String(stats.lateToday)}
            icon={Clock}
            delta={{ value: "-2", trend: "down" }}
            helper={`${stats.onLeaveToday} ${t("onLeave").toLowerCase()}`}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <div>
                <CardTitle>{t("attendanceTrend")}</CardTitle>
                <CardDescription>Daily check-ins, lateness, and absences</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-3.5 w-3.5" />
                Last 7 days
              </Button>
            </CardHeader>
            <CardContent>
              <AttendanceTrendChart data={trend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("departmentBreakdown")}</CardTitle>
              <CardDescription>Headcount across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentChart data={breakdown} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="border-orange-200 bg-orange-50/30 lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-orange-700">{t("aiInsight")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-navy-700">
              <p>
                EMP010 has been late 3 times this week. Consider a 1:1 with their supervisor
                (EMP006).
              </p>
              <p>
                Production line headcount is 6% below historic Friday baseline. Suggest opening 2
                evening-shift OT slots for tomorrow.
              </p>
              <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                <Sparkles className="h-3.5 w-3.5" />
                Ask EC AIHR Assistant
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t("recentActivity")}</CardTitle>
              <CardDescription>Latest clock-ins and clock-outs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEvents.map((e) => {
                const emp = employeeMap.get(e.employee_id);
                if (!emp) return null;
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full ${e.type === "in" ? "bg-emerald-50" : "bg-navy-50"} flex items-center justify-center`}>
                      <Clock className={`h-3.5 w-3.5 ${e.type === "in" ? "text-emerald-600" : "text-navy-500"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy-900 truncate">
                        {getEmployeeName(emp, "en")}{" "}
                        <span className="font-normal text-navy-500">
                          · {e.type === "in" ? "Clocked in" : "Clocked out"}
                        </span>
                      </p>
                      <p className="text-xs text-navy-400">
                        {formatTime(e.timestamp)} · {emp.department}
                      </p>
                    </div>
                    <Badge variant={e.status === "ontime" ? "success" : e.status === "late" ? "warning" : "muted"}>
                      {e.status}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t("pendingApprovals")}</CardTitle>
              <CardDescription>Leave and overtime requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.map((req) => {
                const emp = employeeMap.get(req.employee_id);
                if (!emp) return null;
                return (
                  <div key={req.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                      {req.kind === "leave" ? (
                        <PlaneTakeoff className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy-900 truncate">
                        {getEmployeeName(emp, "en")}
                      </p>
                      <p className="text-xs text-navy-400">
                        {req.kind === "leave"
                          ? `${req.leave_type} · ${req.days}d`
                          : `OT · ${req.hours}h`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                      Review
                    </Button>
                  </div>
                );
              })}
              {pendingApprovals.length === 0 && (
                <p className="text-sm text-navy-500">No pending approvals.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
