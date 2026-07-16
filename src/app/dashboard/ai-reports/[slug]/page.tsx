import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText } from "lucide-react";
import { WorkforceReportCharts } from "@/components/dashboard/workforce-report-charts";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveAnalyticsAccess } from "@/lib/analytics-access";
import { getWorkforceAssistantReport } from "@/lib/data";
import {
  isWorkforceReportToken,
  readWorkforceReportToken,
} from "@/lib/workforce-assistant/report-token";
import {
  workforceReportPayloadSchema,
  type WorkforceReportPayload,
} from "@/lib/workforce-assistant/schema";
import { cn } from "@/lib/utils";

interface ReportView {
  report: WorkforceReportPayload;
  createdAt: string;
}

async function loadReport(slug: string, orgId: string): Promise<ReportView | null> {
  if (isWorkforceReportToken(slug)) {
    try {
      const token = readWorkforceReportToken(slug);
      if (token.orgId !== orgId) return null;
      return {
        report: token.report,
        createdAt: token.createdAt,
      };
    } catch {
      return null;
    }
  }

  try {
    const record = await getWorkforceAssistantReport(orgId, slug);
    if (!record?.report_payload) return null;
    const report = workforceReportPayloadSchema.safeParse(record.report_payload);
    if (!report.success) return null;
    return {
      report: report.data,
      createdAt: record.created_at,
    };
  } catch {
    return null;
  }
}

export default async function WorkforceReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const access = await resolveAnalyticsAccess();
  if (!access.ok) notFound();
  const { slug } = await params;
  const view = await loadReport(decodeURIComponent(slug), access.orgId);
  if (!view) notFound();

  const formattedCreatedAt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(view.createdAt));

  return (
    <>
      <DashboardTopbar
        title={view.report.title}
        subtitle="รายงานที่สร้างจากข้อมูลแบบมีโครงสร้างและแสดงผลด้วยองค์ประกอบของระบบ"
      />
      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/ai-assistant">
              <ArrowLeft className="h-4 w-4" />
              กลับไปที่ผู้ช่วย
            </Link>
          </Button>
          <span className="flex items-center gap-1.5 text-xs text-navy-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {formattedCreatedAt}
          </span>
        </div>

        <Card className="overflow-hidden border-navy-200">
          <div className="h-1.5 bg-orange-400" />
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-orange-600">
                <FileText className="h-4 w-4" />
                {view.report.periodLabel || "ช่วงข้อมูลตามคำถาม"}
              </div>
              <p className="max-w-4xl whitespace-pre-wrap text-sm leading-7 text-navy-700">
                {view.report.summary}
              </p>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-navy-700">
              <div className="flex items-center gap-2 font-semibold text-navy-900">
                <FileText className="h-4 w-4 text-orange-500" />
                รายงานพร้อมใช้งาน
              </div>
              <p className="mt-1 max-w-xs">สรุปจากข้อมูลที่อยู่ในขอบเขตองค์กรของคุณ</p>
            </div>
          </CardContent>
        </Card>

        {view.report.metrics.length > 0 && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {view.report.metrics.map((metric, index) => (
              <Card key={`${metric.label}-${index}`}>
                <CardContent className="p-5">
                  <p className="text-xs font-medium text-navy-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-navy-900">
                    {new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(metric.value)}
                    {metric.unit && (
                      <span className="ml-1.5 text-sm font-medium text-navy-500">{metric.unit}</span>
                    )}
                  </p>
                  {metric.context && <p className="mt-2 text-xs text-navy-500">{metric.context}</p>}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {view.report.charts.length > 0 && <WorkforceReportCharts charts={view.report.charts} />}

        {view.report.insights.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold text-navy-900">ข้อสังเกตจากข้อมูล</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {view.report.insights.map((insight, index) => (
                <div
                  key={`${insight.title}-${index}`}
                  className={cn(
                    "rounded-xl border p-5 shadow-card",
                    insight.tone === "neutral"
                      ? "border-navy-100 bg-white"
                      : "border-orange-200 bg-orange-50",
                  )}
                >
                  <h3 className="text-sm font-semibold text-navy-900">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-navy-600">{insight.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-navy-500">
              การเน้นสีแสดงความแตกต่างเชิงตัวเลขเท่านั้น ไม่ใช่การประเมินคุณลักษณะ ผลงาน
              หรือเจตนาของบุคคล และไม่ควรใช้ข้อมูลเวลาเพียงอย่างเดียวเพื่อลงโทษหรือให้รางวัล
            </p>
          </section>
        )}

        {view.report.table.columns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{view.report.table.title || "รายละเอียด"}</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {view.report.table.columns.map((column, index) => (
                      <TableHead key={`${column}-${index}`}>{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {view.report.table.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {view.report.table.columns.map((_, cellIndex) => (
                        <TableCell key={cellIndex} className="text-xs text-navy-700">
                          {row[cellIndex] ?? ""}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>แหล่งข้อมูลและขอบเขต</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {view.report.sources.map((source, index) => (
              <div key={`${source.label}-${index}`} className="rounded-lg border border-navy-100 p-4">
                <p className="text-xs font-semibold text-navy-900">{source.label}</p>
                <p className="mt-1 text-xs leading-5 text-navy-500">{source.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
