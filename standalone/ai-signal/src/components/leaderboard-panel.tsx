import Link from "next/link";
import { ArrowUpRight, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { getLeaderboardPulse, getMovementLabel } from "@/lib/ranking/score";
import type { LeaderboardEntry, Tool } from "@/lib/product-model";

function MovementIcon({ movement }: { movement: LeaderboardEntry["movement"] }) {
  if (movement === "up") return <TrendingUp className="h-4 w-4 text-positive" />;
  if (movement === "down") return <TrendingDown className="h-4 w-4 text-danger" />;
  if (movement === "new") return <Sparkles className="h-4 w-4 text-warning" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

export function LeaderboardPanel({
  title,
  subtitle,
  entries,
  toolsBySlug,
}: {
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
  toolsBySlug: Record<string, Tool>;
}) {
  return (
    <section className="signal-card rounded-[32px] p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="signal-kicker">Leaderboard</div>
          <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {entries.map((entry) => {
          const tool = toolsBySlug[entry.toolSlug];

          return (
            <Link
              key={entry.id}
              href={`/tools/${tool.slug}`}
              className="group grid gap-4 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-white/[0.18] hover:bg-white/[0.05] lg:grid-cols-[72px_1.2fr_1fr_140px]"
            >
              <div className="rounded-[18px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Rank</div>
                <div className="mt-2 text-3xl font-semibold">{entry.rank}</div>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{tool.name}</h3>
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    {tool.company}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{entry.rationale}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tool.bestFor.map((item) => (
                  <span key={item} className="signal-chip rounded-full px-3 py-1 text-xs text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-col justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <MovementIcon movement={entry.movement} />
                  <span>{getMovementLabel(entry)}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Pulse</div>
                  <div className="mt-1 text-2xl font-semibold">{getLeaderboardPulse(entry)}</div>
                </div>
                <div className="inline-flex items-center justify-end gap-2 text-sm text-electric transition group-hover:text-white">
                  Open tool
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
