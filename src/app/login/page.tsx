import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDashboardAuthState } from "@/lib/dashboard-auth-config";
import { getDashboardOwnerSession } from "@/lib/dashboard-session";
import { loginAction } from "./actions";

export const metadata: Metadata = {
  title: "Organization sign in",
};

type LoginSearchParams = {
  error?: string | string[];
  next?: string | string[];
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const auth = getDashboardAuthState();
  if (auth.status === "disabled") redirect("/dashboard");

  const session = await getDashboardOwnerSession();
  if (session) redirect("/dashboard");

  const params = await searchParams;
  const error = first(params.error);
  const nextPath = first(params.next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-50/40 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandMark size="lg" />
        </div>
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-orange-400">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">เข้าสู่ระบบผู้ดูแลองค์กร</CardTitle>
            <CardDescription>
              ใช้บัญชีเจ้าขององค์กรเพื่อเข้าถึง Dashboard และรายงานหลังบ้าน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error === "credentials" && (
              <p className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-navy-700">
                ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง
              </p>
            )}
            {(error === "config" || auth.status === "misconfigured") && (
              <p className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-navy-700">
                การตั้งค่าระบบเข้าสู่ระบบยังไม่ครบ กรุณาตรวจสอบตัวแปรแวดล้อมของเซิร์ฟเวอร์
              </p>
            )}
            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="next" value={nextPath} />
              <div className="space-y-2">
                <Label htmlFor="username">ชื่อผู้ใช้</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  disabled={auth.status !== "enabled"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={auth.status !== "enabled"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={auth.status !== "enabled"}>
                เข้าสู่ Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
