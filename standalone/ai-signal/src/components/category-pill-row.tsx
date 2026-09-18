import Link from "next/link";

import type { Category } from "@/lib/product-model";

export function CategoryPillRow({ categories }: { categories: Category[] }) {
  return (
    <div className="signal-scroll flex gap-3 overflow-x-auto pb-2">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/categories/${category.slug}`}
          className="signal-chip flex min-w-[210px] items-center gap-3 rounded-full px-4 py-3 transition hover:border-white/[0.25] hover:bg-white/[0.08]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-xs font-semibold">
            {category.icon}
          </div>
          <div>
            <div className="text-sm font-semibold">{category.name}</div>
            <div className="text-xs text-slate-400">{category.tagline}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
