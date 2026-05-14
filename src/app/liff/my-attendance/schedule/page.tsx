import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, Users } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { guardLiffPage } from "@/components/liff/page-guard";
import { EmployeeSchedule } from "@/components/liff/schedule-employee";
import { SupervisorSchedule } from "@/components/liff/schedule-supervisor";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  listScheduleEntries,
  listScheduleEntriesForTeam,
  listTeamForSupervisor,
} from "@/lib/data";

interface SearchParams {
  view?: string;
  week?: string;
}

function mondayOf(dateStr?: string): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();
  const dow = base.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("liff.myAttendance");
  const guard = await guardLiffPage({
    title: t("hub.scheduleTitle"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_ATTENDANCE,
  });
  if (!guard.ok) return guard.view;
  const me = guard.employee;
  const weekStart = mondayOf(sp.week);
  const weekEnd = addDays(weekStart, 6);
  const view = me.is_supervisor && sp.view === "team" ? "team" : "own";

  return (
    <>
      <LiffHeader title={t("hub.scheduleTitle")} />
      <main className="px-4 pb-6 pt-3 space-y-3">
        {me.is_supervisor && (
          <ViewToggle currentView={view} week={sp.week} subordinateCount={me.subordinate_ids?.length ?? 0} />
        )}

        {view === "team" ? (
          <TeamView supervisorId={me.id} supervisorName={me.name_th ?? me.name_en ?? me.id} weekStart={weekStart} weekEnd={weekEnd} />
        ) : (
          <OwnView employeeId={me.id} employeeName={me.name_th ?? me.name_en ?? me.id} weekStart={weekStart} weekEnd={weekEnd} />
        )}
      </main>
    </>
  );
}

function ViewToggle({
  currentView,
  week,
  subordinateCount,
}: {
  currentView: "own" | "team";
  week?: string;
  subordinateCount: number;
}) {
  const ownHref = week ? `/liff/my-attendance/schedule?week=${week}` : "/liff/my-attendance/schedule";
  const teamHref = week
    ? `/liff/my-attendance/schedule?view=team&week=${week}`
    : "/liff/my-attendance/schedule?view=team";

  return (
    <Card>
      <CardContent className="p-2">
        <div className="grid grid-cols-2 gap-1">
          <Link
            href={ownHref}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors",
              currentView === "own"
                ? "bg-orange-400 text-white shadow-soft"
                : "bg-transparent text-navy-500 hover:bg-navy-50",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            ตารางของฉัน
          </Link>
          <Link
            href={teamHref}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition-colors",
              currentView === "team"
                ? "bg-orange-400 text-white shadow-soft"
                : "bg-transparent text-navy-500 hover:bg-navy-50",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            จัดการลูกน้อง ({subordinateCount})
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

async function OwnView({
  employeeId,
  employeeName,
  weekStart,
}: {
  employeeId: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
}) {
  const entries = await listScheduleEntries(employeeId, weekStart, addDays(weekStart, 6));
  return (
    <EmployeeSchedule
      employeeId={employeeId}
      employeeName={employeeName}
      weekStart={weekStart}
      entries={entries}
    />
  );
}

async function TeamView({
  supervisorId,
  supervisorName,
  weekStart,
  weekEnd,
}: {
  supervisorId: string;
  supervisorName: string;
  weekStart: string;
  weekEnd: string;
}) {
  const [team, entries] = await Promise.all([
    listTeamForSupervisor(supervisorId),
    listScheduleEntriesForTeam(supervisorId, weekStart, weekEnd),
  ]);
  return (
    <SupervisorSchedule
      supervisor={{ id: supervisorId, name: supervisorName }}
      weekStart={weekStart}
      team={team.map((e) => ({
        id: e.id,
        code: e.employee_code,
        name: e.name_th ?? e.name_en ?? e.employee_code ?? e.id,
        department: e.department,
      }))}
      entries={entries}
    />
  );
}
