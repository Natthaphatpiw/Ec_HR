"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ChevronRight,
  Loader2,
  Locate,
  MapPin,
  Save,
  UserCircle2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  loadEmployeeForEdit,
  submitProfilePatch,
  type ProfileBundle,
  type PublicEmployee,
} from "@/app/liff/profile/actions";

type View = { mode: "self" } | { mode: "team-list" } | { mode: "edit"; target: PublicEmployee; permission: "self" | "supervisor" | "hr" };

export function ProfileShell({
  bundle,
  lineUserId,
}: {
  bundle: ProfileBundle;
  lineUserId: string;
}) {
  const [view, setView] = useState<View>({ mode: "self" });
  const [me, setMe] = useState<PublicEmployee>(bundle.me);

  if (view.mode === "edit") {
    return (
      <ProfileEditForm
        target={view.target}
        permission={view.permission}
        lineUserId={lineUserId}
        onCancel={() => {
          if (view.target.id === me.id) setView({ mode: "self" });
          else setView({ mode: "team-list" });
        }}
        onSaved={(updated) => {
          if (updated.id === me.id) setMe(updated);
          toast.success("บันทึกข้อมูลเรียบร้อย");
          setView(updated.id === me.id ? { mode: "self" } : { mode: "team-list" });
        }}
      />
    );
  }

  if (view.mode === "team-list") {
    return (
      <TeamList
        team={bundle.team}
        onBack={() => setView({ mode: "self" })}
        onSelect={async (id) => {
          const res = await loadEmployeeForEdit(lineUserId, id);
          if (!res.ok) {
            toast.error("ไม่สามารถเปิดโปรไฟล์นี้ได้");
            return;
          }
          setView({ mode: "edit", target: res.target, permission: res.permission });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <SelfHeader me={me} />
      <SelfDetails me={me} />
      <Button
        size="lg"
        className="w-full"
        onClick={async () => {
          const res = await loadEmployeeForEdit(lineUserId, me.id);
          if (!res.ok) return toast.error("ไม่สามารถเปิดหน้าแก้ไขได้");
          setView({ mode: "edit", target: res.target, permission: res.permission });
        }}
      >
        แก้ไขโปรไฟล์ของฉัน
      </Button>
      {me.is_supervisor && bundle.team.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-orange-50/40"
              onClick={() => setView({ mode: "team-list" })}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy-900">
                  ดู / แก้ไขโปรไฟล์ของลูกน้อง
                </div>
                <div className="text-xs text-navy-500">{bundle.team.length} คน</div>
              </div>
              <ChevronRight className="h-4 w-4 text-navy-400" />
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SelfHeader({ me }: { me: PublicEmployee }) {
  const initials = (me.name_en ?? me.name_th ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="rounded-2xl bg-navy-900 p-5 text-white">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-orange-400 text-white">
          {me.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.profile_photo_url} alt={initials} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold">{initials || <UserCircle2 className="h-6 w-6" />}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{me.name_th ?? me.name_en ?? "—"}</div>
          <div className="truncate text-xs text-navy-300">
            {me.employee_code ?? "ยังไม่มีรหัส"} · {me.department ?? "ยังไม่ระบุแผนก"}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="muted">{labelForRole(me.role)}</Badge>
            {me.is_supervisor && <Badge variant="info">หัวหน้า</Badge>}
            <Badge variant={me.account_status === "active" ? "success" : "warning"}>
              {labelForStatus(me.account_status)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelfDetails({ me }: { me: PublicEmployee }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <DetailRow label="ตำแหน่ง" value={me.position ?? "—"} />
        <DetailRow label="ตำแหน่งเสริม" value={me.job_title ?? "—"} />
        <DetailRow label="ประเภทการจ้าง" value={labelForEmploymentType(me.employment_type)} />
        <DetailRow label="วันที่เริ่มงาน" value={me.hire_date ?? "—"} />
        <DetailRow label="เบอร์โทร" value={me.phone ?? "—"} />
        <DetailRow label="ที่อยู่" value={me.address ?? "—"} />
        <DetailRow label="ผู้ติดต่อฉุกเฉิน" value={me.emergency_contact ?? "—"} />
        <DetailRow label="บัญชีธนาคาร" value={me.bank_account ?? "—"} />
        <DetailRow
          label="เงินเดือน"
          value={me.base_salary != null ? `${me.base_salary.toLocaleString()} บาท` : "—"}
        />
        <DetailRow
          label="พิกัดที่ทำงาน / บ้าน"
          value={
            me.home_lat != null && me.home_lng != null
              ? `${Number(me.home_lat).toFixed(5)}, ${Number(me.home_lng).toFixed(5)}`
              : "—"
          }
        />
      </CardContent>
    </Card>
  );
}

function TeamList({
  team,
  onBack,
  onSelect,
}: {
  team: PublicEmployee[];
  onBack: () => void;
  onSelect: (id: string) => void | Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack}>
        ← กลับไปโปรไฟล์ของฉัน
      </Button>
      {team.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-navy-500">
            ยังไม่มีลูกน้องในทีม
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {team.map((e) => (
            <Card key={e.id}>
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => onSelect(e.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-navy-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-orange-400">
                    {((e.name_en ?? e.name_th ?? "?")
                      .split(/\s+/)
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()) || <UserCircle2 className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-navy-900">
                      {e.name_th ?? e.name_en ?? "—"}
                    </div>
                    <div className="truncate text-xs text-navy-500">
                      {e.employee_code ?? "—"} · {e.department ?? "—"} · {e.position ?? "—"}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-navy-400" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileEditForm({
  target,
  permission,
  lineUserId,
  onCancel,
  onSaved,
}: {
  target: PublicEmployee;
  permission: "self" | "supervisor" | "hr";
  lineUserId: string;
  onCancel: () => void;
  onSaved: (updated: PublicEmployee) => void;
}) {
  const [nameTh, setNameTh] = useState(target.name_th ?? "");
  const [nameEn, setNameEn] = useState(target.name_en ?? "");
  const [nickname, setNickname] = useState(target.nickname ?? "");
  const [phone, setPhone] = useState(target.phone ?? "");
  const [address, setAddress] = useState(target.address ?? "");
  const [emergencyContact, setEmergencyContact] = useState(target.emergency_contact ?? "");
  const [bankAccount, setBankAccount] = useState(target.bank_account ?? "");
  const [department, setDepartment] = useState(target.department ?? "");
  const [position, setPosition] = useState(target.position ?? "");
  const [jobTitle, setJobTitle] = useState(target.job_title ?? "");
  const [shiftGroup, setShiftGroup] = useState(target.shift_group ?? "");
  const [baseSalary, setBaseSalary] = useState(target.base_salary != null ? String(target.base_salary) : "");
  const [homeLat, setHomeLat] = useState(target.home_lat != null ? String(target.home_lat) : "");
  const [homeLng, setHomeLng] = useState(target.home_lng != null ? String(target.home_lng) : "");
  const [homeLabel, setHomeLabel] = useState(target.home_location_label ?? "");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function pickGps() {
    if (!navigator.geolocation) return toast.error("เบราว์เซอร์ไม่รองรับการแชร์ตำแหน่ง");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHomeLat(String(pos.coords.latitude));
        setHomeLng(String(pos.coords.longitude));
        setHomeLabel(
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        );
        toast.success("บันทึกตำแหน่งปัจจุบันแล้ว");
      },
      (err) => toast.error(`ไม่สามารถอ่านตำแหน่งได้: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function save() {
    const fd = new FormData();
    fd.set("nameTh", nameTh.trim());
    fd.set("nameEn", nameEn.trim());
    fd.set("nickname", nickname.trim());
    fd.set("phone", phone.trim());
    fd.set("address", address.trim());
    fd.set("emergencyContact", emergencyContact.trim());
    fd.set("bankAccount", bankAccount.trim());
    fd.set("department", department.trim());
    fd.set("position", position.trim());
    fd.set("jobTitle", jobTitle.trim());
    fd.set("shiftGroup", shiftGroup.trim());
    fd.set("baseSalary", baseSalary.trim());
    fd.set("homeLat", homeLat.trim());
    fd.set("homeLng", homeLng.trim());
    fd.set("homeLocationLabel", homeLabel.trim());
    if (homeLat && homeLng) fd.set("homeLocationSource", target.home_location_source ?? "gps");
    if (reason.trim()) fd.set("reason", reason.trim());

    startTransition(async () => {
      const res = await submitProfilePatch(lineUserId, target.id, fd);
      if (!res.ok || !res.employee) {
        toast.error(res.message);
        return;
      }
      onSaved(res.employee);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-[12px] text-navy-700">
        <span>กำลังแก้ไข:</span>
        <span className="font-semibold text-navy-900">{target.name_th ?? target.name_en ?? "—"}</span>
        <Badge variant={permission === "self" ? "info" : permission === "hr" ? "success" : "warning"}>
          {permission === "self" ? "ตัวเอง" : permission === "hr" ? "HR" : "หัวหน้า"}
        </Badge>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Section title="ข้อมูลส่วนตัว">
            <FieldRow label="ชื่อ-นามสกุล (ไทย)">
              <Input value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
            </FieldRow>
            <FieldRow label="ชื่อภาษาอังกฤษ">
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </FieldRow>
            <FieldRow label="ชื่อเล่น">
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </FieldRow>
            <FieldRow label="เบอร์โทร">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FieldRow>
            <FieldRow label="ที่อยู่">
              <Textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="ผู้ติดต่อฉุกเฉิน">
              <Textarea
                rows={2}
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </FieldRow>
          </Section>

          <Section title="งานและเงินเดือน">
            <FieldRow label="แผนก">
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </FieldRow>
            <FieldRow label="ตำแหน่ง">
              <Input value={position} onChange={(e) => setPosition(e.target.value)} />
            </FieldRow>
            <FieldRow label="ตำแหน่งเสริม">
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </FieldRow>
            <FieldRow label="กะ">
              <Input value={shiftGroup} onChange={(e) => setShiftGroup(e.target.value)} />
            </FieldRow>
            <FieldRow label="เงินเดือน">
              <Input
                type="number"
                inputMode="decimal"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
              />
            </FieldRow>
            <FieldRow label="บัญชีธนาคาร">
              <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
            </FieldRow>
          </Section>

          <Section title="ตำแหน่ง / พิกัด">
            <div className="flex items-center gap-2 rounded-md border border-navy-100 bg-navy-50/40 p-2.5 text-[11px] text-navy-600">
              <MapPin className="h-3.5 w-3.5 text-navy-400" />
              <span>
                ใช้เพื่อบันทึกพิกัดอ้างอิงในการเข้า-ออกงาน ไม่ใช้บังคับ
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="ละติจูด">
                <Input
                  inputMode="decimal"
                  value={homeLat}
                  onChange={(e) => setHomeLat(e.target.value)}
                />
              </FieldRow>
              <FieldRow label="ลองจิจูด">
                <Input
                  inputMode="decimal"
                  value={homeLng}
                  onChange={(e) => setHomeLng(e.target.value)}
                />
              </FieldRow>
            </div>
            <FieldRow label="ป้ายกำกับ">
              <Input value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} />
            </FieldRow>
            <Button type="button" variant="outline" size="sm" onClick={pickGps}>
              <Locate className="h-3.5 w-3.5" />
              ใช้ GPS ปัจจุบัน
            </Button>
          </Section>

          {permission !== "self" && (
            <Section title="หมายเหตุ (ทางเลือก)">
              <FieldRow label="เหตุผลที่แก้">
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เช่น อัปเดตเบอร์โทร, ย้ายแผนก"
                />
              </FieldRow>
            </Section>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button size="lg" className="flex-1" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          บันทึก
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-navy-500">{label}</span>
      <span className="text-right font-medium text-navy-900">{value}</span>
    </div>
  );
}

function labelForRole(role: PublicEmployee["role"]): string {
  switch (role) {
    case "employee": return "พนักงาน";
    case "supervisor": return "หัวหน้า";
    case "hr": return "HR";
    case "executive": return "ผู้บริหาร";
  }
}

function labelForStatus(s: PublicEmployee["account_status"]): string {
  switch (s) {
    case "active": return "ใช้งานอยู่";
    case "pending_review": return "รอตรวจสอบ";
    case "inactive": return "ระงับ";
    case "awaiting_supervisor": return "รอหัวหน้า";
  }
}

function labelForEmploymentType(t: PublicEmployee["employment_type"]): string {
  switch (t) {
    case "full_time": return "พนักงานประจำ";
    case "part_time": return "พาร์ทไทม์";
    case "contractor": return "สัญญาจ้าง";
    case "intern": return "ฝึกงาน";
    case "daily_wage": return "รายวัน";
    case "other": return "อื่นๆ";
  }
}
