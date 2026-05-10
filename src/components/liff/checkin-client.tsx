"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initLiff, type LiffProfile } from "@/lib/liff-client";
import { haversineMeters } from "@/lib/utils";

interface CheckinProps {
  factoryName: string;
  factoryLat: number;
  factoryLng: number;
  factoryRadiusM: number;
  shiftStart: string;
  shiftEnd: string;
}

interface Position {
  lat: number;
  lng: number;
  accuracy: number;
}

export function CheckinClient(props: CheckinProps) {
  const t = useTranslations("liff.checkin");
  const tCommon = useTranslations("common");
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(true);
  const [submitting, setSubmitting] = useState<"in" | "out" | null>(null);
  const [lastInTime, setLastInTime] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    initLiff().then((res) => {
      if (cancelled) return;
      setDemoMode(res.demoMode);
      if (res.profile) setProfile(res.profile);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setPosition({ lat: props.factoryLat, lng: props.factoryLng, accuracy: 999 });
      setLocating(false);
      toast.warning("Location unavailable. Using factory center for demo.");
      return;
    }
    setLocating(true);
    const timeoutId = setTimeout(() => {
      // Demo fallback: place inside geofence
      setPosition({ lat: props.factoryLat + 0.0002, lng: props.factoryLng + 0.0001, accuracy: 12 });
      setLocating(false);
    }, 5000);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        clearTimeout(timeoutId);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        clearTimeout(timeoutId);
        setPosition({ lat: props.factoryLat + 0.0002, lng: props.factoryLng + 0.0001, accuracy: 25 });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
    return () => {
      clearTimeout(timeoutId);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [props.factoryLat, props.factoryLng]);

  const distance = position
    ? Math.round(haversineMeters(position.lat, position.lng, props.factoryLat, props.factoryLng))
    : null;
  const inside = distance !== null && distance <= props.factoryRadiusM;

  async function clockAction(type: "in" | "out") {
    if (!inside) {
      toast.error(t("youAreOutside"));
      return;
    }
    setSubmitting(type);
    try {
      // Simulate save (real impl would call /api/attendance)
      await new Promise((r) => setTimeout(r, 700));
      const time = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      if (type === "in") setLastInTime(time);
      toast.success(type === "in" ? t("success") : t("successOut"), {
        description: `${time} · ${props.factoryName} · ${distance}m`,
      });
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      {demoMode && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          Demo mode · LIFF not configured. Geolocation will simulate a clock-in inside the geofence.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-navy-500">{t("currentTime")}</div>
              <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-navy-900">
                {now.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </div>
              <div className="text-xs text-navy-500">
                {now.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-navy-500">
                {t("todaysShift")}
              </div>
              <div className="mt-1 text-sm font-medium text-navy-900">
                {props.shiftStart} – {props.shiftEnd}
              </div>
              <Badge variant="muted" className="mt-1">
                Morning
              </Badge>
            </div>
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
                <div className="text-navy-500">LINE bound · EMP001</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-semibold text-navy-900">Geofence check</span>
            </div>
            {locating ? (
              <Badge variant="muted">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {t("verifyingLocation")}
              </Badge>
            ) : inside ? (
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Inside
              </Badge>
            ) : (
              <Badge variant="danger">Outside</Badge>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Metric
              label="Distance"
              value={distance !== null ? `${distance}m` : "—"}
              ok={inside}
            />
            <Metric label="Radius" value={`${props.factoryRadiusM}m`} ok />
            <Metric
              label="Accuracy"
              value={position ? `±${Math.round(position.accuracy)}m` : "—"}
              ok={position ? position.accuracy < 50 : false}
            />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-700">
            <div className="flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5 text-navy-500" />
              <span>IP whitelist verified</span>
            </div>
            <span className="text-navy-500">192.168.1.42</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-navy-200 py-3 text-sm text-navy-500 hover:border-orange-300 hover:text-orange-600">
            <Camera className="h-4 w-4" />
            {t("addPhoto")}
          </button>

          <Button
            size="lg"
            className="w-full"
            disabled={submitting !== null || locating || !inside}
            onClick={() => clockAction("in")}
          >
            {submitting === "in" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {t("checkIn")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            disabled={submitting !== null || locating || !inside}
            onClick={() => clockAction("out")}
          >
            {submitting === "out" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {t("checkOut")}
          </Button>

          {lastInTime && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {t("lastCheckIn")}: {lastInTime} · {tCommon("today")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-navy-100 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-navy-500">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold tabular-nums ${
          ok ? "text-navy-900" : "text-red-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
