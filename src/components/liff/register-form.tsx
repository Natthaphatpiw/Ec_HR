"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  Link2,
  Loader2,
  Locate,
  MapPin,
  Phone,
  ShieldX,
  Trash2,
  UserCircle2,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { initLiff } from "@/lib/liff-client";
import { cn } from "@/lib/utils";
import {
  checkInvite,
  checkRegistrationState,
  submitRegistration,
  type InviteInfoResponse,
  type RegistrationStateResponse,
} from "@/app/liff/register/actions";

const TOTAL_STEPS = 4;

type StepKey = "personal" | "job" | "location" | "consent";
const STEP_KEYS: StepKey[] = ["personal", "job", "location", "consent"];

// Lightweight Google Maps URL → {lat, lng} parser.
function parseMapsUrl(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null;
  const atMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  const qMatch = raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  const plainMatch = raw.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (plainMatch) return { lat: Number(plainMatch[1]), lng: Number(plainMatch[2]) };
  return null;
}

export function RegisterForm() {
  const t = useTranslations("liff.register");

  // LIFF
  const [liffReady, setLiffReady] = useState(false);
  const [lineUserId, setLineUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [demo, setDemo] = useState(false);

  // Invite (employee registration is invite-only)
  const [inviteToken, setInviteToken] = useState("");
  const [inviteInfo, setInviteInfo] = useState<InviteInfoResponse | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);

  const [stateCheck, setStateCheck] = useState<RegistrationStateResponse | null>(null);

  // Form state
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  // Step 0 — personal
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalId, setNationalId] = useState("");

  // Step 1 — job
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  // Step 2 — location
  const [homeLat, setHomeLat] = useState("");
  const [homeLng, setHomeLng] = useState("");
  const [homeLabel, setHomeLabel] = useState("");
  const [homeSource, setHomeSource] = useState<"gps" | "maps_url" | "manual" | "">("");
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  // Step 3 — consent
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [profilePreview, setProfilePreview] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Capture the invite token from the deep link. Persist it in sessionStorage
    // so it survives the LIFF login redirect (which can strip the query string).
    let token = "";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("invite");
      if (fromUrl) {
        token = fromUrl;
        sessionStorage.setItem("pending_invite", fromUrl);
      } else {
        token = sessionStorage.getItem("pending_invite") ?? "";
      }
    } catch {
      /* ignore */
    }
    setInviteToken(token);

    if (token) {
      checkInvite(token).then((info) => {
        if (cancelled) return;
        setInviteInfo(info);
        setInviteChecked(true);
      });
    } else {
      setInviteChecked(true);
    }

    initLiff(process.env.NEXT_PUBLIC_LIFF_ID_REGISTER).then(async (res) => {
      if (cancelled) return;
      setDemo(res.demoMode);
      setLiffReady(true);
      if (res.profile) {
        setLineUserId(res.profile.userId);
        setDisplayName(res.profile.displayName);
        setPictureUrl(res.profile.pictureUrl ?? "");
        if (res.profile.pictureUrl) {
          setProfilePreview(res.profile.pictureUrl);
          setProfileUrl(res.profile.pictureUrl);
        }
        const status = await checkRegistrationState(res.profile.userId);
        if (!cancelled) setStateCheck(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function validateStep(): string | null {
    if (step === 0) {
      if (!nameTh.trim()) return "กรุณากรอกชื่อ-นามสกุล";
      if (!/^[+\-\d\s]{6,}$/.test(phone.trim())) return "เบอร์โทรไม่ถูกต้อง";
      if (nationalId && !/^\d{13}$/.test(nationalId.trim())) return "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก";
    }
    if (step === 3) {
      if (!pdpaConsent) return "โปรดยอมรับเงื่อนไข PDPA";
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function pickGps() {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับการแชร์ตำแหน่ง");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHomeLat(String(pos.coords.latitude));
        setHomeLng(String(pos.coords.longitude));
        setHomeLabel(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setHomeSource("gps");
        toast.success("บันทึกตำแหน่งปัจจุบันแล้ว");
      },
      (err) => toast.error(`ไม่สามารถอ่านตำแหน่งได้: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function applyMapsUrl() {
    const parsed = parseMapsUrl(mapsUrl);
    if (!parsed) {
      toast.error('ไม่พบพิกัดในลิงก์ โปรดวาง "lat,lng" หรือ URL ที่มี @lat,lng');
      return;
    }
    setHomeLat(String(parsed.lat));
    setHomeLng(String(parsed.lng));
    setHomeLabel(mapsUrl);
    setHomeSource("maps_url");
    toast.success("ดึงพิกัดจากลิงก์แล้ว");
  }

  function submit() {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    if (!lineUserId) {
      toast.error("ไม่พบข้อมูล LINE กรุณาเปิดหน้านี้ในแอป LINE");
      return;
    }
    if (!inviteToken) {
      toast.error("ไม่พบลิงก์คำเชิญ");
      return;
    }
    const fd = new FormData();
    fd.set("lineUserId", lineUserId);
    fd.set("displayName", displayName);
    fd.set("pictureUrl", pictureUrl);
    fd.set("inviteToken", inviteToken);
    fd.set("nameTh", nameTh.trim());
    fd.set("nameEn", nameEn.trim());
    fd.set("nickname", nickname.trim());
    fd.set("phone", phone.trim());
    fd.set("dateOfBirth", dateOfBirth);
    fd.set("nationalId", nationalId.trim());
    fd.set("department", department.trim());
    fd.set("position", position.trim());
    fd.set("hireDate", hireDate);
    fd.set("baseSalary", baseSalary.trim());
    fd.set("bankAccount", bankAccount.trim());
    fd.set("homeLat", homeLat);
    fd.set("homeLng", homeLng);
    fd.set("homeLocationLabel", homeLabel);
    fd.set("homeLocationSource", homeSource);
    fd.set("address", address.trim());
    fd.set("emergencyContact", emergencyContact.trim());
    fd.set("profilePhotoUrl", profileUrl);
    if (pdpaConsent) fd.set("pdpaConsent", "on");

    startTransition(async () => {
      const res = await submitRegistration(fd);
      if (!res.ok) {
        if (res.duplicate === "line_user_id") toast.error("บัญชี LINE นี้ลงทะเบียนไว้แล้ว");
        else if (res.duplicate === "national_id") toast.error("เลขบัตรประชาชนนี้มีในระบบแล้ว");
        else toast.error(res.message);
        return;
      }
      try {
        sessionStorage.removeItem("pending_invite");
      } catch {
        /* ignore */
      }
      toast.success("ส่งใบสมัครเรียบร้อย");
      setSubmitted(true);
      setStateCheck({
        state: "pending",
        employee: {
          name: nameTh,
          department: department || null,
          position: position || null,
          submittedAt: new Date().toISOString(),
          rejectionReason: null,
        },
      });
    });
  }

  if (!liffReady || !inviteChecked) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-navy-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("lineProfile")}…</span>
        </CardContent>
      </Card>
    );
  }

  // Already-registered short-circuits take priority over the invite gate.
  if (stateCheck?.state === "active") return <AlreadyActive employee={stateCheck.employee!} />;
  if (stateCheck?.state === "pending" || submitted) {
    return (
      <PendingReview
        employee={
          stateCheck?.employee ?? {
            name: nameTh,
            department: department || null,
            position: position || null,
            submittedAt: new Date().toISOString(),
            rejectionReason: null,
          }
        }
      />
    );
  }
  // A rejected user with a FRESH valid invite may re-apply — fall through to
  // the form. Only show the dead-end Rejected screen when they have no usable
  // invite.
  if (stateCheck?.state === "rejected" && (!inviteToken || !inviteInfo?.ok)) {
    return <Rejected employee={stateCheck.employee!} />;
  }

  // Invite-only gate: no token or an invalid/expired token → explain how to join.
  if (!inviteToken || !inviteInfo?.ok) {
    return <NeedInvite reason={!inviteToken ? "missing" : inviteInfo?.reason ?? "invalid"} />;
  }

  // Org can't accept a new seat (full / expired / deactivated) — show the reason
  // up front instead of letting the user fill a form that will be rejected.
  if (inviteInfo.seatBlocked) {
    return (
      <div className="space-y-4">
        <InviteBanner
          businessName={inviteInfo.businessName ?? "—"}
          supervisorName={inviteInfo.supervisorName}
          seatBlocked={inviteInfo.seatBlocked}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {demo && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          Demo mode · LIFF ID ไม่ได้ตั้งค่า ระบบจะใช้บัญชีตัวอย่างให้
        </div>
      )}

      <InviteBanner
        businessName={inviteInfo.businessName ?? "—"}
        supervisorName={inviteInfo.supervisorName}
        seatBlocked={inviteInfo.seatBlocked}
      />

      <LineProfileCard displayName={displayName} userId={lineUserId} pictureUrl={pictureUrl} />

      <StepIndicator step={step} total={TOTAL_STEPS} stepNameKey={STEP_KEYS[step]} />

      <Card>
        <CardContent className="space-y-4 p-5">
          {step === 0 && (
            <PersonalStep
              nameTh={nameTh} setNameTh={setNameTh}
              nameEn={nameEn} setNameEn={setNameEn}
              nickname={nickname} setNickname={setNickname}
              phone={phone} setPhone={setPhone}
              dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
              nationalId={nationalId} setNationalId={setNationalId}
            />
          )}
          {step === 1 && (
            <JobStep
              department={department} setDepartment={setDepartment}
              position={position} setPosition={setPosition}
              hireDate={hireDate} setHireDate={setHireDate}
              baseSalary={baseSalary} setBaseSalary={setBaseSalary}
              bankAccount={bankAccount} setBankAccount={setBankAccount}
            />
          )}
          {step === 2 && (
            <LocationStep
              homeLat={homeLat} homeLng={homeLng}
              homeLabel={homeLabel} homeSource={homeSource}
              mapsUrl={mapsUrl} setMapsUrl={setMapsUrl}
              pickGps={pickGps} applyMapsUrl={applyMapsUrl}
              clearLocation={() => {
                setHomeLat(""); setHomeLng(""); setHomeLabel(""); setHomeSource(""); setMapsUrl("");
              }}
              address={address} setAddress={setAddress}
              emergencyContact={emergencyContact} setEmergencyContact={setEmergencyContact}
            />
          )}
          {step === 3 && (
            <ConsentStep
              pdpaConsent={pdpaConsent} setPdpaConsent={setPdpaConsent}
              profilePreview={profilePreview} setProfilePreview={setProfilePreview}
              profileUrl={profileUrl} setProfileUrl={setProfileUrl}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {step > 0 && (
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={back}>
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button type="button" size="lg" className="flex-1" onClick={next}>
            ถัดไป
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="lg" className="flex-1" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ส่งใบสมัคร
          </Button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Invite banner + gate
// =========================================================================

function InviteBanner({
  businessName,
  supervisorName,
  seatBlocked,
}: {
  businessName: string;
  supervisorName?: string;
  seatBlocked?: "expired" | "seats_full" | "deactivated";
}) {
  const seatMsg =
    seatBlocked === "seats_full" ? "บริษัทนี้เต็มโควต้าที่นั่งแล้ว — แจ้งหัวหน้าเพื่ออัพเกรด" :
    seatBlocked === "expired" ? "บริษัทนี้ครบกำหนดทดลองใช้ — แจ้งหัวหน้าเพื่ออัพเกรด" :
    seatBlocked === "deactivated" ? "บริษัทนี้ถูกระงับการใช้งาน" :
    null;
  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-orange-700">คุณกำลังเข้าร่วมบริษัท</div>
          <div className="truncate text-sm font-semibold text-navy-900">{businessName}</div>
          {supervisorName && (
            <div className="truncate text-[11px] text-navy-500">หัวหน้า: {supervisorName}</div>
          )}
          {seatMsg && <div className="mt-1 text-[11px] font-medium text-red-600">{seatMsg}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function NeedInvite({ reason }: { reason?: "missing" | "invalid" }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50">
          <Link2 className="h-6 w-6 text-navy-700" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">ต้องมีลิงก์คำเชิญ</h3>
          <p className="mt-1 text-sm text-navy-500">
            {reason === "invalid"
              ? "ลิงก์คำเชิญไม่ถูกต้องหรือหมดอายุ"
              : "โปรดเปิดลิงก์ / สแกน QR ที่หัวหน้าของคุณแชร์ให้"}
            <br />
            พนักงานเข้าร่วมบริษัทได้ผ่านลิงก์คำเชิญจากหัวหน้าเท่านั้น
          </p>
        </div>
        <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-[12px] leading-relaxed text-navy-600">
          ถ้าคุณเป็นหัวหน้า / เจ้าของกิจการ{" "}
          <a href="/liff/register-supervisor" className="font-semibold text-orange-600 underline">
            ลงทะเบียนเปิดบริษัทที่นี่
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Step components
// =========================================================================

function StepIndicator({ step, total, stepNameKey }: { step: number; total: number; stepNameKey: StepKey }) {
  const labels: Record<StepKey, string> = {
    personal: "ข้อมูลส่วนตัว",
    job: "ตำแหน่งและเงินเดือน",
    location: "ที่อยู่และตำแหน่ง",
    consent: "รูปและความยินยอม",
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-navy-500">
        <span>ขั้นที่ {step + 1} จาก {total}</span>
        <span className="font-semibold text-navy-700">{labels[stepNameKey]}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-orange-400" : "bg-navy-100",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function LineProfileCard({
  displayName,
  userId,
  pictureUrl,
}: {
  displayName: string;
  userId: string;
  pictureUrl: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-navy-900 text-orange-400">
          {pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pictureUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <UserCircle2 className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-navy-500">บัญชี LINE ของคุณ</div>
          <div className="truncate text-sm font-semibold text-navy-900">{displayName || "—"}</div>
          <div className="truncate text-[11px] text-navy-400">
            {userId ? userId.slice(0, 16) + "…" : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalStep(p: {
  nameTh: string;
  setNameTh: (v: string) => void;
  nameEn: string;
  setNameEn: (v: string) => void;
  nickname: string;
  setNickname: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (v: string) => void;
  nationalId: string;
  setNationalId: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="ชื่อ-นามสกุล (ภาษาไทย)">
        <Input value={p.nameTh} onChange={(e) => p.setNameTh(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ชื่อภาษาอังกฤษ (ถ้ามี)">
          <Input value={p.nameEn} onChange={(e) => p.setNameEn(e.target.value)} />
        </Field>
        <Field label="ชื่อเล่น">
          <Input value={p.nickname} onChange={(e) => p.setNickname(e.target.value)} />
        </Field>
      </div>
      <Field label="เบอร์โทรศัพท์มือถือ">
        <Input
          type="tel"
          inputMode="tel"
          value={p.phone}
          onChange={(e) => p.setPhone(e.target.value)}
          placeholder="081-234-5678"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันเกิด (ถ้ามี)">
          <Input
            type="date"
            value={p.dateOfBirth}
            onChange={(e) => p.setDateOfBirth(e.target.value)}
            max="2010-01-01"
          />
        </Field>
        <Field label="เลขบัตรประชาชน (ถ้ามี)">
          <Input
            inputMode="numeric"
            maxLength={13}
            value={p.nationalId}
            onChange={(e) => p.setNationalId(e.target.value.replace(/\D/g, ""))}
            placeholder="1234567890123"
          />
        </Field>
      </div>
    </div>
  );
}

function JobStep(p: {
  department: string;
  setDepartment: (v: string) => void;
  position: string;
  setPosition: (v: string) => void;
  hireDate: string;
  setHireDate: (v: string) => void;
  baseSalary: string;
  setBaseSalary: (v: string) => void;
  bankAccount: string;
  setBankAccount: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-navy-50 px-3 py-2.5 text-[12px] text-navy-600">
        ทุกฟิลด์ในขั้นนี้เป็นทางเลือก — ไม่ระบุก็ได้ ใส่เพิ่มในหน้าโปรไฟล์ภายหลัง
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="แผนก / ทีม">
          <Input
            value={p.department}
            onChange={(e) => p.setDepartment(e.target.value)}
            placeholder="เช่น ครัว, ฝ่ายขาย"
          />
        </Field>
        <Field label="ตำแหน่ง">
          <Input
            value={p.position}
            onChange={(e) => p.setPosition(e.target.value)}
            placeholder="เช่น พนักงานเสิร์ฟ"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันที่เริ่มงาน">
          <Input type="date" value={p.hireDate} onChange={(e) => p.setHireDate(e.target.value)} />
        </Field>
        <Field label="เงินเดือน (บาท)">
          <Input
            type="number"
            inputMode="decimal"
            value={p.baseSalary}
            onChange={(e) => p.setBaseSalary(e.target.value)}
            placeholder="15000"
          />
        </Field>
      </div>
      <Field label="เลขบัญชีธนาคาร (ถ้าต้องการรับเงินผ่านระบบ)">
        <Input
          inputMode="numeric"
          value={p.bankAccount}
          onChange={(e) => p.setBankAccount(e.target.value)}
          placeholder="123-4-56789-0"
        />
      </Field>
      <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-[11px] leading-relaxed text-navy-500">
        ระบบคำนวณประกันสังคมให้อัตโนมัติเมื่อกำหนดเงินเดือน (กฎใหม่ 2569: 5% ของฐานเงินเดือน
        สูงสุด 875 บาท/เดือน)
      </div>
    </div>
  );
}

function LocationStep(p: {
  homeLat: string;
  homeLng: string;
  homeLabel: string;
  homeSource: string;
  mapsUrl: string;
  setMapsUrl: (v: string) => void;
  pickGps: () => void;
  applyMapsUrl: () => void;
  clearLocation: () => void;
  address: string;
  setAddress: (v: string) => void;
  emergencyContact: string;
  setEmergencyContact: (v: string) => void;
}) {
  const hasLoc = p.homeLat && p.homeLng;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-navy-50 px-3 py-2.5 text-[12px] text-navy-600">
        ระบุพิกัด "บ้าน / ที่ทำงานประจำ" เพื่อบันทึกในตอนเข้า-ออกงาน (ไม่ใช้บังคับตำแหน่ง)
      </div>

      {hasLoc ? (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-center gap-3 p-3">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-emerald-700">
                บันทึกพิกัดแล้ว ({p.homeSource === "gps" ? "GPS" : p.homeSource === "maps_url" ? "Google Maps" : "ระบุเอง"})
              </div>
              <div className="truncate text-xs text-navy-700">{p.homeLabel}</div>
              <div className="text-[10px] text-navy-500 tabular-nums">
                {Number(p.homeLat).toFixed(5)}, {Number(p.homeLng).toFixed(5)}
              </div>
            </div>
            <button
              type="button"
              onClick={p.clearLocation}
              className="rounded-full p-1.5 text-navy-500 hover:bg-white"
              aria-label="clear"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <Button type="button" variant="outline" size="lg" onClick={p.pickGps}>
            <Locate className="h-4 w-4" />
            ใช้ GPS ตำแหน่งปัจจุบัน
          </Button>
          <div className="text-center text-[11px] text-navy-400">หรือ</div>
          <div className="space-y-2">
            <Input
              value={p.mapsUrl}
              onChange={(e) => p.setMapsUrl(e.target.value)}
              placeholder='วางลิงก์ Google Maps หรือ "13.74, 100.56"'
            />
            <Button type="button" variant="outline" size="lg" className="w-full" onClick={p.applyMapsUrl}>
              วางลิงก์ Google Maps
            </Button>
          </div>
        </div>
      )}

      <Field label="ที่อยู่ปัจจุบัน (ถ้ามี)">
        <Textarea
          rows={2}
          value={p.address}
          onChange={(e) => p.setAddress(e.target.value)}
          placeholder="99/9 ถ. … ต. … อ. … จ. … 10000"
        />
      </Field>
      <Field label="ผู้ติดต่อฉุกเฉิน (ถ้ามี)">
        <Textarea
          rows={2}
          value={p.emergencyContact}
          onChange={(e) => p.setEmergencyContact(e.target.value)}
          placeholder="แม่ / 081-000-0000"
        />
      </Field>
      <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-[11px] leading-relaxed text-navy-500">
        <Phone className="mr-1 inline h-3.5 w-3.5 text-navy-400" />
        ข้อมูลผู้ติดต่อฉุกเฉินจะถูกใช้เมื่อเกิดเหตุระหว่างทำงานเท่านั้น
      </div>
    </div>
  );
}

function ConsentStep(p: {
  pdpaConsent: boolean;
  setPdpaConsent: (v: boolean) => void;
  profilePreview: string;
  setProfilePreview: (v: string) => void;
  profileUrl: string;
  setProfileUrl: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <PhotoField
        label="รูปโปรไฟล์ (ทางเลือก)"
        hint="แตะเพื่อถ่ายรูปหรือเลือกจากแกลเลอรี"
        preview={p.profilePreview}
        onPick={(preview, url) => {
          p.setProfilePreview(preview);
          p.setProfileUrl(url);
        }}
        onClear={() => {
          p.setProfilePreview("");
          p.setProfileUrl("");
        }}
        kind="profile"
        ratio="square"
      />

      <label className="flex items-start gap-3 rounded-lg border border-navy-100 bg-white p-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-navy-300 text-orange-500 focus:ring-orange-400"
          checked={p.pdpaConsent}
          onChange={(e) => p.setPdpaConsent(e.target.checked)}
        />
        <span className="text-[12px] leading-relaxed text-navy-700">
          ฉันยินยอมให้บริษัทเก็บและประมวลผลข้อมูลส่วนบุคคลตาม PDPA
          เพื่อใช้บริหาร HR (เข้า-ออกงาน ลา OT เงินเดือน) — สามารถถอนการยินยอมได้ทุกเมื่อ
        </span>
      </label>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PhotoField({
  label,
  hint,
  preview,
  onPick,
  onClear,
  kind,
  ratio = "video",
}: {
  label: string;
  hint: string;
  preview: string;
  onPick: (previewDataUrl: string, url: string) => void;
  onClear: () => void;
  kind: string;
  ratio?: "video" | "square";
}) {
  const aspect = ratio === "square" ? "aspect-square max-w-[200px]" : "aspect-video";
  function pick(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result ?? "");
      const url = `liff-upload://${kind}/${encodeURIComponent(file.name)}`;
      onPick(dataUrl, url);
    };
    reader.readAsDataURL(file);
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {preview ? (
        <div className={cn("relative overflow-hidden rounded-xl border border-navy-100", aspect)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            aria-label="clear"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-navy-700 shadow-soft hover:bg-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-2 left-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="mr-1 inline h-3 w-3" />
            อัพโหลดแล้ว
          </div>
        </div>
      ) : (
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/40 text-navy-500 transition-colors hover:border-orange-400 hover:bg-orange-50",
            aspect,
          )}
        >
          <Camera className="h-6 w-6" />
          <span className="text-[11px]">{hint}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
            }}
          />
        </label>
      )}
    </div>
  );
}

// =========================================================================
// Terminal states
// =========================================================================

interface ResultEmployee {
  name: string;
  department: string | null;
  position: string | null;
  submittedAt?: string | null;
  rejectionReason?: string | null;
}

function PendingReview({ employee }: { employee: ResultEmployee }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
          <Hourglass className="h-7 w-7 text-orange-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">ใบสมัครอยู่ระหว่างตรวจสอบ</h3>
          <p className="mt-1 text-sm text-navy-500">
            ระบบจะแจ้งผลทาง LINE เมื่อหัวหน้าตรวจสอบเสร็จ
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-left text-xs">
          <Row label="ชื่อ" value={employee.name} />
          <Row label="แผนก/ตำแหน่ง" value={`${employee.department ?? "—"} · ${employee.position ?? "—"}`} />
          {employee.submittedAt && (
            <Row label="ส่งเมื่อ" value={new Date(employee.submittedAt).toLocaleString("th-TH")} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlreadyActive({ employee }: { employee: ResultEmployee }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">ลงทะเบียนเรียบร้อยแล้ว</h3>
          <p className="mt-1 text-sm text-navy-500">
            {employee.name} · {employee.department ?? "—"}
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <a href="/liff">
            เปิดหน้าหลัก
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function Rejected({ employee }: { employee: ResultEmployee }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-7 w-7 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">ใบสมัครไม่ได้รับการอนุมัติ</h3>
          {employee.rejectionReason && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left text-xs text-red-800">
              <div className="mb-1 font-semibold">เหตุผล</div>
              {employee.rejectionReason}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="col-span-2 flex items-baseline justify-between gap-3">
      <span className="text-navy-500">{label}</span>
      <span className={cn("text-right text-navy-900", valueClass)}>{value}</span>
    </div>
  );
}
