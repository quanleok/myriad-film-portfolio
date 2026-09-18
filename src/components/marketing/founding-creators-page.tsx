"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FoundingProgramPanel } from "@/components/founding/founding-program-panel";
import type { FoundingProgramStatus } from "@/lib/founding-program";

interface FoundingCreatorsPageProps {
  initialCode: string;
  isLoggedIn: boolean;
  userEmail: string | null;
  displayName: string;
  isFoundingCreator: boolean;
  hasPendingApplication: boolean;
  foundingProgram: FoundingProgramStatus;
}

function splitAiTools(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function FoundingCreatorsPage({
  initialCode,
  isLoggedIn,
  userEmail,
  displayName,
  isFoundingCreator,
  hasPendingApplication,
  foundingProgram,
}: FoundingCreatorsPageProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [applicationDisplayName, setApplicationDisplayName] = useState(displayName);
  const [portfolioLink, setPortfolioLink] = useState("");
  const [aiTools, setAiTools] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [applying, setApplying] = useState(false);
  const teaserEntryHref = isLoggedIn
    ? "/projects/new?mode=teaser"
    : `/signup?redirect=${encodeURIComponent("/projects/new?mode=teaser")}`;

  const redirectTarget = useMemo(() => {
    const query = inviteCode.trim() ? `?code=${encodeURIComponent(inviteCode.trim())}` : "";
    return `/founding-creators${query}`;
  }, [inviteCode]);

  async function handleRedeem() {
    if (!inviteCode.trim()) {
      setError("Enter your invite code.");
      setNotice(null);
      return;
    }

    setRedeeming(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/founding/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Could not accept invite.");
      }

      setNotice("Founding creator access is active. You can start drafting immediately.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite.");
    } finally {
      setRedeeming(false);
    }
  }

  async function handleApply() {
    setApplying(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/founding/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: applicationDisplayName,
          portfolioLink,
          aiTools: splitAiTools(aiTools),
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Could not submit application.");
      }

      setNotice("Application submitted. We’ll review it from the admin queue.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(245,158,11,0.1),transparent_24%),linear-gradient(180deg,rgba(8,14,12,0.96)_0%,rgba(6,8,9,1)_100%)] px-6 py-10 shadow-[0_18px_60px_-36px_rgba(0,0,0,0.65)] sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
          Founding Creator Program
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Launch a public teaser early enough and founding access now unlocks automatically.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
          The public path is simple: post a real public teaser before the countdown ends and, if slots are still open,
          you claim founding access automatically. Invite codes and manual review still exist, but they are no longer the
          main path we want creators to discover first.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {!isLoggedIn ? (
            <>
              <Link href={teaserEntryHref}>
                <Button size="lg">Create account and post teaser</Button>
              </Link>
              <Link href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}>
                <Button size="lg" variant="secondary">Log in</Button>
              </Link>
            </>
          ) : isFoundingCreator ? (
            <>
              <Link href="/projects/new?mode=teaser">
                <Button size="lg">Post another teaser</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">Open Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href={teaserEntryHref}>
                <Button size="lg">Post your teaser</Button>
              </Link>
              <a href="#program-actions">
                <Button size="lg" variant="secondary">Manual paths</Button>
              </a>
              <Link href="/creators">
                <Button size="lg" variant="ghost">For Filmmakers</Button>
              </Link>
            </>
          )}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Auto path</p>
            <p className="mt-2 text-xl font-semibold text-white">Public teaser</p>
            <p className="mt-1 text-sm text-white/70">First 100 creators before the deadline</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Year one</p>
            <p className="mt-2 text-3xl font-semibold text-white">5%</p>
            <p className="mt-1 text-sm text-white/70">Platform fee — keep 95%</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-md">
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">After year one</p>
            <p className="mt-2 text-3xl font-semibold text-white">10%</p>
            <p className="mt-1 text-sm text-white/70">Platform fee for life</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <FoundingProgramPanel
          status={foundingProgram}
          variant="hero"
          primaryCtaHref={teaserEntryHref}
          primaryCtaLabel="Post Your Teaser"
          secondaryCtaHref="#program-actions"
          secondaryCtaLabel="Manual Paths"
        />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">1. Automatic route</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-secondary">
            <p>
              Create the teaser, make it public, and the system awards founding access automatically if the countdown
              is still open and you are still inside the first 100 qualifying creators.
            </p>
            <Link href={teaserEntryHref}>
              <Button className="w-full">Start teaser launch</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">2. Invite code route</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-secondary">
            <p>
              Existing partners, hand-picked creators, or direct outreach can still activate founding access immediately
              with an invite code.
            </p>
            <a href="#program-actions" className="text-sm font-medium text-brand-500 hover:underline">
              Enter invite code below
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">3. Manual review route</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-secondary">
            <p>
              If the countdown is closed or you already have traction elsewhere, you can still submit an application for
              manual approval.
            </p>
            <a href="#program-actions" className="text-sm font-medium text-brand-500 hover:underline">
              Open application form
            </a>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <div className="mt-6 rounded-2xl border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mt-6 rounded-2xl border border-role-success-border bg-role-success-bg px-4 py-3 text-sm text-role-success-fg">
          {notice}
        </div>
      ) : null}

      {isFoundingCreator ? (
        <Card className="mt-8 border-role-success-border bg-role-success-bg/40">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-text-primary">Program active</h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-secondary">
            <p>
              Your account already has founding creator access. The creator onboarding wall is bypassed for project drafts,
              and Stripe payout setup is still enforced only when you submit for review.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/projects/new?mode=teaser">
                <Button>Post another teaser</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">Open Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isLoggedIn ? (
        <Card className="mt-8">
          <CardHeader>
            <h2 className="text-2xl font-semibold text-text-primary">
              {initialCode
                ? "You've been invited — create an account to activate"
                : "Create an account to claim the teaser path or use a manual route"}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-text-secondary">
            {initialCode ? (
              <>
                <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 px-4 py-3">
                  <p className="text-xs text-text-tertiary">Your invite code</p>
                  <p className="mt-1 text-lg font-semibold tracking-wider text-text-primary">{initialCode}</p>
                </div>
                <p>
                  Create an account (or log in) and your invite code will activate automatically.
                  You&apos;ll get 5% platform fee for your first year, then 10% for life.
                </p>
              </>
            ) : (
              <p>
                Sign up, post your teaser, and let the countdown decide whether you claim a public founding slot. If the
                public window is closed, invite and application paths still work here.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href={`/signup?redirect=${encodeURIComponent(initialCode ? redirectTarget : "/projects/new?mode=teaser")}`}>
                <Button>{initialCode ? "Sign Up & Activate" : "Create account"}</Button>
              </Link>
              <Link href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}>
                <Button variant="secondary">Log in</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoggedIn && !isFoundingCreator ? (
        <div id="program-actions" className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold text-text-primary">Manual invite path</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary">
                Use a founding creator invite code to activate the program on your account immediately if you already have direct access.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary" htmlFor="founding-code">
                  Invite code
                </label>
                <input
                  id="founding-code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="Enter your invite code"
                  className="w-full rounded-xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-500"
                />
              </div>
              <div className="rounded-2xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-secondary">
                Account: <span className="font-medium text-text-primary">{userEmail}</span>
              </div>
              <Button onClick={handleRedeem} disabled={redeeming} className="w-full">
                {redeeming ? "Activating..." : "Activate Founding Access"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold text-text-primary">Manual review path</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasPendingApplication ? (
                <div className="rounded-2xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-secondary">
                  You already have a pending founding creator application. We review these from the admin queue.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary" htmlFor="founding-display-name">
                      Display name
                    </label>
                    <input
                      id="founding-display-name"
                      value={applicationDisplayName}
                      onChange={(event) => setApplicationDisplayName(event.target.value)}
                      className="w-full rounded-xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary" htmlFor="founding-portfolio">
                      Portfolio or sample work link
                    </label>
                    <input
                      id="founding-portfolio"
                      value={portfolioLink}
                      onChange={(event) => setPortfolioLink(event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary" htmlFor="founding-tools">
                      AI tools you use
                    </label>
                    <textarea
                      id="founding-tools"
                      value={aiTools}
                      onChange={(event) => setAiTools(event.target.value)}
                      placeholder="Runway, Veo, Kling, Midjourney, ElevenLabs"
                      className="min-h-24 w-full rounded-xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-500"
                    />
                    <p className="text-xs text-text-tertiary">
                      Comma-separated. Keep it short. We use this for review context, not public display.
                    </p>
                  </div>
                  <Button onClick={handleApply} disabled={applying} variant="secondary" className="w-full">
                    {applying ? "Submitting..." : "Submit Application"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
