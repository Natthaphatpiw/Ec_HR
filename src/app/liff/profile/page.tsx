import { LiffHeader } from "@/components/liff/header";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { ProfileShell } from "@/components/liff/profile-shell";
import { getRegistrationStatus } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";
import { loadProfileBundle } from "./actions";

export default async function ProfilePage() {
  const lineUserId = await getLiffUserIdFromCookie();
  if (!lineUserId) {
    return (
      <>
        <LiffHeader title="โปรไฟล์" />
        <main className="px-4 pb-6 pt-3">
          <LiffInit
            liffId={
              process.env.NEXT_PUBLIC_LIFF_ID_PROFILE ??
              process.env.NEXT_PUBLIC_LIFF_ID_CHECKIN
            }
          />
        </main>
      </>
    );
  }
  const registration = await getRegistrationStatus(lineUserId);
  if (registration.state !== "active") {
    return (
      <>
        <LiffHeader title="โปรไฟล์" />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status={registration.state} />
        </main>
      </>
    );
  }
  const bundle = await loadProfileBundle(lineUserId);
  if (!bundle) {
    return (
      <>
        <LiffHeader title="โปรไฟล์" />
        <main className="px-4 pb-6 pt-3">
          <NeedsRegistration status="new" />
        </main>
      </>
    );
  }
  return (
    <>
      <LiffHeader title="โปรไฟล์" />
      <main className="px-4 pb-6 pt-3">
        <ProfileShell bundle={bundle} lineUserId={lineUserId} />
      </main>
    </>
  );
}
