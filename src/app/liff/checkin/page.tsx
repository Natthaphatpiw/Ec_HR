import { getLocale, getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { CheckinClient } from "@/components/liff/checkin-client";
import { guardLiffPage } from "@/components/liff/page-guard";
import { loadCheckinStatus } from "@/app/liff/checkin/actions";
import type { Locale } from "@/i18n/config";
import { getEmployeeName, getOrganization, listShifts } from "@/lib/data";

export default async function CheckinPage() {
  const t = await getTranslations("liff.checkin");
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN,
  });
  if (!guard.ok) return guard.view;

  const employee = guard.employee;
  // The last clock event loads with the page, so the buttons are correct on
  // first paint and the client never needs the LINE SDK to identify the user.
  const [shifts, organization, initialStatus, locale] = await Promise.all([
    listShifts(employee.org_id),
    getOrganization(employee.org_id),
    loadCheckinStatus(guard.lineUserId),
    getLocale(),
  ]);
  const morning = shifts.find((s) => s.name === "Morning Shift") ?? shifts[0];
  const geofenceLatitude = finiteNumber(organization.geofence_lat);
  const geofenceLongitude = finiteNumber(organization.geofence_lng);
  const geofenceRadius = finiteNumber(organization.geofence_radius) ?? 100;

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <CheckinClient
          lineUserId={guard.lineUserId}
          displayName={getEmployeeName(employee, locale as Locale)}
          initialStatus={initialStatus}
          shiftStart={morning ? morning.start_time.slice(0, 5) : undefined}
          shiftEnd={morning ? morning.end_time.slice(0, 5) : undefined}
          geofence={{
            enabled: organization.geofence_enabled,
            latitude: geofenceLatitude,
            longitude: geofenceLongitude,
            radiusM: geofenceRadius,
          }}
        />
      </main>
    </>
  );
}

function finiteNumber(value: number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
