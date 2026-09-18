"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/avatar";
import { SpringLogo } from "@/components/ui/spring-logo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SurfaceTab =
  | "jobs"
  | "explore"
  | "browse"
  | "premieres"
  | "watch"
  | "projects"
  | "resources"
  | "toolkit"
  | "pulse"
  | "forum"
  | "tutorials";

interface VideoHubHeaderProps {
  activeTab?: SurfaceTab;
  primaryHref?: string;
  primaryLabel?: string;
  primaryShortLabel?: string;
  primaryIcon?: "plus" | "upload";
  hidePrimary?: boolean;
}

const SURFACE_TABS: Array<{ key: SurfaceTab; href: string; label: string }> = [
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "browse", href: "/browse", label: "Browse" },
  { key: "premieres", href: "/premieres", label: "Premieres" },
];

const SURFACE_TAB_ACCENTS: Record<
  SurfaceTab,
  { indicator: string; mobile: string; headerGlow: string; primaryButton: string }
> = {
  jobs: {
    indicator: "bg-[rgba(29,158,117,0.28)] ring-1 ring-[rgba(93,202,165,0.32)] shadow-[0_0_24px_rgba(29,158,117,0.16)]",
    mobile:
      "border-[rgba(93,202,165,0.32)] bg-[rgba(29,158,117,0.26)] text-[#d4ffef]",
    headerGlow: "bg-[radial-gradient(circle_at_top,rgba(29,158,117,0.12),rgba(7,17,12,0.9)_38%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-brand-600 text-white hover:bg-brand-500",
  },
  watch: {
    indicator:
      "bg-[linear-gradient(135deg,rgba(9,33,22,0.94),rgba(17,73,47,0.84))] ring-1 ring-[rgba(93,202,165,0.32)] shadow-[0_0_28px_rgba(0,232,123,0.16)]",
    mobile:
      "border-[rgba(93,202,165,0.34)] bg-[rgba(12,46,31,0.28)] text-[#e6fff2]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(0,232,123,0.16),rgba(8,20,14,0.9)_42%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[linear-gradient(135deg,#00bf66,#00e87b)] text-[#03110a] shadow-[0_14px_30px_rgba(0,232,123,0.16)] hover:brightness-105",
  },
  explore: {
    indicator:
      "bg-[linear-gradient(135deg,rgba(9,33,22,0.94),rgba(17,73,47,0.84))] ring-1 ring-[rgba(93,202,165,0.32)] shadow-[0_0_28px_rgba(0,232,123,0.16)]",
    mobile:
      "border-[rgba(93,202,165,0.34)] bg-[rgba(12,46,31,0.28)] text-[#e6fff2]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(0,232,123,0.16),rgba(8,20,14,0.9)_42%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[linear-gradient(135deg,#00bf66,#00e87b)] text-[#03110a] shadow-[0_14px_30px_rgba(0,232,123,0.16)] hover:brightness-105",
  },
  browse: {
    indicator:
      "bg-[linear-gradient(135deg,rgba(9,33,22,0.94),rgba(17,73,47,0.84))] ring-1 ring-[rgba(93,202,165,0.32)] shadow-[0_0_28px_rgba(0,232,123,0.16)]",
    mobile:
      "border-[rgba(93,202,165,0.34)] bg-[rgba(12,46,31,0.28)] text-[#e6fff2]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(0,232,123,0.16),rgba(8,20,14,0.9)_42%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[linear-gradient(135deg,#00bf66,#00e87b)] text-[#03110a] shadow-[0_14px_30px_rgba(0,232,123,0.16)] hover:brightness-105",
  },
  premieres: {
    indicator: "bg-[rgba(245,158,11,0.26)] ring-1 ring-[rgba(245,158,11,0.34)] shadow-[0_0_28px_rgba(245,158,11,0.18)]",
    mobile:
      "border-[rgba(245,158,11,0.38)] bg-[rgba(245,158,11,0.24)] text-[#ffe8b0]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),rgba(25,18,8,0.9)_40%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[#dca24a] text-[#140d02] hover:bg-[#e9b45a]",
  },
  projects: {
    indicator: "bg-[rgba(245,158,11,0.26)] ring-1 ring-[rgba(245,158,11,0.34)] shadow-[0_0_28px_rgba(245,158,11,0.18)]",
    mobile:
      "border-[rgba(245,158,11,0.38)] bg-[rgba(245,158,11,0.24)] text-[#ffe8b0]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),rgba(25,18,8,0.9)_40%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[#dca24a] text-[#140d02] hover:bg-[#e9b45a]",
  },
  resources: {
    indicator:
      "bg-[rgba(45,212,191,0.22)] ring-1 ring-[rgba(124,248,232,0.26)] shadow-[0_0_24px_rgba(45,212,191,0.16)]",
    mobile:
      "border-[rgba(124,248,232,0.26)] bg-[rgba(45,212,191,0.2)] text-[#d2fff9]",
    headerGlow:
      "bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.18),transparent_58%)]",
    primaryButton:
      "bg-[linear-gradient(135deg,rgba(45,212,191,1),rgba(18,191,172,0.92))] text-[#041613] shadow-[0_10px_28px_rgba(45,212,191,0.22)] hover:brightness-105",
  },
  toolkit: {
    indicator: "bg-[rgba(131,92,255,0.28)] ring-1 ring-[rgba(177,151,255,0.34)] shadow-[0_0_32px_rgba(131,92,255,0.18)]",
    mobile:
      "border-[rgba(177,151,255,0.34)] bg-[rgba(88,64,177,0.28)] text-[#f1e9ff]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(131,92,255,0.18),rgba(22,17,37,0.9)_38%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[#835cff] text-[#fbf8ff] hover:bg-[#9772ff]",
  },
  pulse: {
    indicator: "bg-[rgba(74,82,92,0.42)] ring-1 ring-[rgba(141,149,160,0.34)] shadow-[0_0_24px_rgba(0,0,0,0.22)]",
    mobile:
      "border-[rgba(141,149,160,0.24)] bg-[rgba(42,47,54,0.88)] text-[#f5f7fa]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(118,126,138,0.14),rgba(14,17,22,0.94)_38%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[#343a42] text-[#f5f7fa] hover:bg-[#424852]",
  },
  forum: {
    indicator: "bg-[rgba(59,130,246,0.26)] ring-1 ring-[rgba(96,165,250,0.32)] shadow-[0_0_24px_rgba(59,130,246,0.16)]",
    mobile:
      "border-[rgba(96,165,250,0.32)] bg-[rgba(59,130,246,0.22)] text-[#dbeafe]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),rgba(10,14,22,0.9)_38%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[#3b82f6] text-white hover:bg-[#60a5fa]",
  },
  tutorials: {
    indicator: "bg-[rgba(234,179,8,0.26)] ring-1 ring-[rgba(250,204,21,0.32)] shadow-[0_0_24px_rgba(234,179,8,0.16)]",
    mobile:
      "border-[rgba(250,204,21,0.32)] bg-[rgba(234,179,8,0.22)] text-[#fef9c3]",
    headerGlow:
      "bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.14),rgba(20,18,8,0.9)_38%,rgba(7,17,12,0.96)_100%)]",
    primaryButton:
      "bg-[#eab308] text-[#1a1502] hover:bg-[#facc15]",
  },
};

export function VideoHubHeader({
  activeTab = "jobs",
  primaryHref = "/upload",
  primaryLabel = "Upload",
  primaryShortLabel = "Upload",
  primaryIcon = "upload",
  hidePrimary = false,
}: VideoHubHeaderProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const profileHref = profile?.username ? `/creator/${profile.username}` : "/settings";
  const navItems = useMemo(() => SURFACE_TABS, []);

  useEffect(() => {
    function syncIndicator() {
      const activeIndex = navItems.findIndex((tab) => tab.key === activeTab);
      const navEl = navRef.current;
      const activeEl = itemRefs.current[activeIndex];

      if (!navEl || !activeEl) return;

      const navRect = navEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();

      setIndicator({
        left: activeRect.left - navRect.left,
        width: activeRect.width,
        ready: true,
      });
    }

    syncIndicator();
    window.addEventListener("resize", syncIndicator);
    return () => window.removeEventListener("resize", syncIndicator);
  }, [activeTab, navItems]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("pointerdown", handlePointerDown);
    }

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/explore");
    router.refresh();
  }

  const PrimaryIcon = primaryIcon === "upload" ? Upload : Plus;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl",
        activeTab === "watch" ? "border-[rgba(93,202,165,0.14)]" : "border-border",
        SURFACE_TAB_ACCENTS[activeTab].headerGlow
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-text-primary">
            <SpringLogo className="h-11 w-11 shrink-0" glowing />
            <div className="truncate font-display text-[1.25rem] font-black tracking-[-0.07em] text-text-primary sm:text-[1.7rem]">
              Myriad Spring
            </div>
          </Link>

          <div className="hidden lg:flex">
            <div
              ref={navRef}
              aria-label="Primary surfaces"
              className={cn(
                "relative inline-flex items-center rounded-full border bg-surface p-1",
                activeTab === "watch"
                  ? "border-[rgba(93,202,165,0.14)] bg-[rgba(9,15,12,0.72)]"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-1 rounded-full transition-all duration-300 ease-out",
                  SURFACE_TAB_ACCENTS[activeTab].indicator,
                  indicator.ready ? "opacity-100" : "opacity-0"
                )}
                style={{
                  transform: `translateX(${indicator.left}px)`,
                  width: indicator.width,
                }}
              />

              {navItems.map((tab, index) => {
                const active = tab.key === activeTab;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={cn(
                      "relative z-10 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200",
                      active
                        ? tab.key === "projects" || tab.key === "premieres"
                          ? "text-[#ffe8b0]"
                          : "text-[#e6fff2]"
                        : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
          {!hidePrimary ? (
            <Link
              href={primaryHref}
              className={cn(
                "press-effect inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-black transition-all duration-200",
                SURFACE_TAB_ACCENTS[activeTab].primaryButton
              )}
            >
              <PrimaryIcon size={16} strokeWidth={2.6} />
              <span className="hidden sm:inline">{primaryLabel}</span>
              <span className="sm:hidden">{primaryShortLabel}</span>
            </Link>
          ) : null}

          {loading ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="press-effect inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-border bg-surface transition-all duration-200 hover:bg-surface-hover"
                aria-label="Open user menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <Avatar
                  src={profile?.avatar_url}
                  fallback={profile?.display_name || profile?.username || user.email || "U"}
                  alt={profile?.display_name ?? "Your profile"}
                  size="sm"
                  className="rounded-[14px] ring-0"
                />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {profile?.display_name ?? "User"}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {profile?.username ? `@${profile.username}` : user.email}
                    </p>
                  </div>

                  <div className="p-1.5">
                    <HeaderMenuItem href={profileHref} onClick={() => setMenuOpen(false)}>
                      Profile
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/library" onClick={() => setMenuOpen(false)}>
                      Library
                    </HeaderMenuItem>
                    <HeaderMenuItem href="/settings" onClick={() => setMenuOpen(false)}>
                      Settings
                    </HeaderMenuItem>
                  </div>

                  <div className="border-t border-border p-1.5">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/login"
              className="press-effect inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors duration-200 hover:bg-surface-hover"
            >
              <UserCircle2 size={16} />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-border px-4 py-3 lg:hidden sm:px-6 lg:px-8">
        <nav aria-label="Primary surfaces" className="flex items-center gap-2 overflow-x-auto">
          {navItems.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200",
                  active
                    ? SURFACE_TAB_ACCENTS[tab.key].mobile
                    : "border-transparent bg-transparent text-text-secondary hover:border-border hover:bg-surface hover:text-text-primary"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function HeaderMenuItem({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary"
    >
      {children}
    </Link>
  );
}
