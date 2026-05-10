import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { LeaveForm } from "@/components/liff/leave-form";
import { getLeaveBalance } from "@/lib/data";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export default async function RequestLeavePage() {
  const t = await getTranslations("liff.requestLeave");
  const balance = getLeaveBalance(DEMO_EMPLOYEE_ID);
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <LeaveForm balance={balance} />
      </main>
    </>
  );
}
