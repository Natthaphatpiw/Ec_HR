import Link from "next/link";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";

export function LandingFooter() {
  const t = useTranslations("landing.footer");
  const tNav = useTranslations("nav");
  return (
    <footer className="bg-white py-12">
      <div className="container-page">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrandMark href="/" />
            <p className="mt-4 max-w-sm text-sm text-navy-500">
              LinForge HR — built entirely on LINE for factories in Thailand, Taiwan, and Southeast Asia.
            </p>
          </div>
          <FooterColumn title={t("product")}>
            <FooterLink href="#features">{tNav("features")}</FooterLink>
            <FooterLink href="#how">{tNav("demo")}</FooterLink>
            <FooterLink href="/dashboard">{tNav("dashboard")}</FooterLink>
            <FooterLink href="/liff/checkin">LIFF</FooterLink>
          </FooterColumn>
          <FooterColumn title={t("company")}>
            <FooterLink href="#">About</FooterLink>
            <FooterLink href="#">Customers</FooterLink>
            <FooterLink href="#">Careers</FooterLink>
            <FooterLink href="#">Contact</FooterLink>
          </FooterColumn>
          <FooterColumn title={t("legal")}>
            <FooterLink href="#">Terms</FooterLink>
            <FooterLink href="#">Privacy (PDPA)</FooterLink>
            <FooterLink href="#">DPA</FooterLink>
            <FooterLink href="#">Security</FooterLink>
          </FooterColumn>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-navy-100 pt-8 text-sm text-navy-500 md:flex-row md:items-center">
          <span>© 2026 LinForge Co., Ltd. {t("rights")}</span>
          <span>Made for factory floors · Bangkok · Taipei</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="md:col-span-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900">{title}</h4>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-navy-500 transition-colors hover:text-orange-500">
        {children}
      </Link>
    </li>
  );
}
