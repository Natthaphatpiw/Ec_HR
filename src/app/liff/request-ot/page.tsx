import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { OtForm } from "@/components/liff/ot-form";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { getRegistrationStatus } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export default async function RequestOtPage() {
  const t = await getTranslations("liff.requestOt");
  const lineUserId = await getLiffUserIdFromCookie();

  if (!lineUserId) {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_OT} />
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

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <OtForm employeeId={registration.employee.id} />
      </main>
    </>
  );
}
