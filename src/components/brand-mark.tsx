import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href = "/",
  className,
  size = "md",
}: {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { logo: "h-7 w-7", text: "text-base", sub: "text-[10px]" },
    md: { logo: "h-9 w-9", text: "text-lg", sub: "text-[11px]" },
    lg: { logo: "h-12 w-12", text: "text-2xl", sub: "text-xs" },
  };
  const s = sizes[size];

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("relative flex items-center justify-center rounded-lg bg-navy-900", s.logo)}>
        <svg viewBox="0 0 24 24" fill="none" className="h-1/2 w-1/2 text-orange-400">
          <path
            d="M5 4h3v12h7v3H5V4zm14 0v15l-4-4h-3v-3h3l4-4V4z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-tight">
        <span className={cn("font-semibold tracking-tight text-navy-900", s.text)}>
          LinForge<span className="text-orange-500"> HR</span>
        </span>
        <span className={cn("text-navy-400", s.sub)}>LINE-First HR for Factories</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
