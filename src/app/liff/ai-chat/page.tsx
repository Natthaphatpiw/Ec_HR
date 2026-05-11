import { Lock, MessageCircle, Sparkles, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { AiChat } from "@/components/dashboard/ai-chat";
import { ContactForm } from "@/components/liff/contact-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getEmployeeById, listEmployees } from "@/lib/data";

const DEMO_EMPLOYEE_ID = "33333333-3333-3333-3333-333333333301";

interface SearchParams {
  as?: string;
}

export default async function LiffAiChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("liff.aiChat");

  let viewer = await getEmployeeById(DEMO_EMPLOYEE_ID);
  if (sp.as) {
    const all = await listEmployees();
    viewer =
      all.find((e) => e.employee_code === sp.as!.toUpperCase()) ??
      all.find((e) => e.id === sp.as) ??
      viewer;
  }

  const canUseAi = !!viewer && (viewer.role === "supervisor" || viewer.role === "hr" || viewer.role === "executive");

  return (
    <>
      <LiffHeader title={t("title")} />
      <main className="px-3 pb-3 pt-3">
        <Tabs defaultValue="contact">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contact">
              <UserPlus className="h-3.5 w-3.5" />
              ขอติดต่อหัวหน้า
            </TabsTrigger>
            <TabsTrigger value="ai">
              <MessageCircle className="h-3.5 w-3.5" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-3">
            <ContactForm employeeId={viewer?.id} />
          </TabsContent>

          <TabsContent value="ai" className="mt-3">
            {canUseAi ? (
              <>
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>ForgeHR Assistant · Claude Sonnet 4.6</span>
                </div>
                <AiChat channel="liff" employeeId={viewer!.id} compact />
              </>
            ) : (
              <Card>
                <CardContent className="space-y-2 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-50">
                    <Lock className="h-5 w-5 text-navy-500" />
                  </div>
                  <h3 className="text-base font-semibold text-navy-900">เฉพาะหัวหน้างาน</h3>
                  <p className="text-sm text-navy-500">
                    AI Assistant ใช้งานได้เฉพาะตำแหน่ง supervisor / HR / executive
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
