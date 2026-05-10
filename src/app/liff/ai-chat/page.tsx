import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { AiChat } from "@/components/dashboard/ai-chat";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

export default async function LiffAiChatPage() {
  const t = await getTranslations("liff.aiChat");
  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="flex flex-col px-3 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
          <Sparkles className="h-3.5 w-3.5" />
          <span>ForgeHR Assistant · Claude Sonnet 4.6</span>
        </div>
        <AiChat channel="liff" employeeId={DEMO_EMPLOYEE_ID} compact />
      </main>
    </>
  );
}
