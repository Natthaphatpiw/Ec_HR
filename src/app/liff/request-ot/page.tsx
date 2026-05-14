import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { OtForm } from "@/components/liff/ot-form";
import { guardLiffPage } from "@/components/liff/page-guard";

export default async function RequestOtPage() {
  const t = await getTranslations("liff.requestOt");
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_OT,
  });
  if (!guard.ok) return guard.view;
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <OtForm employeeId={guard.employee.id} />
      </main>
    </>
  );
}
