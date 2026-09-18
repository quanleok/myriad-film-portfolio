import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, MessageCircle } from "lucide-react";
import { formatCount, timeAgo } from "@/lib/utils";
import {
  formatTutorialTagLabel,
} from "@/lib/tutorials";
import { TUTORIAL_DIFFICULTY_LABELS, type TutorialSummary } from "@/types/tutorial";

function CoverFallback({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#113122,rgba(9,15,12,0.96)_65%)] p-6">
      <span className="max-w-[18ch] text-center text-lg font-semibold tracking-[-0.03em] text-text-primary">
        {title}
      </span>
    </div>
  );
}

export function TutorialListCard({ tutorial }: { tutorial: TutorialSummary }) {
  const authorHandle = tutorial.author.username
    ? `@${tutorial.author.username}`
    : tutorial.author.display_name ?? "Unknown creator";

  return (
    <Link
      href={`/tutorials/${tutorial.slug}`}
      className="group block rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(13,18,18,0.92),rgba(8,12,12,0.98))] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-500/22 hover:bg-[linear-gradient(180deg,rgba(15,23,20,0.96),rgba(8,12,12,0.98))]"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative overflow-hidden rounded-[1.1rem] border border-white/8 bg-black/30 sm:w-[240px] sm:min-w-[240px]">
          <div className="aspect-[16/10]">
            {tutorial.cover_image_url ? (
              <Image
                src={tutorial.cover_image_url}
                alt={tutorial.title}
                width={960}
                height={600}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                unoptimized
              />
            ) : (
              <CoverFallback title={tutorial.title} />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 py-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
            <span className="rounded-full border border-brand-500/18 bg-brand-500/10 px-2.5 py-1 text-brand-200">
              {TUTORIAL_DIFFICULTY_LABELS[tutorial.difficulty]}
            </span>
            <span>{authorHandle}</span>
            <span>{timeAgo(tutorial.created_at)}</span>
          </div>

          <h2 className="mt-3 max-w-3xl text-[1.45rem] font-semibold tracking-[-0.04em] text-text-primary transition-colors group-hover:text-white">
            {tutorial.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-text-secondary">
            {tutorial.excerpt || "Open the thread to read the full tutorial."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tutorial.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-xs text-text-secondary"
              >
                {formatTutorialTagLabel(tag)}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <Heart size={15} className="text-brand-300" />
              {formatCount(tutorial.like_count)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye size={15} />
              {formatCount(tutorial.view_count)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle size={15} />
              {formatCount(tutorial.comment_count)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
