import Link from "next/link";
import { Calculator, FileText, Info, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { AnalyticsExportMenu } from "@/components/analytics/analytics-export-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getActiveSsoConfig,
  getDefaultOrganizationId,
  getEmployeeName,
  listEmployeesForOrg,
  listPayrolls,
} from "@/lib/data";
import {
  payrollPeriodDate,
  resolvePayrollPresentation,
  type PayrollCalculationStatus,
} from "@/lib/payroll/presentation";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PayrollSearchParams {
  period?: string;
}

const STATUS_LABELS: Record<PayrollCalculationStatus, string> = {
  estimate: "Estimate",
  reviewed: "Reviewed",
  file_ready: "File-ready",
  paid: "Paid",
  void: "Void",
};

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<PayrollSearchParams>;
}) {
  const orgId = getDefaultOrganizationId();
  const [t, employees, payrolls, params] = await Promise.all([
    getTranslations("dashboard.payroll"),
    listEmployeesForOrg(orgId),
    listPayrolls(orgId),
    searchParams,
  ]);
  const empMap = new Map(employees.map((employee) => [employee.id, employee]));
  const periods = Array.from(new Set(payrolls.map((payroll) => payroll.month_year))).sort((a, b) =>
    b.localeCompare(a),
  );
  const period = params.period && periods.includes(params.period) ? params.period : periods[0] ?? "2026-05";
  const ssoConfig = await getActiveSsoConfig("TH", payrollPeriodDate(period));
  const monthly = payrolls.filter((payroll) => payroll.month_year === period);
  const rows = monthly.flatMap((payroll) => {
    const employee = empMap.get(payroll.employee_id);
    if (!employee) return [];
    return [
      {
        employee,
        payroll: resolvePayrollPresentation({ payroll, employee, ssoConfig }),
      },
    ];
  });

  const totalGross = rows.reduce((total, row) => total + row.payroll.grossPay, 0);
  const totalNet = rows.reduce((total, row) => total + row.payroll.netPay, 0);
  const totalEmployeeDeductions = rows.reduce(
    (total, row) =>
      total + row.payroll.employeeSso + row.payroll.withholdingTax + row.payroll.otherDeductions,
    0,
  );
  const totalEmployerSso = rows.reduce((total, row) => total + row.payroll.employerSso, 0);
  const fallbackCount = rows.filter((row) => row.payroll.isLegacyEstimate).length;
  const statusCounts = rows.reduce<Partial<Record<PayrollCalculationStatus, number>>>((counts, row) => {
    const status = row.payroll.calculationStatus;
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-navy-500">
              Payroll period
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {periods.map((item) => (
                <Button
                  asChild
                  key={item}
                  size="sm"
                  variant={item === period ? "secondary" : "outline"}
                >
                  <Link href={`/dashboard/payroll?period=${item}`}>{formatPeriod(item)}</Link>
                </Button>
              ))}
              {periods.length === 0 && <Badge variant="muted">No payroll periods</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AnalyticsExportMenu days={180} />
            <Badge variant="outline">Read-only payroll register</Badge>
            {Object.entries(statusCounts).map(([status, count]) => (
              <PayrollStatusBadge
                key={status}
                status={status as PayrollCalculationStatus}
                suffix={` ${count}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={t("totalPayroll")}
            value={formatCurrency(totalGross)}
            description={`Stored gross pay for ${rows.length} employees`}
          />
          <MetricCard
            label="Employee deductions"
            value={formatCurrency(totalEmployeeDeductions)}
            description="Employee SSO, PIT withholding and other deductions"
          />
          <MetricCard
            label="Employer SSO"
            value={formatCurrency(totalEmployerSso)}
            description="Employer expense; not deducted from employee net pay"
          />
          <MetricCard
            accent
            label={t("totalNet")}
            value={formatCurrency(totalNet)}
            description="Net pay from stored payroll results"
          />
        </div>

        <Card className="mt-6">
          <CardContent className="grid gap-5 p-5 md:grid-cols-3">
            <RuleSummary
              icon={ShieldCheck}
              title="Period-effective SSO rule"
              body={
                ssoConfig
                  ? `${ssoConfig.rate_pct}% · wage base ${formatCurrency(ssoConfig.wage_floor)}–${formatCurrency(ssoConfig.wage_ceiling)} · ${ssoConfig.id}`
                  : "No SSO rule is configured for this payroll period. Stored contributions are shown without recalculation."
              }
            />
            <RuleSummary
              icon={Calculator}
              title="PIT withholding"
              body="Annualized Thai PIT withholding under Revenue Department Order Por.96/2543. Method and calculation version remain visible per employee."
            />
            <RuleSummary
              icon={Info}
              title="Review boundary"
              body="File-ready means the calculation was reviewed for export. It does not mean the PND.1 or SSO filing was submitted or accepted."
            />
          </CardContent>
        </Card>

        {fallbackCount > 0 && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            {fallbackCount} legacy row{fallbackCount === 1 ? "" : "s"} contain missing audit fields.
            Their missing values are calculated for display only and remain clearly marked as estimates.
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payroll register · {formatPeriod(period)}</CardTitle>
            <CardDescription>
              Stored payroll results, employee and employer SSO, withholding method, and review state
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table className="min-w-[1320px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Gross pay</TableHead>
                  <TableHead className="text-right">Employee SSO</TableHead>
                  <TableHead className="text-right">Employer SSO</TableHead>
                  <TableHead className="text-right">PIT withholding</TableHead>
                  <TableHead className="text-right">Net pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead className="text-right">Payslip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ employee, payroll }) => {
                  const name = getEmployeeName(employee, "en");
                  const reviewer = payroll.reviewedById ? empMap.get(payroll.reviewedById) : null;
                  return (
                    <TableRow key={payroll.id}>
                      <TableCell>
                        <div className="flex min-w-48 items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-navy-900 text-xs text-white">
                              {getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-navy-900">{name}</div>
                            <div className="font-mono text-xs text-navy-500">
                              {employee.employee_code ?? employee.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-36 text-right tabular-nums text-navy-900">
                        <div className="font-medium">{formatCurrency(payroll.grossPay)}</div>
                        <div className="mt-1 text-[11px] text-navy-500">
                          Base {formatCurrency(payroll.basePay)} · OT {formatCurrency(payroll.overtimePay)}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-32 text-right tabular-nums text-navy-700">
                        <div>−{formatCurrency(payroll.employeeSso)}</div>
                        <div className="mt-1 text-[11px] text-navy-500">
                          {payroll.ssoRatePct ?? 0}% · base {formatCurrency(payroll.ssoWageBase ?? 0)}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-32 text-right tabular-nums text-navy-700">
                        <div>{formatCurrency(payroll.employerSso)}</div>
                        <div className="mt-1 text-[11px] text-navy-500">Employer expense</div>
                      </TableCell>
                      <TableCell className="min-w-36 text-right tabular-nums text-navy-700">
                        <div>−{formatCurrency(payroll.withholdingTax)}</div>
                        <div className="mt-1 text-[11px] text-navy-500">
                          Annual tax {formatCurrency(payroll.annualTax)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-navy-900">
                        {formatCurrency(payroll.netPay)}
                      </TableCell>
                      <TableCell className="min-w-36">
                        <PayrollStatusBadge status={payroll.calculationStatus} />
                        {payroll.reviewedAt && (
                          <div className="mt-1 text-[11px] text-navy-500">
                            {reviewer ? getEmployeeName(reviewer, "en") : "Reviewer"} ·{" "}
                            {formatDate(payroll.reviewedAt)}
                          </div>
                        )}
                        {payroll.overrideReason && (
                          <div className="mt-1 text-[11px] text-orange-700">
                            Override: {payroll.overrideReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-56">
                        <div className="text-xs font-medium text-navy-900">
                          {formatTaxMethod(payroll.taxMethod)}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-navy-500">
                          {payroll.calculationVersion}
                        </div>
                        <div className="mt-1 text-[11px] text-navy-500">
                          Annualized taxable {formatCurrency(payroll.annualizedTaxableIncome)}
                        </div>
                        {payroll.isLegacyEstimate && (
                          <Badge className="mt-2" variant="default">
                            Legacy fields estimated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {payroll.payslipPdfUrl ? (
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <a
                              href={payroll.payslipPdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open payslip for ${name}`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-navy-400">Not attached</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-navy-500">
                      No payroll results are stored for {formatPeriod(period)}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function MetricCard({
  label,
  value,
  description,
  accent = false,
}: {
  label: string;
  value: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-orange-200 bg-orange-50/30" : undefined}>
      <CardContent className="p-5">
        <div
          className={`text-xs font-semibold uppercase tracking-wider ${
            accent ? "text-orange-700" : "text-navy-500"
          }`}
        >
          {label}
        </div>
        <div
          className={`mt-2 text-2xl font-semibold tabular-nums ${
            accent ? "text-orange-700" : "text-navy-900"
          }`}
        >
          {value}
        </div>
        <div className="mt-1 text-xs leading-relaxed text-navy-500">{description}</div>
      </CardContent>
    </Card>
  );
}

function RuleSummary({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-navy-900">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-navy-500">{body}</p>
      </div>
    </div>
  );
}

function PayrollStatusBadge({
  status,
  suffix = "",
}: {
  status: PayrollCalculationStatus;
  suffix?: string;
}) {
  const className =
    status === "file_ready"
      ? "border-orange-400 bg-orange-400 text-white"
      : status === "paid"
        ? "border-navy-900 bg-navy-900 text-white"
        : status === "reviewed"
          ? "border-navy-200 bg-navy-50 text-navy-700"
          : status === "void"
            ? "border-navy-300 bg-white text-navy-500"
            : "border-orange-200 bg-orange-50 text-orange-700";
  return (
    <Badge className={className} variant="outline">
      {STATUS_LABELS[status]}
      {suffix}
    </Badge>
  );
}

function formatPeriod(monthYear: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(payrollPeriodDate(monthYear));
}

function formatTaxMethod(method: string): string {
  if (method.includes("por_96") || method.includes("annualized")) {
    return "Annualized PIT · Por.96/2543";
  }
  return method.replaceAll("_", " ");
}

function getInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "HR";
}
