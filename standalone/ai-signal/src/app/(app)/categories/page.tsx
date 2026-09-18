import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { categories } from "@/lib/sample-data";

export default function CategoriesPage() {
  return (
    <div>
      <div className="signal-kicker">Category rooms</div>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">Pick the right room, not a noisy stream.</h1>
      <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="signal-card group rounded-[30px] p-6 transition hover:border-white/[0.18]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] font-semibold">
                {category.icon}
              </div>
              <ArrowUpRight className="h-4 w-4 text-electric transition group-hover:text-white" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">{category.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{category.description}</p>
            <div className="mt-5 text-sm text-slate-400">{category.tagline}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
