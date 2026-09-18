import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

const pxSizes: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarProps) {
  const initials = fallback?.[0]?.toUpperCase() ?? "?";
  const px = pxSizes[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={alt ?? fallback}
        width={px}
        height={px}
        className={cn(
          "rounded-lg object-cover ring-2 ring-border",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-brand-600 font-medium text-page ring-2 ring-border",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
