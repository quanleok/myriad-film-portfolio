"use client";

import Link from "next/link";
import { ArrowDownToLine, Heart } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatResourceCount,
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_LICENSE_LABELS,
  type ResourceCategory,
  type ResourceSummary,
} from "@/lib/resources";

function getCategoryClasses(category: ResourceCategory) {
  switch (category) {
    case "character_pack":
      return "border-[rgba(127,119,221,0.28)] bg-[rgba(34,24,70,0.82)] text-[#ded7ff]";
    case "prompt_template":
      return "border-[rgba(0,232,123,0.28)] bg-[rgba(13,43,29,0.84)] text-[#c5ffe3]";
    case "style_preset":
      return "border-[rgba(245,185,74,0.28)] bg-[rgba(58,38,10,0.84)] text-[#ffe8b8]";
    case "location_pack":
      return "border-[rgba(68,211,255,0.28)] bg-[rgba(11,37,49,0.82)] text-[#c8f4ff]";
    case "sound":
      return "border-[rgba(255,107,194,0.28)] bg-[rgba(59,17,42,0.82)] text-[#ffd1ee]";
    case "workflow":
      return "border-[rgba(45,212,191,0.28)] bg-[rgba(10,40,36,0.84)] text-[#c8fff7]";
    case "prop_pack":
      return "border-[rgba(255,143,87,0.28)] bg-[rgba(57,26,13,0.82)] text-[#ffd8c1]";
  }
}

function ResourceThumbnail({ resource }: { resource: ResourceSummary }) {
  if (resource.thumbnail_url) {
    return (
      <div
        className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.03]"
        style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.32)), url(${resource.thumbnail_url})` }}
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(78,213,255,0.16),rgba(18,16,32,0.96)_40%,rgba(7,17,12,0.98)_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(127,119,221,0.18),transparent_40%,rgba(0,232,123,0.12)_100%)]" />
      <div className="absolute inset-5 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,34,0.86),rgba(10,11,18,0.96))] shadow-[0_18px_44px_rgba(0,0,0,0.35)]" />
      <div className="absolute inset-x-6 bottom-6 h-14 rounded-[1rem] border border-white/8 bg-black/18" />
    </div>
  );
}

export function ResourceCard({ resource }: { resource: ResourceSummary }) {
  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group stagger-up overflow-hidden rounded-[1.8rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(12,14,20,0.9)] transition-all duration-200 hover:-translate-y-1 hover:border-[rgba(0,232,123,0.22)] hover:bg-[rgba(16,20,28,0.94)] hover:shadow-[0_24px_54px_rgba(0,0,0,0.28)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-b-[1.2rem]">
        <ResourceThumbnail resource={resource} />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
              getCategoryClasses(resource.category)
            )}
          >
            {RESOURCE_CATEGORY_LABELS[resource.category]}
          </span>
          {resource.isSample ? (
            <span className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              Sample
            </span>
          ) : null}
        </div>
        {resource.license !== "free" ? (
          <span className="absolute right-4 top-4 rounded-full border border-[rgba(255,255,255,0.1)] bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
            {RESOURCE_LICENSE_LABELS[resource.license]}
          </span>
        ) : null}
      </div>

      <div className="space-y-4 px-4 pb-4 pt-4">
        <div>
          <h3 className="text-[1rem] font-semibold tracking-[-0.03em] text-text-primary">
            {resource.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-secondary">
            {resource.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Avatar
            src={resource.creator?.avatar_url}
            fallback={resource.creator?.display_name ?? resource.creator?.username ?? "R"}
            size="sm"
            className="rounded-[14px] ring-0"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {resource.creator?.display_name ?? "Community creator"}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {resource.creator?.username ? `@${resource.creator.username}` : "Community upload"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-text-tertiary">
          <div className="inline-flex items-center gap-1.5">
            <ArrowDownToLine size={13} className="text-[#7eeeb8]" />
            <span>{formatResourceCount(resource.download_count)}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <Heart size={13} className="text-[#ff8ad7]" />
            <span>{formatResourceCount(resource.like_count)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/8 bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] text-text-tertiary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
