"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarRange,
  ClipboardCheck,
  LayoutDashboard,
  MapPinned,
  Receipt,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const links = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/attendance", label: t("attendance"), icon: MapPinned },
    { href: "/dashboard/shifts", label: t("shifts"), icon: CalendarRange },
    { href: "/dashboard/employees", label: t("employees"), icon: Users },
    { href: "/dashboard/leave", label: t("leave"), icon: ClipboardCheck },
    { href: "/dashboard/payroll", label: t("payroll"), icon: Receipt },
    { href: "/dashboard/reports", label: t("reports"), icon: TrendingUp },
    { href: "/dashboard/ai-assistant", label: t("aiAssistant"), icon: Sparkles, accent: true },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-navy-100 bg-white lg:flex">
      <div className="flex h-16 items-center border-b border-navy-100 px-5">
        <BrandMark href="/" size="sm" />
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-navy-400">
          Workspace
        </div>
        <ul className="space-y-0.5">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-navy-900 text-white"
                      : "text-navy-700 hover:bg-navy-50",
                    !active && l.accent && "text-orange-600",
                  )}
                >
                  <l.icon className={cn("h-4 w-4", l.accent && !active && "text-orange-500")} />
                  <span>{l.label}</span>
                  {l.accent && !active && (
                    <span className="ml-auto rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                      AI
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-navy-100 p-4">
        <div className="rounded-xl bg-navy-50 p-4">
          <div className="text-xs font-semibold text-navy-900">Powered by Mastra</div>
          <p className="mt-1 text-[11px] leading-relaxed text-navy-500">
            EC AIHR Assistant uses Claude Sonnet 4.6 to read live data. Try the AI tab.
          </p>
        </div>
      </div>
    </aside>
  );
}
