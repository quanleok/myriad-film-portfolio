"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, Clapperboard, Film, UploadCloud } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VideoUpload } from "@/components/ui/VideoUpload";
import {
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMATS,
  PROJECT_GENRE_LABELS,
  PROJECT_GENRES,
  PROJECT_TONE_LABELS,
  PROJECT_TONES,
  FULL_FILM_UPLOAD_MAX_MB,
  RELEASE_PRICE_MAX,
  RELEASE_PRICE_MIN,
} from "@/types/project";
import { cn, formatPrice } from "@/lib/utils";

type QuickReleaseMode = "direct_premiere" | "direct_release";

type FieldErrors = Partial<Record<
  | "title"
  | "synopsis"
  | "genre"
  | "format"
  | "contentRating"
  | "runtimeMinutes"
  | "coverUrl"
  | "filmVideoId"
  | "price"
  | "premiereDate"
  | "rightsAttested"
  | "termsAccepted",
  string
>>;

const CONTENT_RATINGS = ["general", "teen", "mature"] as const;

const CONTENT_RATING_LABELS: Record<(typeof CONTENT_RATINGS)[number], string> = {
  general: "General",
  teen: "PG-13",
  mature: "R",
};

const TERMS_VERSION = "v1.0";

function normalizeMode(value: string | null): QuickReleaseMode {
  return value === "direct_premiere" ? "direct_premiere" : "direct_release";
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parsePriceToCents(value: string): number | null {
  if (!value.trim()) return null;
  const dollars = Number(value);
  if (!Number.isFinite(dollars)) return null;
  return Math.round(dollars * 100);
}

function buildFieldErrors(input: {
  title: string;
  synopsis: string;
  genre: string;
  format: string;
  contentRating: string;
  runtimeMinutes: string;
  coverUrl: string;
  filmVideoId: string | null;
  releaseOption: "free" | "premium_purchase";
  priceInput: string;
  isPremiere: boolean;
  premiereDate: string;
  minPremiereDate: Date;
  maxPremiereDate: Date;
  rightsAttested: boolean;
  termsAccepted: boolean;
}): FieldErrors {
  const errors: FieldErrors = {};
  const titleLength = input.title.trim().length;
  const synopsisLength = input.synopsis.trim().length;

  if (titleLength < 3 || titleLength > 80) {
    errors.title = "Title must be between 3 and 80 characters.";
  }

  if (synopsisLength < 50 || synopsisLength > 1000) {
    errors.synopsis = "Synopsis must be between 50 and 1000 characters.";
  }

  if (!input.genre) errors.genre = "Select a genre.";
  if (!input.format) errors.format = "Select a format.";
  if (!input.contentRating) errors.contentRating = "Select a rating.";
  if (input.runtimeMinutes.trim()) {
    const runtime = Number(input.runtimeMinutes);
    if (!Number.isFinite(runtime) || runtime < 1 || runtime > 240) {
      errors.runtimeMinutes = "Runtime must be between 1 and 240 minutes.";
    }
  }
  if (!input.coverUrl) errors.coverUrl = "Upload a cover image.";
  if (!input.filmVideoId) errors.filmVideoId = "Upload the full film.";

  if (input.releaseOption === "premium_purchase") {
    const cents = parsePriceToCents(input.priceInput);
    if (
      cents === null ||
      cents < RELEASE_PRICE_MIN ||
      cents > RELEASE_PRICE_MAX
    ) {
      errors.price = `Price must be between ${formatPrice(RELEASE_PRICE_MIN)} and ${formatPrice(RELEASE_PRICE_MAX)}.`;
    }
  }

  if (input.isPremiere) {
    if (!input.premiereDate) {
      errors.premiereDate = "Pick a premiere date.";
    } else {
      const selected = new Date(input.premiereDate);
      if (Number.isNaN(selected.getTime())) {
        errors.premiereDate = "Pick a valid premiere date.";
      } else if (selected < input.minPremiereDate || selected > input.maxPremiereDate) {
        errors.premiereDate = "Premiere date must be between 48 hours and 30 days from now.";
      }
    }
  }

  if (!input.rightsAttested) {
    errors.rightsAttested = "You must confirm that you control the rights to this content.";
  }

  if (!input.termsAccepted) {
    errors.termsAccepted = "You must accept the Creator Terms.";
  }

  return errors;
}

export function QuickReleaseComposer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCreator, loading: authLoading } = useAuth();
  const mode = normalizeMode(searchParams.get("mode"));
  const isPremiere = mode === "direct_premiere";

  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [contentRating, setContentRating] = useState("");
  const [runtimeMinutes, setRuntimeMinutes] = useState("");

  const [coverUrl, setCoverUrl] = useState("");
  const [teaserVideoId, setTeaserVideoId] = useState<string | null>(null);
  const [filmVideoId, setFilmVideoId] = useState<string | null>(null);

  const [releaseOption, setReleaseOption] = useState<"free" | "premium_purchase">("premium_purchase");
  const [priceInput, setPriceInput] = useState("5.00");
  const [premiereDate, setPremiereDate] = useState("");

  const [rightsAttested, setRightsAttested] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minPremiereDate = useMemo(() => addHours(new Date(), 48), []);
  const maxPremiereDate = useMemo(() => addDays(new Date(), 30), []);
  const minPremiereValue = useMemo(() => formatDateTimeLocal(minPremiereDate), [minPremiereDate]);
  const maxPremiereValue = useMemo(() => formatDateTimeLocal(maxPremiereDate), [maxPremiereDate]);

  const fieldErrors = useMemo(
    () =>
      buildFieldErrors({
        title,
        synopsis,
        genre,
        format,
        contentRating,
        runtimeMinutes,
        coverUrl,
        filmVideoId,
        releaseOption,
        priceInput,
        isPremiere,
        premiereDate,
        minPremiereDate,
        maxPremiereDate,
        rightsAttested,
        termsAccepted,
      }),
    [
      title,
      synopsis,
      genre,
      format,
      contentRating,
      runtimeMinutes,
      coverUrl,
      filmVideoId,
      releaseOption,
      priceInput,
      isPremiere,
      premiereDate,
      minPremiereDate,
      maxPremiereDate,
      rightsAttested,
      termsAccepted,
    ]
  );

  const canSubmit = Object.keys(fieldErrors).length === 0 && !submitting;
  const releasePriceCents =
    releaseOption === "premium_purchase" ? parsePriceToCents(priceInput) : null;

  const modeTitle = isPremiere ? "Premiere Film" : "Release Film";
  const modeDescription = isPremiere
    ? "Upload a finished film, schedule its debut, and send it into review without the preorder campaign flow."
    : "Upload a finished film and send it straight into the direct release review flow.";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    setError(null);

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);

    try {
      const createResponse = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          hook: hook.trim() || null,
          synopsis: synopsis.trim(),
          genre,
          format,
          tone: tone || null,
          content_rating: contentRating,
          runtime_minutes: runtimeMinutes.trim() ? Number(runtimeMinutes) : null,
          teaser_thumbnail_url: coverUrl || null,
          teaser_asset_id: teaserVideoId || null,
          launch_mode: mode,
          film_video_id: filmVideoId,
          release_option: releaseOption,
          release_price_cents: releaseOption === "premium_purchase" ? releasePriceCents : null,
          premiere_date: isPremiere ? new Date(premiereDate).toISOString() : null,
        }),
      });

      const createPayload = (await createResponse.json().catch(() => ({}))) as {
        error?: string;
        project?: { id?: string };
      };

      if (!createResponse.ok || !createPayload.project?.id) {
        throw new Error(createPayload.error ?? "Failed to create quick release draft.");
      }

      const projectId = createPayload.project.id;

      if (coverUrl || teaserVideoId) {
        const patchResponse = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teaser_thumbnail_url: coverUrl || null,
            teaser_asset_id: teaserVideoId || null,
          }),
        });

        const patchPayload = (await patchResponse.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!patchResponse.ok) {
          throw new Error(patchPayload.error ?? "Failed to save teaser media.");
        }
      }

      const submitResponse = await fetch(`/api/projects/${projectId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rights_attested: true,
          terms_version: TERMS_VERSION,
        }),
      });

      const submitPayload = (await submitResponse.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!submitResponse.ok) {
        throw new Error(submitPayload.error ?? "Failed to submit for review.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="brand-halo-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <Card>
            <CardContent className="py-12">
              <p className="text-lg font-semibold text-text-primary">Complete creator onboarding first</p>
              <p className="mt-2 text-sm text-text-secondary">
                You need to set up your creator account before you can release films.
              </p>
              <Link href="/onboarding">
                <Button className="mt-6">Start Onboarding</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-halo-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="border-role-border-strong/50 bg-role-bg-page">
          <CardHeader className="space-y-4 border-b border-role-border-subtle">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/projects/new/quick?mode=direct_release"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  !isPremiere
                    ? "bg-role-brand-600 text-role-brand-on"
                    : "border border-role-border-subtle bg-role-bg-page-secondary text-text-secondary hover:text-text-primary"
                )}
              >
                Release Film
              </Link>
              <Link
                href="/projects/new/quick?mode=direct_premiere"
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  isPremiere
                    ? "bg-role-warning-fg text-role-fg-contrast"
                    : "border border-role-border-subtle bg-role-bg-page-secondary text-text-secondary hover:text-text-primary"
                )}
              >
                Premiere Film
              </Link>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold text-text-primary">
                {modeTitle}
              </h1>
              <p className="max-w-2xl text-sm text-text-secondary sm:text-base">
                {modeDescription}
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-3">
              <div className="rounded-xl border border-role-border-subtle bg-role-bg-page-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-text-primary">
                  <Film size={16} />
                  <span className="font-semibold">Finished Film</span>
                </div>
                <p>Upload the full film now so review and publishing stay in one workflow.</p>
              </div>
              <div className="rounded-xl border border-role-border-subtle bg-role-bg-page-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-text-primary">
                  <UploadCloud size={16} />
                  <span className="font-semibold">Fast Setup</span>
                </div>
                <p>No character cards or concept sections. Just the release essentials.</p>
              </div>
              <div className="rounded-xl border border-role-border-subtle bg-role-bg-page-secondary p-4">
                <div className="mb-2 flex items-center gap-2 text-text-primary">
                  <Clapperboard size={16} />
                  <span className="font-semibold">Go To Review</span>
                </div>
                <p>When you submit, the film goes into the same review pipeline as the rest of the platform.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error ? (
            <div className="flex items-start gap-3 rounded-xl border border-role-danger-border bg-role-danger-bg px-4 py-3 text-sm text-role-danger-fg">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <Card>
            <CardHeader className="border-b border-role-border-subtle">
              <h2 className="font-display text-xl font-semibold text-text-primary">Basics</h2>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Input
                id="quick-release-title"
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                placeholder="Film title"
                error={submitAttempted ? fieldErrors.title : undefined}
              />
              <Input
                id="quick-release-hook"
                label="Hook"
                value={hook}
                onChange={(event) => setHook(event.target.value)}
                maxLength={120}
                placeholder="Optional one-line hook"
                hint="Optional. Keep it sharp and short."
              />
              <Textarea
                id="quick-release-synopsis"
                label="Synopsis"
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value)}
                maxLength={1000}
                rows={6}
                placeholder="Tell viewers what the film is about."
                error={submitAttempted ? fieldErrors.synopsis : undefined}
                hint={`${synopsis.trim().length}/1000 characters`}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  id="quick-release-genre"
                  label="Genre"
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  options={[
                    { value: "", label: "Select a genre" },
                    ...PROJECT_GENRES.map((value) => ({
                      value,
                      label: PROJECT_GENRE_LABELS[value] ?? value,
                    })),
                  ]}
                  error={submitAttempted ? fieldErrors.genre : undefined}
                />
                <Select
                  id="quick-release-format"
                  label="Format"
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  options={[
                    { value: "", label: "Select a format" },
                    ...PROJECT_FORMATS.map((value) => ({
                      value,
                      label: PROJECT_FORMAT_LABELS[value] ?? value,
                    })),
                  ]}
                  error={submitAttempted ? fieldErrors.format : undefined}
                />
                <Select
                  id="quick-release-tone"
                  label="Tone"
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  options={[
                    { value: "", label: "Optional tone" },
                    ...PROJECT_TONES.map((value) => ({
                      value,
                      label: PROJECT_TONE_LABELS[value] ?? value,
                    })),
                  ]}
                />
                <Select
                  id="quick-release-rating"
                  label="Rating"
                  value={contentRating}
                  onChange={(event) => setContentRating(event.target.value)}
                  options={[
                    { value: "", label: "Select a rating" },
                    ...CONTENT_RATINGS.map((value) => ({
                      value,
                      label: CONTENT_RATING_LABELS[value],
                    })),
                  ]}
                  error={submitAttempted ? fieldErrors.contentRating : undefined}
                />
              </div>
              <Input
                id="quick-release-runtime"
                label="Runtime (minutes)"
                type="number"
                min={1}
                max={240}
                inputMode="numeric"
                value={runtimeMinutes}
                onChange={(event) => setRuntimeMinutes(event.target.value)}
                placeholder="Optional"
                error={submitAttempted ? fieldErrors.runtimeMinutes : undefined}
                hint="Optional. Between 1 and 240 minutes."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-role-border-subtle">
              <h2 className="font-display text-xl font-semibold text-text-primary">Media</h2>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-primary">Cover Image</p>
                <p className="text-sm text-text-secondary">
                  This becomes the poster/thumbnail on cards and the release page.
                </p>
                <ImageUpload
                  bucket="thumbnails"
                  currentUrl={coverUrl || null}
                  onUpload={setCoverUrl}
                  aspectRatio="video"
                />
                {submitAttempted && fieldErrors.coverUrl ? (
                  <p className="text-xs font-medium text-role-danger-fg">{fieldErrors.coverUrl}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-primary">Teaser Video</p>
                <p className="text-sm text-text-secondary">
                  Optional. Upload a teaser or trailer if you want a separate preview asset.
                </p>
                <VideoUpload
                  currentAssetId={teaserVideoId}
                  onUpload={(assetId) => setTeaserVideoId(assetId || null)}
                  title={title ? `${title} teaser` : "Teaser video"}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-text-primary">Full Film</p>
                <p className="text-sm text-text-secondary">
                  Required. Upload the finished film now so it can move through review and release. Full-film uploads support files up to {FULL_FILM_UPLOAD_MAX_MB / 1000} GB.
                </p>
                <VideoUpload
                  currentAssetId={filmVideoId}
                  onUpload={(assetId) => setFilmVideoId(assetId || null)}
                  title={title ? `${title} full film` : "Full film"}
                  maxSizeMB={FULL_FILM_UPLOAD_MAX_MB}
                />
                {submitAttempted && fieldErrors.filmVideoId ? (
                  <p className="text-xs font-medium text-role-danger-fg">{fieldErrors.filmVideoId}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-role-border-subtle">
              <h2 className="font-display text-xl font-semibold text-text-primary">Pricing</h2>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm text-text-secondary">
                Direct premieres and direct releases default to paid access so you do not accidentally launch a free title.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setReleaseOption("free")}
                  aria-pressed={releaseOption === "free"}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-role-cta-ring",
                    releaseOption === "free"
                      ? "border-role-border-strong bg-role-bg-page-secondary shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "border-role-border-subtle bg-role-bg-page-secondary/70 text-text-secondary hover:border-role-border-strong hover:text-text-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-text-primary">Free</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        Anyone can watch after approval. Best for pure reach.
                      </p>
                    </div>
                    <CheckCircle2
                      size={18}
                      className={cn(
                        "shrink-0 transition",
                        releaseOption === "free" ? "text-role-brand-600" : "text-transparent"
                      )}
                    />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setReleaseOption("premium_purchase")}
                  aria-pressed={releaseOption === "premium_purchase"}
                  className={cn(
                    "rounded-2xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-role-cta-ring",
                    releaseOption === "premium_purchase"
                      ? "border-role-brand-600 bg-role-brand-600/10 shadow-[0_0_0_1px_rgba(83,255,173,0.18)]"
                      : "border-role-border-subtle bg-role-bg-page-secondary/70 text-text-secondary hover:border-role-border-strong hover:text-text-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-text-primary">Paid</p>
                        <span className="rounded-full border border-role-brand-600/40 bg-role-brand-600/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-role-brand-600">
                          Default
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        Charge for access from day one. Best for direct premieres and finished releases.
                      </p>
                    </div>
                    <CheckCircle2
                      size={18}
                      className={cn(
                        "shrink-0 transition",
                        releaseOption === "premium_purchase" ? "text-role-brand-600" : "text-transparent"
                      )}
                    />
                  </div>
                </button>
              </div>
              <Input
                id="quick-release-price"
                label="Price"
                type="number"
                min={RELEASE_PRICE_MIN / 100}
                max={RELEASE_PRICE_MAX / 100}
                step="0.01"
                inputMode="decimal"
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
                disabled={releaseOption === "free"}
                error={submitAttempted ? fieldErrors.price : undefined}
                hint={
                  releaseOption === "free"
                    ? "This film will be free to watch."
                    : `Allowed range: ${formatPrice(RELEASE_PRICE_MIN)} to ${formatPrice(RELEASE_PRICE_MAX)}`
                }
              />
            </CardContent>
          </Card>

          {isPremiere ? (
            <Card>
              <CardHeader className="border-b border-role-border-subtle">
                <h2 className="font-display text-xl font-semibold text-text-primary">Premiere Setup</h2>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="rounded-xl border border-role-warning-border bg-role-warning-bg px-4 py-3 text-sm text-role-warning-fg">
                  <div className="flex items-start gap-3">
                    <CalendarClock size={18} className="mt-0.5 shrink-0" />
                    <p>
                      Pick a premiere between 48 hours and 30 days from now so viewers have time to discover it and set reminders.
                    </p>
                  </div>
                </div>
                <Input
                  id="quick-release-premiere-date"
                  label="Premiere Date"
                  type="datetime-local"
                  value={premiereDate}
                  min={minPremiereValue}
                  max={maxPremiereValue}
                  onChange={(event) => setPremiereDate(event.target.value)}
                  error={submitAttempted ? fieldErrors.premiereDate : undefined}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="border-b border-role-border-subtle">
              <h2 className="font-display text-xl font-semibold text-text-primary">Submission</h2>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <label className="flex items-start gap-3 rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-4 py-3">
                <input
                  type="checkbox"
                  checked={rightsAttested}
                  onChange={(event) => setRightsAttested(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-role-border-subtle text-role-brand-600 focus:ring-role-cta-ring"
                />
                <span className="text-sm text-text-secondary">
                  I confirm that I own or control the rights to all material in this film, including visuals, music, voices, and story elements.
                </span>
              </label>
              {submitAttempted && fieldErrors.rightsAttested ? (
                <p className="text-xs font-medium text-role-danger-fg">{fieldErrors.rightsAttested}</p>
              ) : null}

              <label className="flex items-start gap-3 rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-4 py-3">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-role-border-subtle text-role-brand-600 focus:ring-role-cta-ring"
                />
                <span className="text-sm text-text-secondary">
                  I accept the{" "}
                  <Link
                    href="/creator-terms"
                    target="_blank"
                    className="font-semibold text-text-primary underline underline-offset-4"
                  >
                    Creator Terms
                  </Link>
                  .
                </span>
              </label>
              {submitAttempted && fieldErrors.termsAccepted ? (
                <p className="text-xs font-medium text-role-danger-fg">{fieldErrors.termsAccepted}</p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-role-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-secondary">
                  {releaseOption === "premium_purchase" && releasePriceCents
                    ? `This ${isPremiere ? "premiere" : "release"} will be listed at ${formatPrice(releasePriceCents)} once approved.`
                    : `This ${isPremiere ? "premiere" : "release"} will be free once approved.`}
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={submitting} disabled={!canSubmit}>
                    Submit for Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
