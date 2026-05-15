import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Logo intrinsic dimensions (public/brand/ecaihr-logo.png — 2172×724, ~3:1)
const LOGO_INTRINSIC_W = 2172;
const LOGO_INTRINSIC_H = 724;

export function BrandMark({
  href = "/",
  className,
  size = "md",
}: {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  // Heights chosen so the "ECAIHR" wordmark stays readable. The image renders
  // at intrinsic 3:1 ratio so width is computed below.
  const heightPx = size === "sm" ? 32 : size === "lg" ? 56 : 40;
  const widthPx = Math.round((heightPx * LOGO_INTRINSIC_W) / LOGO_INTRINSIC_H);

  const content = (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ height: heightPx }}
      aria-label="EC AIHR by eCloudtec Thailand"
    >
      <Image
        src="/brand/ecaihr-logo.png"
        alt="EC AIHR by eCloudtec Thailand"
        width={widthPx}
        height={heightPx}
        priority={size === "lg"}
        className="h-full w-auto select-none"
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center" aria-label="EC AIHR home">
        {content}
      </Link>
    );
  }
  return content;
}
