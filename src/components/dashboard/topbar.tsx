"use client";

import { Bell, LogOut, Search } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-navy-100 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-navy-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-navy-500 truncate">{subtitle}</p>}
        </div>
        <div className="hidden items-center gap-2 rounded-md border border-navy-200 bg-white px-3 md:flex">
          <Search className="h-4 w-4 text-navy-400" />
          <Input
            placeholder="Search employees, requests..."
            className="h-9 w-72 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <LanguageSwitcher variant="outline" />
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-orange-400" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-navy-900 text-white">NS</AvatarFallback>
        </Avatar>
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" type="submit" aria-label="ออกจากระบบ" title="ออกจากระบบ">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
