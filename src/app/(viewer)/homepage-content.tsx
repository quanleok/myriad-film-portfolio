"use client";

import { TrendingGrid } from "@/components/browse/trending-grid";
import { ContentRow } from "@/components/browse/content-row";
import { TopCreatorsRow, type TopCreatorCardData } from "@/components/browse/top-creators-row";
import { SeriesRow, type SeriesCardData } from "@/components/browse/series-row";
import { PremiumRow } from "@/components/browse/premium-row";
import { EmptyState } from "@/components/ui/empty-state";
import { GlobalPresenceBanner } from "@/components/presence/GlobalPresenceBanner";
import { UpcomingPremieres } from "@/components/premiere/upcoming-premieres";
import {
  Play,
  Users,
  Star,
  Clock,
  Film,
  Sparkles,
  Clapperboard,
  Laugh,
  Sprout,
} from "lucide-react";
import type { VideoWithCreator } from "@/types/video";

interface HomepageContentProps {
  trending: VideoWithCreator[];
  newReleases: VideoWithCreator[];
  featured: VideoWithCreator[];
  continueWatching?: VideoWithCreator[];
  continueWatchingProgress?: Record<string, number>;
  newFromFollowed?: VideoWithCreator[];
  showcaseVideos?: VideoWithCreator[];
  topCreators?: TopCreatorCardData[];
  seriesData?: SeriesCardData[];
  premiumVideos?: VideoWithCreator[];
  fullLengthFilms?: VideoWithCreator[];
  justUploaded?: VideoWithCreator[];
  movieVideos?: VideoWithCreator[];
  memeVideos?: VideoWithCreator[];
  premiereVideos?: VideoWithCreator[];
  shortFilmVideos?: VideoWithCreator[];
  seedanceVideos?: VideoWithCreator[];
  communityPickVideos?: VideoWithCreator[];
  isLoggedIn?: boolean;
}

export function HomepageContent({
  trending,
  newReleases,
  featured,
  continueWatching = [],
  continueWatchingProgress = {},
  newFromFollowed = [],
  showcaseVideos = [],
  topCreators = [],
  seriesData = [],
  premiumVideos = [],
  fullLengthFilms = [],
  justUploaded = [],
  movieVideos = [],
  memeVideos = [],
  premiereVideos = [],
  shortFilmVideos = [],
  seedanceVideos = [],
  communityPickVideos = [],
  isLoggedIn = false,
}: HomepageContentProps) {
  return (
    <div className="mx-auto max-w-[1600px] overflow-x-hidden px-4 pb-8 space-y-8 lg:px-6 stagger-children">
      {/* Hero headline for logged-out visitors */}
      {!isLoggedIn && (
        <div className="pt-2 pb-2">
          <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
            Explore AI films before they are made
          </h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Watch concepts. Meet the characters. Preorder the ones you want made. Creators keep 80%.
          </p>
        </div>
      )}

      {/* 1. Featured — hero grid */}
      {featured.length > 0 ? (
        <TrendingGrid videos={featured.slice(0, 6)} title="Featured" href="/community" />
      ) : trending.length > 0 ? (
        <TrendingGrid videos={trending.slice(0, 6)} title="Trending Now" href="/browse?sort=trending" />
      ) : null}

      <GlobalPresenceBanner />

      {/* 2. Premieres */}
      {premiereVideos.length > 0 && (
        <UpcomingPremieres
          videos={premiereVideos.map((v) => ({
            id: v.id,
            title: v.title,
            thumbnail_url: v.thumbnail_url,
            premiere_at: v.premiere_at ?? "",
          }))}
        />
      )}

      {/* 3. Continue Watching (logged in only) */}
      {continueWatching.length > 0 && (
        <ContentRow
          title="Continue Watching"
          icon={<Play size={18} />}
          videos={continueWatching}
          progressMap={continueWatchingProgress}
        />
      )}

      {/* 4. New from Followed Creators (logged in only) */}
      {newFromFollowed.length > 0 && (
        <ContentRow
          title="New from Creators You Follow"
          icon={<Users size={18} />}
          videos={newFromFollowed}
        />
      )}

      {/* 5. Seedance 2 */}
      {seedanceVideos.length > 0 && (
        <ContentRow
          title="Seedance 2"
          icon={<Sprout size={18} />}
          videos={seedanceVideos}
          seeAllHref="/seedance"
        />
      )}

      {/* 6. Showcase */}
      {showcaseVideos.length > 0 && (
        <ContentRow
          title="Showcase"
          icon={<Sparkles size={18} />}
          videos={showcaseVideos}
          seeAllHref="/community?tab=showcase"
        />
      )}

      {/* 7. Meme Videos */}
      {memeVideos.length > 0 && (
        <ContentRow
          title="Meme"
          icon={<Laugh size={18} />}
          videos={memeVideos}
          seeAllHref="/community?tab=meme"
        />
      )}

      {/* 8. Community Picks */}
      {communityPickVideos.length > 0 && (
        <ContentRow
          title="Community Picks"
          icon={<Sparkles size={18} />}
          videos={communityPickVideos}
          seeAllHref="/community"
        />
      )}

      {/* 9. Just Uploaded */}
      {justUploaded.length > 0 && (
        <ContentRow
          title="Just Uploaded"
          icon={<Clock size={18} />}
          videos={justUploaded}
          seeAllHref="/browse?sort=newest"
        />
      )}

      {/* 10. New This Week */}
      {newReleases.length > 0 && (
        <ContentRow
          title="New This Week"
          icon={<Clock size={18} />}
          videos={newReleases}
          seeAllHref="/browse?sort=newest"
        />
      )}

      {/* 11. Trending */}
      {trending.length > 0 && featured.length > 0 && (
        <ContentRow
          title="Trending"
          icon={<Star size={18} />}
          videos={trending}
          seeAllHref="/browse?sort=trending"
        />
      )}

      {/* 12. Top Creators */}
      {topCreators.length > 0 && (
        <TopCreatorsRow creators={topCreators} />
      )}

      {/* --- Originals sections (will show once original content exists) --- */}

      {/* Series to Binge */}
      {seriesData.length > 0 && (
        <SeriesRow series={seriesData} title="Series to Binge" seeAllHref="/browse?format=series" />
      )}

      {/* Short Films */}
      {shortFilmVideos.length > 0 && (
        <ContentRow
          title="Short Films"
          icon={<Film size={18} />}
          videos={shortFilmVideos}
          seeAllHref="/browse?format=short_film"
        />
      )}

      {/* Full Length Films */}
      {fullLengthFilms.length > 0 && (
        <ContentRow
          title="Full Length Films"
          icon={<Film size={18} />}
          videos={fullLengthFilms}
          seeAllHref="/browse?format=movie"
        />
      )}

      {/* Movies */}
      {movieVideos.length > 0 && (
        <ContentRow
          title="Movies"
          icon={<Clapperboard size={18} />}
          videos={movieVideos}
          seeAllHref="/browse?format=movie"
        />
      )}

      {/* Premium */}
      {premiumVideos.length > 0 && (
        <PremiumRow videos={premiumVideos} />
      )}

      {/* Empty state */}
      {trending.length === 0 && newReleases.length === 0 && (
        <EmptyState
          title="No content yet"
          description="Be the first creator to upload!"
          actionLabel="Upload"
          actionHref="/upload"
        />
      )}
    </div>
  );
}
