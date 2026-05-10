import { useTranslations } from "next-intl";
import { Brain, MessageCircle, Workflow } from "lucide-react";

export function LandingWhy() {
  const t = useTranslations("landing.why");
  const cards = [
    { icon: MessageCircle, key: "card1" },
    { icon: Workflow, key: "card2" },
    { icon: Brain, key: "card3" },
  ] as const;
  return (
    <section className="border-b border-navy-100 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-navy-500">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cards.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group relative rounded-2xl border border-navy-100 bg-white p-8 transition-all hover:border-orange-200 hover:shadow-card"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-orange-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-navy-900">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-500">{t(`${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
