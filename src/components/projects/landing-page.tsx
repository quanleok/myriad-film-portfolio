"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clapperboard,
  Menu,
  Play,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { TrendingCarousel } from "@/components/landing/trending-carousel";
import { sanitizeProjectText } from "@/components/projects/display";
import type { ProjectFeedItem } from "@/components/projects/types";
import { SpringLogo } from "@/components/ui/spring-logo";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice, cn } from "@/lib/utils";

interface LandingPageProps {
  featuredProjects: ProjectFeedItem[];
  stats: {
    unlockingCount: number;
    premieringCount: number;
    totalBackers: number;
    fundedCount: number;
    creatorCount: number;
  };
}

const STEPS = [
  {
    icon: Clapperboard,
    title: "Discover",
    body: "See the pitch, world, and signal first.",
  },
  {
    icon: ShoppingBag,
    title: "Preorder",
    body: "Back early and decide what gets made.",
  },
  {
    icon: Play,
    title: "Premiere",
    body: "Supporters watch first when it goes live.",
  },
] as const;

export function LandingPage({ featuredProjects, stats }: LandingPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const heroPool = useMemo(
    () => featuredProjects.filter((project) => project.teaser_thumbnail_url),
    [featuredProjects]
  );
  const heroProject = heroPool[0] ?? featuredProjects[0] ?? null;
  const featuredStrip = featuredProjects.slice(0, 3);
  const trendingProjects = useMemo(
    () =>
      [...featuredProjects]
        .sort((a, b) => b.preorder_count_cache - a.preorder_count_cache)
        .slice(0, 12),
    [featuredProjects]
  );

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#030605] text-white">
      <header className="sticky top-0 z-50 border-b border-emerald-950/80 bg-[#030605]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3 text-white">
            <SpringLogo className="h-5 w-5 text-emerald-400" glowing />
            <span className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-white/86">
              Myriad Spring
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-white/68 md:flex">
            <Link href="/explore" className="transition-colors hover:text-white">
              Explore
            </Link>
            <Link href="/browse" className="transition-colors hover:text-white">
              Browse
            </Link>
            <Link href="/premieres" className="transition-colors hover:text-white">
              Premieres
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {!authLoading && !user ? (
              <Link href="/login" className="text-sm text-white/68 transition-colors hover:text-white">
                Sign in
              </Link>
            ) : !authLoading && user ? (
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-[#021107] transition-colors hover:bg-emerald-400"
              >
                Projects
                <ArrowRight size={14} />
              </Link>
            ) : null}
          </div>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-950 bg-[#09110d] text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-emerald-950/80 bg-[#050907] px-6 py-4 md:hidden">
            <nav className="flex flex-col gap-3 text-sm text-white/72">
              <Link href="/explore" onClick={() => setMobileMenuOpen(false)}>
                Explore
              </Link>
              <Link href="/browse" onClick={() => setMobileMenuOpen(false)}>
                Browse
              </Link>
              <Link href="/premieres" onClick={() => setMobileMenuOpen(false)}>
                Premieres
              </Link>
              <div className="mt-2 flex flex-col gap-2 border-t border-emerald-950/80 pt-3">
                {!authLoading && !user ? (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                ) : !authLoading && user ? (
                  <Link
                    href="/projects"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2.5 font-semibold text-[#021107]"
                  >
                    Projects
                  </Link>
                ) : null}
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        <section className="border-b border-emerald-950/80 bg-[#030605]">
          <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_380px]">
              <div className="rounded-[32px] border border-emerald-950/80 bg-[#07110d] p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0b1a13] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  <Sparkles size={12} />
                  AI film preorder platform
                </div>

                <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.8rem,6vw,5.6rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-white">
                  Back films before they exist.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                  Discover live projects, preorder early, and return when they premiere.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#021107] transition-colors hover:bg-emerald-400"
                  >
                    Explore
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-2 rounded-full bg-[#101913] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#142018]"
                  >
                    Browse
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <StatCell value={stats.unlockingCount} label="Unlocking" />
                  <StatCell value={stats.premieringCount} label="Premiering" />
                  <StatCell value={stats.totalBackers.toLocaleString()} label="Preorders" />
                </div>
              </div>

              {heroProject ? (
                <SpotlightCard project={heroProject} />
              ) : (
                <div className="rounded-[32px] border border-emerald-950/80 bg-[#07110d] p-6">
                  <div className="flex h-full min-h-[420px] flex-col justify-between rounded-[24px] bg-[#0b120f] p-6">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                        Live now
                      </p>
                      <p className="mt-4 text-2xl font-semibold text-white">
                        The next wave is loading.
                      </p>
                    </div>
                    <p className="max-w-sm text-sm leading-7 text-white/56">
                      The first set of live project pages will land here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-950/80 bg-[#060d09] px-4 py-4"
                  >
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0d1c15] text-emerald-300">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/58">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-emerald-950/80 bg-[#030605]">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  Live projects
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Open now.
                </h2>
              </div>
              <Link
                href="/browse"
                className="hidden text-sm font-medium text-white/62 transition-colors hover:text-white sm:inline-flex"
              >
                Browse all
              </Link>
            </div>

            {featuredStrip.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-emerald-950 bg-[#07110d] px-8 py-16 text-center">
                <p className="text-lg font-medium text-white">No live projects yet.</p>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
                {featuredStrip.map((project, index) => (
                  <LandingProjectPreview key={project.id} project={project} isHero={index === 0} />
                ))}
              </div>
            )}
          </div>
        </section>

        {trendingProjects.length > 0 ? (
          <section className="bg-[#030605] py-8">
            <TrendingCarousel
              projects={trendingProjects}
              title="Momentum"
              subtitle="Projects pulling signal right now."
            />
          </section>
        ) : null}
      </main>

      <footer className="border-t border-emerald-950/80 bg-[#030605] py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SpringLogo className="h-4 w-4 text-emerald-400" />
            <span>Myriad Spring</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/about" className="transition-colors hover:text-white/72">
              About
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white/72">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white/72">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-[#0a1410] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SpotlightCard({ project }: { project: ProjectFeedItem }) {
  const href = `/project/${project.slug ?? project.id}`;
  const creatorName =
    sanitizeProjectText(
      project.profiles?.display_name ??
        project.profiles?.username ??
        "Unknown creator"
    ) || "Unknown creator";
  const progress =
    project.unlock_target && project.unlock_target > 0
      ? Math.min(100, Math.round((project.preorder_count_cache / project.unlock_target) * 100))
      : null;

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[32px] border border-emerald-950/80 bg-[#07110d] transition-colors hover:border-emerald-900"
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#0c1511]">
        {project.teaser_thumbnail_url ? (
          <img
            src={project.teaser_thumbnail_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-end bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.24),_transparent_34%),linear-gradient(180deg,#0b1511_0%,#07100c_100%)] p-6">
            <p className="max-w-xs text-xl font-semibold tracking-tight text-white">
              {sanitizeProjectText(project.title)}
            </p>
          </div>
        )}
      </div>
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[#021107]">
            {project.lifecycle_status.replaceAll("_", " ")}
          </span>
          {project.genre ? (
            <span className="rounded-full bg-[#101913] px-3 py-1 text-white/66">
              {project.genre.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/42">
            Spotlight
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {sanitizeProjectText(project.title)}
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/62">
            {sanitizeProjectText(
              project.hook ??
                project.synopsis ??
                "A live AI film project building demand before release."
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Creator" value={creatorName} />
          <Metric
            label="Entry"
            value={
              project.preorder_price_cents != null
                ? `Preorder ${formatPrice(project.preorder_price_cents)}`
                : "Open project"
            }
          />
        </div>

        {progress != null ? (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-[#0e1914]">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-white/48">
              <span>{project.preorder_count_cache.toLocaleString()} preorders</span>
              <span>{progress}%</span>
            </div>
          </div>
        ) : null}

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
          Open project
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#0a1410] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function LandingProjectPreview({
  project,
  isHero = false,
}: {
  project: ProjectFeedItem;
  isHero?: boolean;
}) {
  const href = `/project/${project.slug ?? project.id}`;
  const creatorName =
    sanitizeProjectText(
      project.profiles?.display_name ??
        project.profiles?.username ??
        "Unknown creator"
    ) || "Unknown creator";

  return (
    <Link
      href={href}
      className={cn(
        "group overflow-hidden rounded-[28px] border border-emerald-950/80 bg-[#07110d] transition-colors hover:border-emerald-900",
        isHero ? "xl:row-span-2" : ""
      )}
    >
      <div className={cn("overflow-hidden bg-[#0b1511]", isHero ? "aspect-[4/3]" : "aspect-video")}>
        {project.teaser_thumbnail_url ? (
          <img
            src={project.teaser_thumbnail_url}
            alt={project.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-end bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.24),_transparent_34%),linear-gradient(180deg,#0b1511_0%,#07100c_100%)] p-5">
            <p className="text-lg font-semibold text-white">
              {sanitizeProjectText(project.title)}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
          <span className="text-emerald-300">{creatorName}</span>
          {project.genre ? <span className="text-white/34">· {project.genre.replaceAll("_", " ")}</span> : null}
          <span className="text-white/34">· {project.lifecycle_status.replaceAll("_", " ")}</span>
        </div>

        <h3 className={cn("font-display font-semibold tracking-tight text-white", isHero ? "text-3xl" : "text-xl")}>
          {sanitizeProjectText(project.title)}
        </h3>

        <p className={cn("line-clamp-2 text-white/60", isHero ? "text-base leading-7" : "text-sm leading-6")}>
          {sanitizeProjectText(
            project.hook ??
              project.synopsis ??
              "A live AI film project building momentum on Myriad."
          )}
        </p>

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
          Open
          <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}
