import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import {
  HIRE_AVAILABILITY_LABELS,
  HIRE_AVAILABILITY_OPTIONS,
  HIRE_PRICE_BAND_LABELS,
  HIRE_PRICE_BAND_OPTIONS,
  type TalentSummary,
} from "@/lib/talent";
import { TalentCard } from "@/components/talent/talent-card";
import { PublicSurfaceHeader } from "@/components/public/public-surface-header";

interface TalentDirectoryPageProps {
  talents: TalentSummary[];
  query: string;
  specialty: string;
  availability: string;
  price: string;
  allSpecialties: string[];
}

function buildTalentHref(
  query: string,
  specialty: string,
  availability: string,
  price: string
) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (specialty.trim()) params.set("specialty", specialty.trim());
  if (availability.trim()) params.set("availability", availability.trim());
  if (price.trim()) params.set("price", price.trim());
  const next = params.toString();
  return next ? `/talent?${next}` : "/talent";
}

export function TalentDirectoryPage({
  talents,
  query,
  specialty,
  availability,
  price,
  allSpecialties,
}: TalentDirectoryPageProps) {
  return (
    <div className="min-h-screen bg-page text-text-primary">
      <PublicSurfaceHeader backHref="/" backLabel="Back home" showDirectoryNav />

      <main className="brand-halo-bg mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500">
              Talent Discovery
            </p>
            <h1 className="max-w-3xl font-display text-[clamp(2.6rem,5vw,5.2rem)] font-semibold leading-[0.92] tracking-[-0.075em] text-text-primary">
              Find AI creators and studios.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-text-secondary">
              Search public portfolios by specialty, recent work, and style.
            </p>
          </div>

          <form action="/talent" className="rounded-2xl border border-border bg-page/95 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-3">
              <Search size={18} className="text-text-tertiary" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search creators, studios, specialties"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
              {specialty ? <input type="hidden" name="specialty" value={specialty} /> : null}
              {availability ? (
                <input type="hidden" name="availability" value={availability} />
              ) : null}
              {price ? <input type="hidden" name="price" value={price} /> : null}
              <button
                type="submit"
                className="press-effect inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Search
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-text-tertiary">
            <Sparkles size={12} className="text-brand-500" />
            Browse by specialty
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildTalentHref(query, "", availability, price)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                specialty
                  ? "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  : "bg-brand-600 text-white"
              }`}
            >
              All
            </Link>
            {allSpecialties.map((item) => {
              const active = item.toLowerCase() === specialty.toLowerCase();
              return (
                <Link
                  key={item}
                  href={buildTalentHref(
                    query,
                    active ? "" : item,
                    availability,
                    price
                  )}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-brand-600 text-white"
                      : "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
                >
                  {item}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-tertiary">
              Availability
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildTalentHref(query, specialty, "", price)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  availability
                    ? "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    : "bg-brand-600 text-white"
                }`}
              >
                All
              </Link>
              {HIRE_AVAILABILITY_OPTIONS.map((item) => {
                const active = item === availability;
                return (
                  <Link
                    key={item}
                    href={buildTalentHref(
                      query,
                      specialty,
                      active ? "" : item,
                      price
                    )}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-brand-600 text-white"
                        : "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {HIRE_AVAILABILITY_LABELS[item]}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-tertiary">
              Price band
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildTalentHref(query, specialty, availability, "")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  price
                    ? "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    : "bg-brand-600 text-white"
                }`}
              >
                All
              </Link>
              {HIRE_PRICE_BAND_OPTIONS.map((item) => {
                const active = item === price;
                return (
                  <Link
                    key={item}
                    href={buildTalentHref(
                      query,
                      specialty,
                      availability,
                      active ? "" : item
                    )}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      active
                        ? "bg-brand-600 text-white"
                        : "border border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    }`}
                  >
                    {HIRE_PRICE_BAND_LABELS[item]}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-text-tertiary">
                Directory
              </p>
              <h2 className="mt-2 font-display text-[2.3rem] font-semibold tracking-[-0.06em] text-text-primary">
                {query.trim()
                  ? `Results for “${query.trim()}”`
                  : specialty
                    ? `${specialty} talent`
                    : availability
                      ? `${HIRE_AVAILABILITY_LABELS[availability as keyof typeof HIRE_AVAILABILITY_LABELS] ?? availability} talent`
                      : price
                        ? `${HIRE_PRICE_BAND_LABELS[price as keyof typeof HIRE_PRICE_BAND_LABELS] ?? price} talent`
                    : "Creators and studios"}
              </h2>
            </div>
            <span className="text-sm text-text-tertiary">
              {talents.length} result{talents.length === 1 ? "" : "s"}
            </span>
          </div>

          {talents.length > 0 ? (
            <div className="stagger-up mt-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {talents.map((talent) => (
                <TalentCard key={talent.id} talent={talent} showContact />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
              <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                No talent matched that search.
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-text-secondary">
                Try a broader specialty, or clear the current query.
              </p>
              <Link
                href="/talent"
                className="press-effect mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
              >
                Clear filters
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
