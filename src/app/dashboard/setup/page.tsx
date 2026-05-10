import { ArrowRight, Building2, Check } from "lucide-react";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupPage() {
  return (
    <>
      <DashboardTopbar
        title="Factory setup"
        subtitle="Create your organization and bind your LINE Official Accounts"
      />
      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-orange-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Step 1 · Create organization</CardTitle>
                  <CardDescription>This creates the row in `organizations`</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Factory name</Label>
                <Input placeholder="e.g. ThaiAuto Factory" />
              </div>
              <div className="space-y-2">
                <Label>Thai tax ID</Label>
                <Input placeholder="13 digits" />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input defaultValue="Asia/Bangkok" />
              </div>
              <div className="space-y-2">
                <Label>Geofence latitude</Label>
                <Input placeholder="13.7563" />
              </div>
              <div className="space-y-2">
                <Label>Geofence longitude</Label>
                <Input placeholder="100.5018" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Geofence radius (m)</Label>
                <Input type="number" defaultValue={100} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2 · Connect LINE OAs</CardTitle>
              <CardDescription>
                Paste channel ID, secret, and access token for both Employee and Management OAs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ConnectRow name="Employee OA" status="needed" />
              <ConnectRow name="Management OA" status="needed" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 3 · Import employees</CardTitle>
              <CardDescription>
                Upload CSV (employee_code, name_th, name_en, role, department, base_salary)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Choose CSV file</Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg">
              Finish setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

function ConnectRow({ name, status }: { name: string; status: "needed" | "connected" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-navy-100 p-4">
      <div>
        <div className="text-sm font-medium text-navy-900">{name}</div>
        <div className="text-xs text-navy-500">
          {status === "connected" ? "Webhook signed and verified" : "Not connected"}
        </div>
      </div>
      {status === "connected" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
          <Check className="h-3 w-3" /> Connected
        </span>
      ) : (
        <Button variant="outline" size="sm">
          Connect
        </Button>
      )}
    </div>
  );
}
