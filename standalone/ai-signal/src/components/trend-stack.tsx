import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { TrendEvent } from "@/lib/product-model";
import { getTrendTone } from "@/lib/trending/score";

export function TrendStack({ events }: { events: TrendEvent[] }) {
  return (
    <section className="signal-card rounded-[32px] p-6">
      <div className="signal-kicker">Trending</div>
      <h2 className="mt-2 text-2xl font-semibold">Fastest-moving conversations</h2>
      <div className="mt-6 space-y-4">
        {events.map((event, index) => (
          <Link
            key={event.id}
            href={`/categories/${event.category}`}
            className="group block rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-white/[0.18] hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4">
                <div className="rounded-[16px] border border-white/[0.08] bg-black/20 px-3 py-2 text-sm text-slate-300">
                  #{index + 1}
                </div>
                <div>
                  <div className={`text-xs uppercase tracking-[0.22em] ${getTrendTone(event.movement)}`}>
                    {event.category}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{event.label}</h3>
                  <p className="mt-2 text-sm text-slate-300">{event.summary}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Signal</div>
                <div className="mt-1 text-2xl font-semibold">{event.signalScore}</div>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-electric transition group-hover:text-white">
                  Open room
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
