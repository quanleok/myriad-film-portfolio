"use client";

import {
  formatProjectGenre,
  formatProjectFormat,
  formatProjectTone,
} from "@/components/projects/utils";

interface FeedSlideStoryProps {
  synopsis: string | null;
  genre: string | null;
  tone: string | null;
  format: string | null;
  runtimeMinutes: number | null;
  inspirationLine: string | null;
  thumbnailUrl: string | null;
}

export function FeedSlideStory({
  synopsis,
  genre,
  tone,
  format,
  runtimeMinutes,
  inspirationLine,
  thumbnailUrl,
}: FeedSlideStoryProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Ambient background */}
      {thumbnailUrl ? (
        <>
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
          />
          <div className="absolute inset-0 bg-black/70" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
      )}

      {/* Content — centered, above the fixed overlay */}
      <div className="relative z-10 max-w-md px-6 pb-[240px]">
        {/* Synopsis */}
        {synopsis ? (
          <div className="max-h-[40vh] overflow-y-auto scrollbar-none">
            <p className="text-base leading-relaxed text-white/90">{synopsis}</p>
          </div>
        ) : (
          <p className="text-base italic text-white/50">No synopsis available yet.</p>
        )}

        {/* Meta pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {genre ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {formatProjectGenre(genre)}
            </span>
          ) : null}
          {tone ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {formatProjectTone(tone)}
            </span>
          ) : null}
          {format ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
              {formatProjectFormat(format)}
            </span>
          ) : null}
        </div>

        {/* Runtime */}
        {runtimeMinutes ? (
          <p className="mt-3 text-sm text-white/60">
            {runtimeMinutes} min{format ? ` · ${formatProjectFormat(format)}` : ""}
          </p>
        ) : null}

        {/* Inspiration line */}
        {inspirationLine ? (
          <p className="mt-4 text-sm italic text-white/50">
            &ldquo;{inspirationLine}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  );
}
