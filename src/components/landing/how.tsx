import { useTranslations } from "next-intl";
import { ChevronRight, Plug, Upload, Users } from "lucide-react";

export function LandingHow() {
  const t = useTranslations("landing.how");
  const steps = [
    { icon: Plug, key: "step1", num: "01" },
    { icon: Upload, key: "step2", num: "02" },
    { icon: Users, key: "step3", num: "03" },
  ] as const;
  return (
    <section id="how" className="border-b border-navy-100 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            {t("title")}
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, key, num }, i) => (
            <div key={key} className="relative">
              <div className="rounded-2xl border border-navy-100 bg-white p-8 transition-all hover:border-orange-200 hover:shadow-card">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-orange-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-3xl font-semibold tracking-tight text-navy-100">{num}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-navy-900">{t(`${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-500">{t(`${key}.desc`)}</p>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="absolute right-[-22px] top-1/2 hidden h-6 w-6 -translate-y-1/2 text-navy-300 md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
