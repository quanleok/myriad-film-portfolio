"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { FORUM_CATEGORIES, type ForumCategory } from "@/lib/forum";

export function ForumPostEditor() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ForumCategory>("general");
  const [tags, setTags] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedCategories = useMemo(
    () => FORUM_CATEGORIES.filter((item) => isAdmin || item.value !== "announcements"),
    [isAdmin]
  );

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/forum/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as {
      file_url?: string;
      file_name?: string;
      file_type?: string | null;
      error?: string;
    };

    if (!response.ok || !payload.file_url) {
      throw new Error(payload.error ?? "Could not upload file.");
    }

    const snippet =
      payload.file_type?.startsWith("image/")
        ? `\n\n![${payload.file_name ?? "upload"}](${payload.file_url})\n`
        : `\n\n[${payload.file_name ?? "attachment"}](${payload.file_url})\n`;

    setBodyMarkdown((current) => `${current}${snippet}`);
  }

  async function submit() {
    if (submitting || !title.trim() || !bodyMarkdown.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body_markdown: bodyMarkdown.trim(),
          category,
          tags: tags
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Could not create post.");
      }

      router.push(`/forum/${payload.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(112,122,255,0.16),rgba(16,15,26,0.94)_38%,rgba(7,17,12,0.98)_100%)]">
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/8 bg-[rgba(12,14,20,0.92)] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#b7b4ff]">
                New thread
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,4vw,3.1rem)] font-semibold tracking-[-0.07em] text-white">
                Start a conversation worth returning to.
              </h1>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                Ask a sharp question, share a workflow, or post a breakdown other creators can actually use.
              </p>
            </div>

            <div className="mt-8 space-y-6">
              <Input
                id="forum-title"
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Best settings for action scenes in Seedance 2?"
              />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-role-fg-primary">Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ForumCategory)}
                    className="h-11 w-full rounded-xl border border-role-border-subtle bg-role-bg-page-secondary px-3 text-sm text-role-fg-primary outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/35"
                  >
                    {allowedCategories.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  id="forum-tags"
                  label="Tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="seedance, action, camera"
                  hint="Comma-separated. Optional."
                />
              </div>

              <div className="rounded-[1.3rem] border border-white/8 bg-black/12 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("write")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "write" ? "bg-[rgba(0,232,123,0.14)] text-white" : "text-text-secondary"}`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("preview")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "preview" ? "bg-[rgba(127,119,221,0.16)] text-white" : "text-text-secondary"}`}
                    >
                      Preview
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        setError(null);
                        try {
                          await handleUpload(file);
                        } catch (uploadError) {
                          setError(uploadError instanceof Error ? uploadError.message : "Could not upload asset.");
                        } finally {
                          setUploading(false);
                          event.target.value = "";
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<Upload size={15} />}
                      loading={uploading}
                    >
                      Upload image/video
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  {mode === "write" ? (
                    <Textarea
                      label="Body"
                      value={bodyMarkdown}
                      onChange={(event) => setBodyMarkdown(event.target.value)}
                      className="min-h-[320px] resize-y rounded-[1rem] border-white/10 bg-[rgba(255,255,255,0.03)]"
                      placeholder="Write in markdown. Code fences, images, links, and lists all work."
                    />
                  ) : (
                    <div className="min-h-[320px] rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-4">
                      {bodyMarkdown.trim() ? (
                        <MarkdownRenderer content={bodyMarkdown} />
                      ) : (
                        <p className="text-sm text-text-tertiary">Nothing to preview yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-text-tertiary">
                  Markdown supported. Images embed inline. Video uploads insert a playable link.
                </p>
                <Button type="button" onClick={submit} loading={submitting}>
                  Publish thread
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

