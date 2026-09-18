import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREATOR_WORKFLOW_STEPS } from "./how-it-works-content";

interface CreatorWorkflowGuideProps {
  teaserEntryHref: string;
}

export function CreatorWorkflowGuide({
  teaserEntryHref,
}: CreatorWorkflowGuideProps) {
  return (
    <section className="mt-8 rounded-3xl border border-role-border-strong bg-page-secondary/90 p-8 shadow-[var(--role-surface-elev-2)]">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-500">
          Creator Workflow
        </p>
        <h2 className="mt-3 text-3xl font-bold text-text-primary sm:text-4xl">
          See the real upload path before you commit to a launch.
        </h2>
        <p className="mt-4 text-sm leading-7 text-text-secondary sm:text-base">
          This is the actual creator pipeline on Myriad right now: choose the
          lightest launch mode, upload the essentials, publish the page, manage
          the project from dashboard, then deliver the finished film through the
          same system.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {CREATOR_WORKFLOW_STEPS.map((step, index) => (
          <article
            key={step.title}
            className="grid gap-5 rounded-[28px] border border-role-border-strong bg-page p-4 shadow-[0_18px_50px_-36px_rgba(0,0,0,0.45)] sm:p-5 lg:grid-cols-[minmax(0,1.04fr)_380px] lg:items-center"
          >
            <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
              <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/40">
                <img
                  src={step.imageSrc}
                  alt={step.imageAlt}
                  className="aspect-[16/10] w-full object-cover object-top"
                />
              </div>
            </div>

            <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-500">
                  {step.eyebrow}
                </span>
                {step.note ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                    {step.note}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
                {step.body}
              </p>
              <p className="mt-4 rounded-2xl border border-white/8 bg-page-secondary/80 px-4 py-3 text-sm leading-6 text-text-secondary">
                {step.caption}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_35%),linear-gradient(180deg,rgba(7,10,16,0.98)_0%,rgba(4,7,10,1)_100%)] p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Teaser Launch Rules
          </p>
          <h3 className="mt-3 text-xl font-semibold">
            Keep teaser launch honest and lightweight.
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Required
              </p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Title, hook, teaser clip, genre, content rating, rights, and
                terms.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                Optional polish
              </p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Characters, concept cards, longer synopsis, and heavier story
                materials can come later.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-role-border-strong bg-page p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Start here
          </p>
          <h3 className="mt-3 text-xl font-semibold text-text-primary">
            Post the teaser first, then grow the page when the signal is real.
          </h3>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            The teaser path is the fastest honest start, and it still keeps the
            door open for preorder, production, premiere, or release later.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={teaserEntryHref}>
              <Button>Post your teaser</Button>
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded-full border border-role-border-strong px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-page-secondary"
            >
              Open launch modes
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
