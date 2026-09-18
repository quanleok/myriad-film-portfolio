import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProjectLifecycleStatus } from "@/types/project";

interface ProjectProgressBarProps {
  value: number;
  className?: string;
  vibrant?: boolean;
  /** When provided, bar color matches lifecycle status. Seed: teal→green at 50%. */
  status?: ProjectLifecycleStatus;
}

/** Seed: teal→green at 50% (greenlight eligible). Other states: solid lifecycle color. */
function getBarColor(pct: number, vibrant: boolean, status?: ProjectLifecycleStatus): string {
  if (!status) {
    // Fallback: threshold-based
    if (!vibrant) return "bg-role-cta-bg shadow-[0_0_8px_var(--role-glow-soft)]";
    if (pct >= 100) return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]";
    if (pct >= 50) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]";
    return "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.3)]";
  }

  // Seed: teal→green at 50% (greenlight eligible)
  if (status === "unlocking") {
    if (pct >= 50) return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]";
    return "bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.35)]";
  }

  // Other states: solid lifecycle color
  const colors: Record<string, string> = {
    draft: "bg-zinc-400 shadow-[0_0_6px_rgba(161,161,170,0.3)]",
    in_production: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]",
    premiering: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]",
    released: "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]",
    failed_to_unlock: "bg-zinc-500 shadow-[0_0_6px_rgba(161,161,170,0.3)]",
    cancelled: "bg-zinc-500 shadow-[0_0_6px_rgba(161,161,170,0.3)]",
  };
  return colors[status] ?? "bg-role-cta-bg";
}

export function ProjectProgressBar({ value, className, vibrant = false, status }: ProjectProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));
  const fillClass = getBarColor(value, vibrant, status);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-role-bg-surface-active", className)}>
      <div
        className={cn("relative h-full rounded-full transition-all duration-500 ease-out", fillClass)}
        style={{ width: visible ? `${normalized}%` : "0%" }}
      />
    </div>
  );
}
