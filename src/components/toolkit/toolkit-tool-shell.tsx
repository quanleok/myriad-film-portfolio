"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { TOOLKIT_CATEGORY_LABELS, type ToolApp } from "@/lib/toolkit";

const TOOL_COMPONENTS = {
  "video-stamp": dynamic(
    () => import("@/components/toolkit/tools/video-stamp").then((module) => module.VideoStampTool),
    { ssr: false }
  ),
  "prompt-master": dynamic(
    () => import("@/components/toolkit/tools/prompt-master").then((module) => module.PromptMasterTool),
    { ssr: false }
  ),
  "character-sheet": dynamic(
    () => import("@/components/toolkit/tools/character-sheet").then((module) => module.CharacterSheetTool),
    { ssr: false }
  ),
} as const;

export function ToolkitToolShell({ tool }: { tool: ToolApp }) {
  const ToolComponent = TOOL_COMPONENTS[tool.component];

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(131,92,255,0.2),rgba(13,12,22,0.92)_38%,rgba(7,17,12,0.96)_100%)]">
        <VideoHubHeader activeTab="toolkit" hidePrimary />

        <main className="mx-auto max-w-[min(1720px,100vw)] px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 rounded-[1.75rem] border border-[rgba(131,92,255,0.16)] bg-[linear-gradient(180deg,rgba(19,15,31,0.94),rgba(10,11,16,0.96))] px-5 py-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Link
                  href="/toolkit"
                  className="press-effect inline-flex items-center gap-2 rounded-full border border-[rgba(131,92,255,0.16)] bg-black/14 px-3.5 py-2 font-medium text-text-primary transition-colors hover:bg-black/22"
                >
                  <ArrowLeft size={15} />
                  Back
                </Link>
                <span className="rounded-full border border-[rgba(131,92,255,0.18)] bg-[rgba(26,18,58,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e5ddff]">
                  {TOOLKIT_CATEGORY_LABELS[tool.category]}
                </span>
                {tool.isAIPowered ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,61,210,0.18)] bg-[rgba(47,13,40,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb8ef]">
                    <Sparkles size={12} />
                    AI-powered
                  </span>
                ) : null}
              </div>
              <div>
                <h1 className="font-display text-[1.95rem] font-semibold tracking-[-0.06em] text-text-primary">
                  {tool.name}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
                  {tool.detail}
                </p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-[rgba(131,92,255,0.14)] bg-black/14 px-4 py-3 text-sm text-text-secondary">
              {tool.slug === "character-sheet"
                ? "Saved to your private character library. Sign-in required."
                : "Opens instantly. Nothing is stored unless the tool says so."}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-[rgba(131,92,255,0.16)] bg-[linear-gradient(180deg,rgba(15,13,24,0.96),rgba(9,10,15,0.98))] shadow-[0_24px_72px_rgba(0,0,0,0.34)]">
            <ToolComponent tool={tool} />
          </section>
        </main>
      </div>
    </div>
  );
}
