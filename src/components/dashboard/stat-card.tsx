import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  helper,
  accent = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: { value: string; trend: "up" | "down" | "flat" };
  helper?: string;
  accent?: boolean;
}) {
  const trendColor =
    delta?.trend === "up"
      ? "text-emerald-600 bg-emerald-50"
      : delta?.trend === "down"
        ? "text-red-600 bg-red-50"
        : "text-navy-500 bg-navy-50";
  return (
    <Card className={cn(accent && "border-orange-200 bg-orange-50/30")}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-navy-500">{label}</p>
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              accent ? "bg-orange-400 text-white" : "bg-navy-900 text-orange-400",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-2">
          <p className="text-3xl font-semibold tracking-tight text-navy-900">{value}</p>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                trendColor,
              )}
            >
              {delta.trend === "up" && <ArrowUp className="h-3 w-3" />}
              {delta.trend === "down" && <ArrowDown className="h-3 w-3" />}
              {delta.value}
            </span>
          )}
        </div>
        {helper && <p className="mt-1 text-xs text-navy-400">{helper}</p>}
      </CardContent>
    </Card>
  );
}
