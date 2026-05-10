import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { OtForm } from "@/components/liff/ot-form";

export default async function RequestOtPage() {
  const t = await getTranslations("liff.requestOt");
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <OtForm />
      </main>
    </>
  );
}
