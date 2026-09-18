"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSiteUrl } from "@/lib/site-url";
import { CheckCircle, Film, Rocket, Users } from "lucide-react";
import { GENRE_LABELS, LEGACY_GENRE_LABELS } from "@/types/video";

interface OnboardingProfile {
  id: string;
  email: string | null;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  stripe_onboarding_complete: boolean | null;
  creator_onboarding_completed: boolean;
  genre_interests: string[];
}

interface CreatorOnboardingFlowProps {
  profile: OnboardingProfile;
  initialStep: number;
}

function clampStep(step: number) {
  if (step < 1) return 1;
  if (step > 4) return 4;
  return step;
}

export function CreatorOnboardingFlow({
  profile,
  initialStep,
}: CreatorOnboardingFlowProps) {
  const router = useRouter();

  const [step, setStep] = useState(clampStep(initialStep));

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    profile.genre_interests ?? []
  );

  const [stripeReady, setStripeReady] = useState(
    Boolean(profile.stripe_onboarding_complete)
  );
  const [stripeAutoChecked, setStripeAutoChecked] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [startingStripe, setStartingStripe] = useState(false);
  const [completing, setCompleting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const profileUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `${getSiteUrl()}/creator/${profile.username}`;
    }

    return `${window.location.origin}/creator/${profile.username}`;
  }, [profile.username]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(avatarUrl || "");
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, avatarUrl]);

  // Auto-detect Stripe Connect status when landing on Step 2
  useEffect(() => {
    if (step !== 2 || stripeReady || stripeAutoChecked) return;
    setStripeAutoChecked(true);

    (async () => {
      setCheckingStripe(true);
      try {
        const res = await fetch("/api/creators", { method: "GET" });
        const data = (await res.json()) as { isOnboarded?: boolean };
        if (res.ok && data.isOnboarded) {
          setStripeReady(true);
          setNotice("Stripe account detected — payouts connected.");
        }
      } catch {
        // Silent — user can still click refresh manually
      } finally {
        setCheckingStripe(false);
      }
    })();
  }, [step, stripeReady, stripeAutoChecked]);

  function setMessage(nextError: string | null, nextNotice: string | null = null) {
    setError(nextError);
    setNotice(nextNotice);
  }

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((value) => value !== genre);
      }
      return [...prev, genre];
    });
  }

  async function saveStepOne() {
    if (!displayName.trim()) {
      setMessage("Display name required");
      return;
    }

    setSavingProfile(true);
    setMessage(null, null);

    try {
      const supabase = createClient();
      let nextAvatarUrl = avatarUrl || null;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const filePath = `${profile.id}/onboarding-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) {
          throw new Error(uploadError.message || "Avatar upload failed");
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        nextAvatarUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          avatar_url: nextAvatarUrl,
          genre_interests: selectedGenres,
          is_creator: true,
          role: "creator",
        })
        .eq("id", profile.id);

      if (updateError) {
        throw new Error(updateError.message || "Failed to save profile");
      }

      setAvatarUrl(nextAvatarUrl ?? "");
      setAvatarFile(null);
      setStep(2);
      setMessage(null, "Profile saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setMessage(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function refreshStripeStatus() {
    setCheckingStripe(true);
    setMessage(null, null);

    try {
      const res = await fetch("/api/creators", { method: "GET" });
      const data = (await res.json()) as {
        error?: string;
        isOnboarded?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error || "Could not check Stripe status");
      }

      if (data.isOnboarded) {
        setStripeReady(true);
        setMessage(null, "Stripe onboarding verified.");
      } else {
        setMessage("Stripe onboarding is not complete yet.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not check Stripe status";
      setMessage(message);
    } finally {
      setCheckingStripe(false);
    }
  }

  async function startStripeSetup() {
    setStartingStripe(true);
    setMessage(null, null);

    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/onboarding?step=2" }),
      });

      const data = (await res.json()) as { error?: string; url?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start Stripe onboarding");
      }

      window.location.href = data.url;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start Stripe onboarding";
      setMessage(message);
      setStartingStripe(false);
    }
  }

  async function completeOnboarding() {
    setCompleting(true);
    setMessage(null, null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ creator_onboarding_completed: true })
        .eq("id", profile.id);

      if (updateError) {
        throw new Error(updateError.message || "Could not complete onboarding");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not complete onboarding";
      setMessage(message);
      setCompleting(false);
    }
  }

  const shareText = encodeURIComponent(
    "I just launched my creator profile on Myriad. Follow my releases here:"
  );
  const shareUrl = encodeURIComponent(profileUrl);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">
          Creator onboarding
        </p>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Step {step} of 4</h1>
          <span className="text-sm text-text-tertiary">Launch your creator profile</span>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      {step === 1 ? (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">Tell us about yourself</h2>
            <p className="text-sm text-text-tertiary">
              Your public creator profile.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">Avatar</label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-600 text-xl font-semibold text-page">
                    {displayName.trim()[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                  className="text-sm text-text-tertiary file:mr-3 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-text-primary hover:file:bg-surface-hover"
                />
              </div>
            </div>

            <Input
              id="onboarding_display_name"
              label="Display Name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={50}
              required
            />

            <Textarea
              id="onboarding_bio"
              label="Bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="What kind of stories do you create?"
              rows={4}
              maxLength={500}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-text-secondary">Genre interests</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries({ ...GENRE_LABELS, ...LEGACY_GENRE_LABELS }).map(([value, label]) => {
                  const active = selectedGenres.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleGenre(value)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? "border-brand-400 bg-surface text-text-primary"
                          : "border-border bg-surface text-text-secondary hover:bg-surface-hover"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveStepOne} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save and continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">Set up payments</h2>
            <p className="text-sm text-text-tertiary">
              Connect Stripe to receive payouts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-lg border p-4 ${stripeReady ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-surface"}`}>
              <div className="flex items-center gap-3">
                {stripeReady ? (
                  <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : null}
                <div>
                  <p className="text-sm text-text-secondary">Payout status</p>
                  <p className={`mt-1 text-lg font-semibold ${stripeReady ? "text-emerald-600 dark:text-emerald-400" : "text-text-primary"}`}>
                    {stripeReady ? "Payouts connected" : "Stripe not connected yet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!stripeReady ? (
                <>
                  <Button onClick={startStripeSetup} disabled={startingStripe}>
                    {startingStripe ? "Opening Stripe..." : "Set up payouts"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={refreshStripeStatus}
                    disabled={checkingStripe}
                  >
                    {checkingStripe ? "Checking..." : "I already connected Stripe"}
                  </Button>
                </>
              ) : null}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                {stripeReady ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">Ready to launch your first project?</h2>
            <p className="text-sm text-text-tertiary">
              On Myriad, you create project pages and viewers preorder to unlock your film.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10">
                  <Film size={20} className="text-brand-500" />
                </div>
                <p className="text-sm font-medium text-text-primary">Create</p>
                <p className="mt-1 text-xs text-text-secondary">Build a project page with your teaser, characters, and story.</p>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10">
                  <Users size={20} className="text-brand-500" />
                </div>
                <p className="text-sm font-medium text-text-primary">Preorders</p>
                <p className="mt-1 text-xs text-text-secondary">Viewers preorder to unlock. Hit the target and you&apos;re greenlit.</p>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10">
                  <Rocket size={20} className="text-brand-500" />
                </div>
                <p className="text-sm font-medium text-text-primary">Make your film</p>
                <p className="mt-1 text-xs text-text-secondary">Deliver your film, premiere it live, and earn from your audience.</p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStep(4)}>
                  Skip for now
                </Button>
                <a href="/projects/new">
                  <Button>Create Your First Project</Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-text-primary">Share your profile</h2>
            <p className="text-sm text-text-tertiary">
              Share your creator page and start building your audience.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 text-center">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-primary/10 blur-2xl animate-pulse" />
              <p className="relative text-sm uppercase tracking-[0.2em] text-text-secondary">You're all set!</p>
              <p className="relative mt-2 text-2xl font-bold text-text-primary">Creator profile ready</p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Profile URL</p>
              <p className="mt-1 break-all text-sm text-text-primary">{profileUrl}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(profileUrl);
                  setMessage(null, "Profile link copied to clipboard.");
                }}
              >
                Copy Link
              </Button>
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary">Share to X</Button>
              </a>
              <a
                href="https://discord.com/app"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary">Share to Discord</Button>
              </a>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={completeOnboarding} disabled={completing}>
                {completing ? "Finishing..." : "Go to dashboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
