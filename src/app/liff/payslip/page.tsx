import { getTranslations } from "next-intl/server";
import { Download, FileText, Receipt } from "lucide-react";
import { LiffHeader } from "@/components/liff/header";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRegistrationStatus, listPayrollsForEmployee } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";
import { formatCurrency } from "@/lib/utils";

const MONTH_NAMES: Record<string, string> = {
  "01": "January", "02": "February", "03": "March", "04": "April",
  "05": "May", "06": "June", "07": "July", "08": "August",
  "09": "September", "10": "October", "11": "November", "12": "December",
};

export default async function PayslipPage() {
  const t = await getTranslations("liff.payslip");
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_PAYSLIP} />
        </main>
      </>
    );
  }
  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status={registration.state} />
        </main>
      </>
    );
  }
  const payrolls = await listPayrollsForEmployee(registration.employee.id);

  const latest = payrolls[0];

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3 space-y-4">
        {latest && (
          <Card className="overflow-hidden">
            <div className="bg-navy-900 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    {MONTH_NAMES[latest.month_year.slice(-2)]} {latest.month_year.slice(0, 4)}
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-0">Paid</Badge>
              </div>
              <div className="mt-4">
                <div className="text-xs text-navy-300">Net pay</div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {formatCurrency(latest.net_pay)}
                </div>
              </div>
            </div>
            <CardContent className="space-y-3 p-5">
              <Row label="Base salary" value={formatCurrency(latest.base_pay)} />
              <Row label="Overtime pay" value={`+${formatCurrency(latest.ot_pay)}`} positive />
              <Row label="Social Security Fund" value={`-${formatCurrency(latest.ssf_deduction)}`} negative />
              <Row label="Withholding tax" value={`-${formatCurrency(latest.tax_deduction)}`} negative />
              <div className="border-t border-navy-100 pt-3">
                <Row label="Net pay" value={formatCurrency(latest.net_pay)} bold />
              </div>
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
              <p className="text-sm text-navy-500">No earlier payslips yet.</p>
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
