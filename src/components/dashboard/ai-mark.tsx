import Image from "next/image";
import { cn } from "@/lib/utils";

const sizes = {
  sm: 18,
  md: 24,
  lg: 30,
} as const;

export function AiMark({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const pixels = sizes[size];

  return (
    <Image
      src="/brand/ai-spark.png"
      alt=""
      width={pixels}
      height={pixels}
      aria-hidden="true"
      className={cn("select-none object-contain", className)}
    />
  );
}
