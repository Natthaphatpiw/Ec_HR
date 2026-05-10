import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineQrPreview } from "./line-qr-preview";

export function LandingHero() {
  const t = useTranslations();
  return (
    <section className="relative overflow-hidden border-b border-navy-100">
      <div className="absolute inset-0 grid-pattern opacity-50" aria-hidden />
      <div
        className="absolute -top-32 left-1/2 h-[500px] w-[900px] -translate-x-1/2 bg-gradient-to-br from-orange-100 via-white to-white blur-3xl opacity-60"
        aria-hidden
      />

      <div className="container-page relative grid gap-16 py-20 md:py-28 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7 flex flex-col gap-8 animate-fade-in">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-medium text-navy-700 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            {t("landing.hero.badge")}
          </div>

          <h1 className="text-balance text-4xl font-semibold tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            {t("landing.hero.headline")}
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-navy-500 sm:text-xl">
            {t("landing.hero.subheadline")}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="xl">
              <Link href="/liff/checkin">
                <MessageCircle className="h-5 w-5" />
                {t("common.tryDemo")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="#book-demo">{t("common.bookDemo")}</Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 border-t border-navy-100 pt-8 max-w-xl">
            <Stat label={t("landing.hero.stat1Label")} value={t("landing.hero.stat1Value")} />
            <Stat label={t("landing.hero.stat2Label")} value={t("landing.hero.stat2Value")} />
            <Stat label={t("landing.hero.stat3Label")} value={t("landing.hero.stat3Value")} />
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <LineQrPreview />
          <FloatingPills />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-navy-400">{label}</div>
    </div>
  );
}

function FloatingPills() {
  return (
    <>
      <div className="absolute -left-4 top-12 hidden rounded-xl border border-navy-100 bg-white p-3 shadow-card animate-fade-in lg:block">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-emerald-50 p-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs font-semibold text-navy-900">Geofence verified</div>
            <div className="text-[11px] text-navy-500">ThaiAuto Factory · 142m</div>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-16 hidden rounded-xl border border-navy-100 bg-white p-3 shadow-card animate-fade-in lg:block">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-orange-50 p-1.5">
            <Zap className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <div className="text-xs font-semibold text-navy-900">Clock-in 08:02</div>
            <div className="text-[11px] text-navy-500">EMP001 · Somchai · On time</div>
          </div>
        </div>
      </div>
    </>
  );
}
