import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { EmployeeSchedule } from "@/components/liff/schedule-employee";
import { SupervisorSchedule } from "@/components/liff/schedule-supervisor";
import {
  getEmployeeById,
  listScheduleEntries,
  listScheduleEntriesForTeam,
  listTeamForSupervisor,
} from "@/lib/data";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

interface SearchParams {
  as?: string;
  week?: string;
}

function mondayOf(dateStr?: string): string {
  // Default anchor: 2026-05-11 (the Monday of the week the user mentioned)
  const base = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date("2026-05-11T00:00:00Z");
  const dow = base.getUTCDay(); // 0=Sun..6=Sat
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

  // Resolve who's viewing — `?as=` overrides the default demo employee
  let viewer = await getEmployeeById(DEMO_EMPLOYEE_ID);
  if (sp.as) {
    const all = await import("@/lib/data").then((m) => m.listEmployees());
    viewer =
      all.find((e) => e.employee_code === sp.as!.toUpperCase()) ??
      all.find((e) => e.id === sp.as) ??
      viewer;
  }
  if (!viewer) {
    return (
      <>
        <LiffHeader title={t("hub.scheduleTitle")} />
        <main className="px-4 pb-6 pt-3 text-sm text-navy-500">ไม่พบพนักงาน</main>
      </>
    );
  }

  const weekStart = mondayOf(sp.week);
  const weekEnd = addDays(weekStart, 6);
  const isSupervisor = viewer.role === "supervisor" || viewer.role === "hr";

  if (isSupervisor) {
    const [team, entries] = await Promise.all([
      listTeamForSupervisor(viewer.id),
      listScheduleEntriesForTeam(viewer.id, weekStart, weekEnd),
    ]);
    return (
      <>
        <LiffHeader title={t("hub.scheduleTitle")} />
        <main className="px-4 pb-6 pt-3 space-y-3">
          <SupervisorSchedule
            supervisor={{ id: viewer.id, name: viewer.name_th ?? viewer.name_en ?? viewer.id }}
            weekStart={weekStart}
            team={team.map((e) => ({
              id: e.id,
              code: e.employee_code,
              name: e.name_th ?? e.name_en ?? e.employee_code ?? e.id,
              department: e.department,
            }))}
            entries={entries}
          />
        </main>
      </>
    );
  }

  const entries = await listScheduleEntries(viewer.id, weekStart, weekEnd);
  return (
    <>
      <LiffHeader title={t("hub.scheduleTitle")} />
      <main className="px-4 pb-6 pt-3 space-y-3">
        <EmployeeSchedule
          employeeId={viewer.id}
          employeeName={viewer.name_th ?? viewer.name_en ?? viewer.id}
          weekStart={weekStart}
          entries={entries}
        />
      </main>
    </>
  );
}
