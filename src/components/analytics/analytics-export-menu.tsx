"use client";

import { ChevronDown, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DATASETS = [
  "all",
  "employees",
  "attendance",
  "leave",
  "overtime",
  "payroll",
  "performance",
] as const;

export function AnalyticsExportMenu({ days, fullWidth = false }: { days: number; fullWidth?: boolean }) {
  const t = useTranslations("dashboard.analytics");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={fullWidth ? "w-full" : undefined}>
          <FileSpreadsheet className="h-3.5 w-3.5 text-orange-500" />
          {t("exportExcel")}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("chooseDataset")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DATASETS.map((dataset) => (
          <DropdownMenuItem key={dataset} asChild>
            <a
              href={`/api/analytics/export?days=${days}&dataset=${dataset}`}
              className="cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-orange-500" />
              {t(`exportDatasets.${dataset}`)}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
