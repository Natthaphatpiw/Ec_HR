import { Building2, MapPinned, Save, ShieldCheck, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GeofenceSettingsForm } from "@/components/dashboard/geofence-settings-form";
import {
  getDefaultOrganizationId,
  getEmployeeByLineId,
  getOrganization,
  isDemoMode,
} from "@/lib/data";
import { getDashboardOrganizationId } from "@/lib/dashboard-auth-config";
import { getDashboardOwnerSession } from "@/lib/dashboard-session";
import { shouldUseDemoWorkforceSource } from "@/lib/demo-workforce";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-02-19", name: "Makha Bucha" },
  { date: "2026-04-06", name: "Chakri Day" },
  { date: "2026-04-13", name: "Songkran" },
  { date: "2026-04-14", name: "Songkran" },
  { date: "2026-04-15", name: "Songkran" },
  { date: "2026-05-01", name: "Labor Day" },
  { date: "2026-05-04", name: "Coronation Day" },
  { date: "2026-07-28", name: "King Vajiralongkorn Birthday" },
  { date: "2026-08-12", name: "Mother's Day" },
  { date: "2026-10-23", name: "Chulalongkorn Day" },
  { date: "2026-12-05", name: "Father's Day" },
  { date: "2026-12-10", name: "Constitution Day" },
  { date: "2026-12-31", name: "New Year's Eve" },
];

const ROLES = [
  { name: "Employee", desc: "Clock-in, leave, OT, payslip — own data only" },
  { name: "Supervisor", desc: "Approve team requests, view team attendance" },
  { name: "HR", desc: "Full HR data, payroll, employee CRUD" },
  { name: "Executive", desc: "Read-only org rollups and reports" },
];

export default async function SettingsPage() {
  const demoMode = isDemoMode();
  const [t, lineUserId, dashboardSession] = await Promise.all([
    getTranslations("dashboard.settings"),
    getLiffUserIdFromCookie(),
    getDashboardOwnerSession(),
  ]);
  const actor = !demoMode && lineUserId ? await getEmployeeByLineId(lineUserId) : undefined;
  const ownerOrgId = dashboardSession
    ? (getDashboardOrganizationId() ?? getDefaultOrganizationId())
    : undefined;
  const org = await getOrganization(actor?.org_id ?? ownerOrgId);
  const readOnlyJsonDemo = Boolean(
    dashboardSession && !demoMode && shouldUseDemoWorkforceSource(ownerOrgId),
  );
  const canManageGeofence =
    (Boolean(dashboardSession) && !readOnlyJsonDemo) ||
    demoMode ||
    (!!actor &&
      actor.account_status === "active" &&
      (actor.is_supervisor ||
        actor.role === "supervisor" ||
        actor.role === "hr" ||
        actor.role === "executive"));
  const latitude = finiteNumber(org.geofence_lat);
  const longitude = finiteNumber(org.geofence_lng);
  const radiusM = finiteNumber(org.geofence_radius) ?? 100;

  return (
    <>
      <DashboardTopbar title={t("title")} subtitle={t("subtitle")} />
      <main className="flex-1 px-6 py-6">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              {t("factoryProfile")}
            </TabsTrigger>
            <TabsTrigger value="geofence">
              <MapPinned className="mr-1.5 h-3.5 w-3.5" />
              {t("geofence")}
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              {t("holidays")}
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {t("roles")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("factoryProfile")}</CardTitle>
                <CardDescription>Basic information about your organization</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("factoryName")}</Label>
                  <Input defaultValue={org.name} />
                </div>
                <div className="space-y-2">
                  <Label>{t("thaiTaxId")}</Label>
                  <Input defaultValue={org.thai_tax_id ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label>{t("timezone")}</Label>
                  <Select defaultValue={org.timezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                      <SelectItem value="Asia/Taipei">Asia/Taipei</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default language</Label>
                  <Select defaultValue="th">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="th">ไทย</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button>
                    <Save className="h-3.5 w-3.5" />
                    Save profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geofence">
            <GeofenceSettingsForm
              organizationName={org.business_name || org.name}
              canEdit={canManageGeofence}
              initialEnabled={org.geofence_enabled}
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialRadiusM={radiusM}
            />
          </TabsContent>

          <TabsContent value="holidays">
            <Card>
              <CardHeader>
                <CardTitle>{t("holidays")} 2026</CardTitle>
                <CardDescription>
                  Workers clocking in on these dates earn 3x OT per Thai labor law
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {HOLIDAYS_2026.map((h) => (
                  <div
                    key={h.date}
                    className="flex items-center justify-between rounded-lg border border-navy-100 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-navy-900">{h.name}</div>
                      <div className="text-xs text-navy-500">{h.date}</div>
                    </div>
                    <Badge variant="muted">3x OT</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle>{t("roles")}</CardTitle>
                <CardDescription>
                  Each role enforces Postgres Row-Level Security policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ROLES.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-lg border border-navy-100 p-4"
                  >
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{r.name}</div>
                      <div className="text-xs text-navy-500">{r.desc}</div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit policies
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function finiteNumber(value: number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
