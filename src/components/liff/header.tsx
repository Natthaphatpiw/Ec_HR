"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-mark";

export function LiffHeader({ title }: { title?: string }) {
  const pathname = usePathname();
  const showBack = pathname !== "/liff" && pathname !== "/liff/";

  return (
    <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          {showBack ? (
            <Link
              href="/liff"
              className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-navy-700 hover:bg-navy-50"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <BrandMark href="/liff" size="sm" />
          )}
          {title && (
            <span className="ml-1 truncate text-sm font-semibold text-navy-900">{title}</span>
          )}
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
