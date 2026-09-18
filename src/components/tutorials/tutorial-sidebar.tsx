import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatTutorialTagLabel } from "@/lib/tutorials";
import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_CATEGORY_LABELS,
  TUTORIAL_DIFFICULTIES,
  TUTORIAL_DIFFICULTY_LABELS,
  type TutorialBrowseSidebarData,
} from "@/types/tutorial";

interface TutorialSidebarProps {
  sidebar: TutorialBrowseSidebarData;
  currentCategory: string;
  currentDifficulty: string;
  currentTag: string;
  currentQuery: string;
  currentSort: string;
}

function buildTutorialHref(
  params: Record<string, string | null | undefined>
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all" && value !== "general") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `/tutorials?${query}` : "/tutorials";
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-brand-500/10 text-brand-200"
          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? <span className="text-xs text-text-tertiary">{count}</span> : null}
    </Link>
  );
}

export function TutorialSidebar({
  sidebar,
  currentCategory,
  currentDifficulty,
  currentTag,
  currentQuery,
  currentSort,
}: TutorialSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <section className="rounded-[1.4rem] border border-white/8 bg-[rgba(8,12,12,0.72)] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
          Categories
        </h2>
        <div className="mt-3 space-y-1">
          <FilterLink
            href={buildTutorialHref({
              q: currentQuery,
              sort: currentSort,
              difficulty: currentDifficulty,
              tag: currentTag || null,
            })}
            active={currentCategory === "general" || currentCategory === "all" || !currentCategory}
            label={TUTORIAL_CATEGORY_LABELS.general}
            count={Object.values(sidebar.categoryCounts).reduce((sum, value) => sum + value, 0)}
          />
          {TUTORIAL_CATEGORIES.filter((category) => category !== "general").map((category) => (
            <FilterLink
              key={category}
              href={buildTutorialHref({
                q: currentQuery,
                sort: currentSort,
                category,
                difficulty: currentDifficulty,
                tag: currentTag || null,
              })}
              active={currentCategory === category}
              label={TUTORIAL_CATEGORY_LABELS[category]}
              count={sidebar.categoryCounts[category]}
            />
          ))}
        </div>
      </section>

      <section className="rounded-[1.4rem] border border-white/8 bg-[rgba(8,12,12,0.72)] p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
          Difficulty
        </h2>
        <div className="mt-3 space-y-1">
          <FilterLink
            href={buildTutorialHref({
              q: currentQuery,
              sort: currentSort,
              category: currentCategory,
              tag: currentTag || null,
            })}
            active={currentDifficulty === "all" || !currentDifficulty}
            label="All levels"
          />
          {TUTORIAL_DIFFICULTIES.map((difficulty) => (
            <FilterLink
              key={difficulty}
              href={buildTutorialHref({
                q: currentQuery,
                sort: currentSort,
                category: currentCategory,
                difficulty,
                tag: currentTag || null,
              })}
              active={currentDifficulty === difficulty}
              label={TUTORIAL_DIFFICULTY_LABELS[difficulty]}
              count={sidebar.difficultyCounts[difficulty]}
            />
          ))}
        </div>
      </section>

      {sidebar.popularTags.length ? (
        <section className="rounded-[1.4rem] border border-white/8 bg-[rgba(8,12,12,0.72)] p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
            Popular tags
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {sidebar.popularTags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={buildTutorialHref({
                  q: currentQuery,
                  sort: currentSort,
                  category: currentCategory,
                  difficulty: currentDifficulty,
                  tag,
                })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  currentTag === tag
                    ? "border-brand-500/28 bg-brand-500/10 text-brand-200"
                    : "border-white/8 bg-white/3 text-text-secondary hover:border-white/14 hover:text-text-primary"
                )}
              >
                {formatTutorialTagLabel(tag)} <span className="text-text-tertiary">· {count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
