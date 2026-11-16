import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { RegisterForm } from "@/components/liff/register-form";
import { redirectActiveMemberHome } from "@/lib/registration-entry";

export default async function RegisterPage() {
  await redirectActiveMemberHome();
  const t = await getTranslations("liff.register");
  return (
    <>
      <LiffHeader />
      <main className="px-4 pb-10 pt-3">
        {/* The form shows this banner only once it knows the visitor still has to register. */}
        <RegisterForm
          hero={
            <div className="mb-4 rounded-2xl bg-navy-900 p-5 text-white">
              <h2 className="text-lg font-semibold">{t("title")}</h2>
              <p className="mt-1 text-sm text-navy-300">{t("subtitle")}</p>
            </div>
          }
        />
      </main>
    </>
  );
}
