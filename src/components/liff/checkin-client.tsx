"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { initLiff, type LiffProfile } from "@/lib/liff-client";
import { haversineMeters } from "@/lib/utils";
import {
  clockAction,
  loadCheckinStatus,
  type CheckinStatus,
} from "@/app/liff/checkin/actions";

interface CheckinProps {
  shiftStart?: string;
  shiftEnd?: string;
  geofence: {
    enabled: boolean;
    latitude: number | null;
    longitude: number | null;
    radiusM: number;
  };
}

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

export function CheckinClient(props: CheckinProps) {
  const t = useTranslations("liff.checkin");
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [lineUserId, setLineUserId] = useState("");
  const [now, setNow] = useState<Date>(() => new Date());
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, startTransition] = useTransition();
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // LIFF init + load attendance status
  useEffect(() => {
    let cancelled = false;
    initLiff(process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN).then(async (res) => {
      if (cancelled) return;
      if (res.profile) {
        setProfile(res.profile);
        setLineUserId(res.profile.userId);
        const s = await loadCheckinStatus(res.profile.userId);
        if (!cancelled) setStatus(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep a live GPS reading so the UI can explain the same geofence rule that
  // the server enforces when the employee submits a clock event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationError("อุปกรณ์นี้ไม่รองรับการอ่าน GPS");
      return;
    }
    setLocating(true);
    const timeoutId = setTimeout(() => {
      setLocating(false);
      setLocationError("ใช้เวลาค้นหา GPS นานเกินไป กรุณาตรวจสิทธิ์ location");
    }, 8000);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        clearTimeout(timeoutId);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationError(null);
        setLocating(false);
      },
      (error) => {
        clearTimeout(timeoutId);
        setLocationError(
          error.code === 1
            ? "ยังไม่ได้อนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ location"
            : "อ่าน GPS ไม่สำเร็จ กรุณาตรวจสัญญาณแล้วลองใหม่",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
    return () => {
      clearTimeout(timeoutId);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const hasGeofenceConfig =
    props.geofence.latitude !== null &&
    props.geofence.longitude !== null &&
    Number.isFinite(props.geofence.latitude) &&
    Number.isFinite(props.geofence.longitude) &&
    Number.isFinite(props.geofence.radiusM) &&
    props.geofence.radiusM > 0;
  const geofenceDistanceM =
    position && hasGeofenceConfig
      ? haversineMeters(
          position.lat,
          position.lng,
          props.geofence.latitude as number,
          props.geofence.longitude as number,
        )
      : null;
  const isInsideGeofence =
    geofenceDistanceM !== null && geofenceDistanceM <= props.geofence.radiusM;
  const geofenceBlocked =
    props.geofence.enabled && (!hasGeofenceConfig || !position || !isInsideGeofence);
  const geofenceBlockMessage = !hasGeofenceConfig
    ? "องค์กรเปิดตรวจระยะ แต่ยังตั้งค่าจุดทำงานไม่ครบ กรุณาติดต่อหัวหน้าหรือ HR"
    : !position
      ? locationError ?? "กำลังรอพิกัด GPS ก่อนลงเวลา"
      : `คุณอยู่ห่างจุดทำงาน ${formatDistance(geofenceDistanceM)} เกินรัศมีที่อนุญาต ${formatDistance(props.geofence.radiusM)}`;

  function doClock(type: "in" | "out") {
    if (geofenceBlocked) {
      toast.error(geofenceBlockMessage);
      return;
    }
    if (!lineUserId) {
      toast.error(t("currentTime"));
      return;
    }
    startTransition(async () => {
      const r = await clockAction({
        lineUserId,
        type,
        latitude: position?.lat,
        longitude: position?.lng,
        reason: reason.trim() || undefined,
      });
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      toast.success(type === "in" ? t("success") : t("successOut"));
      setReason("");
      if (r.status) setStatus(r.status);
    });
  }

  const hasOpenSession = status?.hasOpenSession ?? false;
  const lastLogTime = status?.lastLog?.timestamp
    ? new Date(status.lastLog.timestamp).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-navy-500">{t("currentTime")}</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-navy-900">
                {now.toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </div>
              <div className="text-xs text-navy-500">
                {now.toLocaleDateString("th-TH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            {props.shiftStart && props.shiftEnd && (
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-navy-500">
                  {t("todaysShift")}
                </div>
                <div className="mt-1 text-sm font-medium text-navy-900">
                  {props.shiftStart} – {props.shiftEnd}
                </div>
              </div>
            )}
          </div>

          {profile && (
            <div className="flex items-center gap-3 rounded-lg bg-navy-50 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-orange-400">
                {profile.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="text-xs text-navy-700">
                <div className="font-medium">{profile.displayName}</div>
                <div className="text-navy-500">LINE bound</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span>พิกัดปัจจุบัน</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {locating ? (
                <Badge variant="muted">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  กำลังหา GPS
                </Badge>
              ) : position ? (
                <Badge variant="default">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  GPS พร้อม
                </Badge>
              ) : (
                <Badge variant="default">ไม่พบ GPS</Badge>
              )}
              <Badge variant={props.geofence.enabled ? "default" : "muted"}>
                {props.geofence.enabled ? (
                  <ShieldCheck className="mr-1 h-3 w-3" />
                ) : (
                  <ShieldOff className="mr-1 h-3 w-3" />
                )}
                {props.geofence.enabled ? "เปิดตรวจระยะ" : "ไม่บังคับระยะ"}
              </Badge>
              {props.geofence.enabled && (
                <Badge variant={isInsideGeofence ? "muted" : "default"}>
                  {!hasGeofenceConfig
                    ? "ตั้งค่าไม่ครบ"
                    : !position
                      ? "รอพิกัด"
                      : isInsideGeofence
                        ? "ภายในพื้นที่"
                        : "นอกพื้นที่"}
                </Badge>
              )}
            </div>
          </div>
          {position && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <Metric label="ละติจูด" value={position.lat.toFixed(5)} />
              <Metric label="ลองจิจูด" value={position.lng.toFixed(5)} />
              <Metric label="ความแม่นยำ" value={`±${Math.round(position.accuracy)}m`} />
              <Metric
                label="ระยะจากจุดงาน"
                value={
                  geofenceDistanceM === null ? "ไม่ได้ตั้งค่า" : formatDistance(geofenceDistanceM)
                }
              />
            </div>
          )}
          <div
            aria-live="polite"
            className={`mt-3 rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
              geofenceBlocked
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-navy-100 bg-navy-50 text-navy-600"
            }`}
          >
            {!props.geofence.enabled
              ? "องค์กรปิดการตรวจระยะ ระบบจะบันทึกพิกัดที่อุปกรณ์ส่งมาแต่ไม่บล็อกการลงเวลา"
              : !hasGeofenceConfig
                ? geofenceBlockMessage
                : !position
                  ? geofenceBlockMessage
                  : isInsideGeofence
                    ? `อยู่ภายในพื้นที่อนุญาต ระยะ ${formatDistance(geofenceDistanceM)} จากจุดทำงาน (กำหนดไว้ ${formatDistance(props.geofence.radiusM)})`
                    : geofenceBlockMessage}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          {hasOpenSession ? (
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2.5 text-xs text-orange-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
              <span>
                คุณกดเข้างานล่าสุดเวลา <b>{lastLogTime}</b> แล้วยังไม่ได้กดออกงาน — กดออกงานก่อนจึงจะเข้างานใหม่ได้
              </span>
            </div>
          ) : status?.lastLog ? (
            <div className="flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2.5 text-xs text-navy-700">
              <Clock className="h-3.5 w-3.5 text-orange-500" />
              <span>
                ล่าสุด {status.lastLog.type === "in" ? "เข้างาน" : "ออกงาน"} เวลา{" "}
                <b>{lastLogTime}</b>
              </span>
            </div>
          ) : (
            <div className="rounded-lg bg-navy-50 px-3 py-2.5 text-xs text-navy-600">
              ยังไม่มีบันทึกการเข้า-ออกงานในระบบ
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">
              หมายเหตุ / เหตุผล (ทางเลือก)
            </label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ลืมกดเข้างานตอนเช้า, อยู่ระหว่างเดินทาง"
            />
            <div className="text-[10px] text-navy-400">
              ถ้าลืมกดเข้างาน ใส่เหตุผลเพื่อบันทึกย้อนหลังตอนกดออกงาน
            </div>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={submitting || hasOpenSession || geofenceBlocked}
            onClick={() => doClock("in")}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {t("checkIn")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={submitting || geofenceBlocked}
            onClick={() => doClock("out")}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {t("checkOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-navy-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-navy-900">{value}</div>
    </div>
  );
}

function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "ไม่ทราบ";
  if (value < 1_000) return `${Math.round(value).toLocaleString("th-TH")} ม.`;
  return `${(value / 1_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} กม.`;
}
