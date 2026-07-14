import { ChevronLeft, ChevronRight, Plus, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getEmployeeName,
  getDefaultOrganizationId,
  listEmployeeShifts,
  listEmployeesForOrg,
  listShifts,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export default async function ShiftsPage() {
  const orgId = getDefaultOrganizationId();
  const [t, employees, shifts, employeeShifts] = await Promise.all([
    getTranslations("dashboard.shifts"),
    listEmployeesForOrg(orgId),
    listShifts(orgId),
    listEmployeeShifts(orgId),
  ]);
  const workers = employees.filter((e) => e.role === "employee" || e.role === "supervisor");
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date("2026-05-09T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i - 3);
    return d.toISOString().slice(0, 10);
  });

  const cellShift = (employeeId: string, date: string) => {
    const es = employeeShifts.find((s) => s.employee_id === employeeId && s.date === date);
    return es ? shiftMap.get(es.shift_id) : undefined;
  };

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Week of May 6 – 12</CardTitle>
              <CardDescription>Drag a shift cell to reassign · click + to add</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                This week
              </Button>
              <Button variant="outline" size="icon" aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                {t("aiSuggest")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b border-navy-100 bg-navy-50/50 text-xs font-semibold uppercase tracking-wider text-navy-500">
                <div className="px-4 py-3">Employee</div>
                {days.map((d) => {
                  const date = new Date(d + "T00:00:00Z");
                  const isToday = d === "2026-05-09";
                  return (
                    <div
                      key={d}
                      className={cn(
                        "border-l border-navy-100 px-3 py-3 text-center",
                        isToday && "bg-orange-50 text-orange-700",
                      )}
                    >
                      <div>{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                      <div className="text-base font-semibold normal-case tracking-normal text-navy-900">
                        {date.getUTCDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
              {workers.map((emp) => (
                <div
                  key={emp.id}
                  className="grid grid-cols-[200px_repeat(7,minmax(0,1fr))] border-b border-navy-100 last:border-0"
                >
                  <div className="px-4 py-3">
                    <div className="font-medium text-navy-900">{getEmployeeName(emp, "en")}</div>
                    <div className="text-xs text-navy-500">
                      {emp.position} · Group {emp.shift_group ?? "-"}
                    </div>
                  </div>
                  {days.map((d) => {
                    const s = cellShift(emp.id, d);
                    return (
                      <div
                        key={d}
                        className="flex items-center justify-center border-l border-navy-100 p-2"
                      >
                        {s ? (
                          <ShiftPill name={s.name} />
                        ) : (
                          <button className="flex h-8 w-full items-center justify-center rounded-md text-navy-300 hover:bg-navy-50 hover:text-orange-500">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="border-orange-200 bg-orange-50/30 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-orange-700">{t("aiSuggest")}</CardTitle>
              </div>
              <CardDescription>
                Mastra suggests rotation patterns based on historical attendance, leave patterns, and OT
                fatigue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Suggestion
                title="Add 2 evening-shift slots Friday"
                desc="Production line A is 6% below baseline. Recommend EMP005 and EMP009 (lowest OT this month)."
              />
              <Suggestion
                title="Rotate Group B off Saturday"
                desc="Group B has worked 6 consecutive days. Swap with Group C for fatigue compliance."
              />
              <Suggestion
                title="Pre-approve OT for May 14"
                desc="Approved leave overlap (EMP001, EMP010) leaves Production short by 2."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shift legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {shifts.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-navy-100 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-navy-900">{s.name}</div>
                    <div className="text-xs text-navy-500">
                      {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)} · {s.break_minutes}m break
                    </div>
                  </div>
                  <ShiftPill name={s.name} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function ShiftPill({ name }: { name: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    "Morning Shift": { bg: "bg-orange-100", text: "text-orange-700", label: "M" },
    "Evening Shift": { bg: "bg-sky-100", text: "text-sky-700", label: "E" },
    "Night Shift": { bg: "bg-navy-900", text: "text-white", label: "N" },
  };
  const v = map[name] ?? { bg: "bg-navy-100", text: "text-navy-700", label: "?" };
  return (
    <div className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1.5", v.bg, v.text)}>
      <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold opacity-80">
        {v.label}
      </span>
      <span className="text-[11px] font-medium">{name.replace(" Shift", "")}</span>
    </div>
  );
}

function Suggestion({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-orange-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-400 text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-navy-900">{title}</div>
          <div className="mt-0.5 text-xs text-navy-500">{desc}</div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
            Dismiss
          </Button>
          <Button size="sm" className="h-7 px-2 text-xs">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
