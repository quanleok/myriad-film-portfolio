"use client";

import { useRef } from "react";
import { getCardMediaUrl, getProjectTeaserUrl, formatProjectGenre, formatProjectFormat, formatProjectTone } from "@/components/projects/utils";
import { TeaserPlayer, type TeaserPlayerHandle } from "@/components/projects/teaser-player";

export type SlideType = "teaser" | "character" | "concept" | "story" | "creator";

export interface CinemaSlide {
  type: SlideType;
  key: string;
  label: string;
  mediaAssetId: string | null;
  mediaType: "image" | "video" | null;
  thumbnailUrl: string | null;
  characterName?: string;
  characterDescription?: string;
  conceptCaption?: string;
  synopsis?: string;
  genre?: string;
  tone?: string;
  format?: string;
  runtimeMinutes?: number;
  inspirationLine?: string;
  creatorName?: string;
  creatorBio?: string;
  creatorAvatarUrl?: string;
}

interface CinemaMediaAreaProps {
  slide: CinemaSlide;
  teaserAssetId: string | null;
  teaserThumbnailUrl: string | null;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function CinemaMediaArea({
  slide,
  teaserAssetId,
  teaserThumbnailUrl,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: CinemaMediaAreaProps) {
  const playerRef = useRef<TeaserPlayerHandle>(null);

  // Resolve media URL
  const mediaUrl =
    slide.type === "teaser"
      ? getProjectTeaserUrl(teaserAssetId)
      : getCardMediaUrl(slide.mediaAssetId, slide.mediaType);

  const hasMedia = Boolean(mediaUrl);
  const isVideo = slide.type === "teaser" || slide.mediaType === "video";

  return (
    <div
      className="relative h-full w-full select-none overflow-hidden bg-black"
    >
      {/* === Video slides — use TeaserPlayer with full controls === */}
      {hasMedia && isVideo ? (
        <TeaserPlayer
          ref={playerRef}
          key={slide.key}
          src={mediaUrl!}
          poster={teaserThumbnailUrl}
          fit="contain"
          loop
        />
      ) : hasMedia && !isVideo ? (
        /* Image slides — click left/right to navigate */
        <div
          className="relative h-full w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) {
              if (hasPrev) onPrev();
            } else {
              if (hasNext) onNext();
            }
          }}
        >
          <img
            key={slide.key}
            src={mediaUrl!}
            alt={slide.label}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      ) : null}

      {/* === Text-only slides: blurred teaser bg + content overlay === */}
      {!hasMedia ? (
        <div
          className="relative h-full w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x < rect.width / 2) {
              if (hasPrev) onPrev();
            } else {
              if (hasNext) onNext();
            }
          }}
        >
          {/* Blurred background */}
          {teaserThumbnailUrl ? (
            <>
              <img
                src={teaserThumbnailUrl}
                alt=""
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
              />
              <div className="absolute inset-0 bg-black/65" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
          )}

          {/* Text content */}
          <div className="relative z-10 flex h-full w-full items-center justify-center p-8">
            <div className="max-w-lg space-y-4 text-center">
              {slide.type === "character" ? (
                <>
                  <h3 className="text-3xl font-bold text-white">{slide.characterName}</h3>
                  {slide.characterDescription ? (
                    <p className="text-lg leading-relaxed text-white/85">{slide.characterDescription}</p>
                  ) : null}
                </>
              ) : null}

              {slide.type === "concept" && slide.conceptCaption ? (
                <p className="text-xl leading-relaxed text-white/90">{slide.conceptCaption}</p>
              ) : null}

              {slide.type === "story" ? (
                <>
                  {slide.synopsis ? (
                    <p className="text-lg leading-relaxed text-white/90">{slide.synopsis}</p>
                  ) : null}
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {slide.genre ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                        {formatProjectGenre(slide.genre)}
                      </span>
                    ) : null}
                    {slide.tone ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                        {formatProjectTone(slide.tone)}
                      </span>
                    ) : null}
                    {slide.format ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
                        {formatProjectFormat(slide.format)}
                      </span>
                    ) : null}
                  </div>
                  {slide.runtimeMinutes ? (
                    <p className="text-sm text-white/60">{slide.runtimeMinutes} min</p>
                  ) : null}
                  {slide.inspirationLine ? (
                    <p className="text-base italic text-white/50">&ldquo;{slide.inspirationLine}&rdquo;</p>
                  ) : null}
                </>
              ) : null}

              {slide.type === "creator" ? (
                <>
                  {slide.creatorAvatarUrl ? (
                    <img
                      src={slide.creatorAvatarUrl}
                      alt={slide.creatorName ?? ""}
                      className="mx-auto h-20 w-20 rounded-full border-2 border-white/30 object-cover"
                    />
                  ) : null}
                  <h3 className="text-2xl font-bold text-white">{slide.creatorName ?? "Unknown Creator"}</h3>
                  {slide.creatorBio ? (
                    <p className="text-base leading-relaxed text-white/80">{slide.creatorBio}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Navigation arrows for non-video slides */}
      {!isVideo && (hasPrev || hasNext) ? (
        <>
          {hasPrev ? (
            <div className="absolute inset-y-0 left-0 w-1/2" style={{ cursor: "w-resize" }} />
          ) : null}
          {hasNext ? (
            <div className="absolute inset-y-0 right-0 w-1/2" style={{ cursor: "e-resize" }} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
