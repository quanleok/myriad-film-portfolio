"use client";

import type { FoundingProgramStatus } from "@/lib/founding-program";

// Founding program archived — component renders nothing
// Kept as a stub so existing imports don't break
export function FoundingProgramPanel(_props: {
  status: FoundingProgramStatus | null;
  variant?: "hero" | "compact";
  title?: string;
  body?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  className?: string;
}) {
  return null;
}
