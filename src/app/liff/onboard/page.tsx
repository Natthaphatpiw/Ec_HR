import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { OnboardForm } from "@/components/liff/onboard-form";

export default async function OnboardPage() {
  const t = await getTranslations("liff.onboard");
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-4 pb-6 pt-3">
        <div className="mb-4 rounded-2xl bg-navy-900 p-5 text-white">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-navy-300">{t("subtitle")}</p>
        </div>
        <OnboardForm />
      </main>
    </>
  );
}
