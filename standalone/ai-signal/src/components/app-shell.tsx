"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, LayoutGrid, LineChart, MessageSquare, Trophy, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/categories", label: "Categories", icon: MessageSquare },
  { href: "/trending", label: "Trending", icon: LineChart },
  { href: "/people", label: "People", icon: Users },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-r border-white/[0.08] px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg font-semibold">
              AI
            </div>
            <div>
              <div className="text-lg font-semibold">AI Signal</div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Category-first intelligence</div>
            </div>
          </Link>
          <nav className="mt-10 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "border border-white/[0.14] bg-white/[0.06] text-white"
                      : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="signal-card mt-10 rounded-[28px] p-5">
            <div className="signal-kicker">Live signal</div>
            <div className="mt-3 text-3xl font-semibold">42</div>
            <p className="mt-2 text-sm text-slate-300">
              ranking moves and release shifts are active in the product right now.
            </p>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-white/[0.08] bg-canvas/80 px-6 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="signal-kicker">Now tracking</div>
                <div className="mt-1 text-xl font-semibold">What matters in AI today</div>
              </div>
              <button className="signal-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-200">
                <BellRing className="h-4 w-4" />
                Alerts
              </button>
            </div>
          </header>
          <main className="px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
