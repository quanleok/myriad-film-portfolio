"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RESOURCE_LICENSE_OPTIONS,
  RESOURCE_UPLOAD_CATEGORY_OPTIONS,
  RESOURCE_TAG_SUGGESTIONS,
  type ResourceCategory,
  type ResourceLicense,
} from "@/lib/resources";

interface UploadedFile {
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
}

export function ResourceUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("character_pack");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [license, setLicense] = useState<ResourceLicense>("free");
  const [thumbnail, setThumbnail] = useState<UploadedFile | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const normalizedTags = useMemo(
    () =>
      [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 12),
    [tags]
  );

  async function uploadSingle(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/resources/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as UploadedFile & { error?: string };
    if (!response.ok || !payload.file_url) {
      throw new Error(payload.error ?? "Upload failed.");
    }

    return payload;
  }

  async function handleThumbnail(file: File) {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadSingle(file);
      setThumbnail(uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload thumbnail.");
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    setError(null);
    try {
      const nextUploads: UploadedFile[] = [];
      for (const file of Array.from(fileList).slice(0, 10 - files.length)) {
        nextUploads.push(await uploadSingle(file));
      }
      setFiles((current) => [...current, ...nextUploads].slice(0, 10));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload files.");
    } finally {
      setUploading(false);
    }
  }

  function addTag(value: string) {
    const next = value.trim().toLowerCase();
    if (!next) return;
    setTags((current) => [...current, next]);
    setTagInput("");
  }

  async function submit(isPublished: boolean) {
    if (submitting || !title.trim()) return;
    setSubmitting(isPublished ? "publish" : "draft");
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          tags: normalizedTags,
          license,
          thumbnail_url: thumbnail?.file_url ?? null,
          files,
          is_published: isPublished,
        }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Could not save resource.");
      }

      if (isPublished) {
        router.push(`/resources/${payload.id}`);
        return;
      }

      setSuccess("Draft saved. It will stay private until you publish it.");
      setTitle("");
      setDescription("");
      setTags([]);
      setTagInput("");
      setThumbnail(null);
      setFiles([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save resource.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(78,213,255,0.18),rgba(16,15,26,0.94)_38%,rgba(7,17,12,0.98)_100%)]">
        <VideoHubHeader
          activeTab="resources"
          primaryHref="/resources"
          primaryLabel="Back to resources"
          primaryShortLabel="Back"
          primaryIcon="plus"
        />

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/8 bg-[rgba(12,14,20,0.92)] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8de2ff]">
                Upload a resource
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.3rem)] font-semibold tracking-[-0.07em] text-white">
                Build the shared shelf for AI filmmakers.
              </h1>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                Upload reusable packs, prompts, presets, guides, and reference bundles so the next creator starts further ahead.
              </p>
            </div>

            <div className="mt-8 space-y-6">
              <Input id="resource-title" label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-role-fg-primary">Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ResourceCategory)}
                    className="h-11 w-full rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-3 text-sm text-role-fg-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/35"
                  >
                    {RESOURCE_UPLOAD_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-role-fg-primary">License</label>
                  <select
                    value={license}
                    onChange={(event) => setLicense(event.target.value as ResourceLicense)}
                    className="h-11 w-full rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-3 text-sm text-role-fg-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/35"
                  >
                    {RESOURCE_LICENSE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-role-fg-primary">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[160px] w-full rounded-[1.2rem] border border-role-border-subtle bg-role-bg-page-secondary px-4 py-3 text-sm text-role-fg-primary outline-none placeholder:text-role-fg-tertiary focus:border-brand-500 focus:ring-2 focus:ring-brand-500/35"
                  placeholder="Tell creators what is included, what models it works with, and how to use it."
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-role-fg-primary">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {normalizedTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((current) => current.filter((value) => value !== tag))}
                      className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-sm text-text-primary"
                    >
                      {tag}
                      <X size={14} />
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {RESOURCE_TAG_SUGGESTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="rounded-full border border-white/8 bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] text-text-secondary"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <Input
                  id="resource-tag-input"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="Add tags and press Enter"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[1.3rem] border border-dashed border-white/12 bg-black/12 p-5">
                  <p className="text-sm font-semibold text-text-primary">Thumbnail</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Drop a main preview image for the grid and detail page.
                  </p>
                  <label className="mt-4 flex cursor-pointer items-center justify-center rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-8 text-sm text-text-secondary">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleThumbnail(file);
                      }}
                    />
                    <span>{thumbnail ? thumbnail.file_name : "Choose thumbnail"}</span>
                  </label>
                </div>

                <div className="rounded-[1.3rem] border border-dashed border-white/12 bg-black/12 p-5">
                  <p className="text-sm font-semibold text-text-primary">Files</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Upload up to 10 files: images, audio, text, JSON, ZIP, or PDF.
                  </p>
                  <label className="mt-4 flex cursor-pointer items-center justify-center rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-8 text-sm text-text-secondary">
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.webp,.txt,.md,.json,.zip,.pdf,.wav,.ogg,.mp3"
                      className="hidden"
                      onChange={(event) => void handleFiles(event.target.files)}
                    />
                    <span>{uploading ? "Uploading..." : "Add files"}</span>
                  </label>
                  {files.length ? (
                    <div className="mt-4 space-y-2">
                      {files.map((file) => (
                        <div key={file.file_url} className="rounded-[1rem] border border-white/8 bg-white/4 px-3 py-2 text-sm text-text-secondary">
                          {file.file_name}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="secondary" disabled={uploading || !files.length} loading={submitting === "draft"} onClick={() => void submit(false)}>
                  Save as draft
                </Button>
                <Button type="button" loading={submitting === "publish"} disabled={uploading || !files.length} onClick={() => void submit(true)}>
                  Publish
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
