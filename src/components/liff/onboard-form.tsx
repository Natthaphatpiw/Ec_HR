"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initLiff } from "@/lib/liff-client";
import { bindLineAccount } from "@/app/liff/onboard/actions";

export function OnboardForm() {
  const t = useTranslations("liff.onboard");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lineUserId, setLineUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [bound, setBound] = useState<{ name: string; dept: string; position: string } | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initLiff(process.env.NEXT_PUBLIC_LIFF_ID_ONBOARD).then((res) => {
      if (cancelled) return;
      if (res.profile) {
        setLineUserId(res.profile.userId);
        setDisplayName(res.profile.displayName);
      }
      setDemo(res.demoMode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(formData: FormData) {
    formData.set("lineUserId", lineUserId);
    formData.set("employeeCode", employeeCode);
    startTransition(async () => {
      const res = await bindLineAccount(formData);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(t("success"));
      setBound({
        name: res.employeeName ?? employeeCode,
        dept: res.department ?? "",
        position: res.position ?? "",
      });
      setTimeout(() => router.push("/liff/checkin"), 1500);
    });
  }

  if (bound) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-navy-900">{t("success")}</h3>
            <p className="mt-1 text-sm text-navy-500">
              Linked to {bound.name} · {bound.position}, {bound.dept}
            </p>
          </div>
          <p className="text-xs text-navy-400">Redirecting to clock-in...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {demo && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          Demo · using mock LINE profile. In production, the form auto-fills from `liff.getProfile()`.
        </div>
      )}

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-orange-400">
              <Link2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-navy-900">{displayName || "LINE user"}</div>
              <div className="text-[11px] text-navy-500 truncate">
                {lineUserId ? lineUserId.slice(0, 16) + "…" : "Detecting LINE profile…"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <form action={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeCode">{t("employeeCode")}</Label>
              <Input
                id="employeeCode"
                name="employeeCode"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                placeholder="EMP001"
                autoCapitalize="characters"
                autoComplete="off"
                required
              />
              <p className="text-[11px] text-navy-500">
                Demo codes: EMP001, EMP004, EMP007, EMP010
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input id="fullName" name="fullName" placeholder="As shown on your ID card" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="department">{t("department")}</Label>
                <Input id="department" name="department" placeholder="Production" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">{t("position")}</Label>
                <Input id="position" name="position" placeholder="Operator" />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={pending || !lineUserId}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
