import React from "react";
import { cn } from "@/lib/utils";

interface SpringLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  glowing?: boolean;
}

export function SpringLogo({ className, glowing = false, ...props }: SpringLogoProps) {
  return (
    <img
      src="/seed-logo.png"
      alt="Myriad Spring"
      className={cn(
        "h-full w-full object-contain",
        glowing && "drop-shadow-[0_0_16px_rgba(74,222,128,0.45)]",
        className
      )}
      {...props}
    />
  );
}
