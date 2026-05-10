import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingFinalCta() {
  const t = useTranslations("landing.finalCta");
  return (
    <section id="book-demo" className="relative overflow-hidden border-b border-navy-100 py-20 sm:py-28">
      <div
        className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-white"
        aria-hidden
      />
      <div className="container-tight relative">
        <div className="overflow-hidden rounded-3xl border border-navy-100 bg-navy-900 p-10 text-white shadow-card sm:p-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-8">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("title")}
              </h2>
              <p className="mt-4 text-lg text-navy-300">{t("subtitle")}</p>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
              <Button asChild size="xl" className="w-full lg:w-auto">
                <Link href="/liff/checkin">
                  <MessageCircle className="h-5 w-5" />
                  {t("primary")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:w-auto"
              >
                <Link href="/dashboard">{t("secondary")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
