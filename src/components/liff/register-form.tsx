"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  Loader2,
  Phone,
  Send,
  ShieldX,
  Trash2,
  UserCircle2,
} from "lucide-react";

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

import { initLiff } from "@/lib/liff-client";
import { cn } from "@/lib/utils";
import {
  checkRegistrationState,
  submitRegistration,
  type RegistrationStateResponse,
} from "@/app/liff/register/actions";

const DEPARTMENTS = ["Production", "Maintenance", "Warehouse", "Quality", "Logistics", "HR", "Other"] as const;
const SHIFT_GROUPS = ["A", "B", "C", "any"] as const;
const TOTAL_STEPS = 4;

type StepKey = "personal" | "address" | "job" | "docs";
const STEP_KEYS: StepKey[] = ["personal", "address", "job", "docs"];

export function RegisterForm() {
  const t = useTranslations("liff.register");

  // LIFF
  const [liffReady, setLiffReady] = useState(false);
  const [lineUserId, setLineUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [demo, setDemo] = useState(false);

  // Existing registration state
  const [stateCheck, setStateCheck] = useState<RegistrationStateResponse | null>(null);

  // Form state
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — personal
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2 — contact
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  // Step 3 — job
  const [department, setDepartment] = useState<string>("Production");
  const [position, setPosition] = useState("");
  const [shiftGroup, setShiftGroup] = useState<string>("any");
  const [bankAccount, setBankAccount] = useState("");

  // Step 4 — documents (preview = data URL for UI, url = synthetic ref sent to server)
  const [idCardPreview, setIdCardPreview] = useState("");
  const [idCardUrl, setIdCardUrl] = useState("");
  const [bankBookPreview, setBankBookPreview] = useState("");
  const [bankBookUrl, setBankBookUrl] = useState("");
  const [profilePreview, setProfilePreview] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
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
      if (!nameTh.trim()) return t("errors.requiredField");
      if (!dateOfBirth) return t("errors.requiredField");
      if (!/^\d{13}$/.test(nationalId.trim())) return t("errors.invalidNid");
      if (!/^[+\-\d\s]{6,}$/.test(phone.trim())) return t("errors.invalidPhone");
    }
    if (step === 1) {
      if (!address.trim()) return t("errors.requiredField");
      if (!emergencyContact.trim()) return t("errors.requiredField");
    }
    if (step === 2) {
      if (!department.trim()) return t("errors.requiredField");
      if (!position.trim()) return t("errors.requiredField");
    }
    if (step === 3) {
      if (!idCardUrl) return t("errors.requiredField");
      if (!bankBookUrl) return t("errors.requiredField");
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

  function submit() {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    if (!lineUserId) {
      toast.error(t("errors.missingLine"));
      return;
    }
    const fd = new FormData();
    fd.set("lineUserId", lineUserId);
    fd.set("displayName", displayName);
    fd.set("pictureUrl", pictureUrl);
    fd.set("nameTh", nameTh.trim());
    fd.set("nameEn", nameEn.trim());
    fd.set("nameZh", nameZh.trim());
    fd.set("dateOfBirth", dateOfBirth);
    fd.set("nationalId", nationalId.trim());
    fd.set("phone", phone.trim());
    fd.set("address", address.trim());
    fd.set("emergencyContact", emergencyContact.trim());
    fd.set("department", department);
    fd.set("position", position.trim());
    fd.set("shiftGroup", shiftGroup === "any" ? "" : shiftGroup);
    fd.set("bankAccount", bankAccount.trim());
    fd.set("idCardPhotoUrl", idCardUrl);
    fd.set("bankBookPhotoUrl", bankBookUrl);
    fd.set("profilePhotoUrl", profileUrl);

    startTransition(async () => {
      const res = await submitRegistration(fd);
      if (!res.ok) {
        if (res.duplicate === "line_user_id") toast.error(t("errors.duplicateLine"));
        else if (res.duplicate === "national_id") toast.error(t("errors.duplicateNationalId"));
        else toast.error(res.message);
        return;
      }
      toast.success(t("submitted.title"));
      setSubmitted(true);
      setStateCheck({
        state: "pending",
        employee: {
          name: nameTh,
          department,
          position,
          submittedAt: new Date().toISOString(),
          rejectionReason: null,
        },
      });
    });
  }

  // -- Render branches --------------------------------------------------

  if (!liffReady) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-navy-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("lineProfile")}…</span>
        </CardContent>
      </Card>
    );
  }

  if (stateCheck?.state === "active") {
    return <AlreadyActive employee={stateCheck.employee!} />;
  }
  if (stateCheck?.state === "pending" || submitted) {
    return (
      <PendingReview
        employee={stateCheck?.employee ?? { name: nameTh, department, position, submittedAt: new Date().toISOString() }}
      />
    );
  }
  if (stateCheck?.state === "rejected") {
    return <Rejected employee={stateCheck.employee!} />;
  }

  // -- Form -------------------------------------------------------------

  return (
    <div className="space-y-4">
      {demo && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          Demo mode · LINE profile is mocked. Wire NEXT_PUBLIC_LIFF_ID_REGISTER for production.
        </div>
      )}

      <LineProfileCard displayName={displayName} userId={lineUserId} pictureUrl={pictureUrl} />

      <StepIndicator step={step} total={TOTAL_STEPS} stepNameKey={STEP_KEYS[step]} />

      <Card>
        <CardContent className="space-y-4 p-5">
          {step === 0 && (
            <PersonalStep
              nameTh={nameTh} setNameTh={setNameTh}
              nameEn={nameEn} setNameEn={setNameEn}
              nameZh={nameZh} setNameZh={setNameZh}
              dateOfBirth={dateOfBirth} setDateOfBirth={setDateOfBirth}
              nationalId={nationalId} setNationalId={setNationalId}
              phone={phone} setPhone={setPhone}
            />
          )}
          {step === 1 && (
            <ContactStep
              address={address} setAddress={setAddress}
              emergencyContact={emergencyContact} setEmergencyContact={setEmergencyContact}
            />
          )}
          {step === 2 && (
            <JobStep
              department={department} setDepartment={setDepartment}
              position={position} setPosition={setPosition}
              shiftGroup={shiftGroup} setShiftGroup={setShiftGroup}
              bankAccount={bankAccount} setBankAccount={setBankAccount}
            />
          )}
          {step === 3 && (
            <DocsStep
              idCardPreview={idCardPreview} setIdCardPreview={setIdCardPreview}
              idCardUrl={idCardUrl} setIdCardUrl={setIdCardUrl}
              bankBookPreview={bankBookPreview} setBankBookPreview={setBankBookPreview}
              bankBookUrl={bankBookUrl} setBankBookUrl={setBankBookUrl}
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
            {t("back")}
          </Button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <Button type="button" size="lg" className="flex-1" onClick={next}>
            {t("next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="lg" className="flex-1" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("submit")}
          </Button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Step indicator + reused subcomponents
// =========================================================================

function StepIndicator({ step, total, stepNameKey }: { step: number; total: number; stepNameKey: StepKey }) {
  const t = useTranslations("liff.register");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-navy-500">
        <span>{t("step", { current: step + 1, total })}</span>
        <span className="font-semibold text-navy-700">{t(`stepNames.${stepNameKey}`)}</span>
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
  const t = useTranslations("liff.register");
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
          <div className="text-xs uppercase tracking-wider text-navy-500">{t("lineProfile")}</div>
          <div className="truncate text-sm font-semibold text-navy-900">{displayName || "—"}</div>
          <div className="truncate text-[11px] text-navy-400">
            {userId ? userId.slice(0, 16) + "…" : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Steps
// =========================================================================

interface PersonalStepProps {
  nameTh: string; setNameTh: (v: string) => void;
  nameEn: string; setNameEn: (v: string) => void;
  nameZh: string; setNameZh: (v: string) => void;
  dateOfBirth: string; setDateOfBirth: (v: string) => void;
  nationalId: string; setNationalId: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
}

function PersonalStep(p: PersonalStepProps) {
  const t = useTranslations("liff.register.fields");
  return (
    <div className="space-y-4">
      <Field label={t("nameTh")}>
        <Input value={p.nameTh} onChange={(e) => p.setNameTh(e.target.value)} autoComplete="name" required />
      </Field>
      <Field label={t("nameEn")}>
        <Input value={p.nameEn} onChange={(e) => p.setNameEn(e.target.value)} autoComplete="name" />
      </Field>
      <Field label={t("nameZh")}>
        <Input value={p.nameZh} onChange={(e) => p.setNameZh(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("dob")}>
          <Input
            type="date"
            value={p.dateOfBirth}
            onChange={(e) => p.setDateOfBirth(e.target.value)}
            max="2010-01-01"
            required
          />
        </Field>
        <Field label={t("phone")}>
          <Input
            type="tel"
            inputMode="tel"
            value={p.phone}
            onChange={(e) => p.setPhone(e.target.value)}
            placeholder="081-234-5678"
            autoComplete="tel"
            required
          />
        </Field>
      </div>
      <Field label={t("nationalId")}>
        <Input
          inputMode="numeric"
          maxLength={13}
          value={p.nationalId}
          onChange={(e) => p.setNationalId(e.target.value.replace(/\D/g, ""))}
          placeholder="1234567890123"
          required
        />
      </Field>
    </div>
  );
}

interface ContactStepProps {
  address: string; setAddress: (v: string) => void;
  emergencyContact: string; setEmergencyContact: (v: string) => void;
}

function ContactStep(p: ContactStepProps) {
  const t = useTranslations("liff.register.fields");
  return (
    <div className="space-y-4">
      <Field label={t("address")}>
        <Textarea
          rows={3}
          value={p.address}
          onChange={(e) => p.setAddress(e.target.value)}
          placeholder="99/9 ถ. … ต. … อ. … จ. … 10000"
          required
        />
      </Field>
      <Field label={t("emergencyContact")}>
        <Textarea
          rows={2}
          value={p.emergencyContact}
          onChange={(e) => p.setEmergencyContact(e.target.value)}
          placeholder="สมศรี ใจดี / แม่ / 081-000-0000"
          required
        />
      </Field>
      <div className="rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-[11px] leading-relaxed text-navy-500">
        <Phone className="mr-1 inline h-3.5 w-3.5 text-navy-400" />
        ข้อมูลผู้ติดต่อฉุกเฉินจะถูกใช้เมื่อเกิดเหตุระหว่างทำงานเท่านั้น
      </div>
    </div>
  );
}

interface JobStepProps {
  department: string; setDepartment: (v: string) => void;
  position: string; setPosition: (v: string) => void;
  shiftGroup: string; setShiftGroup: (v: string) => void;
  bankAccount: string; setBankAccount: (v: string) => void;
}

function JobStep(p: JobStepProps) {
  const t = useTranslations("liff.register.fields");
  const tDept = useTranslations("liff.register.departments");
  const tShift = useTranslations("liff.register.shiftGroups");
  return (
    <div className="space-y-4">
      <Field label={t("department")}>
        <Select value={p.department} onValueChange={p.setDepartment}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {tDept(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("position")}>
        <Input value={p.position} onChange={(e) => p.setPosition(e.target.value)} required />
      </Field>
      <Field label={t("shiftGroup")}>
        <Select value={p.shiftGroup} onValueChange={p.setShiftGroup}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIFT_GROUPS.map((s) => (
              <SelectItem key={s} value={s}>
                {tShift(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("bankAccount")}>
        <Input
          inputMode="numeric"
          value={p.bankAccount}
          onChange={(e) => p.setBankAccount(e.target.value)}
          placeholder="123-4-56789-0"
        />
      </Field>
    </div>
  );
}

interface DocsStepProps {
  idCardPreview: string; setIdCardPreview: (v: string) => void;
  idCardUrl: string; setIdCardUrl: (v: string) => void;
  bankBookPreview: string; setBankBookPreview: (v: string) => void;
  bankBookUrl: string; setBankBookUrl: (v: string) => void;
  profilePreview: string; setProfilePreview: (v: string) => void;
  profileUrl: string; setProfileUrl: (v: string) => void;
}

function DocsStep(p: DocsStepProps) {
  const t = useTranslations("liff.register");
  return (
    <div className="space-y-4">
      <PhotoField
        label={t("fields.idCardPhoto")}
        hint={t("uploadHint")}
        preview={p.idCardPreview}
        onPick={(preview, url) => {
          p.setIdCardPreview(preview);
          p.setIdCardUrl(url);
        }}
        onClear={() => {
          p.setIdCardPreview("");
          p.setIdCardUrl("");
        }}
        kind="id-card"
      />
      <PhotoField
        label={t("fields.bankBookPhoto")}
        hint={t("uploadHint")}
        preview={p.bankBookPreview}
        onPick={(preview, url) => {
          p.setBankBookPreview(preview);
          p.setBankBookUrl(url);
        }}
        onClear={() => {
          p.setBankBookPreview("");
          p.setBankBookUrl("");
        }}
        kind="bank-book"
      />
      <PhotoField
        label={t("fields.profilePhoto")}
        hint={t("uploadHint")}
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
    </div>
  );
}

// =========================================================================
// Small primitives
// =========================================================================

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
  const t = useTranslations("liff.register");
  const aspect = ratio === "square" ? "aspect-square max-w-[200px]" : "aspect-video";

  function pick(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = String(e.target?.result ?? "");
      // Demo: store a synthetic URL (real upload happens in production via Supabase Storage)
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
            {t("uploaded")}
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
  const t = useTranslations("liff.register");
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
          <Hourglass className="h-7 w-7 text-orange-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{t("alreadyExists.pendingTitle")}</h3>
          <p className="mt-1 text-sm text-navy-500">{t("alreadyExists.pendingBody")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-navy-100 bg-navy-50/40 p-3 text-left text-xs">
          <Row label="Name" value={employee.name} />
          <Row label="Department" value={`${employee.department ?? "—"} · ${employee.position ?? "—"}`} />
          <Row
            label={t("submitted.status")}
            value={t("submitted.pending")}
            valueClass="font-semibold text-orange-600"
          />
          {employee.submittedAt && (
            <Row
              label="Submitted"
              value={new Date(employee.submittedAt).toLocaleString()}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AlreadyActive({ employee }: { employee: ResultEmployee }) {
  const t = useTranslations("liff.register");
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{t("alreadyExists.active")}</h3>
          <p className="mt-1 text-sm text-navy-500">
            {employee.name} · {employee.department ?? "—"}
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <a href="/liff">
            {t("alreadyExists.activeAction")}
            <ChevronRight className="h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

function Rejected({ employee }: { employee: ResultEmployee }) {
  const t = useTranslations("liff.register");
  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldX className="h-7 w-7 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-navy-900">{t("alreadyExists.rejectedTitle")}</h3>
          {employee.rejectionReason && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-left text-xs text-red-800">
              <div className="mb-1 font-semibold">{t("alreadyExists.rejectedReason")}</div>
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
