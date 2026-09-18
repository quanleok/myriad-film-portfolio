"use client";

import Link from "next/link";
import { SpringLogo } from "@/components/ui/spring-logo";

export function Footer() {
  return (
    <footer className="shell-chrome border-t border-white/8 bg-page">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <SpringLogo className="h-4 w-4" glowing />
            <span className="font-display text-sm font-bold text-text-primary">Myriad Spring</span>
            <span className="text-xs text-text-tertiary">&copy; Myriad Spring</span>
          </div>
          <a
            href="mailto:support@myriadspring.com"
            className="text-xs text-text-tertiary transition-colors hover:text-text-secondary"
          >
            support@myriadspring.com
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-tertiary">
          <Link href="/about" className="transition-colors hover:text-text-secondary">
            About
          </Link>
          <Link href="/terms" className="transition-colors hover:text-text-secondary">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-text-secondary">
            Privacy
          </Link>
          <Link href="/dmca" className="transition-colors hover:text-text-secondary">
            DMCA
          </Link>
          <Link href="/community-guidelines" className="transition-colors hover:text-text-secondary">
            Guidelines
          </Link>
        </div>
      </div>
    </footer>
  );
}
