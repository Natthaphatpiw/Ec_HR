"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { submitOvertimeRequest } from "@/app/liff/request-ot/actions";

const HOURLY_RATE = 86; // 15000 / 22 days / 8 hours ≈ 86 baht/h

export function OtForm({ employeeId, lineUserId }: {
  employeeId?: string;
  /** Verified by the server session; the form never asks the LINE SDK for it. */
  lineUserId?: string;
}) {
  const t = useTranslations("liff.requestOt");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("3");
  const [reason, setReason] = useState("");
  const [submitting, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const calc = useMemo(() => {
    const h = parseFloat(hours) || 0;
    const isHoliday = date && new Date(date).getDay() === 0;
    const rate = isHoliday ? 3 : 1.5;
    const pay = h * HOURLY_RATE * rate;
    return { rate, pay, isHoliday };
  }, [hours, date]);

  function submit() {
    if (!date || !hours) {
      toast.error(t("incomplete"));
      return;
    }
    const fd = new FormData();
    if (lineUserId) fd.set("lineUserId", lineUserId);
    if (employeeId) fd.set("employeeId", employeeId);
    fd.set("date", date);
    fd.set("hours", hours);
    fd.set("reason", reason);
    startTransition(async () => {
      const res = await submitOvertimeRequest(fd);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setDone(true);
      toast.success(res.message);
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">{t("doneTitle")}</h3>
          <p className="mt-1 text-sm text-navy-500">{t("doneBody", { amount: calc.pay.toFixed(0) })}</p>
          <Button className="mt-6" onClick={() => setDone(false)} variant="outline">
            {t("submitAnother")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label>{t("date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("hours")}</Label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="12"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("reason")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={3}
            />
          </div>

          <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("submit")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-navy-500">
              {t("estimatedPay")}
            </span>
            <Badge variant={calc.isHoliday ? "default" : "muted"}>
              {calc.isHoliday ? t("holidayRate") : `${calc.rate}x`}
            </Badge>
          </div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-navy-900">
            ฿{calc.pay.toFixed(0)}
          </div>
          <p className="mt-1 text-xs text-navy-500">
            {t("lawNote", { rate: HOURLY_RATE, multiplier: calc.rate, hours: hours || 0 })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
