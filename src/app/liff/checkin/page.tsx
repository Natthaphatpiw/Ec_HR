import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { CheckinClient } from "@/components/liff/checkin-client";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { getOrganization, getRegistrationStatus, listShifts } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export default async function CheckinPage() {
  const t = await getTranslations("liff.checkin");
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN} />
        </main>
      </>
    );
  }
  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status={registration.state} />
        </main>
      </>
    );
  }

  const [org, shifts] = await Promise.all([getOrganization(), listShifts()]);
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
