import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container-page flex h-16 items-center justify-between">
        <BrandMark href="/" />
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm font-medium text-navy-700 transition-colors hover:text-orange-500">
            {t("nav.features")}
          </Link>
          <Link href="#how" className="text-sm font-medium text-navy-700 transition-colors hover:text-orange-500">
            {t("landing.how.title").split(" ").slice(0, 2).join(" ")}
          </Link>
          <Link href="#compliance" className="text-sm font-medium text-navy-700 transition-colors hover:text-orange-500">
            {t("nav.compliance")}
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-navy-700 transition-colors hover:text-orange-500">
            {t("nav.dashboard")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard">
              {t("common.openDashboard")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/liff/checkin">{t("common.openLiff")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
