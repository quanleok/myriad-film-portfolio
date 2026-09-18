import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { PersonProfile } from "@/lib/product-model";

export function PersonCard({ person }: { person: PersonProfile }) {
  return (
    <Link
      href={`/people/${person.handle}`}
      className="signal-card group block rounded-[28px] p-5 transition hover:border-white/20"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">{person.name}</div>
          <div className="mt-1 text-sm text-slate-400">@{person.handle}</div>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
          {person.credibilityLabel}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{person.bio}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {person.expertise.map((item) => (
          <span key={item} className="signal-chip rounded-full px-3 py-1 text-xs text-slate-200">
            {item}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
        <span>{person.followerCount.toLocaleString()} followers</span>
        <span className="inline-flex items-center gap-2 text-electric transition group-hover:text-white">
          Open profile
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
