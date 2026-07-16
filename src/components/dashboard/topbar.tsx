"use client";

import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { useDashboardNavigation } from "@/components/dashboard/dashboard-shell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigation = useDashboardNavigation();

  return (
    <div className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-16 items-center gap-1.5 px-3 sm:gap-2 sm:px-4 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="เปิดเมนู"
          onClick={navigation.openMobile}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          aria-label={navigation.collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          title={navigation.collapsed ? "ขยายเมนู" : "ย่อเมนู"}
          onClick={navigation.toggleCollapsed}
        >
          {navigation.collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
        <div className="min-w-0 flex-1 pl-1">
          <h1 className="text-lg font-semibold tracking-tight text-navy-900 truncate">{title}</h1>
          {subtitle && <p className="hidden truncate text-xs text-navy-500 sm:block">{subtitle}</p>}
        </div>
        <div className="hidden items-center gap-2 rounded-lg border border-navy-200 bg-white px-3 shadow-soft xl:flex">
          <Search className="h-4 w-4 text-navy-400" />
          <Input
            placeholder="Search employees, requests..."
            className="h-9 w-64 border-0 px-0 shadow-none focus-visible:ring-0 2xl:w-72"
          />
        </div>
        <div className="hidden sm:block">
          <LanguageSwitcher variant="outline" />
        </div>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-orange-400" />
        </Button>
        <Avatar className="hidden h-9 w-9 sm:flex">
          <AvatarFallback className="bg-navy-900 text-white">NS</AvatarFallback>
        </Avatar>
        <form action={logoutAction}>
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            className="hidden sm:inline-flex"
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
