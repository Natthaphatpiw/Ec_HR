"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/i18n/actions";
import { localeNames, localeShort, locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-1.5 text-navy-700"
          disabled={pending}
        >
          <Globe className="h-4 w-4" />
          <span className="font-medium">{localeShort[current]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() =>
              startTransition(async () => {
                await setLocale(loc);
              })
            }
            className={loc === current ? "bg-navy-50 font-medium" : ""}
          >
            <span className="mr-2 text-xs text-navy-500">{localeShort[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
