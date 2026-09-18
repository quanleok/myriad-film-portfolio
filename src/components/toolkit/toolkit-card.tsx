"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatToolkitUsageCount,
  TOOLKIT_CATEGORY_LABELS,
  type ToolApp,
  type ToolkitCategory,
} from "@/lib/toolkit";

function getCategoryClasses(category: ToolkitCategory) {
  switch (category) {
    case "prompting":
      return "border-[rgba(54,211,153,0.28)] bg-[rgba(13,42,31,0.84)] text-[#b7f9df]";
    case "planning":
      return "border-[rgba(45,212,191,0.28)] bg-[rgba(9,34,33,0.84)] text-[#bafcf3]";
    case "utility":
      return "border-[rgba(131,92,255,0.28)] bg-[rgba(26,18,58,0.82)] text-[#e5ddff]";
    case "creative":
      return "border-[rgba(245,158,11,0.28)] bg-[rgba(52,31,9,0.84)] text-[#ffe4b3]";
  }
}

function ToolkitThumbnail({ tool }: { tool: ToolApp }) {
  if (tool.slug === "video-stamp") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] bg-[radial-gradient(circle_at_top_left,rgba(131,92,255,0.24),rgba(18,13,36,0.98)_52%,rgba(8,10,15,1)_100%)]">
        <div className="absolute inset-[9%] rounded-[1rem] border border-white/10 bg-black/35 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-[8%] overflow-hidden rounded-[0.8rem] bg-[linear-gradient(145deg,rgba(24,30,42,0.92),rgba(7,8,12,0.98))]">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.42))]" />
            <div className="absolute right-[10%] top-[10%] rounded-[0.6rem] border border-[rgba(54,211,153,0.34)] bg-[rgba(18,40,30,0.82)] px-3 py-2 text-[11px] font-semibold text-[#c4ffe7] shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
              @Myriad
            </div>
            <div className="absolute bottom-[9%] left-[8%] right-[8%] flex gap-2">
              <div className="h-2.5 flex-1 rounded-full bg-white/15" />
              <div className="h-2.5 w-14 rounded-full bg-[rgba(131,92,255,0.55)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tool.slug === "prompt-master") {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] bg-[radial-gradient(circle_at_top_left,rgba(255,61,210,0.16),rgba(24,13,34,0.96)_42%,rgba(8,10,15,1)_100%)]">
        <div className="absolute inset-[8%] grid grid-cols-[0.92fr_1.08fr] gap-3">
          <div className="rounded-[0.95rem] border border-white/8 bg-[rgba(8,9,14,0.72)] p-3">
            <div className="h-3.5 w-20 rounded-full bg-[rgba(131,92,255,0.28)]" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2.5 rounded-full bg-white/10",
                    index === 0 ? "w-11/12" : index === 1 ? "w-full" : index === 2 ? "w-10/12" : index === 3 ? "w-9/12" : "w-8/12"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[0.95rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(16,11,30,0.78)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.24)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="h-2.5 w-14 rounded-full bg-[rgba(255,61,210,0.24)]" />
                  <div className="h-2.5 w-10 rounded-full bg-white/10" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-white/12" />
                  <div className="h-2.5 w-10/12 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),rgba(28,17,10,0.96)_44%,rgba(9,10,15,1)_100%)]">
      <div className="absolute inset-[8%] grid grid-cols-[0.92fr_1.08fr] gap-3">
        <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[linear-gradient(180deg,rgba(35,23,19,0.95),rgba(11,10,15,0.98))]">
          <div className="absolute inset-x-[18%] top-[10%] bottom-[20%] rounded-[1rem] bg-[linear-gradient(180deg,#d9b7ff,#8664ff_42%,#24172b)]" />
          <div className="absolute inset-x-[14%] bottom-[12%] h-4 rounded-full bg-white/12" />
        </div>
        <div className="space-y-3">
          <div className="rounded-[0.95rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,16,0.74)] p-3">
            <div className="h-3 w-16 rounded-full bg-[rgba(245,158,11,0.25)]" />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["#D6B7FF", "#A67DFF", "#6C5AE0", "#2A2334"].map((color) => (
                <div key={color} className="h-8 rounded-[0.8rem]" style={{ background: color }} />
              ))}
            </div>
          </div>
          <div className="rounded-[0.95rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,16,0.74)] p-3">
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-full bg-white/12" />
              <div className="h-2.5 w-11/12 rounded-full bg-white/12" />
              <div className="h-2.5 w-8/12 rounded-full bg-white/12" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToolkitCard({ tool }: { tool: ToolApp }) {
  return (
    <Link
      href={`/toolkit/${tool.slug}`}
      className="group block overflow-hidden rounded-[1.45rem] border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(131,92,255,0.28)] hover:bg-[rgba(20,16,33,0.96)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden p-3">
        <ToolkitThumbnail tool={tool} />
        <div className="absolute left-5 top-5 flex items-center gap-2">
          <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", getCategoryClasses(tool.category))}>
            {TOOLKIT_CATEGORY_LABELS[tool.category]}
          </span>
          {tool.isAIPowered ? (
            <span className="rounded-full border border-[rgba(255,61,210,0.24)] bg-[rgba(47,13,40,0.84)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffb8ef]">
              AI
            </span>
          ) : null}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/28 via-black/6 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={16} />
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4 pt-0">
        <div>
          <h3 className="text-[0.98rem] font-semibold text-text-primary transition-colors duration-200 group-hover:text-white">
            {tool.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-text-secondary">
            {tool.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
          <div className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <span>{formatToolkitUsageCount(tool.usageCount)} uses</span>
          </div>
          <div className="inline-flex items-center gap-1 text-[#d9ceff]">
            <Sparkles size={13} />
            <span>{tool.isNew ? "New" : "Open tool"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
