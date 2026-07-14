import { NextResponse } from "next/server";
import { resolveAnalyticsAccess } from "@/lib/analytics-access";
import {
  buildAnalyticsWorkbook,
  type AnalyticsExportDataset,
} from "@/lib/analytics-workbook";
import { getWorkforceAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";

const ALLOWED_DATASETS = new Set<AnalyticsExportDataset>([
  "all",
  "summary",
  "employees",
  "attendance",
  "leave",
  "overtime",
  "payroll",
  "performance",
]);

function parseDataset(value: string | null): AnalyticsExportDataset | null {
  if (!value || value === "all") return "all";
  return ALLOWED_DATASETS.has(value as AnalyticsExportDataset)
    ? (value as AnalyticsExportDataset)
    : null;
}

function parseDays(value: string | null): number {
  const days = Number(value ?? 30);
  return Number.isFinite(days) ? Math.min(180, Math.max(7, Math.round(days))) : 30;
}

function filenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9ก-๙_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "organization";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dataset = parseDataset(url.searchParams.get("dataset"));
  if (!dataset) {
    return NextResponse.json(
      { error: "Unsupported analytics dataset." },
      { status: 400 },
    );
  }

  const access = await resolveAnalyticsAccess();
  if (!access.ok) {
    return NextResponse.json(
      { error: "You are not authorized to export this analytics scope." },
      { status: access.reason === "forbidden" ? 403 : 401 },
    );
  }

  const days = parseDays(url.searchParams.get("days"));
  const analytics = await getWorkforceAnalytics({
    orgId: access.orgId,
    employeeIds: access.employeeIds,
    scope: access.scope,
    days,
  });
  const workbook = buildAnalyticsWorkbook(analytics, dataset);
  const filename = `EC-AIHR-${filenamePart(analytics.organization.business_name)}-${dataset}-${analytics.rangeEnd}.xlsx`;
  const body = workbook.buffer.slice(
    workbook.byteOffset,
    workbook.byteOffset + workbook.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
