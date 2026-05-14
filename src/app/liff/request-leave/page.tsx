import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { LeaveForm } from "@/components/liff/leave-form";
import { guardLiffPage } from "@/components/liff/page-guard";
import { getLeaveBalance } from "@/lib/data";

export default async function RequestLeavePage() {
  const t = await getTranslations("liff.requestLeave");
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_LEAVE,
  });
  if (!guard.ok) return guard.view;
  const balance = await getLeaveBalance(guard.employee.id);
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <LeaveForm balance={balance} employeeId={guard.employee.id} />
      </main>
    </>
  );
}
