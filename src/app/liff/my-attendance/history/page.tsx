import { getTranslations } from "next-intl/server";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRegistrationStatus, listAttendanceForEmployee } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";
import { formatDate, formatTime } from "@/lib/utils";

export default async function AttendanceHistoryPage() {
  const t = await getTranslations("liff.myAttendance");
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return (
      <>
        <LiffHeader title={t("hub.historyTitle")} />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_ATTENDANCE} />
        </main>
      </>
    );
  }
  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return (
      <>
        <LiffHeader title={t("hub.historyTitle")} />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status={registration.state} />
        </main>
      </>
    );
  }
  const attendance = await listAttendanceForEmployee(registration.employee.id);

  const ontime = attendance.filter((a) => a.status === "ontime").length;
  const late = attendance.filter((a) => a.status === "late").length;
  const totalIn = attendance.filter((a) => a.type === "in").length;

  const byDate = new Map<string, typeof attendance>();
  for (const a of attendance) {
    const key = a.timestamp.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(a);
  }
  const days = Array.from(byDate.entries()).slice(0, 30);

  return (
    <>
      <LiffHeader title={t("hub.historyTitle")} />
      <main className="px-4 pb-6 pt-3 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard label={t("ontime")} value={String(ontime)} icon={CheckCircle2} accent="success" />
          <SummaryCard label={t("late")} value={String(late)} icon={Clock} accent="warning" />
          <SummaryCard label="Total" value={`${totalIn}d`} icon={Calendar} />
        </div>

        <Tabs defaultValue="month">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week">{t("thisWeek")}</TabsTrigger>
            <TabsTrigger value="month">{t("thisMonth")}</TabsTrigger>
          </TabsList>

          <TabsContent value="month">
            <Card>
              <CardHeader>
                <CardTitle>{t("thisMonth")}</CardTitle>
                <CardDescription>Daily clock-in / clock-out timeline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {days.map(([date, logs]) => {
                  const inLog = logs.find((l) => l.type === "in");
                  const outLog = logs.find((l) => l.type === "out");
                  return (
                    <div
                      key={date}
                      className="flex items-center justify-between rounded-lg border border-navy-100 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-navy-900">{formatDate(date)}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-navy-500">
                          <span>In: {inLog ? formatTime(inLog.timestamp) : "—"}</span>
                          <span>·</span>
                          <span>Out: {outLog ? formatTime(outLog.timestamp) : "—"}</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          inLog?.status === "late"
                            ? "warning"
                            : inLog
                              ? "success"
                              : "danger"
                        }
                      >
                        {inLog ? inLog.status : "absent"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="week">
            <Card>
              <CardHeader>
                <CardTitle>{t("thisWeek")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {days.slice(0, 7).map(([date, logs]) => {
                  const inLog = logs.find((l) => l.type === "in");
                  return (
                    <div
                      key={date}
                      className="flex items-center justify-between rounded-lg border border-navy-100 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-navy-900">{formatDate(date)}</div>
                        <div className="mt-0.5 text-xs text-navy-500">
                          In: {inLog ? formatTime(inLog.timestamp) : "—"}
                        </div>
                      </div>
                      <Badge variant={inLog?.status === "late" ? "warning" : "success"}>
                        {inLog ? inLog.status : "absent"}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle2;
  accent?: "success" | "warning" | "danger";
}) {
  const color =
    accent === "success"
      ? "text-emerald-600"
      : accent === "warning"
        ? "text-amber-600"
        : accent === "danger"
          ? "text-red-600"
          : "text-navy-900";
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className={`mx-auto h-4 w-4 ${color}`} />
        <div className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-navy-500">{label}</div>
      </CardContent>
    </Card>
  );
}
