import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { LiffHeader } from "@/components/liff/header";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown the moment a menu is tapped, while the next page loads its data. */
export default function LiffLoading() {
  const t = useTranslations("common");
  return (
    <>
      <LiffHeader />
      <main className="px-4 pb-6 pt-3" aria-busy="true">
        <div role="status" className="flex items-center justify-center gap-2 py-3 text-sm text-navy-500">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span>{t("loading")}…</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </main>
    </>
  );
}
