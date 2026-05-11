import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { LeaveForm } from "@/components/liff/leave-form";
import { LiffInit } from "@/components/liff/liff-init";
import { NeedsRegistration } from "@/components/liff/needs-registration";
import { getLeaveBalance, getRegistrationStatus } from "@/lib/data";
import { getLiffUserIdFromCookie } from "@/lib/liff-session";

export default async function RequestLeavePage() {
  const t = await getTranslations("liff.requestLeave");
  const lineUserId = await getLiffUserIdFromCookie();

  if (!lineUserId) {
    return (
      <>
        <LiffHeader title={t("title")} />
        <main className="px-4 pb-6 pt-3">
          <LiffInit liffId={process.env.NEXT_PUBLIC_LIFF_ID_LEAVE} />
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

  const balance = await getLeaveBalance(registration.employee.id);
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <LeaveForm balance={balance} employeeId={registration.employee.id} />
      </main>
    </>
  );
}
