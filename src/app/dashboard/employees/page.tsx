import { Download, FileUp, Plus, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getEmployeeName, listEmployees } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const ROLE_VARIANT: Record<string, "default" | "muted" | "info" | "success"> = {
  employee: "muted",
  supervisor: "info",
  hr: "default",
  executive: "success",
};

export default async function EmployeesPage() {
  const [t, employees] = await Promise.all([
    getTranslations("dashboard.employees"),
    listEmployees(),
  ]);

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <Input placeholder="Search by name, code, or department" className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FileUp className="h-3.5 w-3.5" />
                  {t("importCsv")}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  {t("exportCsv")}
                </Button>
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  {t("addEmployee")}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("code")}</TableHead>
                  <TableHead>{t("department")}</TableHead>
                  <TableHead>{t("position")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>{t("lineBound")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => {
                  const name = getEmployeeName(e, "en");
                  const initials = name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("");
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-navy-900 text-white text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-navy-900">{name}</div>
                            <div className="text-xs text-navy-500">{e.name_th}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-navy-700">{e.employee_code}</TableCell>
                      <TableCell className="text-sm text-navy-700">{e.department}</TableCell>
                      <TableCell className="text-sm text-navy-700">{e.position}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANT[e.role]}>{e.role}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-navy-700">
                        {e.base_salary ? formatCurrency(e.base_salary) : "-"}
                      </TableCell>
                      <TableCell>
                        {e.line_user_id ? (
                          <Badge variant="success">{t("yes")}</Badge>
                        ) : (
                          <Badge variant="muted">{t("no")}</Badge>
                        )}
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
