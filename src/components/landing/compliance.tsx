import { useTranslations } from "next-intl";
import { Database, FileLock2, MapPinned, ShieldCheck } from "lucide-react";

const ICONS = [ShieldCheck, FileLock2, MapPinned, Database] as const;

export function LandingCompliance() {
  const t = useTranslations("landing.compliance");
  const items = t.raw("items") as { title: string; desc: string }[];

  return (
    <section id="compliance" className="border-b border-navy-100 bg-navy-900 py-20 text-white sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-orange-300">
            <ShieldCheck className="h-3 w-3" />
            Security
          </div>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-navy-300">{t("subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {items.map((it, i) => {
            const Icon = ICONS[i] ?? ShieldCheck;
            return (
              <div
                key={it.title}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-colors hover:bg-white/[0.07]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-400/10 text-orange-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{it.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-navy-300">{it.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
