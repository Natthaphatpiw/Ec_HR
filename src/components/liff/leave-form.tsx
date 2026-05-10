"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Balance {
  annual: { used: number; total: number };
  sick: { used: number; total: number };
  personal: { used: number; total: number };
}

export function LeaveForm({ balance }: { balance: Balance }) {
  const t = useTranslations("liff.requestLeave");
  const tCommon = useTranslations("common");
  const [type, setType] = useState<"annual" | "sick" | "maternity" | "personal">("annual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!from || !to) {
      toast.error("Please select dates");
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setDone(true);
    toast.success("Leave request submitted to your supervisor");
  }

  if (done) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-navy-900">Request submitted</h3>
          <p className="mt-1 text-sm text-navy-500">
            Your supervisor will be notified in LINE. You'll receive a push notification when it's
            approved.
          </p>
          <Button className="mt-6" onClick={() => setDone(false)} variant="outline">
            Submit another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="text-xs uppercase tracking-wider text-navy-500">{t("balance")}</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <BalancePill label="Annual" used={balance.annual.used} total={balance.annual.total} />
            <BalancePill label="Sick" used={balance.sick.used} total={balance.sick.total} />
            <BalancePill label="Personal" used={balance.personal.used} total={balance.personal.total} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label>{t("leaveType")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual leave</SelectItem>
                <SelectItem value="sick">Sick leave</SelectItem>
                <SelectItem value="maternity">Maternity leave</SelectItem>
                <SelectItem value="personal">Personal leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("from")}</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("to")}</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("reason")}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe the reason for your leave"
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-navy-500">Approval flow</span>
            <Badge variant="info">2-step</Badge>
          </div>
          <div className="mt-3 space-y-2 text-xs text-navy-600">
            <Step n={1} label="Direct supervisor" status="next" />
            <Step n={2} label="HR final approval" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BalancePill({ label, used, total }: { label: string; used: number; total: number }) {
  const remaining = total - used;
  const pct = Math.round((remaining / total) * 100);
  return (
    <div className="rounded-lg border border-navy-100 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-navy-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-navy-900">{remaining}d</div>
      <div className="text-[10px] text-navy-400">{pct}% left</div>
    </div>
  );
}

function Step({ n, label, status }: { n: number; label: string; status?: "next" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
          status === "next" ? "bg-orange-400 text-white" : "bg-navy-100 text-navy-500"
        }`}
      >
        {n}
      </span>
      <span>{label}</span>
    </div>
  );
}
