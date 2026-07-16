"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Info, Users } from "lucide-react";
import { useTranslations } from "next-intl";
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
import type {
  DemoDailyRosterRow,
  DemoEmployeeAttendanceStats,
} from "@/lib/demo-workforce";
import { cn } from "@/lib/utils";

interface LiffDemoWorkforceDetailsProps {
  locale: string;
  dates: string[];
  defaultDate: string;
  dailyRows: Record<string, DemoDailyRosterRow[]>;
  employeeStats: DemoEmployeeAttendanceStats[];
}

export function LiffDemoWorkforceDetails({
  locale,
  dates,
  defaultDate,
  dailyRows,
  employeeStats,
}: LiffDemoWorkforceDetailsProps) {
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
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-orange-400">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription className="mt-1 leading-5">{t("description")}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        <Tabs defaultValue="daily">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily" className="gap-1.5 px-2">
              <CalendarDays className="h-3.5 w-3.5" />
              {t("dailyTab")}
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5 px-2">
              <Clock3 className="h-3.5 w-3.5" />
              {t("employeeTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4 space-y-4">
            <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <p className="text-sm font-semibold text-navy-900">{t("dailyTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-navy-500">{t("dailyDescription")}</p>
              <label
                className="mb-1.5 mt-3 block text-xs font-medium text-navy-600"
                htmlFor="liff-demo-workforce-date"
              >
                {t("selectedDate")}
              </label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger id="liff-demo-workforce-date">
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

            <div className="grid grid-cols-2 gap-2">
              <DailyCount label={t("selectedTimeRecorded")} value={selectedDayCounts.recorded} />
              <DailyCount label={t("beforeShift")} value={selectedDayCounts.beforeStart} />
              <DailyCount label={t("selectedAfterStart")} value={selectedDayCounts.afterStart} tone="orange" />
              <DailyCount label={t("selectedBeforeEnd")} value={selectedDayCounts.beforeEnd} tone="orange" />
              <DailyCount label={t("afterShift")} value={selectedDayCounts.afterEnd} />
              <DailyCount label={t("selectedLeave")} value={selectedDayCounts.leave} />
              <DailyCount label={t("selectedNoCheckIn")} value={selectedDayCounts.noCheckIn} tone="strong" />
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <DailyEmployeeCard key={row.employeeId} row={row} locale={locale} />
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-navy-700">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <p>{t("statusDefinitions")}</p>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="mt-4 space-y-4">
            <div className="rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <p className="text-sm font-semibold text-navy-900">{t("employeeSummaryTitle")}</p>
              <p className="mt-1 text-xs leading-5 text-navy-500">{t("employeeSummaryDescription")}</p>
            </div>
            <div className="space-y-3">
              {employeeStats.map((row) => (
                <EmployeeStatsCard
                  key={row.employeeId}
                  row={row}
                  locale={locale}
                  number={number}
                  signedNumber={signedNumber}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DailyEmployeeCard({
  row,
  locale,
}: {
  row: DemoDailyRosterRow;
  locale: string;
}) {
  const t = useTranslations("dashboard.analytics.demo");

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy-900">
            {locale === "th" ? row.nameTh : row.nameEn}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-navy-500">
            {row.employeeCode} · {row.department}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-navy-400">{row.position}</p>
        </div>
        <StatusBadge status={row.dayStatus} label={t(`statuses.${row.dayStatus}`)} />
      </div>

      <div className="mt-3 rounded-lg bg-navy-50 px-3 py-2 text-[11px] text-navy-600">
        {t("shift")} <span className="font-medium text-navy-900 tabular-nums">{row.shiftStart}–{row.shiftEnd}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <TimeBlock
          label={t("checkIn")}
          time={row.checkIn}
          status={row.arrivalStatus}
          statusLabel={t(`statuses.${row.arrivalStatus}`)}
        />
        <TimeBlock
          label={t("checkOut")}
          time={row.checkOut}
          status={row.departureStatus}
          statusLabel={t(`statuses.${row.departureStatus}`)}
        />
      </div>
    </div>
  );
}

function TimeBlock({
  label,
  time,
  status,
  statusLabel,
}: {
  label: string;
  time: string | null;
  status: DemoDailyRosterRow["arrivalStatus"] | DemoDailyRosterRow["departureStatus"];
  statusLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-navy-100 p-3">
      <p className="text-[10px] text-navy-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-navy-900 tabular-nums">{time ?? "—"}</p>
      <StatusBadge status={status} label={statusLabel} className="mt-2 max-w-full" />
    </div>
  );
}

function EmployeeStatsCard({
  row,
  locale,
  number,
  signedNumber,
}: {
  row: DemoEmployeeAttendanceStats;
  locale: string;
  number: Intl.NumberFormat;
  signedNumber: Intl.NumberFormat;
}) {
  const t = useTranslations("dashboard.analytics.demo");
  const formatOffset = (value: number | null) =>
    value == null
      ? t("notApplicable")
      : t("minutesOffset", { value: signedNumber.format(value) });

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4 shadow-soft">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-navy-900">
          {locale === "th" ? row.nameTh : row.nameEn}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-navy-500">
          {row.employeeCode} · {row.department}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatMetric label={t("attendance")} value={`${number.format(row.attendanceRate)}%`} />
        <StatMetric label={t("punctuality")} value={`${number.format(row.punctualityRate)}%`} accent />
        <StatMetric label={t("averageCheckIn")} value={row.averageCheckIn ?? t("notApplicable")} />
        <StatMetric label={t("arrivalOffset")} value={formatOffset(row.averageArrivalOffsetMinutes)} />
        <StatMetric label={t("averageCheckOut")} value={row.averageCheckOut ?? t("notApplicable")} />
        <StatMetric label={t("departureOffset")} value={formatOffset(row.averageDepartureOffsetMinutes)} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-navy-50 p-2">
        <CountMetric label={t("recordedWorkdays")} value={row.recordedWorkdays} />
        <CountMetric label={t("late")} value={row.lateArrivals} />
        <CountMetric label={t("earlyDeparture")} value={row.earlyDepartures} />
        <CountMetric label={t("absent")} value={row.absentDays} />
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "whitespace-nowrap text-[10px]",
        (status === "workday" || status === "on_time") &&
          "border-navy-900 bg-navy-900 text-white",
        (status === "leave" || status === "before_shift" || status === "after_shift") &&
          "border-navy-200 bg-navy-50 text-navy-700",
        status === "absent" && "border-orange-400 bg-orange-400 text-white",
        (status === "late" || status === "early_departure") &&
          "border-orange-200 bg-orange-100 text-orange-700",
        status === "not_applicable" && "border-navy-200 bg-white text-navy-500",
        className,
      )}
    >
      <span className="truncate">{label}</span>
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
        "rounded-xl border p-3",
        tone === "navy" && "border-navy-200 bg-white",
        tone === "orange" && "border-orange-200 bg-orange-50",
        tone === "strong" && "border-orange-400 bg-orange-400 text-white",
      )}
    >
      <p className={cn("text-[10px] leading-4", tone === "strong" ? "text-white" : "text-navy-500")}>
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "strong" ? "text-white" : "text-navy-900")}>
        {value}
      </p>
    </div>
  );
}

function StatMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-3", accent ? "border-orange-200 bg-orange-50" : "border-navy-100 bg-white")}>
      <p className="text-[10px] leading-4 text-navy-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy-900 tabular-nums">{value}</p>
    </div>
  );
}

function CountMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 text-center">
      <p className="text-sm font-semibold text-navy-900 tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-[9px] text-navy-500">{label}</p>
    </div>
  );
}
