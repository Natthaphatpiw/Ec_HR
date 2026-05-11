import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { CheckinClient } from "@/components/liff/checkin-client";
import { getOrganization, listShifts } from "@/lib/data";

export default async function CheckinPage() {
  const [t, org, shifts] = await Promise.all([
    getTranslations("liff.checkin"),
    getOrganization(),
    listShifts(),
  ]);
  const morning = shifts.find((s) => s.name === "Morning Shift") ?? shifts[0];

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <CheckinClient
          factoryName={org.name}
          factoryLat={Number(org.geofence_lat ?? 13.740198598326677)}
          factoryLng={Number(org.geofence_lng ?? 100.56227944249513)}
          factoryRadiusM={Number(org.geofence_radius)}
          shiftStart={morning.start_time.slice(0, 5)}
          shiftEnd={morning.end_time.slice(0, 5)}
        />
      </main>
    </>
  );
}
