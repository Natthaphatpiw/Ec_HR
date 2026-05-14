import { Lock, MessageCircle, Sparkles, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LiffHeader } from "@/components/liff/header";
import { guardLiffPage } from "@/components/liff/page-guard";
import { AiChat } from "@/components/dashboard/ai-chat";
import { ContactForm } from "@/components/liff/contact-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export default async function LiffAiChatPage() {
  const t = await getTranslations("liff.aiChat");
  const guard = await guardLiffPage({
    title: t("title"),
    liffId: process.env.NEXT_PUBLIC_LIFF_ID_AI_CHAT,
  });
  if (!guard.ok) return guard.view;
  const me = guard.employee;
  // AI is gated to anyone who supervises others, or has the HR/executive role.
  const canUseAi = !!me.is_supervisor || me.role === "hr" || me.role === "executive";

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
            <ContactForm employeeId={me.id} />
          </TabsContent>

          <TabsContent value="ai" className="mt-3">
            {canUseAi ? (
              <>
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>ForgeHR Assistant · Claude Sonnet 4.6</span>
                </div>
                <AiChat channel="liff" employeeId={me.id} compact />
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
