import { CalendarDays, Download, Filter, MapPinned } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { GeofenceMap } from "@/components/dashboard/geofence-map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEmployeeName,
  getOrganization,
  listAttendanceLogs,
  listEmployees,
} from "@/lib/data";
import { formatTime } from "@/lib/utils";

export default async function AttendancePage() {
  const [t, tCommon, employees, logs, org] = await Promise.all([
    getTranslations("dashboard.attendance"),
    getTranslations("common"),
    listEmployees(),
    listAttendanceLogs(),
    getOrganization(),
  ]);
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const today = "2026-05-09";
  const todayLogs = logs.filter((l) => l.timestamp.startsWith(today));
  const points = todayLogs.slice(0, 24).map((l) => ({
    id: l.id,
    lat: Number(l.latitude ?? org.geofence_lat ?? 13.7563),
    lng: Number(l.longitude ?? org.geofence_lng ?? 100.5018),
    label: getEmployeeName(employeeMap.get(l.employee_id)!, "en"),
    status: l.status,
  }));

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-orange-500" />
                  {t("map")}
                </CardTitle>
                <CardDescription>
                  {org.name} · radius {org.geofence_radius}m
                </CardDescription>
              </div>
              <Badge variant="success">{points.length} clock-ins today</Badge>
            </CardHeader>
            <CardContent>
              <GeofenceMap
                centerLat={Number(org.geofence_lat ?? 13.7563)}
                centerLng={Number(org.geofence_lng ?? 100.5018)}
                radiusM={Number(org.geofence_radius)}
                points={points}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today summary</CardTitle>
              <CardDescription>{tCommon("today")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SummaryRow label="Clocked in" value={`${todayLogs.filter((l) => l.type === "in").length}`} />
              <SummaryRow label="Clocked out" value={`${todayLogs.filter((l) => l.type === "out").length}`} />
              <SummaryRow
                label="Late"
                value={`${todayLogs.filter((l) => l.status === "late").length}`}
                accent="warning"
              />
              <SummaryRow
                label="Absent"
                value={`${employees.filter((e) => e.role !== "executive" && e.role !== "hr").length - new Set(todayLogs.filter((l) => l.type === "in").map((l) => l.employee_id)).size}`}
                accent="danger"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>{t("today")}</CardTitle>
              <CardDescription>Live feed of clock-in / clock-out events</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-3.5 w-3.5" />
                {tCommon("filter")}
              </Button>
              <Button variant="outline" size="sm">
                <CalendarDays className="h-3.5 w-3.5" />
                Date
              </Button>
              <Button size="sm">
                <Download className="h-3.5 w-3.5" />
                {tCommon("export")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("time")}</TableHead>
                  <TableHead>{t("type")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("location")}</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 25).map((l) => {
                  const emp = employeeMap.get(l.employee_id);
                  if (!emp) return null;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-navy-900">{getEmployeeName(emp, "en")}</div>
                          <div className="text-xs text-navy-500">
                            {emp.employee_code} · {emp.department}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-navy-700">
                        {formatTime(l.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.type === "in" ? "success" : "muted"}>
                          {l.type === "in" ? t("checkIn") : t("checkOut")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            l.status === "ontime"
                              ? "success"
                              : l.status === "late"
                                ? "warning"
                                : l.status === "absent"
                                  ? "danger"
                                  : "muted"
                          }
                        >
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-navy-500 tabular-nums">
                        {Number(l.latitude).toFixed(4)}, {Number(l.longitude).toFixed(4)}
                      </TableCell>
                      <TableCell className="text-xs text-navy-500">{l.ip_address ?? "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warning" | "danger";
}) {
  return (
    <div className="flex items-center justify-between border-b border-navy-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-navy-500">{label}</span>
      <span
        className={`text-2xl font-semibold tabular-nums ${
          accent === "warning"
            ? "text-amber-600"
            : accent === "danger"
              ? "text-red-600"
              : "text-navy-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
