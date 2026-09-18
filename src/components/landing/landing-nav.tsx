"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SpringLogo } from "@/components/ui/spring-logo";
import { useAuth } from "@/hooks/useAuth";

interface LandingNavProps {
  scrolled?: boolean;
}

const LANDING_NAV_ITEMS = [
  { label: "Explore", href: "/explore" },
  { label: "Browse", href: "/browse" },
  { label: "Premieres", href: "/premieres" },
];

export function LandingNav({ scrolled = true }: LandingNavProps) {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={`left-0 right-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-role-border-strong bg-role-bg-overlay-soft backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className={`flex items-center gap-2 font-display text-lg font-bold tracking-tight ${
            scrolled ? "text-role-fg-primary" : "text-white"
          }`}
        >
          <SpringLogo className="h-5 w-5" glowing />
          <span>Myriad Spring</span>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-6 xl:flex">
            {LANDING_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[13px] font-medium transition-colors ${
                  scrolled
                    ? "text-text-secondary hover:text-text-primary"
                    : "text-white/72 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {!loading && !user ? (
            <Link
              href="/login"
              className={`hidden text-[13px] font-medium transition-colors sm:block ${
                scrolled ? "text-text-secondary hover:text-text-primary" : "text-white/70 hover:text-white"
              }`}
            >
              Sign In
            </Link>
          ) : !loading && user ? (
            <Link
              href="/explore"
              className="hidden text-[13px] font-semibold text-text-primary transition-colors hover:text-brand-300 sm:inline-flex"
            >
              Open App
            </Link>
          ) : null}

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors sm:hidden ${
              scrolled ? "text-text-secondary hover:text-text-primary" : "text-white/70 hover:text-white"
            }`}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-black/90 px-6 py-4 backdrop-blur-2xl sm:hidden">
          <nav className="flex flex-col gap-3">
            {LANDING_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-white/80 transition-colors hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
              {!loading && !user ? (
                <Link
                  href="/login"
                  className="text-sm font-medium text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                ) : !loading && user ? (
                  <Link
                    href="/explore"
                    className="text-sm font-semibold text-white"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                  Open App
                </Link>
              ) : null}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
