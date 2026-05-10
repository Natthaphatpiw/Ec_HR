import { getTranslations } from "next-intl/server";
import { Activity, Clock, MapPin, PlaneTakeoff, Users } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getEmployeeName,
  listAttendanceLogs,
  listEmployees,
  listLeaveRequests,
} from "@/lib/data";
import { formatTime } from "@/lib/utils";

export default async function LiffTeamPage() {
  const [t, employees, logs, leaves] = await Promise.all([
    getTranslations("liff.team"),
    listEmployees(),
    listAttendanceLogs(),
    listLeaveRequests(),
  ]);

  // Production team
  const team = employees.filter((e) => e.department === "Production");
  const today = "2026-05-09";
  const todayIns = logs.filter((l) => l.timestamp.startsWith(today) && l.type === "in");
  const presentIds = new Set(todayIns.map((l) => l.employee_id));
  const onLeaveIds = new Set(
    leaves
      .filter(
        (l) =>
          l.status === "approved" &&
          l.start_date <= today &&
          l.end_date >= today,
      )
      .map((l) => l.employee_id),
  );

  const present = team.filter((e) => presentIds.has(e.id));
  const onLeave = team.filter((e) => onLeaveIds.has(e.id));
  const absent = team.filter((e) => !presentIds.has(e.id) && !onLeaveIds.has(e.id));
  const late = todayIns.filter((l) => l.status === "late" && team.some((e) => e.id === l.employee_id));

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          <SummaryTile label={t("present")} value={present.length} icon={Activity} accent="success" />
          <SummaryTile label={t("late")} value={late.length} icon={Clock} accent="warning" />
          <SummaryTile label={t("onLeave")} value={onLeave.length} icon={PlaneTakeoff} accent="info" />
          <SummaryTile label={t("absent")} value={absent.length} icon={Users} accent="danger" />
        </div>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-navy-500">
              Production team · today
            </h3>
            <div className="space-y-3">
              {team.map((e) => {
                const inLog = todayIns.find((l) => l.employee_id === e.id);
                const isOnLeave = onLeaveIds.has(e.id);
                const name = getEmployeeName(e, "en");
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-navy-900 text-white text-xs">
                        {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-navy-900 truncate">{name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-navy-500">
                        {inLog ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span>In {formatTime(inLog.timestamp)} · {e.position}</span>
                          </>
                        ) : (
                          <span>{e.position}</span>
                        )}
                      </div>
                    </div>
                    {inLog ? (
                      <Badge variant={inLog.status === "late" ? "warning" : "success"}>
                        {inLog.status}
                      </Badge>
                    ) : isOnLeave ? (
                      <Badge variant="info">leave</Badge>
                    ) : (
                      <Badge variant="danger">absent</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  accent: "success" | "warning" | "info" | "danger";
}) {
  const styles = {
    success: { iconColor: "text-emerald-600", valueColor: "text-emerald-600" },
    warning: { iconColor: "text-amber-600", valueColor: "text-amber-600" },
    info: { iconColor: "text-sky-600", valueColor: "text-sky-600" },
    danger: { iconColor: "text-red-600", valueColor: "text-red-600" },
  }[accent];
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`mx-auto h-4 w-4 ${styles.iconColor}`} />
        <div className={`mt-1 text-xl font-semibold tabular-nums ${styles.valueColor}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-navy-500">{label}</div>
      </CardContent>
    </Card>
  );
}
