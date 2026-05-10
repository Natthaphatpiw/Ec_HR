import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";

export function LandingTestimonials() {
  const t = useTranslations("landing.testimonials");
  const items = t.raw("items") as { quote: string; author: string; company: string }[];

  return (
    <section className="border-b border-navy-100 py-20 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
            {t("title")}
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <figure
              key={it.author + it.company}
              className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-7 transition-all hover:border-orange-200 hover:shadow-card"
            >
              <Quote className="h-6 w-6 text-orange-300" />
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-navy-700">
                &ldquo;{it.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 border-t border-navy-100 pt-4">
                <div className="text-sm font-semibold text-navy-900">{it.author}</div>
                <div className="text-xs text-navy-500">{it.company}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
