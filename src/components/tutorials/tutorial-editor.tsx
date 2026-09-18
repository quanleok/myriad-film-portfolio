"use client";

import { useDeferredValue, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  Loader2,
  Quote,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TutorialMarkdown } from "@/components/tutorials/tutorial-markdown";
import {
  sanitizeTutorialTags,
} from "@/lib/tutorials";
import type { TutorialDetail } from "@/types/tutorial";
import {
  TUTORIAL_CATEGORY_OPTIONS,
  TUTORIAL_DIFFICULTY_OPTIONS,
  TUTORIAL_TITLE_MAX,
  type TutorialCategory,
  type TutorialDifficulty,
} from "@/types/tutorial";

type SaveMode = "draft" | "publish";

function normalizeFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function TutorialEditor({
  initialTutorial,
}: {
  initialTutorial: TutorialDetail | null;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [tutorialId, setTutorialId] = useState(initialTutorial?.id ?? null);
  const [title, setTitle] = useState(initialTutorial?.title ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialTutorial?.cover_image_url ?? "");
  const [category, setCategory] = useState<TutorialCategory>(initialTutorial?.category ?? "general");
  const [difficulty, setDifficulty] = useState<TutorialDifficulty>(initialTutorial?.difficulty ?? "beginner");
  const [tags, setTags] = useState<string[]>(initialTutorial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [body, setBody] = useState(initialTutorial?.body_markdown ?? "");
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [uploadingLabel, setUploadingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const deferredBody = useDeferredValue(body);

  function setSelectionValue(nextValue: string, nextCursor: number) {
    setBody(nextValue);

    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function wrapSelection(prefix: string, suffix = prefix, placeholder = "") {
    const element = textareaRef.current;
    if (!element) {
      setBody((current) => `${current}${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = body.slice(start, end) || placeholder;
    const next = `${body.slice(0, start)}${prefix}${selected}${suffix}${body.slice(end)}`;
    const nextCursor = start + prefix.length + selected.length + suffix.length;
    setSelectionValue(next, nextCursor);
  }

  function insertText(text: string) {
    const element = textareaRef.current;
    if (!element) {
      setBody((current) => `${current}\n${text}`);
      return;
    }

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const prefix = start === 0 ? "" : "\n";
    const suffix = body.slice(end).startsWith("\n") ? "" : "\n";
    const next = `${body.slice(0, start)}${prefix}${text}${suffix}${body.slice(end)}`;
    const nextCursor = start + prefix.length + text.length;
    setSelectionValue(next, nextCursor);
  }

  function handleAddTag() {
    const next = sanitizeTutorialTags([...tags, tagInput]);
    setTags(next);
    setTagInput("");
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/tutorials/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? "Image upload failed");
    }

    return payload.url;
  }

  async function uploadVideo(file: File) {
    const response = await fetch("/api/tutorials/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaType: "video",
        title: normalizeFileName(file.name) || title || "Tutorial video",
      }),
    });

    const payload = (await response.json()) as {
      bunnyVideoId?: string;
      uploadUrl?: string;
      uploadHeaders?: Record<string, string>;
      playbackUrl?: string;
      error?: string;
    };

    if (!response.ok || !payload.uploadUrl || !payload.playbackUrl) {
      throw new Error(payload.error ?? "Video upload failed");
    }

    const { Upload } = await import("tus-js-client");

    await new Promise<void>((resolve, reject) => {
      const upload = new Upload(file, {
        endpoint: payload.uploadUrl!,
        retryDelays: [0, 3000, 5000, 10000],
        headers: payload.uploadHeaders,
        metadata: {
          filetype: file.type,
          title: normalizeFileName(file.name) || "Tutorial video",
        },
        onSuccess: () => resolve(),
        onError: (uploadError) => reject(uploadError),
      });

      upload.findPreviousUploads().then((previous) => {
        if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      });
    });

    return payload.playbackUrl;
  }

  async function handleCoverUpload(file: File) {
    setUploadingLabel("Uploading cover…");
    setError(null);

    try {
      const url = await uploadImage(file);
      setCoverImageUrl(url);
      setStatus("Cover image uploaded.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Cover upload failed");
    } finally {
      setUploadingLabel(null);
    }
  }

  async function handleInlineImage(file: File) {
    setUploadingLabel("Uploading image…");
    setError(null);

    try {
      const url = await uploadImage(file);
      insertText(`![${normalizeFileName(file.name) || "image"}](${url})`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed");
    } finally {
      setUploadingLabel(null);
    }
  }

  async function handleInlineVideo(file: File) {
    setUploadingLabel("Uploading video…");
    setError(null);

    try {
      const url = await uploadVideo(file);
      insertText(`![video](${url})`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Video upload failed");
    } finally {
      setUploadingLabel(null);
    }
  }

  async function saveTutorial(mode: SaveMode) {
    setSavingMode(mode);
    setError(null);
    setStatus(null);

    try {
      const endpoint = tutorialId ? `/api/tutorials/${tutorialId}` : "/api/tutorials";
      const method = tutorialId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body_markdown: body,
          cover_image_url: coverImageUrl || null,
          category,
          difficulty,
          tags,
          is_published: mode === "publish",
        }),
      });

      const payload = (await response.json()) as {
        tutorial?: TutorialDetail;
        error?: string;
      };

      if (!response.ok || !payload.tutorial) {
        throw new Error(payload.error ?? "Failed to save tutorial");
      }

      const nextTutorial = payload.tutorial;
      setTutorialId(nextTutorial.id);
      if (mode === "publish") {
        router.push(`/tutorials/${nextTutorial.slug}`);
        router.refresh();
        return;
      }

      setStatus("Draft saved.");
      if (!tutorialId) {
        router.replace(`/tutorials/write?id=${encodeURIComponent(nextTutorial.id)}`);
      } else {
        router.refresh();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save tutorial");
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Tutorials
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-text-primary">
            {initialTutorial ? "Edit tutorial" : "Write a tutorial"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Markdown only. Title, body, images, videos, comments. Nothing extra.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void saveTutorial("draft")}
            loading={savingMode === "draft"}
          >
            Save draft
          </Button>
          <Button
            type="button"
            onClick={() => void saveTutorial("publish")}
            loading={savingMode === "publish"}
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(9,13,13,0.78)] p-5 sm:p-6">
          <Input
            id="tutorial-title"
            label="Title *"
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, TUTORIAL_TITLE_MAX))}
            placeholder="How I keep characters consistent in Seedance 2"
            hint={`${title.length}/${TUTORIAL_TITLE_MAX}`}
          />

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-role-fg-primary">
                Cover image
              </label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-[1.25rem] border border-dashed border-white/12 bg-black/20 text-sm text-text-secondary transition-colors hover:border-brand-500/26 hover:text-text-primary"
              >
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImageUrl} alt="Tutorial cover" className="h-full w-full object-cover" />
                ) : (
                  <span>Drop a cover or click to upload</span>
                )}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleCoverUpload(file);
                  event.target.value = "";
                }}
              />
            </div>

            <Select
              id="tutorial-category"
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value as TutorialCategory)}
              options={TUTORIAL_CATEGORY_OPTIONS}
            />

            <Select
              id="tutorial-difficulty"
              label="Difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as TutorialDifficulty)}
              options={TUTORIAL_DIFFICULTY_OPTIONS}
            />
          </div>

          <div className="mt-5">
            <label className="block text-sm font-semibold text-role-fg-primary">Tags</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                  className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                >
                  {tag} ×
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                id="tutorial-tag-input"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="seedance, workflow, character"
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(9,13,13,0.78)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Body *</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Use markdown. Images and video uploads insert inline markup automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "Bold",
                  icon: Bold,
                  action: () => wrapSelection("**", "**", "bold text"),
                },
                {
                  label: "Italic",
                  icon: Italic,
                  action: () => wrapSelection("*", "*", "italic text"),
                },
                {
                  label: "Link",
                  icon: Link2,
                  action: () => {
                    const url = window.prompt("Paste a URL");
                    if (!url) return;
                    wrapSelection("[", `](${url})`, "link text");
                  },
                },
                {
                  label: "Image",
                  icon: ImagePlus,
                  action: () => imageInputRef.current?.click(),
                },
                {
                  label: "Video",
                  icon: Video,
                  action: () => videoInputRef.current?.click(),
                },
                {
                  label: "Code",
                  icon: Code2,
                  action: () => wrapSelection("\n```text\n", "\n```\n", "Prompt or code"),
                },
                {
                  label: "Quote",
                  icon: Quote,
                  action: () => wrapSelection("\n> ", "\n", "Quoted note"),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  <item.icon size={15} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleInlineImage(file);
              event.target.value = "";
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleInlineVideo(file);
              event.target.value = "";
            }}
          />

          <div className="mt-4 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Textarea
                ref={textareaRef}
                id="tutorial-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write the tutorial in markdown..."
                className="min-h-[480px] font-mono text-[13px] leading-6"
              />
            </div>

            <div className="rounded-[1.35rem] border border-white/8 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Preview</h3>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Live markdown render with code copy buttons.
                  </p>
                </div>
                {uploadingLabel ? (
                  <span className="inline-flex items-center gap-2 text-xs text-brand-200">
                    <Loader2 size={14} className="animate-spin" />
                    {uploadingLabel}
                  </span>
                ) : null}
              </div>
              <TutorialMarkdown
                markdown={deferredBody || "_Nothing yet. Start writing on the left._"}
                className="max-h-[540px] overflow-y-auto pr-2"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          {error ? <p className="text-role-danger-fg">{error}</p> : null}
          {!error && status ? <p className="text-brand-200">{status}</p> : null}
        </div>
        <div className="text-xs text-text-tertiary">
          Body supports images, videos, links, quotes, and fenced code blocks.
        </div>
      </div>
    </div>
  );
}
