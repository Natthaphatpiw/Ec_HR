"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Home, Receipt, User } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_PATHS = new Set([
  "/liff/register",
  "/liff/register-supervisor",
  "/liff/onboard",
]);

export function LiffBottomNav() {
  const pathname = usePathname();
  const t = useTranslations("liff.nav");

  if (HIDDEN_PATHS.has(pathname)) return null;

  const items = [
    { href: "/liff", label: t("home"), icon: Home, exact: true },
    { href: "/liff/checkin", label: t("checkin"), icon: Clock },
    { href: "/liff/my-attendance", label: t("attendance"), icon: Calendar },
    { href: "/liff/payslip", label: t("payslip"), icon: Receipt },
    { href: "/liff/profile", label: t("profile"), icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-orange-500" : "text-navy-500",
                )}
              >
                <it.icon className={cn("h-5 w-5", active && "text-orange-500")} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
