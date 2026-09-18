"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  CheckCircle2,
  LoaderCircle,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContentType, Genre } from "@/types/database";
import { AI_MODELS } from "@/types/community";
import {
  normalizeVideoStoryElements,
  type VideoStoryCard,
  type VideoStoryElementKind,
  type VideoStoryElements,
} from "@/types/video";

interface StandaloneUploadFormProps {
  editVideoId?: string | null;
  seriesId?: string | null;
  episodeNumber?: number | null;
}

interface UploadResponse {
  videoId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  error?: string;
}

interface ManageResponse {
  error?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  video?: {
    id: string;
  };
}

type Visibility = "public" | "unlisted" | "private";
type UploadPhase = "idle" | "creating" | "uploading" | "done";
type StoryElementSectionKey = keyof VideoStoryElements;
const STORY_CARD_LIMIT = 6;

const STORY_ELEMENT_SECTIONS: Array<{
  key: StoryElementSectionKey;
  kind: VideoStoryElementKind;
  title: string;
  copy: string;
  imageAspect: "portrait" | "video" | "square";
}> = [
  {
    key: "characters",
    kind: "character",
    title: "Characters",
    copy: "Optional faces, roles, or archetypes that help viewers read the clip faster.",
    imageAspect: "portrait",
  },
  {
    key: "locations",
    kind: "location",
    title: "Locations",
    copy: "Optional world or setting references for where the clip happens.",
    imageAspect: "video",
  },
  {
    key: "props",
    kind: "prop",
    title: "Props",
    copy: "Optional objects, costumes, or visual anchors tied to the clip.",
    imageAspect: "square",
  },
];

function createStoryCard(): VideoStoryCard {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `story-${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    description: "",
    image_url: null,
  };
}

function normalizeTags(raw: string[]) {
  return raw
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase())
    .filter((tag, index, list) => list.indexOf(tag) === index);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${size.toFixed(size >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatEta(seconds: number | null) {
  if (!seconds || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function normalizeStoryElementsForSubmit(value: VideoStoryElements) {
  const next = STORY_ELEMENT_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = value[section.key]
        .map((card) => ({
          id: card.id,
          name: card.name.trim(),
          description: card.description.trim(),
          image_url: card.image_url?.trim() || null,
        }))
        .filter((card) => card.name);
      return acc;
    },
    {
      characters: [],
      locations: [],
      props: [],
    } as VideoStoryElements
  );

  const hasAny = STORY_ELEMENT_SECTIONS.some((section) => next[section.key].length > 0);
  return hasAny ? next : null;
}

function validateStoryElements(value: VideoStoryElements) {
  for (const section of STORY_ELEMENT_SECTIONS) {
    for (const card of value[section.key]) {
      const hasAnyContent =
        card.name.trim() ||
        card.description.trim() ||
        Boolean(card.image_url?.trim());

      if (!hasAnyContent) continue;

      if (!card.name.trim()) {
        return `Add a name for each ${section.kind} card you keep.`;
      }
    }
  }

  return null;
}

interface StoryElementSectionProps {
  title: string;
  copy: string;
  cards: VideoStoryCard[];
  imageAspect: "portrait" | "video" | "square";
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: keyof VideoStoryCard, value: string | null) => void;
}

function StoryElementSection({
  title,
  copy,
  cards,
  imageAspect,
  onAdd,
  onRemove,
  onChange,
}: StoryElementSectionProps) {
  return (
    <section className="space-y-3 rounded-[24px] border border-border bg-page p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-text-tertiary">{copy}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={cards.length >= STORY_CARD_LIMIT}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-page-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="h-3.5 w-3.5" />
          {cards.length >= STORY_CARD_LIMIT ? "Max reached" : "Add"}
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-page-secondary/70 px-4 py-3 text-sm text-text-tertiary">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="grid gap-4 rounded-[22px] border border-border bg-page-secondary p-4 lg:grid-cols-[minmax(0,1fr)_220px]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">
                    {title.slice(0, -1)} {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemove(card.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-page px-2.5 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
                <Input
                  value={card.name}
                  onChange={(event) => onChange(card.id, "name", event.target.value)}
                  placeholder={`${title.slice(0, -1)} name`}
                  label="Name"
                  maxLength={80}
                />
                <Textarea
                  value={card.description}
                  onChange={(event) => onChange(card.id, "description", event.target.value)}
                  placeholder="One or two lines of context"
                  label="Notes"
                  rows={3}
                  maxLength={280}
                  hint={`${card.description.length}/280`}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-primary">
                  Reference image <span className="text-text-tertiary">(optional)</span>
                </label>
                <ImageUpload
                  bucket="thumbnails"
                  currentUrl={card.image_url}
                  onUpload={(url) => onChange(card.id, "image_url", url)}
                  aspectRatio={imageAspect}
                  maxSizeMB={5}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function StandaloneUploadForm({
  editVideoId = null,
  seriesId = null,
  episodeNumber = null,
}: StandaloneUploadFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isEditMode = Boolean(editVideoId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadEtaSeconds, setUploadEtaSeconds] = useState<number | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);

  const [tagInput, setTagInput] = useState("");
  const [guidelinesAgreed, setGuidelinesAgreed] = useState(isEditMode);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [storyElements, setStoryElements] = useState<VideoStoryElements>({
    characters: [],
    locations: [],
    props: [],
  });

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  const [form, setForm] = useState({
    title: "",
    description: "",
    ai_tool: "",
    tags: [] as string[],
    thumbnail_url: "",
    visibility: "public" as Visibility,
    genre: "showcase" as Genre,
    content_type: (seriesId ? "episode" : "short") as ContentType,
    series_id: seriesId ?? "",
    season_number: 1,
    episode_number: episodeNumber ?? 1,
  });

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [videoFile]);

  useEffect(() => {
    if (!isEditMode || !editVideoId) {
      setStoryElements({
        characters: [],
        locations: [],
        props: [],
      });
      setLoadingExisting(false);
      return;
    }

    let mounted = true;

    async function loadExistingVideo() {
      setLoadingExisting(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("videos")
          .select("*")
          .eq("id", editVideoId)
          .single();

        if (fetchError || !data) {
          throw new Error("Could not load video for editing");
        }

        if (!mounted) return;

        setForm({
          title: data.title,
          description: data.description ?? "",
          ai_tool: data.ai_tool ?? "",
          tags: data.tags ?? [],
          thumbnail_url: data.thumbnail_url ?? "",
          visibility:
            ((data.visibility as Visibility | null) ??
              (data.is_published ? "public" : "private")) || "public",
          genre: data.genre,
          content_type: data.content_type,
          series_id: data.series_id ?? "",
          season_number: data.season_number ?? 1,
          episode_number: data.episode_number ?? 1,
        });
        setStoryElements(normalizeVideoStoryElements(data.story_elements));
        setGuidelinesAgreed(true);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load video");
        }
      } finally {
        if (mounted) {
          setLoadingExisting(false);
        }
      }
    }

    loadExistingVideo();

    return () => {
      mounted = false;
    };
  }, [editVideoId, isEditMode, supabase]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTag(rawValue: string) {
    const nextTag = rawValue.trim().replace(/^,+|,+$/g, "");
    if (!nextTag) return;

    setForm((prev) => ({
      ...prev,
      tags: normalizeTags([...prev.tags, nextTag]),
    }));
  }

  function removeTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((item) => item !== tag),
    }));
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
      setTagInput("");
      return;
    }

    if (event.key === "Backspace" && !tagInput && form.tags.length > 0) {
      setForm((prev) => ({
        ...prev,
        tags: prev.tags.slice(0, -1),
      }));
    }
  }

  function handleVideoSelection(file: File | null) {
    setVideoFile(file);
    setError(null);
  }

  function handleVideoDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingVideo(false);
    handleVideoSelection(event.dataTransfer.files?.[0] ?? null);
  }

  function handleVideoDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingVideo(true);
  }

  function handleVideoDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingVideo(false);
  }

  function addStoryCard(section: StoryElementSectionKey) {
    setStoryElements((prev) => ({
      ...prev,
      [section]:
        prev[section].length >= STORY_CARD_LIMIT
          ? prev[section]
          : [...prev[section], createStoryCard()],
    }));
  }

  function removeStoryCard(section: StoryElementSectionKey, id: string) {
    setStoryElements((prev) => ({
      ...prev,
      [section]: prev[section].filter((card) => card.id !== id),
    }));
  }

  function updateStoryCard(
    section: StoryElementSectionKey,
    id: string,
    field: keyof VideoStoryCard,
    value: string | null
  ) {
    setStoryElements((prev) => ({
      ...prev,
      [section]: prev[section].map((card) =>
        card.id === id ? { ...card, [field]: value } : card
      ),
    }));
  }

  function validate() {
    setError(null);

    if (!form.title.trim()) {
      setError("Add a title before publishing.");
      return false;
    }

    if (!isEditMode && !videoFile) {
      setError("Choose a video file first.");
      return false;
    }

    if (!isEditMode && !guidelinesAgreed) {
      setError("Confirm the upload guidelines before publishing.");
      return false;
    }

    if (!isEditMode && siteKey && !captchaToken) {
      setError("Complete the captcha check before publishing.");
      return false;
    }

    const storyValidationError = validateStoryElements(storyElements);
    if (storyValidationError) {
      setError(storyValidationError);
      return false;
    }

    return true;
  }

  async function uploadVideoFile(
    uploadUrl: string,
    uploadHeaders: Record<string, string>,
    file: File
  ) {
    const startedAt = Date.now();
    const { Upload } = await import("tus-js-client");

    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: uploadHeaders,
        metadata: {
          filetype: file.type,
          title: file.name,
        },
        onProgress(bytesUploaded, bytesTotal) {
          const pct = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(pct);

          const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 1);
          const bytesPerSecond = bytesUploaded / elapsedSeconds;
          const remainingBytes = Math.max(bytesTotal - bytesUploaded, 0);
          const remainingSeconds =
            bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : null;

          setUploadEtaSeconds(remainingSeconds);
        },
        onSuccess() {
          resolve();
        },
        onError(err) {
          reject(err);
        },
      });

      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setError(null);
    setUploadPhase("creating");
    setUploadProgress(0);
    setUploadEtaSeconds(null);

    const normalizedTags = normalizeTags(form.tags);
    const normalizedStoryElements = normalizeStoryElementsForSubmit(storyElements);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      ai_tool: form.ai_tool.trim() || null,
      content_type: form.content_type,
      genre: form.genre,
      tags: normalizedTags,
      story_elements: normalizedStoryElements,
      thumbnail_url: form.thumbnail_url || null,
      series_id: form.content_type === "episode" && form.series_id ? form.series_id : null,
      season_number: form.content_type === "episode" ? form.season_number : null,
      episode_number: form.content_type === "episode" ? form.episode_number : null,
      is_premium: false,
      pricing_model: "free" as const,
      price_cents: null,
      preview_duration_seconds: null,
      preview_type: null,
      preview_seconds: null,
      visibility: form.visibility,
      media_type: "video" as const,
      is_published: form.visibility !== "private",
      is_premiere: false,
      premiere_at: null,
      premiere_ended: false,
      captchaToken: captchaToken ?? undefined,
    };

    try {
      let nextVideoId = editVideoId;

      if (isEditMode && editVideoId) {
        const res = await fetch("/api/video/manage", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId: editVideoId,
            ...payload,
            request_upload_url: Boolean(videoFile),
          }),
        });

        const data = (await res.json()) as ManageResponse;

        if (!res.ok) {
          throw new Error(data.error || "Failed to update video");
        }

        if (videoFile) {
          if (!data.uploadUrl || !data.uploadHeaders) {
            throw new Error("Upload slot missing for replacement video");
          }

          setUploadPhase("uploading");
          await uploadVideoFile(data.uploadUrl, data.uploadHeaders, videoFile);
        }

        nextVideoId = data.video?.id ?? editVideoId;
      } else {
        const res = await fetch("/api/video/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let data: UploadResponse;
        try {
          data = (await res.json()) as UploadResponse;
        } catch {
          throw new Error(`Upload failed (${res.status}) — server returned invalid response`);
        }

        if (!res.ok) {
          throw new Error(data.error || `Upload failed (${res.status})`);
        }

        if (!videoFile) {
          throw new Error("Choose a video file first.");
        }

        setUploadPhase("uploading");
        await uploadVideoFile(data.uploadUrl, data.uploadHeaders, videoFile);
        nextVideoId = data.videoId;
      }

      if (!nextVideoId) {
        throw new Error("Video created, but no id was returned.");
      }

      setUploadPhase("done");
      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 700));
      router.push(`/watch/${nextVideoId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setUploadPhase("idle");

      if (!isEditMode && siteKey) {
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="flex items-center gap-3 rounded-[28px] border border-border bg-page-secondary px-5 py-6 text-sm text-text-secondary shadow-[var(--role-surface-elev-2)]">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading clip details...
      </div>
    );
  }

  const fileStatus =
    uploadPhase === "creating"
      ? "Preparing"
      : uploadPhase === "uploading"
        ? "Uploading"
        : uploadPhase === "done"
          ? "Ready"
          : isEditMode && !videoFile
            ? "Current file"
            : "No file";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-border bg-page-secondary shadow-[var(--role-surface-elev-2)]">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={handleVideoDragOver}
          onDragLeave={handleVideoDragLeave}
          onDrop={handleVideoDrop}
          className={`group relative overflow-hidden transition-all ${
            isDraggingVideo
              ? "bg-brand-500/8 shadow-[0_0_0_1px_rgba(52,211,153,0.18),0_0_48px_rgba(52,211,153,0.08)]"
              : ""
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => handleVideoSelection(event.target.files?.[0] ?? null)}
          />

          {videoPreviewUrl ? (
            <div className="space-y-4 p-4 sm:p-5">
              <div className="aspect-video overflow-hidden rounded-[26px] border border-border bg-page">
                <video
                  src={videoPreviewUrl}
                  className="h-full w-full object-cover"
                  controls
                  muted
                  playsInline
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {videoFile?.name}
                  </p>
                  <p className="text-xs text-text-tertiary">{formatBytes(videoFile?.size ?? 0)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="rounded-full border border-border bg-page px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleVideoSelection(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-page px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-surface"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[460px] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-border bg-page text-brand-500 transition-colors group-hover:bg-surface">
                <UploadCloud className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-4xl font-black tracking-[-0.05em] text-text-primary sm:text-5xl">
                  Drag video here
                </h2>
                {isEditMode ? (
                  <p className="text-sm text-text-tertiary">
                    Drop a new file to replace the current one.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="rounded-full border border-brand-500/25 bg-brand-500/10 px-5 py-2.5 text-sm font-semibold text-brand-500 transition-colors hover:bg-brand-500/14 hover:text-brand-400"
              >
                Choose file
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4 rounded-[28px] border border-border bg-page-secondary p-5 shadow-[var(--role-surface-elev-2)] sm:p-6">
          {seriesId && !isEditMode ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Series episode upload
            </div>
          ) : null}

          <div className="rounded-[24px] border border-border bg-page px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-500">
              Watch upload
            </p>
            <h2 className="mt-3 font-display text-2xl font-black tracking-[-0.05em] text-text-primary sm:text-[2rem]">
              Publish a clip with project-style context.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Core video details stay lightweight. Characters, locations, and props are optional if
              they make the watch page clearer.
            </p>
          </div>

          <Input
            id="title"
            label="Title"
            hint={`${form.title.length}/200`}
            maxLength={200}
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="What is this clip called?"
            className="h-12 rounded-2xl border-border bg-page px-4"
          />

          <Textarea
            id="description"
            label="Description"
            hint={`${form.description.length}/5000`}
            rows={5}
            maxLength={5000}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="What should viewers know before they watch?"
            className="rounded-2xl border-border bg-page px-4 py-3"
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <label htmlFor="ai_tool" className="text-sm font-semibold text-text-primary">
                AI model <span className="text-text-tertiary">(optional)</span>
              </label>
              <input
                id="ai_tool"
                list="upload-ai-tools"
                value={form.ai_tool}
                onChange={(event) => updateField("ai_tool", event.target.value)}
                placeholder="Kling 2.1, Seedance 2, Veo 3..."
                className="h-12 w-full rounded-2xl border border-border bg-page px-4 text-sm font-medium text-text-primary placeholder:text-text-tertiary transition-colors focus:border-brand-500/25 focus:bg-surface focus:outline-none"
              />
              <datalist id="upload-ai-tools">
                {AI_MODELS.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </div>

            <div className="rounded-[24px] border border-border bg-page p-4">
              <p className="text-sm font-semibold text-text-primary">
                Thumbnail <span className="text-text-tertiary">(optional)</span>
              </p>
              <div className="mt-4">
                <ImageUpload
                  bucket="thumbnails"
                  currentUrl={form.thumbnail_url || null}
                  onUpload={(url) => updateField("thumbnail_url", url)}
                  aspectRatio="video"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-semibold text-text-primary">
              Tags <span className="text-text-tertiary">(optional)</span>
            </label>
            <div className="rounded-2xl border border-border bg-page px-3 py-3">
              <div className="mb-2 flex flex-wrap gap-2">
                {form.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <input
                id="tags"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) {
                    addTag(tagInput);
                    setTagInput("");
                  }
                }}
                placeholder="Add tags"
                className="w-full bg-transparent px-1 text-sm font-medium text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-border bg-page-secondary/80 p-1">
            <div className="px-4 pt-4">
              <p className="text-sm font-semibold text-text-primary">
                Story package <span className="text-text-tertiary">(optional)</span>
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                Treat this like a mini project page for the clip. Add only the context that helps
                viewers understand the world, cast, or visual anchors.
              </p>
            </div>

            <div className="space-y-4 px-3 pb-3">
              {STORY_ELEMENT_SECTIONS.map((section) => (
                <StoryElementSection
                  key={section.key}
                  title={section.title}
                  copy={section.copy}
                  cards={storyElements[section.key]}
                  imageAspect={section.imageAspect}
                  onAdd={() => addStoryCard(section.key)}
                  onRemove={(id) => removeStoryCard(section.key, id)}
                  onChange={(id, field, value) =>
                    updateStoryCard(section.key, id, field, value)
                  }
                />
              ))}
            </div>
          </div>

          {!isEditMode ? (
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-page px-4 py-4 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={guidelinesAgreed}
                onChange={(event) => setGuidelinesAgreed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border bg-transparent text-brand-500 focus:ring-brand-500"
              />
              <span>I own this upload.</span>
            </label>
          ) : null}

          {!isEditMode && siteKey ? (
            <div className="rounded-2xl border border-border bg-page px-4 py-4">
              <HCaptcha
                ref={captchaRef}
                sitekey={siteKey}
                theme="dark"
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-border bg-page-secondary p-5 shadow-[var(--role-surface-elev-2)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">{fileStatus}</p>
              {uploadPhase === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-brand-500" />
              ) : uploadPhase === "creating" || uploadPhase === "uploading" ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-text-tertiary" />
              ) : null}
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-page">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{
                  width: `${uploadPhase === "creating" ? 12 : uploadPhase === "done" ? 100 : uploadProgress}%`,
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-text-tertiary">
              <span>{uploadPhase === "uploading" ? `${uploadProgress}%` : uploadPhase}</span>
              <span>{uploadPhase === "uploading" ? formatEta(uploadEtaSeconds) : ""}</span>
            </div>

            <p className="mt-4 text-xs leading-5 text-text-tertiary">
              Publish stays free. The extra story package only adds structure to the watch page if
              you decide to use it.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-text-primary px-5 text-sm font-semibold text-page transition-colors hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? "Working..." : isEditMode ? "Save" : "Publish"}
            </button>

            <Link
              href="/projects/new?mode=preorder"
              className="mt-3 inline-flex text-sm text-text-tertiary transition-colors hover:text-text-primary"
            >
              Use preorder.
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
