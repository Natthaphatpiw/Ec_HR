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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GeofenceMap } from "@/components/dashboard/geofence-map";
import { getOrganization } from "@/lib/data";

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
  const [t, org] = await Promise.all([getTranslations("dashboard.settings"), getOrganization()]);

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
            <Card>
              <CardHeader>
                <CardTitle>{t("geofence")}</CardTitle>
                <CardDescription>
                  Set the factory location and acceptance radius. Workers outside the radius are
                  blocked from clocking in.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input defaultValue={String(org.geofence_lat)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input defaultValue={String(org.geofence_lng)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("geofenceRadius")}</Label>
                    <Input type="number" defaultValue={String(org.geofence_radius)} />
                    <p className="text-xs text-navy-500">Recommended: 50–200 m</p>
                  </div>
                  <div className="space-y-3 rounded-lg border border-navy-100 bg-navy-50 p-4">
                    <RowSwitch label="Require photo on clock-in" defaultChecked />
                    <RowSwitch label="Block VPN / proxy IPs" defaultChecked />
                    <RowSwitch label="Allow clock-in without GPS (fallback)" />
                  </div>
                  <Button>
                    <Save className="h-3.5 w-3.5" />
                    Save geofence
                  </Button>
                </div>
                <GeofenceMap
                  centerLat={Number(org.geofence_lat ?? 13.7563)}
                  centerLng={Number(org.geofence_lng ?? 100.5018)}
                  radiusM={Number(org.geofence_radius)}
                  points={[]}
                />
              </CardContent>
            </Card>
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

function RowSwitch({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-navy-700">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
