"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Spinner that appears inside a `<Link>` from the moment it is tapped until
 * the next page takes over, so a tap never looks ignored.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 aria-hidden className={cn("h-4 w-4 animate-spin text-orange-500", className)} />;
}
