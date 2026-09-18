"use client";

import { useMemo } from "react";
import { Copy, Download, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { outputTypeLabel } from "@/lib/toolkit/character-sheet-config";
import { cn } from "@/lib/utils";
import type { CharacterOutputRecord } from "./types";

interface CharacterOutputCardProps {
  output: CharacterOutputRecord;
  onPin: (outputId: string) => Promise<void>;
  onDelete: (outputId: string) => Promise<void>;
}

function formatDateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function CharacterOutputCard({
  output,
  onPin,
  onDelete,
}: CharacterOutputCardProps) {
  const formattedDate = useMemo(() => formatDateLabel(output.created_at), [output.created_at]);
  const analysis = output.metadata_json?.analysis ?? null;
  const palette = output.metadata_json?.palette ?? null;

  async function copyValue(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-white/8 bg-[rgba(7,11,9,0.86)] shadow-[0_18px_42px_rgba(0,0,0,0.22)] transition-all duration-200 hover:border-brand-500/18 hover:bg-[rgba(10,15,12,0.92)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-brand-500/22 bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200">
            {outputTypeLabel(output.type)}
          </span>
          {output.is_pinned ? (
            <span className="rounded-full border border-emerald-400/24 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              Pinned
            </span>
          ) : null}
        </div>
        <span className="text-xs text-text-tertiary">{formattedDate}</span>
      </div>

      {output.image_url ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-black/30">
          <img src={output.image_url} alt={outputTypeLabel(output.type)} className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
      ) : analysis ? (
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Physical", Object.values(analysis.physical).filter(Boolean).join(" · ")],
              ["Hair & eyes", `${analysis.hair.color}, ${analysis.hair.style}, ${analysis.eyes.color} eyes`],
              [
                "Clothing",
                [analysis.clothing.top, analysis.clothing.bottom, analysis.clothing.footwear, analysis.clothing.accessories]
                  .filter(Boolean)
                  .join(" · "),
              ],
              [
                "Features",
                analysis.distinguishing_features.filter(Boolean).join(" · "),
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1rem] border border-white/6 bg-black/18 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">{label}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">Prompt block</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void copyValue(analysis.prompt_block)}
                className="rounded-full"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
              >
                Copy
              </Button>
            </div>
            <div className="rounded-[1rem] border border-white/6 bg-black/18 px-3 py-3 text-sm leading-6 text-text-secondary">
              {analysis.prompt_block}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {analysis.colors.map((color) => (
              <div
                key={color}
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-2.5 py-1.5 text-xs font-medium text-text-primary"
              >
                <span className="h-4 w-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                {color}
              </div>
            ))}
          </div>
        </div>
      ) : palette ? (
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {palette.all_colors.map((entry) => (
              <div key={`${entry.hex}-${entry.location ?? entry.name}`} className="rounded-[1rem] border border-white/6 bg-black/18 p-3">
                <div className="h-14 rounded-[0.9rem] border border-white/8" style={{ backgroundColor: entry.hex }} />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{entry.name}</p>
                    <p className="mt-1 text-xs text-text-tertiary">{entry.location ?? "Derived color"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyValue(entry.hex)}
                    className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {entry.hex}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 py-5 text-sm text-text-secondary">
          This output finished, but there is no previewable payload yet.
        </div>
      )}

      <div className={cn("flex flex-wrap items-center gap-2 border-t border-white/6 px-4 py-3")}>
        {output.image_url ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => window.open(output.image_url!, "_blank", "noopener,noreferrer")}
            className="rounded-full"
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Download
          </Button>
        ) : null}
        {output.image_url ? (
          <Button
            type="button"
            size="sm"
            variant={output.is_pinned ? "success" : "secondary"}
            onClick={() => void onPin(output.id)}
            className="rounded-full"
            leftIcon={<Pin className="h-3.5 w-3.5" />}
          >
            {output.is_pinned ? "Pinned" : "Pin as reference"}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void onDelete(output.id)}
          className="rounded-full text-text-secondary hover:text-red-100"
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          Delete
        </Button>
      </div>
    </article>
  );
}
