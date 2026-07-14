"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Crosshair,
  Loader2,
  MapPinned,
  Save,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { saveGeofenceSettings, type GeofenceSettingsResult } from "@/app/dashboard/settings/actions";
import { GeofenceMap } from "@/components/dashboard/geofence-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface GeofenceSettingsFormProps {
  organizationName: string;
  canEdit: boolean;
  initialEnabled: boolean;
  initialLatitude: number | null;
  initialLongitude: number | null;
  initialRadiusM: number;
}

function validCoordinate(value: string, min: number, max: number): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function GeofenceSettingsForm({
  organizationName,
  canEdit,
  initialEnabled,
  initialLatitude,
  initialLongitude,
  initialRadiusM,
}: GeofenceSettingsFormProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [latitude, setLatitude] = useState(initialLatitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initialLongitude?.toString() ?? "");
  const [radiusM, setRadiusM] = useState(initialRadiusM.toString());
  const [locating, setLocating] = useState(false);
  const [result, setResult] = useState<GeofenceSettingsResult | null>(null);
  const [pending, startTransition] = useTransition();

  const previewLatitude = validCoordinate(latitude, -90, 90);
  const previewLongitude = validCoordinate(longitude, -180, 180);
  const parsedRadius = Number(radiusM);
  const previewRadius = Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null;
  const canPreview =
    previewLatitude !== null && previewLongitude !== null && previewRadius !== null;

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์นี้ไม่รองรับการอ่านพิกัด");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setLocating(false);
        toast.success("นำพิกัดปัจจุบันมาใส่แล้ว กรุณาตรวจแผนที่ก่อนบันทึก");
      },
      (error) => {
        setLocating(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? "ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง กรุณาเปิดสิทธิ์ location ในเบราว์เซอร์"
            : "อ่านพิกัดไม่สำเร็จ กรุณาลองใหม่หรือกรอกพิกัดด้วยตนเอง",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("enabled", String(enabled));
    setResult(null);

    startTransition(async () => {
      try {
        const next = await saveGeofenceSettings(formData);
        setResult(next);
        if (next.ok) {
          toast.success(next.message);
          router.refresh();
        } else {
          toast.error(next.message);
        }
      } catch {
        const next = { ok: false, message: "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่" };
        setResult(next);
        toast.error(next.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-orange-500" />
              Geofence เข้า-ออกงาน
            </CardTitle>
            <CardDescription className="mt-1">
              กำหนดจุดทำงานและระยะที่อนุญาตสำหรับ {organizationName}
            </CardDescription>
          </div>
          <Badge variant={enabled ? "default" : "muted"}>
            {enabled ? (
              <ShieldCheck className="mr-1 h-3 w-3" />
            ) : (
              <ShieldOff className="mr-1 h-3 w-3" />
            )}
            {enabled ? "เปิดตรวจระยะ" : "ปิดตรวจระยะ"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-navy-100 bg-navy-50 p-4">
              <div className="space-y-1">
                <Label htmlFor="geofence-enabled" className="text-sm font-semibold text-navy-900">
                  บังคับตรวจระยะก่อนลงเวลา
                </Label>
                <p className="text-xs leading-relaxed text-navy-500">
                  เมื่อเปิด พนักงานต้องอนุญาต GPS และอยู่ภายในรัศมีที่กำหนดจึงจะกดเข้าและออกงานได้
                </p>
              </div>
              <Switch
                id="geofence-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!canEdit || pending}
                aria-label="เปิดหรือปิดการบังคับตรวจระยะ"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="geofence-latitude">ละติจูด</Label>
                <Input
                  id="geofence-latitude"
                  name="latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-90}
                  max={90}
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  disabled={!canEdit || pending}
                  placeholder="13.7401986"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geofence-longitude">ลองจิจูด</Label>
                <Input
                  id="geofence-longitude"
                  name="longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={-180}
                  max={180}
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  disabled={!canEdit || pending}
                  placeholder="100.5622794"
                  required
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={useCurrentLocation}
              disabled={!canEdit || pending || locating}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
              {locating ? "กำลังอ่านพิกัด" : "ใช้พิกัดปัจจุบันของฉัน"}
            </Button>

            <div className="space-y-2">
              <Label htmlFor="geofence-radius">รัศมีที่อนุญาต (เมตร)</Label>
              <Input
                id="geofence-radius"
                name="radiusM"
                type="number"
                inputMode="numeric"
                min={10}
                max={10_000}
                step={10}
                value={radiusM}
                onChange={(event) => setRadiusM(event.target.value)}
                disabled={!canEdit || pending}
                required
              />
              <p className="text-xs text-navy-500">
                แนะนำ 50-200 เมตร โดยเผื่อความคลาดเคลื่อนของ GPS ภายในอาคาร
              </p>
            </div>

            <div
              className={`rounded-lg border px-4 py-3 text-xs leading-relaxed ${
                enabled
                  ? "border-orange-200 bg-orange-50 text-orange-700"
                  : "border-navy-100 bg-navy-50 text-navy-600"
              }`}
            >
              {enabled
                ? "ระบบจะบล็อกทั้งการเข้างานและออกงานเมื่อไม่พบ GPS หรืออยู่นอกรัศมี"
                : "ระบบยังบันทึกพิกัดที่อุปกรณ์ส่งมา แต่จะไม่บล็อกการเข้างานหรือออกงานตามระยะ"}
            </div>

            {!canEdit && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-orange-700">
                ต้องเปิดหน้านี้ผ่าน LINE ด้วยบัญชีหัวหน้างาน HR หรือผู้บริหารที่ active จึงจะแก้ไขได้
              </div>
            )}

            {result && (
              <div
                aria-live="polite"
                className={`rounded-lg border px-4 py-3 text-xs ${
                  result.ok
                    ? "border-navy-200 bg-navy-50 text-navy-700"
                    : "border-orange-200 bg-orange-50 text-orange-700"
                }`}
              >
                {result.message}
              </div>
            )}

            <Button type="submit" disabled={!canEdit || pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {pending ? "กำลังบันทึก" : "บันทึก geofence"}
            </Button>
          </div>

          <div className="space-y-3">
            {canPreview ? (
              <GeofenceMap
                key={`${previewLatitude}-${previewLongitude}-${previewRadius}`}
                centerLat={previewLatitude}
                centerLng={previewLongitude}
                radiusM={previewRadius}
                points={[]}
              />
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-navy-200 bg-navy-50 px-6 text-center text-sm text-navy-500">
                กรอกละติจูด ลองจิจูด และรัศมีที่ถูกต้องเพื่อดูตัวอย่างบนแผนที่
              </div>
            )}

            <div className="rounded-lg border border-navy-100 p-4 text-xs text-navy-600">
              <div className="font-semibold text-navy-900">ตัวอย่างพื้นที่อนุญาต</div>
              <p className="mt-1 leading-relaxed">
                วงกลมสีส้มคือขอบเขตที่พนักงานลงเวลาได้ แผนที่นี้เป็นตัวอย่างก่อนบันทึกและจะเปลี่ยนตามค่าที่กรอก
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
