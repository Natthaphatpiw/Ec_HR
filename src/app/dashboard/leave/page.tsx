import { Check, Filter, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getEmployeeName,
  listEmployees,
  listLeaveRequests,
  listOvertimeRequests,
} from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function LeavePage() {
  const [t, tCommon, employees, leaves, ots] = await Promise.all([
    getTranslations("dashboard.leave"),
    getTranslations("common"),
    listEmployees(),
    listLeaveRequests(),
    listOvertimeRequests(),
  ]);
  const empMap = new Map(employees.map((e) => [e.id, e]));

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-navy-500">Pending leave</div>
              <div className="mt-2 text-3xl font-semibold text-navy-900">
                {leaves.filter((l) => l.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-navy-500">Pending OT</div>
              <div className="mt-2 text-3xl font-semibold text-navy-900">
                {ots.filter((o) => o.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-wider text-navy-500">
                OT hours this month
              </div>
              <div className="mt-2 text-3xl font-semibold text-navy-900">
                {ots.filter((o) => o.status === "approved").reduce((acc, o) => acc + o.hours, 0)}h
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leave">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="leave">{t("leaveTab")}</TabsTrigger>
              <TabsTrigger value="ot">{t("otTab")}</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm">
              <Filter className="h-3.5 w-3.5" />
              {tCommon("filter")}
            </Button>
          </div>

          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <CardTitle>{t("leaveTab")} requests</CardTitle>
                <CardDescription>Approve or reject leave requests from your team</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead>{t("dates")}</TableHead>
                      <TableHead>{t("days")}</TableHead>
                      <TableHead>{t("reason")}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l) => {
                      const emp = empMap.get(l.employee_id);
                      if (!emp) return null;
                      const name = getEmployeeName(emp, "en");
                      return (
                        <TableRow key={l.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-navy-900 text-white text-xs">
                                  {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-navy-900">{name}</div>
                                <div className="text-xs text-navy-500">{emp.department}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="muted">{l.leave_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-navy-700">
                            {formatDate(l.start_date)} – {formatDate(l.end_date)}
                          </TableCell>
                          <TableCell className="font-medium tabular-nums text-navy-900">{l.days}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-navy-500">
                            {l.reason ?? "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                l.status === "approved"
                                  ? "success"
                                  : l.status === "rejected"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {l.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {l.status === "pending" ? (
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="outline" className="h-7 px-2">
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" className="h-7 px-2">
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-navy-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ot">
            <Card>
              <CardHeader>
                <CardTitle>{t("otTab")} requests</CardTitle>
                <CardDescription>Calculated at Thai labor law rates (1.5x / 2x / 3x)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>{t("reason")}</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ots.map((o) => {
                      const emp = empMap.get(o.employee_id);
                      if (!emp) return null;
                      const name = getEmployeeName(emp, "en");
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-navy-900 text-white text-xs">
                                  {name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-navy-900">{name}</div>
                                <div className="text-xs text-navy-500">{emp.department}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-navy-700">{formatDate(o.date)}</TableCell>
                          <TableCell className="font-medium tabular-nums text-navy-900">
                            {o.hours}h
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate text-sm text-navy-500">
                            {o.reason ?? "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                o.status === "approved"
                                  ? "success"
                                  : o.status === "rejected"
                                    ? "danger"
                                    : "warning"
                              }
                            >
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {o.status === "pending" ? (
                              <div className="flex justify-end gap-1.5">
                                <Button size="sm" variant="outline" className="h-7 px-2">
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" className="h-7 px-2">
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-navy-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
