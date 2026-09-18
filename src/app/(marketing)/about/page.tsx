import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About",
  description:
    "Myriad Spring is the public home for AI clip discovery, connected to Myriad's structured preorder and release system for serious film projects.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.1),transparent_24%),linear-gradient(180deg,rgba(8,14,12,0.96)_0%,rgba(6,8,9,1)_100%)] px-6 py-10 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.65)] sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">About Myriad Spring</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">The public AI video surface connected to a deeper film-project system.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
          Myriad Spring is the fast consumer layer: trending clips, meme discovery, free uploads, and standalone watch pages.
          Behind it sits Myriad, the structured system for filmmakers who want to turn early attention into preorder momentum,
          production updates, and full releases.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/explore">
            <Button size="lg">Explore Projects</Button>
          </Link>
          <Link href="/browse">
            <Button size="lg" variant="secondary">Browse</Button>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-role-border-strong bg-page-secondary/90 p-6 shadow-[var(--role-surface-elev-2)]">
          <h2 className="text-lg font-semibold text-text-primary">Our vision</h2>
          <p className="mt-2 text-sm text-text-secondary">
            A world where AI video can spread fast at the clip level while serious film projects
            still have a real path to funding, production, and delivery.
          </p>
        </article>
        <article className="rounded-2xl border border-role-border-strong bg-page-secondary/90 p-6 shadow-[var(--role-surface-elev-2)]">
          <h2 className="text-lg font-semibold text-text-primary">Creator-first economics</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Short-form clip discovery lives on Myriad Spring. When creators are ready to run a structured
            preorder or release flow, they can move into Myriad without rebuilding their audience from scratch.
          </p>
        </article>
        <article className="rounded-2xl border border-role-border-strong bg-page-secondary/90 p-6 shadow-[var(--role-surface-elev-2)]">
          <h2 className="text-lg font-semibold text-text-primary">Small team, big vision</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Myriad Spring is built by a small, independent team. We&apos;re building for the
            next generation of filmmakers and AI creators — the ones using tools like Sora, Kling, and whatever
            comes next to tell stories the world hasn&apos;t seen yet.
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-role-border-strong bg-page-secondary/90 p-8 shadow-[var(--role-surface-elev-2)]">
        <h2 className="text-2xl font-bold text-text-primary">How the Myriad Spring + Myriad system works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-role-border-subtle bg-page p-5">
            <h3 className="font-semibold text-text-primary">Preorder to unlock</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Creators can publish clips to Myriad Spring first, then use that attention to launch a structured
              preorder campaign. Once a project hits its unlock target, it moves into production.
            </p>
          </div>
          <div className="rounded-2xl border border-role-border-subtle bg-page p-5">
            <h3 className="font-semibold text-text-primary">Fan-funded filmmaking</h3>
            <p className="mt-1 text-sm text-text-secondary">
              No gatekeepers deciding what gets made. The audience can share clips, discover teasers,
              and back the projects they actually want to see finished.
            </p>
          </div>
          <div className="rounded-2xl border border-role-border-subtle bg-page p-5">
            <h3 className="font-semibold text-text-primary">Discovery built in</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Browse viral clips on Myriad Spring, then move deeper into project pages when a filmmaker
              is ready for a real release cycle. Discovery starts fast and can deepen into a full campaign.
            </p>
          </div>
          <div className="rounded-2xl border border-role-border-subtle bg-page p-5">
            <h3 className="font-semibold text-text-primary">Deliver and earn</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Once a project is unlocked, creators produce their film and deliver it to backers.
              Standard creators keep 80% after the 20% platform fee, and founding creators follow their separate promotional terms. Creators can withdraw anytime with a $50 minimum.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-role-border-strong bg-page-secondary/90 p-8 text-center shadow-[var(--role-surface-elev-2)]">
        <h2 className="font-display text-3xl font-bold text-text-primary">Jump into the films already building momentum</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-text-secondary">
          Whether you&apos;re here to find the latest AI clips or back a filmmaker building something bigger,
          the Myriad Spring front door leads into the full Myriad system.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/explore">
            <Button>Explore Projects</Button>
          </Link>
          <Link href="/premieres">
            <Button variant="secondary">Premieres</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
