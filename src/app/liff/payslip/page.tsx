import { getTranslations } from "next-intl/server";
import { Download, FileText, Receipt } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { guardLiffPage } from "@/components/liff/page-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calcEmployeeSso,
  getActiveSsoConfig,
  listPayrollsForEmployee,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES: Record<string, string> = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

export default async function PayslipPage() {
  const t = await getTranslations("liff.payslip");
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_PAYSLIP,
  });
  if (!guard.ok) return guard.view;
  const me = guard.employee;
  const payrolls = await listPayrollsForEmployee(me.id);
  const sso = await calcEmployeeSso(me.base_salary, new Date());
  const ssoConfig = await getActiveSsoConfig("TH", new Date());

  const latest = payrolls[0];
  // When we have a real salary on file, recompute the current-period SSO
  // contribution live so the user always sees the latest legal rate.
  const liveLatest = latest
    ? {
        ...latest,
        ssf_deduction: sso.contribution || latest.ssf_deduction,
        net_pay:
          latest.base_pay +
          latest.ot_pay -
          (sso.contribution || latest.ssf_deduction) -
          latest.tax_deduction,
      }
    : null;

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3 space-y-4">
        {liveLatest && (
          <Card className="overflow-hidden">
            <div className="bg-navy-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {MONTH_NAMES[liveLatest.month_year.slice(-2)]} {liveLatest.month_year.slice(0, 4)}
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-0">Paid</Badge>
              </div>
              <div className="mt-4">
                <div className="text-xs text-navy-300">Net pay</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {formatCurrency(liveLatest.net_pay)}
                </div>
              </div>
            </div>
            <CardContent className="space-y-3 p-5">
              <Row label="Base salary" value={formatCurrency(liveLatest.base_pay)} />
              <Row label="Overtime pay" value={`+${formatCurrency(liveLatest.ot_pay)}`} positive />
              <Row
                label={`Social Security (${sso.ratePct}%${sso.capped ? " · capped" : ""})`}
                value={`-${formatCurrency(liveLatest.ssf_deduction)}`}
                negative
              />
              <Row label="Withholding tax" value={`-${formatCurrency(liveLatest.tax_deduction)}`} negative />
              <div className="border-t border-navy-100 pt-3">
                <Row label="Net pay" value={formatCurrency(liveLatest.net_pay)} bold />
              </div>
              {ssoConfig && (
                <div className="rounded-md bg-navy-50 px-3 py-2 text-[11px] leading-relaxed text-navy-600">
                  <b>ประกันสังคม 2569</b>: {ssoConfig.rate_pct}% ของฐานเงินเดือน (
                  {formatCurrency(ssoConfig.wage_floor)} – {formatCurrency(ssoConfig.wage_ceiling)})
                  สูงสุด {formatCurrency(ssoConfig.max_contribution)} บาท/เดือน
                  {me.base_salary == null && (
                    <>
                      <br />
                      <span className="text-orange-700">
                        ยังไม่ระบุเงินเดือนในระบบ — ไปที่หน้าโปรไฟล์เพื่อใส่
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">
                  <FileText className="h-3.5 w-3.5" />
                  {t("viewPdf")}
                </Button>
                <Button className="flex-1">
                  <Download className="h-3.5 w-3.5" />
                  {t("download")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Past payslips</CardTitle>
            <CardDescription>Tap to view a previous month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payrolls.slice(1).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-navy-100 p-3"
              >
                <div>
                  <div className="text-sm font-medium text-navy-900">
                    {MONTH_NAMES[p.month_year.slice(-2)]} {p.month_year.slice(0, 4)}
                  </div>
                  <div className="text-xs text-navy-500">
                    Net {formatCurrency(p.net_pay)}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {payrolls.length <= 1 && (
              <p className="text-sm text-navy-500">ยังไม่มีสลิปย้อนหลัง</p>
            )}
            {!latest && (
              <p className="text-sm text-navy-500">
                ยังไม่มีสลิปเงินเดือนในระบบ — ระบบจะคำนวณให้อัตโนมัติเมื่อเริ่มทำงานครบเดือนแรก
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Row({
  label,
  value,
  positive,
  negative,
  bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={bold ? "font-semibold text-navy-900" : "text-navy-500"}>{label}</span>
      <span
        className={`tabular-nums ${
          positive ? "text-emerald-600" : negative ? "text-red-600" : "text-navy-900"
        } ${bold ? "text-base font-semibold" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
