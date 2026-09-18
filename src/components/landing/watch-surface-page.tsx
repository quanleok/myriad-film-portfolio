"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { VideoCard } from "@/components/video/video-card";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  WATCH_SURFACE_SORTS,
  deriveWatchSignals,
  formatWatchAiToolLabel,
  formatWatchSurfaceTabLabel,
  formatWatchTagLabel,
  type WatchSurfaceData,
  type WatchSurfaceFacetOption,
  type WatchSurfaceSort,
  type WatchSurfaceTab,
  type WatchSurfaceTabOption,
} from "@/lib/video-hub";
import { type VideoWithCreator } from "@/types/video";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface WatchSurfacePageProps {
  initialQuery: string;
  initialTab: WatchSurfaceTab;
  initialSort: WatchSurfaceSort;
  initialTag: string | null;
  initialAiTool: string | null;
  initialVideos: VideoWithCreator[];
  initialHasMore: boolean;
  initialNextOffset: number | null;
  initialTabs: WatchSurfaceTabOption[];
  initialPopularTags: WatchSurfaceFacetOption[];
  initialAiTools: WatchSurfaceFacetOption[];
}

function buildCardChips(video: VideoWithCreator) {
  const signals = deriveWatchSignals(video);
  const chips: Array<
    | { kind: "tab"; label: string; value: string }
    | { kind: "tool"; label: string; value: string }
    | { kind: "tag"; label: string; value: string }
  > = [];

  if (signals.lane) {
    chips.push({
      kind: "tab",
      label: formatWatchSurfaceTabLabel(signals.lane),
      value: signals.lane,
    });
  }

  const primaryTool = signals.toolTags[0];
  if (primaryTool) {
    chips.push({
      kind: "tool",
      label: formatWatchAiToolLabel(primaryTool),
      value: primaryTool,
    });
  }

  const primaryTag = signals.displayTags[0];
  if (primaryTag && chips.length < 3) {
    chips.push({
      kind: "tag",
      label: formatWatchTagLabel(primaryTag),
      value: primaryTag,
    });
  }

  return chips.slice(0, 3);
}

export function WatchSurfacePage({
  initialQuery,
  initialTab,
  initialSort,
  initialTag,
  initialAiTool,
  initialVideos,
  initialHasMore,
  initialNextOffset,
  initialTabs,
  initialPopularTags,
  initialAiTools,
}: WatchSurfacePageProps) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [query, setQuery] = useState(initialQuery);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [tab, setTab] = useState<WatchSurfaceTab>(initialTab);
  const [sort, setSort] = useState<WatchSurfaceSort>(initialSort);
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  const [selectedAiTool, setSelectedAiTool] = useState<string | null>(initialAiTool);
  const [videos, setVideos] = useState(initialVideos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [tabs, setTabs] = useState(initialTabs);
  const [popularTags, setPopularTags] = useState(initialPopularTags);
  const [aiTools, setAiTools] = useState(initialAiTools);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenVideoIds, setHiddenVideoIds] = useState<Set<string>>(() => new Set());
  const [motionReady, setMotionReady] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const initializedRef = useRef(false);

  const hasActiveFilters =
    query.trim().length > 0 ||
    tab !== "all" ||
    sort !== "newest" ||
    Boolean(selectedTag) ||
    Boolean(selectedAiTool);
  const showAmbientVideo = motionReady && !prefersReducedMotion;

  useEffect(() => {
    setMotionReady(true);
  }, []);

  const syncUrl = useCallback(
    (
      nextQuery: string,
      nextTab: WatchSurfaceTab,
      nextSort: WatchSurfaceSort,
      nextTag: string | null,
      nextAiTool: string | null
    ) => {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextTab !== "all") params.set("tab", nextTab);
      if (nextSort !== "newest") params.set("sort", nextSort);
      if (nextTag) params.set("tag", nextTag);
      if (nextAiTool) params.set("tool", nextAiTool);
      const next = params.toString();
      router.replace(next ? `/watch?${next}` : "/watch", { scroll: false });
    },
    [router]
  );

  const fetchVideos = useCallback(
    async ({
      replace,
      nextQuery,
      nextTab,
      nextSort,
      nextTag,
      nextAiTool,
      offset,
    }: {
      replace: boolean;
      nextQuery: string;
      nextTab: WatchSurfaceTab;
      nextSort: WatchSurfaceSort;
      nextTag: string | null;
      nextAiTool: string | null;
      offset: number;
    }) => {
      const requestId = ++requestIdRef.current;
      if (replace) {
        setLoadingInitial(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        if (nextQuery.trim()) params.set("q", nextQuery.trim());
        if (nextTab !== "all") params.set("tab", nextTab);
        if (nextSort !== "newest") params.set("sort", nextSort);
        if (nextTag) params.set("tag", nextTag);
        if (nextAiTool) params.set("tool", nextAiTool);
        params.set("offset", String(offset));
        params.set("limit", "20");

        const response = await fetch(`/api/video/public?${params.toString()}`);
        const payload = (await response.json()) as Partial<WatchSurfaceData> & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load clips");
        }

        if (requestId !== requestIdRef.current) return;

        if (replace) {
          setVideos(payload.videos ?? []);
          if (payload.tabs) setTabs(payload.tabs);
          if (payload.popularTags) setPopularTags(payload.popularTags);
          if (payload.aiTools) setAiTools(payload.aiTools);
        } else {
          setVideos((current) => {
            const map = new Map(current.map((video) => [video.id, video]));
            (payload.videos ?? []).forEach((video) => map.set(video.id, video));
            return Array.from(map.values());
          });
        }

        setHasMore(Boolean(payload.hasMore));
        setNextOffset(payload.nextOffset ?? null);
        setError(null);
      } catch (err) {
        if (replace) {
          setVideos([]);
        }
        setHasMore(false);
        setNextOffset(null);
        setError(err instanceof Error ? err.message : "Failed to load clips");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingInitial(false);
          setLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    syncUrl(query, tab, sort, selectedTag, selectedAiTool);
    fetchVideos({
      replace: true,
      nextQuery: query,
      nextTab: tab,
      nextSort: sort,
      nextTag: selectedTag,
      nextAiTool: selectedAiTool,
      offset: 0,
    });
  }, [fetchVideos, query, selectedAiTool, selectedTag, sort, syncUrl, tab]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loadingInitial &&
          nextOffset != null
        ) {
          fetchVideos({
            replace: false,
            nextQuery: query,
            nextTab: tab,
            nextSort: sort,
            nextTag: selectedTag,
            nextAiTool: selectedAiTool,
            offset: nextOffset,
          });
        }
      },
      { rootMargin: "320px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    fetchVideos,
    hasMore,
    loadingInitial,
    loadingMore,
    nextOffset,
    query,
    selectedAiTool,
    selectedTag,
    sort,
    tab,
  ]);

  const sortOptions = useMemo(
    () => WATCH_SURFACE_SORTS.map((item) => ({ value: item.value, label: item.label })),
    []
  );

  const aiToolOptions = useMemo(
    () => [
      { value: "", label: "All models" },
      ...aiTools.map((item) => ({ value: item.value, label: item.label })),
    ],
    [aiTools]
  );

  const gridVideos = useMemo(() => {
    return videos.filter((video) => !hiddenVideoIds.has(video.id));
  }, [hiddenVideoIds, videos]);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(draftQuery.trim());
  }

  function resetFilters() {
    setQuery("");
    setDraftQuery("");
    setTab("all");
    setSort("newest");
    setSelectedTag(null);
    setSelectedAiTool(null);
  }

  function hideVideo(videoId: string) {
    setHiddenVideoIds((current) => {
      const next = new Set(current);
      next.add(videoId);
      return next;
    });
  }

  function renderMetaChips(video: VideoWithCreator) {
    const chips = buildCardChips(video);
    if (chips.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2 px-1">
        {chips.map((chip) => {
          const active =
            (chip.kind === "tag" && selectedTag === chip.value) ||
            (chip.kind === "tool" && selectedAiTool === chip.value) ||
            (chip.kind === "tab" && tab === chip.value);

          return (
            <button
              key={`${video.id}-${chip.kind}-${chip.value}`}
              type="button"
              onClick={() => {
                if (chip.kind === "tag") {
                  setSelectedTag((current) => (current === chip.value ? null : chip.value));
                  return;
                }

                if (chip.kind === "tool") {
                  setSelectedAiTool((current) =>
                    current === chip.value ? null : chip.value
                  );
                  return;
                }

                setTab(chip.value);
              }}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-200 ${
                active
                  ? "border-[rgba(93,202,165,0.36)] bg-[rgba(10,38,27,0.84)] text-[#e8fff4] shadow-[0_10px_24px_rgba(0,232,123,0.1)]"
                  : "border-[rgba(93,202,165,0.12)] bg-[rgba(8,14,11,0.7)] text-[#9fb0a8] hover:border-[rgba(93,202,165,0.26)] hover:bg-[rgba(11,20,15,0.9)] hover:text-[#e8fff4]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-page text-text-primary">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {showAmbientVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="watch-ambient-video"
          >
            <source src="/watch-bg.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div className="watch-ambient-scrim" />
        <div className="watch-ambient-halo" />
        <div className="watch-ambient-vignette" />
        <div className="watch-ambient-floor" />
      </div>

      <div className="brand-halo-bg min-h-screen bg-[linear-gradient(180deg,rgba(5,10,8,0.14)_0%,rgba(7,10,9,0.58)_44%,rgba(7,10,9,0.9)_100%)]">
        <VideoHubHeader
          activeTab="watch"
          primaryHref="/upload"
          primaryLabel="Upload"
          primaryShortLabel="Upload"
          primaryIcon="upload"
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="relative rounded-[1.75rem] border border-[rgba(93,202,165,0.16)] bg-[linear-gradient(180deg,rgba(6,12,10,0.52),rgba(8,14,12,0.72))] p-5 shadow-[0_26px_72px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[18px] sm:p-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(78%_52%_at_50%_4%,rgba(0,232,123,0.18)_0%,rgba(7,15,11,0.03)_38%,transparent_74%)]"
            />
            <div className="relative flex flex-col gap-4 sm:gap-5">
              <h1 className="font-display text-xl font-semibold tracking-[-0.05em] text-[#f2faf5] sm:text-2xl">
                Watch clips
              </h1>

              <div className="flex gap-2 overflow-x-auto py-1">
                {tabs.map((item) => {
                  const active = tab === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTab(item.value)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                        active
                          ? "bg-[linear-gradient(135deg,rgba(9,33,22,0.92),rgba(16,74,46,0.84))] text-[#e6fff2] ring-1 ring-[rgba(93,202,165,0.32)] shadow-[0_0_24px_rgba(0,232,123,0.14)]"
                          : "bg-[rgba(9,14,11,0.7)] text-[#a8b8b1] hover:bg-[rgba(13,24,18,0.88)] hover:text-[#e6fff2]"
                      }`}
                      aria-pressed={active}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {popularTags.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8fb9a5]">
                    Popular tags
                  </p>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {popularTags.map((item) => {
                      const active = selectedTag === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() =>
                            setSelectedTag((current) =>
                              current === item.value ? null : item.value
                            )
                          }
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                            active
                              ? "border-[rgba(93,202,165,0.38)] bg-[rgba(10,38,27,0.78)] text-[#e8fff4] shadow-[0_12px_24px_rgba(0,232,123,0.1)]"
                              : "border-[rgba(93,202,165,0.12)] bg-[rgba(9,14,11,0.68)] text-[#a8b8b1] hover:border-[rgba(93,202,165,0.26)] hover:bg-[rgba(11,20,15,0.86)] hover:text-[#e8fff4]"
                          }`}
                          aria-pressed={active}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                  />
                  <Input
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="Search clips, creators, tags, or models"
                    className="!h-12 !rounded-[1rem] !border-[rgba(93,202,165,0.16)] !bg-[rgba(8,15,12,0.82)] pl-9 !text-[#f2faf5] placeholder:!text-[#81958b] focus:!border-[rgba(93,202,165,0.4)] focus:!bg-[rgba(10,20,15,0.94)] focus:!ring-[rgba(0,232,123,0.16)]"
                    aria-label="Search clips"
                  />
                </form>

                <Select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as WatchSurfaceSort)}
                  options={sortOptions}
                  className="!h-12 min-w-[200px] appearance-none !rounded-[1rem] !border-[rgba(93,202,165,0.16)] !bg-[rgba(8,15,12,0.82)] !text-[#f2faf5] focus:!border-[rgba(93,202,165,0.4)] focus:!bg-[rgba(10,20,15,0.94)] focus:!ring-[rgba(0,232,123,0.16)]"
                  aria-label="Sort clips"
                />

                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetFilters}
                    className="h-12 shrink-0 border-[rgba(93,202,165,0.18)] bg-[rgba(8,14,11,0.78)] text-[#d7f7e8] hover:border-[rgba(93,202,165,0.34)] hover:bg-[rgba(10,21,15,0.94)]"
                  >
                    Reset
                  </Button>
                ) : null}
              </div>

              {aiTools.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8fb9a5]">
                    Model filter
                  </p>
                  <Select
                    value={selectedAiTool ?? ""}
                    onChange={(event) => setSelectedAiTool(event.target.value || null)}
                    options={aiToolOptions}
                    className="!h-12 max-w-xs appearance-none !rounded-[1rem] !border-[rgba(93,202,165,0.16)] !bg-[rgba(8,15,12,0.82)] !text-[#f2faf5] focus:!border-[rgba(93,202,165,0.4)] focus:!bg-[rgba(10,20,15,0.94)] focus:!ring-[rgba(0,232,123,0.16)]"
                    aria-label="Filter by AI model"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-text-secondary">
                  {loadingInitial
                    ? "Refreshing clips…"
                    : `${gridVideos.length} clip${gridVideos.length === 1 ? "" : "s"}`}
                </p>
                {selectedTag ? (
                  <span className="rounded-full border border-[rgba(93,202,165,0.24)] bg-[rgba(10,38,27,0.7)] px-3 py-1 text-[11px] font-medium text-[#e8fff4]">
                    Tag: {formatWatchTagLabel(selectedTag)}
                  </span>
                ) : null}
                {selectedAiTool ? (
                  <span className="rounded-full border border-[rgba(93,202,165,0.24)] bg-[rgba(10,38,27,0.7)] px-3 py-1 text-[11px] font-medium text-[#e8fff4]">
                    Model: {formatWatchAiToolLabel(selectedAiTool)}
                  </span>
                ) : null}
              </div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">
                {tabs.find((item) => item.value === tab)?.label ??
                  formatWatchSurfaceTabLabel(tab)}
              </p>
            </div>

            {loadingInitial ? (
              <div className="flex justify-center py-20">
                <Loader2 size={24} className="animate-spin text-text-tertiary" />
              </div>
            ) : gridVideos.length === 0 ? (
              <div className="rounded-[1.35rem] border border-[rgba(93,202,165,0.16)] bg-[rgba(8,14,11,0.74)] px-6 py-8 text-center backdrop-blur-xl">
                <p className="text-sm text-text-secondary">
                  No clips match the current filters.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button type="button" variant="secondary" onClick={resetFilters}>
                    Reset filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {gridVideos.map((video) => (
                  <div key={video.id} className="space-y-1">
                    <VideoCard
                      video={video}
                      variant="watch"
                      onHide={() => hideVideo(video.id)}
                    />
                    {renderMetaChips(video)}
                  </div>
                ))}
              </div>
            )}

            {error ? <p className="mt-5 text-sm text-role-danger-fg">{error}</p> : null}

            {loadingMore ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-text-tertiary" />
              </div>
            ) : null}

            <div ref={sentinelRef} className="h-1" />
          </section>
        </main>
      </div>
    </div>
  );
}
