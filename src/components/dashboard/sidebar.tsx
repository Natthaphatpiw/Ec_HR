"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { AiMark } from "@/components/dashboard/ai-mark";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function DashboardSidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const links = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/attendance", label: t("attendance"), icon: MapPinned },
    { href: "/dashboard/shifts", label: t("shifts"), icon: CalendarRange },
    { href: "/dashboard/employees", label: t("employees"), icon: Users },
    { href: "/dashboard/leave", label: t("leave"), icon: ClipboardCheck },
    { href: "/dashboard/payroll", label: t("payroll"), icon: Receipt },
    { href: "/dashboard/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/dashboard/ai-assistant", label: t("aiAssistant"), ai: true },
    { href: "/dashboard/settings", label: t("settings"), icon: Settings },
  ];

  const navigation = (compact: boolean, closeAfterNavigate = false, mobile = false) => (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!compact && (
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-400">
            Workspace
          </div>
        )}
        <ul className="space-y-1">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  title={compact ? link.label : undefined}
                  aria-label={compact ? link.label : undefined}
                  onClick={closeAfterNavigate ? onMobileClose : undefined}
                  className={cn(
                    "group flex min-h-11 items-center rounded-xl text-sm font-medium transition-colors",
                    compact ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-navy-900 text-white shadow-soft"
                      : "text-navy-700 hover:bg-navy-50 hover:text-navy-900",
                    !active && link.ai && "text-orange-600",
                  )}
                >
                  {link.ai ? (
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-white" : "bg-white ring-1 ring-navy-100",
                      )}
                    >
                      <AiMark size="sm" />
                    </span>
                  ) : (
                    Icon && <Icon className="h-[18px] w-[18px] shrink-0" />
                  )}
                  {!compact && <span className="min-w-0 truncate">{link.label}</span>}
                  {!compact && link.ai && !active && (
                    <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      AI
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!compact && !mobile && (
        <div className="border-t border-navy-100 p-4">
          <div className="rounded-xl border border-navy-100 bg-navy-50 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-soft">
                <AiMark size="sm" />
              </span>
              <div className="text-xs font-semibold text-navy-900">ผู้ช่วยงานบุคคล</div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-navy-600">
              ค้นข้อมูล สรุปแนวโน้ม และสร้างรายงานองค์กรได้ในที่เดียว
            </p>
          </div>
        </div>
      )}

      {mobile && (
        <div className="flex items-center gap-2 border-t border-navy-100 p-4">
          <LanguageSwitcher variant="outline" />
          <form action={logoutAction} className="flex-1">
            <Button type="submit" variant="outline" className="w-full">
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </Button>
          </form>
        </div>
      )}
    </>
  );

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-navy-100 bg-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-navy-100",
            collapsed ? "justify-center px-3" : "px-5",
          )}
        >
          {collapsed ? (
            <Link href="/" aria-label="EC AIHR home" className="flex h-10 w-12 items-center justify-center">
              <Image
                src="/brand/ecaihr-logo.png"
                alt="EC AIHR"
                width={52}
                height={18}
                className="h-auto w-12 object-contain"
              />
            </Link>
          ) : (
            <BrandMark href="/" size="sm" />
          )}
        </div>
        {navigation(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            aria-label="ปิดเมนู"
            className="absolute inset-0 h-auto w-auto rounded-none bg-navy-900/45 p-0 hover:bg-navy-900/45"
            onClick={onMobileClose}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="เมนูหลัก"
            className="relative z-10 flex h-dvh w-[min(304px,86vw)] flex-col border-r border-navy-100 bg-white shadow-card"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-navy-100 px-5">
              <BrandMark href="/" size="sm" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="ปิดเมนู"
                onClick={onMobileClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {navigation(false, true, true)}
          </aside>
        </div>
      )}
    </>
  );
}
