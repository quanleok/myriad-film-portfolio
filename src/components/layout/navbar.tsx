"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useSidebar } from "@/components/layout/sidebar";
import { createClient } from "@/lib/supabase/client";
import { Search, X, Menu, PanelLeftClose, PanelLeft, Clock, Flame, Film } from "lucide-react";
import { SpringLogo } from "@/components/ui/spring-logo";

// ---- Types ----
interface SearchCreator {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
}

interface SearchVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  view_count: number;
  creator_name: string;
}

const TRENDING_TERMS = ["AI films", "sci-fi", "preorder", "new projects", "animation"];

export function Navbar() {
  const { user, profile, loading, isCreator, isAdmin } = useAuth();
  const { collapsed, pinned, setPinned, mobileOpen, setMobileOpen } = useSidebar();
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();
  // Avatar dropdown
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // mobile overlay
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchCreators, setSearchCreators] = useState<SearchCreator[]>([]);
  const [searchVideos, setSearchVideos] = useState<SearchVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("myriad-recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    if (avatarOpen) document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [avatarOpen]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    if (searchFocused) document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [searchFocused]);

  // Focus mobile search input
  useEffect(() => {
    if (searchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchCreators([]);
        setSearchVideos([]);
        return;
      }
      setIsSearching(true);
      try {
        const q = query.trim().replace(/[%_\\(),."']/g, "");
        if (!q) {
          setSearchCreators([]);
          setSearchVideos([]);
          return;
        }
        const [creatorsRes, videosRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, follower_count")
            .eq("is_creator", true)
            .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
            .order("follower_count", { ascending: false })
            .limit(3),
          supabase
            .from("videos")
            .select(
              `id, title, thumbnail_url, view_count,
              profiles!videos_creator_id_fkey ( display_name )`
            )
            .eq("is_published", true)
            .ilike("title", `%${q}%`)
            .order("view_count", { ascending: false })
            .limit(5),
        ]);

        setSearchCreators((creatorsRes.data ?? []) as SearchCreator[]);
        setSearchVideos(
          (videosRes.data ?? []).map((v: any) => ({
            id: v.id,
            title: v.title,
            thumbnail_url: v.thumbnail_url,
            view_count: v.view_count,
            creator_name: v.profiles?.display_name ?? "Unknown",
          }))
        );
      } catch {
        setSearchCreators([]);
        setSearchVideos([]);
      }
      setIsSearching(false);
    },
    [supabase]
  );

  function handleQueryChange(value: string) {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  }

  function saveRecentSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("myriad-recent-searches", JSON.stringify(updated));
  }

  function removeRecentSearch(term: string) {
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    localStorage.setItem("myriad-recent-searches", JSON.stringify(updated));
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
      setSearchOpen(false);
      setSearchQuery("");
      setSearchCreators([]);
      setSearchVideos([]);
    }
  }

  function navigateSearch(term: string) {
    saveRecentSearch(term);
    router.push(`/browse?q=${encodeURIComponent(term)}`);
    setSearchFocused(false);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchCreators([]);
    setSearchVideos([]);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAvatarOpen(false);
    router.push("/");
    router.refresh();
  }

  function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  // Track scroll for glass morphism effect
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Show dropdown when focused
  const showDropdown = searchFocused && (searchQuery.trim().length > 0 || recentSearches.length > 0);

  // ---- Search dropdown content ----
  const searchDropdownContent = (
    <div className="max-h-[400px] overflow-y-auto">
      {searchQuery.trim().length === 0 ? (
        <>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="p-3">
              <p className="mb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">Recent Searches</p>
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <button
                    onClick={() => navigateSearch(term)}
                    className="flex items-center gap-2 text-sm text-text-primary flex-1 text-left"
                  >
                    <Clock size={14} className="shrink-0 text-text-tertiary" />
                    {term}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecentSearch(term);
                    }}
                    className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                    aria-label={`Remove ${term}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Trending */}
          <div className="border-t border-border p-3">
            <p className="mb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">Trending</p>
            {TRENDING_TERMS.map((term) => (
              <button
                key={term}
                onClick={() => navigateSearch(term)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover transition-colors text-left"
              >
                <Flame size={14} className="shrink-0 text-accent-trending" />
                {term}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-text-tertiary border-t-text-primary" />
            </div>
          )}

          {!isSearching && (
            <>
              {/* Creator results */}
              {searchCreators.length > 0 && (
                <div className="p-3">
                  <p className="mb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">Creators</p>
                  {searchCreators.map((creator) => (
                    <Link
                      key={creator.id}
                      href={`/creator/${creator.username}`}
                      onClick={() => {
                        setSearchFocused(false);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover transition-colors"
                    >
                      {creator.avatar_url ? (
                        <img
                          src={creator.avatar_url}
                          alt={creator.display_name}
                          className="h-8 w-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-role-bg-surface-active text-xs font-medium text-role-fg-primary">
                          {creator.display_name[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{creator.display_name}</p>
                        <p className="text-xs text-text-tertiary">{formatCount(creator.follower_count)} followers</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Video results */}
              {searchVideos.length > 0 && (
                <div className="border-t border-border p-3">
                  <p className="mb-2 text-xs font-medium text-text-tertiary uppercase tracking-wider">Videos</p>
                  {searchVideos.map((video) => (
                    <Link
                      key={video.id}
                      href={`/watch/${video.id}`}
                      onClick={() => {
                        setSearchFocused(false);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-hover transition-colors"
                    >
                      <div className="h-[45px] w-[80px] shrink-0 overflow-hidden rounded bg-surface-hover">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Film size={16} className="text-text-tertiary" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary line-clamp-1">{video.title}</p>
                        <p className="text-xs text-text-tertiary">
                          {video.creator_name} · {formatCount(video.view_count)} views
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* No results */}
              {searchCreators.length === 0 && searchVideos.length === 0 && searchQuery.trim().length > 0 && (
                <div className="py-8 text-center text-sm text-text-tertiary">
                  No results for &ldquo;{searchQuery}&rdquo;
                </div>
              )}

              {/* See all results */}
              {searchQuery.trim().length > 0 && (
                <div className="border-t border-border p-2">
                  <button
                    onClick={() => navigateSearch(searchQuery)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-text-primary font-medium hover:bg-surface-hover transition-colors"
                  >
                    <Search size={14} />
                    See all results for &ldquo;{searchQuery}&rdquo;
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  const homeActive = pathname === "/";

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={`brand-edge-line shell-chrome sticky top-0 z-40 h-14 transition-all duration-300 ${
          scrolled
            ? "border-b border-border/90 backdrop-blur-xl shadow-[0_1px_0_var(--role-border-subtle),0_10px_28px_-22px_var(--role-overlay-strong)]"
            : "border-b border-transparent backdrop-blur-sm"
        }`}
        style={{ backgroundColor: scrolled ? 'color-mix(in srgb, var(--page) 90%, transparent)' : 'color-mix(in srgb, var(--page) 60%, transparent)' }}
      >
        <div className="shell-divider flex h-full items-center justify-between gap-4 px-4">
          {/* Left: Hamburger (mobile) + Collapse toggle (desktop) + Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="nav-icon-btn flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-text-primary lg:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setPinned(!pinned)}
              className="nav-icon-btn hidden h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-text-primary lg:flex"
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            >
              {pinned ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>

            <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-text-primary tracking-tight">
              <SpringLogo className="h-5 w-5" />
              <span>Myriad Spring</span>
            </Link>

            <Link
              href="/"
              aria-current={homeActive ? "page" : undefined}
              className={`hidden items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all md:inline-flex ${
                homeActive
                  ? "bg-green-500/10 text-green-300 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.18)]"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              Home
            </Link>

          </div>

          {/* Center: Search bar (desktop) */}
          <div ref={searchRef} className={`relative hidden md:block transition-all duration-300 ease-out ${searchFocused ? "max-w-lg flex-[1.5]" : "max-w-md flex-1"}`}>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchFocused(false);
                      searchInputRef.current?.blur();
                    }
                  }}
                  placeholder='Search projects, creators...  Press "/"'
                  aria-label="Search projects and creators"
                  className={`nav-input h-9 w-full rounded-full border bg-surface pl-10 pr-9 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-300 focus:outline-none ${
                    searchFocused
                      ? "border-role-border-strong ring-1 ring-[var(--role-cta-ring)] shadow-[0_0_16px_var(--role-glow-soft)]"
                      : "border-border focus:border-border"
                  }`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchCreators([]);
                      setSearchVideos([]);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Search dropdown */}
            {showDropdown && (
              <div className="nav-popover surface-edge-glow absolute left-0 right-0 top-11 z-[45] origin-top animate-scale-in overflow-hidden rounded-xl border border-border bg-page-secondary backdrop-blur-xl shadow-2xl">
                {searchDropdownContent}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="nav-icon-btn flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-text-primary md:hidden"
              aria-label="Search"
            >
              <Search size={16} />
            </button>

            {/* Light/dark toggle — hidden while dark-only mode is forced */}

            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded-lg bg-surface" />
            ) : user ? (
              <>
                {/* New Project button — available to all logged-in users */}
                <Link
                  href="/projects/new"
                  className="cta-energy flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="hidden sm:inline">New Project</span>
                </Link>

                <NotificationBell />

                {/* Avatar dropdown */}
                <div className="relative" ref={avatarRef}>
                  <button
                    onClick={() => setAvatarOpen(!avatarOpen)}
                    className="nav-icon-btn flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg transition-all hover:ring-2 hover:ring-border"
                    aria-label="User menu"
                    aria-expanded={avatarOpen}
                    aria-haspopup="true"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name ?? "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-role-bg-surface-active text-xs font-medium text-role-fg-primary">
                        {profile?.display_name?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                  </button>

                  {avatarOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-[44] bg-black/30 md:hidden"
                        onClick={() => setAvatarOpen(false)}
                        aria-label="Close user menu overlay"
                      />
                      <div
                        role="menu"
                        onKeyDown={(e) => { if (e.key === "Escape") setAvatarOpen(false); }}
                        className="nav-popover surface-edge-glow fixed inset-x-2 top-14 z-[45] origin-top animate-scale-in rounded-xl border border-border bg-page-secondary py-1 shadow-2xl md:fixed md:inset-x-auto md:right-3 md:top-14 md:w-56 md:origin-top-right md:rounded-lg"
                      >
                      <div className="border-b border-border px-4 py-3">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {profile?.display_name ?? "User"}
                        </p>
                        <p className="text-xs text-text-tertiary truncate">
                          @{profile?.username ?? "user"}
                        </p>
                      </div>

                      <div className="py-1">
                        <DropdownItem
                          href={profile?.username ? `/creator/${profile.username}` : "/settings"}
                          onClick={() => setAvatarOpen(false)}
                        >
                          View Profile
                        </DropdownItem>
                        {isCreator && (
                          <>
                            <DropdownItem href="/dashboard" onClick={() => setAvatarOpen(false)}>
                              Dashboard
                            </DropdownItem>
                            <DropdownItem href="/projects/new" onClick={() => setAvatarOpen(false)}>
                              New Project
                            </DropdownItem>
                          </>
                        )}
                        <DropdownItem href="/settings" onClick={() => setAvatarOpen(false)}>
                          Settings
                        </DropdownItem>
                        {isAdmin && (
                          <DropdownItem href="/admin" onClick={() => setAvatarOpen(false)}>
                            Admin Panel
                          </DropdownItem>
                        )}
                      </div>

                      <div className="border-t border-border pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                        >
                          Sign Out
                        </button>
                      </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="cta-energy rounded-lg px-3 py-1.5 text-sm font-semibold"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[65] bg-page md:hidden">
          <div className="p-4">
            <form onSubmit={handleSearch} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                  setSearchCreators([]);
                  setSearchVideos([]);
                }}
                className="nav-icon-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary"
                aria-label="Close search"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search projects, creators..."
                  aria-label="Search projects and creators"
                  className="nav-input h-10 w-full rounded-full border border-border bg-surface pl-10 pr-9 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-[var(--role-cta-ring)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchCreators([]);
                      setSearchVideos([]);
                      mobileSearchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </form>

            {/* Mobile search results */}
            <div className="mt-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
              {searchDropdownContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DropdownItem({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
    >
      {children}
    </Link>
  );
}
