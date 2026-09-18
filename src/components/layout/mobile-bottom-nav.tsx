"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Compass, LayoutGrid } from "lucide-react";

const TAB_ACTIVE_COLORS: Record<string, string> = {
  "/explore": "text-green-500",
  "/browse": "text-green-500",
  "/premieres": "text-green-500",
};

const NAV_ITEMS = [
  {
    href: "/explore",
    label: "Explore",
    icon: Compass,
  },
  {
    href: "/browse",
    label: "Browse",
    icon: LayoutGrid,
  },
  {
    href: "/premieres",
    label: "Premieres",
    icon: Clapperboard,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-page/95 backdrop-blur-lg sm:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] transition-colors bounce-tap ${
                active ? (TAB_ACTIVE_COLORS[item.href] ?? "text-brand-500") : "text-text-tertiary"
              }`}
            >
              {active ? (
                <span
                  className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-current transition-all duration-300"
                  style={{ boxShadow: "0 0 8px currentColor" }}
                />
              ) : null}
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
