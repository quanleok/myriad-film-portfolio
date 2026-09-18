"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Clapperboard,
  Compass,
  FolderOpen,
  LayoutGrid,
  Plus,
  Settings,
  User,
  X,
} from "lucide-react";
import { SpringLogo } from "@/components/ui/spring-logo";


interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  pinned: boolean;
  setPinned: (value: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: true,
  setCollapsed: () => undefined,
  pinned: false,
  setPinned: () => undefined,
  mobileOpen: false,
  setMobileOpen: () => undefined,
});

const SidebarHoverContext = createContext<{ setHovered: (value: boolean) => void }>({
  setHovered: () => undefined,
});

const PRIMARY_NAV_ITEMS = [
  { label: "Explore", shortLabel: "Explore", href: "/explore", icon: <Compass size={20} />, primary: true },
  { label: "Browse", shortLabel: "Browse", href: "/browse", icon: <LayoutGrid size={20} />, primary: true },
  { label: "Premieres", shortLabel: "Live", href: "/premieres", icon: <Clapperboard size={20} />, primary: true },
];

const DISCOVER_NAV_ITEMS: Array<{ label: string; shortLabel?: string; href: string; icon: React.ReactNode }> = [];

const SECONDARY_NAV_ITEMS: Array<{ label: string; href: string; icon: React.ReactNode }> = [];

export function useSidebar() {
  return useContext(SidebarContext);
}

export function useSidebarHover() {
  return useContext(SidebarHoverContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateCanHover = () => {
      setCanHover(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setHovered(false);
      }
    };

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);

    return () => {
      mediaQuery.removeEventListener("change", updateCanHover);
    };
  }, []);

  const collapsed = !hovered && !pinned;

  const setCollapsed = useCallback(() => {
    // controlled by hover + pinned state
  }, []);

  const setHoverState = useCallback((value: boolean) => {
    if (!canHover) return;
    setHovered(value);
  }, [canHover]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, pinned, setPinned, mobileOpen, setMobileOpen }}>
      <SidebarHoverContext.Provider value={{ setHovered: setHoverState }}>{children}</SidebarHoverContext.Provider>
    </SidebarContext.Provider>
  );
}

function isRouteActive(pathname: string, href: string): boolean {
  const [pathOnly] = href.split("?");
  if (pathOnly === "/") return pathname === "/";
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function NavSection({
  label,
  children,
  collapsed,
}: {
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  return (
    <div className="mt-4 border-t border-border/80 px-2 pt-4">
      {!collapsed ? (
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Sidebar nav colors by GROUP — not per-item.
 * Color = group identity, not individual flair.
 *
 * Discovery (Explore, Premieres, Browse) → green (brand, main theme)
 * Personal  (Library, Create, Profile, Settings) → purple (your stuff)
 * Creator   (Dashboard) → amber (creator tools, stands out)
 */
function getNavColor(href: string): { active: string; hover: string; icon: string; rail: string } {
  // Creator group — amber
  if (href.startsWith("/dashboard")) return {
    active: "bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]",
    hover: "hover:bg-amber-500/5 hover:text-amber-300",
    icon: "text-amber-400",
    rail: "bg-amber-400",
  };
  // Personal group — purple (library, create, profile, settings)
  if (href.startsWith("/library") || href.startsWith("/projects/new") || href.startsWith("/creator/") || href.startsWith("/settings")) return {
    active: "bg-purple-500/10 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.18)]",
    hover: "hover:bg-purple-500/5 hover:text-purple-300",
    icon: "text-purple-400",
    rail: "bg-purple-400",
  };
  // Discovery group — green (explore, browse, premieres)
  return {
    active: "bg-green-500/10 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.18)]",
    hover: "hover:bg-green-500/5 hover:text-green-300",
    icon: "text-green-400",
    rail: "bg-green-400",
  };
}

function NavItem({
  href,
  label,
  shortLabel,
  icon,
  active,
  collapsed,
  primary = false,
}: {
  href: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  primary?: boolean;
}) {
  const colors = getNavColor(href);

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        className={`mb-1 flex flex-col items-center gap-0.5 rounded-xl py-2.5 text-[10px] transition-all duration-200 ${
          active
            ? `text-role-fg-primary ${colors.active}`
            : `${primary ? "bg-surface/45 font-semibold text-text-primary/92" : "text-text-secondary"} hover:bg-surface-hover/80 hover:scale-110 ${colors.hover}`
        }`}
      >
        <span className={active ? colors.icon : ""}>{icon}</span>
        <span className="leading-tight">{shortLabel ?? label.split(" ")[0]}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`relative mb-1 flex items-center gap-3 rounded-xl px-3 transition-all duration-200 ${
        primary ? "py-3 text-[15px]" : "py-2 text-sm"
      } ${
        active
          ? `text-role-fg-primary font-semibold ${colors.active}`
          : `${primary ? "bg-surface/45 font-semibold text-text-primary/92" : "text-text-secondary"} hover:bg-surface-hover/80 ${colors.hover}`
      }`}
    >
      {active ? (
        <span className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition-all duration-300 ${colors.rail}`} />
      ) : null}
      <span className={active ? colors.icon : ""}>{icon}</span>
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, isCreator } = useAuth();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { setHovered } = useSidebarHover();

  const content = (
    <div className="flex h-full flex-col overflow-y-auto pb-4 scrollbar-hide">
      <div className="px-2 pt-4">
        {!collapsed ? (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">Watch</p>
        ) : null}
        {PRIMARY_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.label}
            href={item.href}
            icon={item.icon}
            label={item.label}
            shortLabel={item.shortLabel}
            active={isRouteActive(pathname, item.href)}
            collapsed={collapsed}
            primary={item.primary}
          />
        ))}
      </div>

      {DISCOVER_NAV_ITEMS.length > 0 ? (
        <NavSection label="Watch" collapsed={collapsed}>
          {DISCOVER_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
              shortLabel={item.shortLabel}
              active={isRouteActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </NavSection>
      ) : null}

      {user ? (
        <NavSection label="You" collapsed={collapsed}>
          <NavItem
            href="/library"
            icon={<FolderOpen size={20} />}
            label="Library"
            active={isRouteActive(pathname, "/library")}
            collapsed={collapsed}
          />
          <NavItem
            href="/projects/new"
            icon={<Plus size={20} />}
            label="Create Project"
            active={isRouteActive(pathname, "/projects/new")}
            collapsed={collapsed}
          />
          <NavItem
            href={profile?.username ? `/creator/${profile.username}` : "/settings"}
            icon={<User size={20} />}
            label="Profile"
            active={isRouteActive(pathname, profile?.username ? `/creator/${profile.username}` : "/settings")}
            collapsed={collapsed}
          />
          <NavItem
            href="/settings"
            icon={<Settings size={20} />}
            label="Settings"
            active={isRouteActive(pathname, "/settings")}
            collapsed={collapsed}
          />
        </NavSection>
      ) : null}

      {user && isCreator ? (
        <NavSection label="Creator" collapsed={collapsed}>
          <NavItem
            href="/dashboard"
            icon={<BarChart3 size={20} />}
            label="Dashboard"
            active={isRouteActive(pathname, "/dashboard")}
            collapsed={collapsed}
          />
        </NavSection>
      ) : null}

      {SECONDARY_NAV_ITEMS.length > 0 ? (
        <div className="mt-auto border-t border-border/80 px-2 pt-4">
          {!collapsed ? (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">More</p>
          ) : null}
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.label}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isRouteActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <aside
        aria-label="Main sidebar"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`brand-edge-line shell-chrome fixed left-0 top-14 hidden h-[calc(100vh-3.5rem)] border-r border-border bg-page transition-all duration-200 lg:block ${
          collapsed ? "z-30 w-16" : "z-[41] w-60 shadow-2xl"
        }`}
      >
        {content}
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-role-overlay-strong lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />

          <aside aria-label="Main sidebar" className="shell-chrome fixed inset-y-0 left-0 z-[60] w-64 border-r border-border bg-page lg:hidden">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="flex items-center gap-2 font-display text-lg font-bold text-text-primary"><SpringLogo className="h-5 w-5" />Myriad Spring</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="nav-icon-btn flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            {content}
          </aside>
        </>
      ) : null}
    </>
  );
}
