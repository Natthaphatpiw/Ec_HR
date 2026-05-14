import { Building2, Clock, ShieldAlert, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrgTrialStatus } from "@/lib/data";

/**
 * Banner shown on the LIFF home + dashboard when an org is on the free trial.
 * Renders nothing when the org is on a paid tier — the SaaS gate is invisible
 * once the customer has upgraded.
 */
export function TrialBanner({ trial }: { trial: OrgTrialStatus }) {
  if (trial.org.tier !== "free") return null;
  const remaining = Math.max(0, trial.seatsLimit - trial.seatsUsed);
  const danger = trial.daysLeft <= 5 || remaining <= 1;
  return (
    <Card className={danger ? "border-orange-300 bg-orange-50/60" : "border-navy-200"}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Building2 className="h-4 w-4 text-orange-500" />
            <span>{trial.org.business_name}</span>
          </div>
          <Badge variant={danger ? "warning" : "info"}>
            ทดลองใช้
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Stat
            icon={<Clock className="h-3.5 w-3.5 text-navy-500" />}
            label="เหลือเวลา"
            value={`${trial.daysLeft} วัน`}
            danger={trial.daysLeft <= 5}
          />
          <Stat
            icon={<Users className="h-3.5 w-3.5 text-navy-500" />}
            label="เหลือที่นั่ง"
            value={`${remaining} / ${trial.seatsLimit}`}
            danger={remaining <= 1}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md border border-navy-100 bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-navy-500">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${danger ? "text-orange-600" : "text-navy-900"}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Full-screen "we need to upgrade" panel — replaces every LIFF body when the
 * tenant's trial has expired or seats are full and a new user tries to clock
 * in / request leave / etc.
 */
export function TrialBlockedView({ trial }: { trial: OrgTrialStatus }) {
  const isExpired = trial.reason === "expired";
  const isSeats = trial.reason === "seats_full";
  const isDeactivated = trial.reason === "deactivated";
  return (
    <Card className="border-red-200 bg-red-50/40">
      <CardContent className="space-y-3 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <ShieldAlert className="h-7 w-7 text-red-600" />
        </div>
        <h3 className="text-base font-semibold text-navy-900">
          {isExpired && "ครบกำหนดทดลองใช้แล้ว"}
          {isSeats && "ครบโควต้าที่นั่งของทดลองใช้"}
          {isDeactivated && "บัญชีนี้ถูกระงับ"}
        </h3>
        <p className="text-sm text-navy-600">
          {isExpired && (
            <>
              บริษัท <b>{trial.org.business_name}</b> ครบกำหนด 30 วันแล้ว — ติดต่อทีมงานเพื่ออัพเกรดเป็นแพ็คเกจถาวร
            </>
          )}
          {isSeats && (
            <>
              บริษัท <b>{trial.org.business_name}</b> ใช้ครบ {trial.seatsLimit} คนแล้ว — อัพเกรดเพื่อเพิ่มที่นั่ง
            </>
          )}
          {isDeactivated && <>บัญชีนี้ถูกปิดใช้งาน — ติดต่อทีมงาน LinForge HR</>}
        </p>
        <div className="rounded-md bg-white px-3 py-2 text-[11px] text-navy-600">
          ติดต่อ <b>devecloudtec@gmail.com</b> เพื่อย้ายแพ็คเกจ
        </div>
      </CardContent>
    </Card>
  );
}
