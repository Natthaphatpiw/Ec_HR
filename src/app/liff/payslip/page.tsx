import Link from "next/link";
import { Calculator, Download, FileText, Info, Receipt, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { guardLiffPage } from "@/components/liff/page-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveSsoConfig, listPayrollsForEmployee } from "@/lib/data";
import {
  payrollPeriodDate,
  resolvePayrollPresentation,
  type PayrollCalculationStatus,
  type PayrollPresentation,
} from "@/lib/payroll/presentation";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PayslipSearchParams {
  period?: string;
}

const STATUS_LABELS: Record<PayrollCalculationStatus, string> = {
  estimate: "ประมาณการ (Estimate)",
  reviewed: "ตรวจทานแล้ว (Reviewed)",
  file_ready: "พร้อมจัดทำไฟล์ (File-ready)",
  paid: "จ่ายแล้ว (Paid)",
  void: "ยกเลิก (Void)",
};

export default async function PayslipPage({
  searchParams,
}: {
  searchParams: Promise<PayslipSearchParams>;
}) {
  const [t, params] = await Promise.all([getTranslations("liff.payslip"), searchParams]);
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_PAYSLIP,
  });
  if (!guard.ok) return guard.view;
  const employee = guard.employee;
  const payrolls = await listPayrollsForEmployee(employee.id);
  const periods = Array.from(new Set(payrolls.map((payroll) => payroll.month_year))).sort((a, b) =>
    b.localeCompare(a),
  );
  const configs = await Promise.all(
    periods.map(async (period) => [
      period,
      await getActiveSsoConfig("TH", payrollPeriodDate(period)),
    ] as const),
  );
  const configByPeriod = new Map(configs);
  const payslips = payrolls.map((payroll) =>
    resolvePayrollPresentation({
      payroll,
      employee,
      ssoConfig: configByPeriod.get(payroll.month_year),
    }),
  );
  const selectedPeriod =
    params.period && periods.includes(params.period) ? params.period : periods[0] ?? null;
  const selected = payslips.find((payroll) => payroll.monthYear === selectedPeriod) ?? null;

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="space-y-4 px-4 pb-6 pt-3">
        {selected ? (
          <PayslipCard payroll={selected} />
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Receipt className="mx-auto h-8 w-8 text-orange-400" />
              <div className="mt-3 text-sm font-semibold text-navy-900">ยังไม่มีผลเงินเดือน</div>
              <p className="mt-1 text-xs leading-relaxed text-navy-500">
                หน้านี้แสดงเฉพาะผลที่บันทึกในระบบ และจะไม่สร้างงวดเงินเดือนใหม่โดยอัตโนมัติ
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>สลิปย้อนหลัง</CardTitle>
            <CardDescription>เลือกงวดเพื่อดูผลที่บันทึกและสถานะการตรวจทาน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payslips.map((payroll) => (
              <Link
                key={payroll.id}
                href={`/liff/payslip?period=${payroll.monthYear}`}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  payroll.monthYear === selectedPeriod
                    ? "border-orange-200 bg-orange-50"
                    : "border-navy-100 bg-white hover:bg-navy-50"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-navy-900">
                    {formatPeriodThai(payroll.monthYear)}
                  </div>
                  <div className="mt-1 text-xs tabular-nums text-navy-500">
                    สุทธิ {formatCurrency(payroll.netPay, "th")}
                  </div>
                </div>
                <PayrollStatusBadge status={payroll.calculationStatus} compact />
              </Link>
            ))}
            {payslips.length === 0 && (
              <p className="py-3 text-center text-sm text-navy-500">ยังไม่มีสลิปย้อนหลัง</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function PayslipCard({ payroll }: { payroll: PayrollPresentation }) {
  const earnings = [
    { label: "เงินเดือนพื้นฐาน", value: payroll.basePay },
    { label: "ค่าตอบแทนประจำ", value: payroll.allowancePay },
    { label: "ค่าล่วงเวลา", value: payroll.overtimePay },
    { label: "โบนัส", value: payroll.bonusPay },
    { label: "รายได้อื่น", value: payroll.otherIncome },
  ].filter((item, index) => index === 0 || item.value !== 0);

  return (
    <Card className="overflow-hidden">
      <div className="bg-navy-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-orange-400" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {formatPeriodThai(payroll.monthYear)}
            </span>
          </div>
          <PayrollStatusBadge status={payroll.calculationStatus} compact inverse />
        </div>
        <div className="mt-4">
          <div className="text-xs text-navy-300">เงินได้สุทธิ</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {formatCurrency(payroll.netPay, "th")}
          </div>
          <div className="mt-1 text-[11px] text-navy-300">จากผลเงินเดือนที่บันทึกในระบบ</div>
        </div>
      </div>

      <CardContent className="space-y-5 p-5">
        <section>
          <SectionTitle>รายได้</SectionTitle>
          <div className="mt-3 space-y-2.5">
            {earnings.map((item) => (
              <MoneyRow
                key={item.label}
                label={item.label}
                value={formatCurrency(item.value, "th")}
                positive={item.value > 0 && item.label !== "เงินเดือนพื้นฐาน"}
              />
            ))}
            <div className="border-t border-navy-100 pt-2.5">
              <MoneyRow label="รายได้รวม" value={formatCurrency(payroll.grossPay, "th")} bold />
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>รายการหัก</SectionTitle>
          <div className="mt-3 space-y-2.5">
            <MoneyRow
              label="ประกันสังคมพนักงาน"
              value={`−${formatCurrency(payroll.employeeSso, "th")}`}
              negative
            />
            <MoneyRow
              label="ภาษีเงินได้หัก ณ ที่จ่าย"
              value={`−${formatCurrency(payroll.withholdingTax, "th")}`}
              negative
            />
            {payroll.otherDeductions !== 0 && (
              <MoneyRow
                label="รายการหักอื่น"
                value={`−${formatCurrency(payroll.otherDeductions, "th")}`}
                negative
              />
            )}
            <div className="border-t border-navy-100 pt-2.5">
              <MoneyRow label="เงินได้สุทธิ" value={formatCurrency(payroll.netPay, "th")} bold />
            </div>
          </div>
        </section>

        <div className="rounded-lg border border-navy-100 bg-navy-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
            <div>
              <div className="text-xs font-semibold text-navy-900">ประกันสังคมตามงวด</div>
              <p className="mt-1 text-[11px] leading-relaxed text-navy-600">
                พนักงาน {formatCurrency(payroll.employeeSso, "th")} · นายจ้างสมทบ{" "}
                {formatCurrency(payroll.employerSso, "th")} โดยส่วนของนายจ้างไม่หักจากเงินได้สุทธิ
              </p>
              {payroll.ssoRatePct !== null && (
                <p className="mt-1 text-[11px] leading-relaxed text-navy-500">
                  อัตรา {payroll.ssoRatePct}% · ฐานที่ใช้ {formatCurrency(payroll.ssoWageBase ?? 0, "th")} ·
                  ช่วงฐาน {formatCurrency(payroll.ssoWageFloor ?? 0, "th")}–
                  {formatCurrency(payroll.ssoWageCeiling ?? 0, "th")}
                </p>
              )}
              {payroll.ssoConfigId && (
                <p className="mt-1 font-mono text-[10px] text-navy-500">
                  {payroll.ssoConfigId} · มีผล {formatRulePeriod(payroll)}
                </p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-navy-500">
                ค่าลดหย่อนภาษีทั้งปีต้องใช้ยอดประกันสังคมที่จ่ายจริง ไม่ใช่เพดานเหมารวม
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-navy-900">วิธีคำนวณภาษี</div>
              <p className="mt-1 text-[11px] leading-relaxed text-navy-600">
                {formatTaxMethodThai(payroll.taxMethod)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <CalculationValue
                  label="เงินได้สุทธิ annualized"
                  value={formatCurrency(payroll.annualizedTaxableIncome, "th")}
                />
                <CalculationValue
                  label="ภาษีทั้งปีโดยประมาณ"
                  value={formatCurrency(payroll.annualTax, "th")}
                />
              </div>
              <p className="mt-2 font-mono text-[10px] text-navy-500">
                Version {payroll.calculationVersion}
              </p>
              {payroll.monthYear.endsWith("-12") && (
                <p className="mt-2 text-[11px] leading-relaxed text-orange-700">
                  งวดธันวาคมควร true-up ภาษีทั้งปีกับยอดหักสะสมและค่าลดหย่อนจริงก่อนปิดงวด
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-navy-100 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-navy-900">สถานะการตรวจทาน</span>
                <PayrollStatusBadge status={payroll.calculationStatus} compact />
              </div>
              {payroll.calculatedAt && (
                <p className="mt-2 text-[11px] text-navy-500">
                  คำนวณเมื่อ {formatDate(payroll.calculatedAt, "th")}
                </p>
              )}
              {payroll.reviewedAt && (
                <p className="mt-1 text-[11px] text-navy-500">
                  ตรวจทานเมื่อ {formatDate(payroll.reviewedAt, "th")}
                </p>
              )}
              {payroll.overrideReason && (
                <p className="mt-1 text-[11px] text-orange-700">
                  เหตุผลการปรับค่า: {payroll.overrideReason}
                </p>
              )}
              {payroll.isLegacyEstimate && (
                <p className="mt-2 text-[11px] leading-relaxed text-orange-700">
                  ระเบียนเดิมขาดข้อมูล audit บางช่อง ระบบจึงคำนวณเฉพาะช่องที่หายเพื่อแสดงผล
                  ค่าดังกล่าวยังเป็นประมาณการและไม่ได้เขียนกลับฐานข้อมูล
                </p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-navy-500">
                สถานะ File-ready หมายถึงพร้อมให้ฝ่ายบัญชีจัดทำไฟล์เท่านั้น ไม่ได้หมายความว่ายื่น ภ.ง.ด.1
                หรือประกันสังคมสำเร็จแล้ว
              </p>
            </div>
          </div>
        </div>

        {payroll.payslipPdfUrl ? (
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <a href={payroll.payslipPdfUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-3.5 w-3.5" />
                เปิด PDF
              </a>
            </Button>
            <Button asChild>
              <a href={payroll.payslipPdfUrl} download>
                <Download className="h-3.5 w-3.5" />
                ดาวน์โหลด
              </a>
            </Button>
          </div>
        ) : (
          <div className="rounded-md bg-navy-50 px-3 py-2 text-center text-xs text-navy-500">
            งวดนี้ยังไม่ได้แนบไฟล์ PDF
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-navy-500">{children}</h2>;
}

function MoneyRow({
  label,
  value,
  positive = false,
  negative = false,
  bold = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={bold ? "font-semibold text-navy-900" : "text-navy-500"}>{label}</span>
      <span
        className={`shrink-0 tabular-nums ${
          positive ? "text-orange-700" : negative ? "text-navy-700" : "text-navy-900"
        } ${bold ? "text-base font-semibold" : ""}`}
      >
        {positive ? "+" : ""}
        {value}
      </span>
    </div>
  );
}

function CalculationValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-2">
      <div className="text-[10px] text-navy-500">{label}</div>
      <div className="mt-1 font-medium tabular-nums text-navy-900">{value}</div>
    </div>
  );
}

function PayrollStatusBadge({
  status,
  compact = false,
  inverse = false,
}: {
  status: PayrollCalculationStatus;
  compact?: boolean;
  inverse?: boolean;
}) {
  const className = inverse
    ? "border-orange-400 bg-orange-400 text-white"
    : status === "file_ready"
      ? "border-orange-400 bg-orange-400 text-white"
      : status === "paid"
        ? "border-navy-900 bg-navy-900 text-white"
        : status === "reviewed"
          ? "border-navy-200 bg-navy-50 text-navy-700"
          : status === "void"
            ? "border-navy-300 bg-white text-navy-500"
            : "border-orange-200 bg-orange-50 text-orange-700";
  const label = compact ? STATUS_LABELS[status].split(" (")[0] : STATUS_LABELS[status];
  return (
    <Badge className={className} variant="outline">
      {label}
    </Badge>
  );
}

function formatPeriodThai(monthYear: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(payrollPeriodDate(monthYear));
}

function formatRulePeriod(payroll: PayrollPresentation): string {
  if (!payroll.ssoEffectiveFrom) return "ไม่พบช่วงวันที่กำกับ";
  const from = formatDate(`${payroll.ssoEffectiveFrom}T00:00:00Z`, "th");
  const to = payroll.ssoEffectiveTo
    ? formatDate(`${payroll.ssoEffectiveTo}T00:00:00Z`, "th")
    : "เป็นต้นไป";
  return `${from}–${to}`;
}

function formatTaxMethodThai(method: string): string {
  if (method.includes("por_96") || method.includes("annualized")) {
    return "คำนวณภาษีหัก ณ ที่จ่ายแบบ annualized ตามคำสั่งกรมสรรพากร ป.96/2543";
  }
  return method.replaceAll("_", " ");
}
