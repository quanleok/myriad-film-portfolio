import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";

import type { Tool } from "@/lib/product-model";

export function ToolSpotlight({ tool }: { tool: Tool }) {
  return (
    <section className="signal-card rounded-[32px] p-6">
      <div className="signal-kicker">Spotlight</div>
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-3xl font-semibold">{tool.name}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{tool.summary}</p>
        </div>
        <div className="rounded-[24px] border border-white/[0.08] bg-black/20 px-5 py-4 text-right">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Pricing</div>
          <div className="mt-2 text-lg font-semibold">{tool.pricing}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-positive">Strengths</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {tool.strengths.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.22em] text-danger">Tradeoffs</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {tool.weaknesses.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Latest movement</div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{tool.changeSummary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {tool.bestFor.map((item) => (
              <span key={item} className="signal-chip rounded-full px-3 py-1 text-xs text-slate-200">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <a
              href={tool.website}
              className="inline-flex items-center gap-2 text-sm text-electric transition hover:text-white"
              rel="noreferrer"
              target="_blank"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
            <Link href={`/categories/${tool.category}`} className="inline-flex items-center gap-2 text-sm text-electric transition hover:text-white">
              View category
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
