"use client";

import {
  FileText,
  Grid2x2,
  ImageIcon,
  MessageSquareMore,
  Palette,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getOutputOption, type CharacterOutputType } from "@/lib/toolkit/character-sheet-config";

const ICONS: Record<CharacterOutputType, React.ComponentType<{ className?: string }>> = {
  fullbody: ImageIcon,
  sheet: Grid2x2,
  description: FileText,
  expression: MessageSquareMore,
  closeup: ZoomIn,
  palette: Palette,
};

interface OutputOptionCardProps {
  type: CharacterOutputType;
  selected: boolean;
  onToggle: (type: CharacterOutputType) => void;
}

export function OutputOptionCard({ type, selected, onToggle }: OutputOptionCardProps) {
  const option = getOutputOption(type);
  const Icon = ICONS[type];

  return (
    <button
      type="button"
      onClick={() => onToggle(type)}
      className={cn(
        "group flex min-h-[118px] flex-col items-start gap-3 rounded-[1.15rem] border px-4 py-3 text-left transition-all duration-200",
        selected
          ? "border-brand-500/45 bg-brand-500/10 shadow-[0_0_0_1px_rgba(0,232,123,0.16),0_14px_30px_rgba(0,0,0,0.22)]"
          : "border-white/8 bg-[rgba(8,14,11,0.7)] hover:border-brand-500/20 hover:bg-[rgba(12,20,15,0.82)]"
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors duration-200",
          selected
            ? "border-brand-500/35 bg-brand-500/14 text-brand-300"
            : "border-white/8 bg-black/20 text-text-secondary group-hover:text-text-primary"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="space-y-1">
        <p className={cn("text-sm font-semibold", selected ? "text-text-primary" : "text-text-primary")}>
          {option.label}
        </p>
        <p className="text-xs leading-5 text-text-secondary">{option.summary}</p>
      </div>
    </button>
  );
}
