"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Info, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  DemoDailyRosterRow,
  DemoEmployeeAttendanceStats,
} from "@/lib/demo-workforce";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DemoWorkforceDetailsProps {
  locale: string;
  dates: string[];
  defaultDate: string;
  dailyRows: Record<string, DemoDailyRosterRow[]>;
  employeeStats: DemoEmployeeAttendanceStats[];
}

export function DemoWorkforceDetails({
  locale,
  dates,
  defaultDate,
  dailyRows,
  employeeStats,
}: DemoWorkforceDetailsProps) {
  const t = useTranslations("dashboard.analytics.demo");
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale],
  );
  const number = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    [locale],
  );
  const signedNumber = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1, signDisplay: "always" }),
    [locale],
  );
  const rows = dailyRows[selectedDate] ?? [];
  const selectedDayCounts = {
    recorded: rows.filter((row) => row.dayStatus === "workday").length,
    beforeStart: rows.filter((row) => row.arrivalStatus === "before_shift").length,
    afterStart: rows.filter((row) => row.arrivalStatus === "late").length,
    beforeEnd: rows.filter((row) => row.departureStatus === "early_departure").length,
    afterEnd: rows.filter((row) => row.departureStatus === "after_shift").length,
    leave: rows.filter((row) => row.dayStatus === "leave").length,
    noCheckIn: rows.filter((row) => row.dayStatus === "absent").length,
  };

  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-orange-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription className="mt-1">{t("description")}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily">
          <TabsList>
            <TabsTrigger value="daily" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {t("dailyTab")}
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Clock3 className="h-4 w-4" />
              {t("employeeTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <div className="mb-4 flex flex-col gap-4 rounded-xl border border-navy-100 bg-navy-50/50 p-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-navy-900">{t("dailyTitle")}</p>
                <p className="mt-1 text-xs leading-5 text-navy-500">{t("dailyDescription")}</p>
              </div>
              <div className="w-full sm:w-64">
                <label className="mb-2 block text-xs font-medium text-navy-600" htmlFor="demo-workforce-date">
                  {t("selectedDate")}
                </label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger id="demo-workforce-date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...dates].reverse().map((value) => (
                      <SelectItem key={value} value={value}>
                        {dateFormatter.format(new Date(`${value}T00:00:00Z`))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
              <DailyCount label={t("selectedTimeRecorded")} value={selectedDayCounts.recorded} />
              <DailyCount label={t("beforeShift")} value={selectedDayCounts.beforeStart} />
              <DailyCount label={t("selectedAfterStart")} value={selectedDayCounts.afterStart} tone="orange" />
              <DailyCount label={t("selectedBeforeEnd")} value={selectedDayCounts.beforeEnd} tone="orange" />
              <DailyCount label={t("afterShift")} value={selectedDayCounts.afterEnd} />
              <DailyCount label={t("selectedLeave")} value={selectedDayCounts.leave} />
              <DailyCount label={t("selectedNoCheckIn")} value={selectedDayCounts.noCheckIn} tone="strong" />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">{t("employee")}</TableHead>
                  <TableHead className="min-w-36">{t("department")}</TableHead>
                  <TableHead>{t("shift")}</TableHead>
                  <TableHead className="min-w-40">{t("checkIn")}</TableHead>
                  <TableHead className="min-w-40">{t("checkOut")}</TableHead>
                  <TableHead>{t("dayStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>
                      <p className="font-medium text-navy-900">{locale === "th" ? row.nameTh : row.nameEn}</p>
                      <p className="mt-0.5 text-xs text-navy-500">{row.employeeCode} · {row.position}</p>
                    </TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {row.shiftStart}–{row.shiftEnd}
                    </TableCell>
                    <TableCell>
                      <TimeStatus
                        time={row.checkIn}
                        status={row.arrivalStatus}
                        label={t(`statuses.${row.arrivalStatus}`)}
                      />
                    </TableCell>
                    <TableCell>
                      <TimeStatus
                        time={row.checkOut}
                        status={row.departureStatus}
                        label={t(`statuses.${row.departureStatus}`)}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.dayStatus} label={t(`statuses.${row.dayStatus}`)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-4 text-xs leading-5 text-navy-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p>{t("statusDefinitions")}</p>
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <div className="mb-4 rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <p className="text-sm font-semibold text-navy-900">{t("employeeSummaryTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-navy-500">{t("employeeSummaryDescription")}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">{t("employee")}</TableHead>
                  <TableHead className="text-right">{t("scheduled")}</TableHead>
                  <TableHead className="text-right">{t("recordedWorkdays")}</TableHead>
                  <TableHead className="text-right">{t("leave")}</TableHead>
                  <TableHead className="text-right">{t("absent")}</TableHead>
                  <TableHead className="text-right">{t("beforeShift")}</TableHead>
                  <TableHead className="text-right">{t("late")}</TableHead>
                  <TableHead className="text-right">{t("earlyDeparture")}</TableHead>
                  <TableHead className="text-right">{t("afterShift")}</TableHead>
                  <TableHead className="text-right">{t("averageCheckIn")}</TableHead>
                  <TableHead className="text-right">{t("arrivalOffset")}</TableHead>
                  <TableHead className="text-right">{t("averageCheckOut")}</TableHead>
                  <TableHead className="text-right">{t("departureOffset")}</TableHead>
                  <TableHead className="text-right">{t("averageHours")}</TableHead>
                  <TableHead className="text-right">{t("attendance")}</TableHead>
                  <TableHead className="text-right">{t("punctuality")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeStats.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell>
                      <p className="font-medium text-navy-900">{locale === "th" ? row.nameTh : row.nameEn}</p>
                      <p className="mt-0.5 text-xs text-navy-500">{row.employeeCode} · {row.department}</p>
                    </TableCell>
                    <NumberCell value={row.scheduledDays} />
                    <NumberCell value={row.recordedWorkdays} />
                    <NumberCell value={row.leaveDays} />
                    <NumberCell value={row.absentDays} />
                    <NumberCell value={row.beforeShiftArrivals} />
                    <NumberCell value={row.lateArrivals} />
                    <NumberCell value={row.earlyDepartures} />
                    <NumberCell value={row.afterShiftDepartures} />
                    <TableCell className="text-right tabular-nums">{row.averageCheckIn ?? t("notApplicable")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.averageArrivalOffsetMinutes == null
                        ? t("notApplicable")
                        : t("minutesOffset", { value: signedNumber.format(row.averageArrivalOffsetMinutes) })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.averageCheckOut ?? t("notApplicable")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.averageDepartureOffsetMinutes == null
                        ? t("notApplicable")
                        : t("minutesOffset", { value: signedNumber.format(row.averageDepartureOffsetMinutes) })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.averageWorkedHours == null ? t("notApplicable") : number.format(row.averageWorkedHours)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{number.format(row.attendanceRate)}%</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{number.format(row.punctualityRate)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TimeStatus({
  time,
  status,
  label,
}: {
  time: string | null;
  status: DemoDailyRosterRow["arrivalStatus"] | DemoDailyRosterRow["departureStatus"];
  label: string;
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="font-medium tabular-nums text-navy-900">{time ?? "—"}</span>
      <StatusBadge status={status} label={label} />
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap",
        (status === "workday" || status === "on_time") &&
          "border-navy-900 bg-navy-900 text-white",
        (status === "leave" || status === "before_shift" || status === "after_shift") &&
          "border-navy-200 bg-navy-50 text-navy-700",
        status === "absent" && "border-orange-400 bg-orange-400 text-white",
        (status === "late" || status === "early_departure") &&
          "border-orange-200 bg-orange-100 text-orange-700",
        status === "not_applicable" && "border-navy-200 bg-white text-navy-500",
      )}
    >
      {label}
    </Badge>
  );
}

function DailyCount({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: number;
  tone?: "navy" | "orange" | "strong";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "navy" && "border-navy-200 bg-white",
        tone === "orange" && "border-orange-200 bg-orange-50",
        tone === "strong" && "border-orange-400 bg-orange-400 text-white",
      )}
    >
      <p
        className={cn(
          "text-xs",
          tone === "strong" ? "text-white" : "text-navy-500",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          tone === "strong" ? "text-white" : "text-navy-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function NumberCell({ value }: { value: number }) {
  return <TableCell className="text-right tabular-nums">{value}</TableCell>;
}
