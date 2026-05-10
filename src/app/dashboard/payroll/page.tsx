import { Download, FileText, Play, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmployeeName, listEmployees, listPayrolls } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function PayrollPage() {
  const [t, employees, payrolls] = await Promise.all([
    getTranslations("dashboard.payroll"),
    listEmployees(),
    listPayrolls(),
  ]);
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const month = "2026-05";
  const monthly = payrolls.filter((p) => p.month_year === month);
  const totalGross = monthly.reduce((acc, p) => acc + p.base_pay + p.ot_pay, 0);
  const totalNet = monthly.reduce((acc, p) => acc + p.net_pay, 0);
  const totalDeductions = monthly.reduce((acc, p) => acc + p.ssf_deduction + p.tax_deduction, 0);

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Select defaultValue={month}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-05">May 2026</SelectItem>
                <SelectItem value="2026-04">April 2026</SelectItem>
                <SelectItem value="2026-03">March 2026</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="info">Auto-calculated · Thai labor law</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Sparkles className="h-3.5 w-3.5" />
              AI explain
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              {t("downloadAll")}
            </Button>
            <Button size="sm">
              <Play className="h-3.5 w-3.5" />
              {t("runPayroll")}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-navy-500">
                {t("totalPayroll")}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-navy-900">
                {formatCurrency(totalGross)}
              </div>
              <div className="mt-1 text-xs text-navy-500">
                Base + OT for {monthly.length} employees
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-navy-500">Deductions</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-navy-900">
                {formatCurrency(totalDeductions)}
              </div>
              <div className="mt-1 text-xs text-navy-500">SSF + withholding tax</div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/30">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-orange-700">
                {t("totalNet")}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-orange-700">
                {formatCurrency(totalNet)}
              </div>
              <div className="mt-1 text-xs text-orange-600">Ready to disburse</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payroll register · May 2026</CardTitle>
            <CardDescription>Click any row to preview payslip PDF</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">{t("basePay")}</TableHead>
                  <TableHead className="text-right">{t("otPay")}</TableHead>
                  <TableHead className="text-right">{t("ssfDeduction")}</TableHead>
                  <TableHead className="text-right">{t("taxDeduction")}</TableHead>
                  <TableHead className="text-right">{t("netPay")}</TableHead>
                  <TableHead className="text-right">Payslip</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.map((p) => {
                  const emp = empMap.get(p.employee_id);
                  if (!emp) return null;
                  const name = getEmployeeName(emp, "en");
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-navy-900 text-white text-xs">
                              {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-navy-900">{name}</div>
                            <div className="text-xs text-navy-500 font-mono">{emp.employee_code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-navy-700">
                        {formatCurrency(p.base_pay)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-navy-700">
                        {formatCurrency(p.ot_pay)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-navy-500">
                        −{formatCurrency(p.ssf_deduction)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-navy-500">
                        −{formatCurrency(p.tax_deduction)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-navy-900">
                        {formatCurrency(p.net_pay)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
