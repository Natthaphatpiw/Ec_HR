import { useTranslations } from "next-intl";
import {
  Calendar,
  CalendarRange,
  ClipboardCheck,
  MapPinned,
  ScrollText,
  Sparkles,
} from "lucide-react";

export function LandingFeatures() {
  const t = useTranslations("landing.features");
  const items = [
    { icon: MapPinned, key: "lineCheckin" },
    { icon: CalendarRange, key: "shifts" },
    { icon: ClipboardCheck, key: "leave" },
    { icon: Calendar, key: "payroll" },
    { icon: ScrollText, key: "compliance" },
    { icon: Sparkles, key: "ai" },
  ] as const;

  return (
    <section id="features" className="border-b border-navy-100 bg-navy-50/30 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-medium text-navy-700">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            All features
          </div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-navy-500">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group rounded-xl border border-navy-100 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-card"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500 transition-colors group-hover:bg-orange-400 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-navy-900">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-500">
                    {t(`${key}.desc`)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
