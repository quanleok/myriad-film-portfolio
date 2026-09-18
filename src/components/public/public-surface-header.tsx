"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SpringLogo } from "@/components/ui/spring-logo";
import { useAuth } from "@/hooks/useAuth";

interface PublicSurfaceHeaderProps {
  backHref?: string;
  backLabel?: string;
  showDirectoryNav?: boolean;
}

const PRIMARY_NAV_ITEMS = [
  { label: "Explore", href: "/explore" },
  { label: "Browse", href: "/browse" },
  { label: "Premieres", href: "/premieres" },
];

export function PublicSurfaceHeader(_: PublicSurfaceHeaderProps) {
  const { user, profile, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileHref = profile?.username ? `/creator/${profile.username}` : "/settings";

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/80 bg-[#030605]/94 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <SpringLogo className="h-5 w-5 text-emerald-400" glowing />
          <span className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-white/86">
            Myriad Spring
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-white/68 md:flex">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!loading && !user ? (
            <Link href="/login" className="text-sm text-white/68 transition-colors hover:text-white">
              Sign in
            </Link>
          ) : !loading && user ? (
            <Link
              href={profileHref}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-950/80 bg-[#09110d] transition-colors hover:bg-[#0d1712]"
              aria-label="Open your profile"
            >
              <Avatar
                src={profile?.avatar_url}
                fallback={profile?.display_name || profile?.username || user.email || "U"}
                alt={profile?.display_name ?? "Your profile"}
                size="sm"
                className="rounded-full ring-0"
              />
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
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-emerald-950/80 pt-3">
              {!loading && !user ? (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Sign in
                </Link>
              ) : !loading && user ? (
                <Link href={profileHref} onClick={() => setMobileMenuOpen(false)}>
                  Profile
                </Link>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
