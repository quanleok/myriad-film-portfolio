"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ALL_VIDEO_GENRE_LABELS } from "@/types/video";
import { formatDuration } from "@/lib/utils";
import type { Database } from "@/types/database";
import type { Genre } from "@/types/database";

type Series = Database["public"]["Tables"]["series"]["Row"];
type Video = Database["public"]["Tables"]["videos"]["Row"];

const genreOptions = Object.entries(ALL_VIDEO_GENRE_LABELS).map(([value, label]) => ({ value, label }));

interface SeriesDetailProps {
  series: Series;
  initialEpisodes: Video[];
}

export function SeriesDetail({ series, initialEpisodes }: SeriesDetailProps) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    title: series.title,
    description: series.description ?? "",
    genre: series.genre as Genre,
    thumbnail_url: series.thumbnail_url ?? "",
    cover_image_url: (series as any).cover_image_url ?? "",
    is_published: series.is_published,
    pricing_model: ((series as any).pricing_model ?? "mixed") as "free" | "premium" | "mixed",
    tags: (series.tags ?? []) as string[],
  });
  const [tagInput, setTagInput] = useState("");

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/series/${series.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateEpisodeOrder(
    episodeId: string,
    seasonNumber: number,
    episodeNumber: number
  ) {
    try {
      await fetch("/api/video/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: episodeId,
          season_number: seasonNumber,
          episode_number: episodeNumber,
        }),
      });

      setEpisodes((prev) =>
        prev
          .map((ep) =>
            ep.id === episodeId
              ? {
                  ...ep,
                  season_number: seasonNumber,
                  episode_number: episodeNumber,
                }
              : ep
          )
          .sort(
            (a, b) =>
              (a.season_number ?? 0) - (b.season_number ?? 0) ||
              (a.episode_number ?? 0) - (b.episode_number ?? 0)
          )
      );
    } catch {
      setError("Failed to update episode order");
    }
  }

  function handleDeleteClick() {
    if (episodes.length > 0) {
      setError("Cannot delete series with episodes. Remove all episodes first.");
      return;
    }
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirmed() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/series/${series.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      router.push("/content");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleReorder(episodeIds: string[]) {
    try {
      await fetch(`/api/series/${series.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeIds }),
      });
      // Re-sort locally
      const idOrder = new Map(episodeIds.map((id, i) => [id, i + 1]));
      setEpisodes((prev) =>
        [...prev]
          .map((ep) => ({
            ...ep,
            episode_number: idOrder.get(ep.id) ?? ep.episode_number,
          }))
          .sort(
            (a, b) =>
              (a.season_number ?? 0) - (b.season_number ?? 0) ||
              (a.episode_number ?? 0) - (b.episode_number ?? 0)
          )
      );
    } catch {
      setError("Failed to reorder episodes");
    }
  }

  const nextEpisodeNumber = episodes.length > 0
    ? Math.max(...episodes.map((ep) => ep.episode_number ?? 0)) + 1
    : 1;

  async function handleToggleFreePreview(episodeId: string, currentlyFree: boolean) {
    try {
      await fetch("/api/video/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: episodeId,
          is_premium: currentlyFree, // toggle: if currently free, make premium
          pricing_model: currentlyFree ? "per_video" : "free",
        }),
      });
      setEpisodes((prev) =>
        prev.map((ep) =>
          ep.id === episodeId
            ? { ...ep, is_premium: currentlyFree, pricing_model: currentlyFree ? "per_video" as any : "free" as any }
            : ep
        )
      );
    } catch {
      setError("Failed to update preview status");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{series.title}</h1>
        <Badge variant={form.is_published ? "free" : "default"}>
          {form.is_published ? "Published" : "Draft"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-text-primary">Series Details</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="title"
            label="Title"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
          />
          <Textarea
            id="description"
            label="Description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={3}
          />
          <Select
            id="genre"
            label="Genre"
            options={genreOptions}
            value={form.genre}
            onChange={(e) => updateField("genre", e.target.value as Genre)}
          />
          <Input
            id="thumbnail_url"
            label="Thumbnail URL"
            value={form.thumbnail_url}
            onChange={(e) => updateField("thumbnail_url", e.target.value)}
          />
          <Input
            id="cover_image_url"
            label="Cover Image URL (16:9)"
            value={form.cover_image_url}
            onChange={(e) => updateField("cover_image_url", e.target.value)}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">Pricing</p>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface p-1">
              {(
                [
                  { value: "free", label: "Free", color: "bg-surface-hover text-text-primary" },
                  { value: "mixed", label: "Mixed", color: "bg-text-primary text-page" },
                  { value: "premium", label: "Premium", color: "bg-amber-500 text-black" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("pricing_model", opt.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    form.pricing_model === opt.value
                      ? opt.color
                      : "text-text-tertiary hover:bg-surface-hover"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit_tags" className="block text-sm font-medium text-text-secondary">
              Tags
            </label>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <div className="mb-2 flex flex-wrap gap-2">
                {form.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        tags: prev.tags.filter((t) => t !== tag),
                      }))
                    }
                    className="inline-flex items-center rounded-full bg-surface-active px-2.5 py-1 text-xs text-text-primary hover:bg-surface-active"
                  >
                    {tag}
                    <span className="ml-1 text-text-secondary">&times;</span>
                  </button>
                ))}
              </div>
              <input
                id="edit_tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = tagInput.trim().toLowerCase();
                    if (val && !form.tags.includes(val)) {
                      setForm((prev) => ({
                        ...prev,
                        tags: [...prev.tags, val],
                      }));
                    }
                    setTagInput("");
                  }
                }}
                placeholder="Type tag and press comma"
                className="w-full border-0 bg-transparent p-0 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => updateField("is_published", e.target.checked)}
                className="rounded accent-brand-600"
              />
              Published
            </label>
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleDeleteClick}
              disabled={deleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {deleting ? "Deleting..." : "Delete Series"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Episodes ({episodes.length})
            </h2>
            <Link
              href={`/upload?series=${series.id}&episode=${nextEpisodeNumber}`}
            >
              <Button size="sm">Add Episode</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {episodes.length === 0 ? (
            <p className="py-8 text-center text-text-tertiary">
              No episodes yet. Add your first episode to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {episodes.map((episode) => {
                const isFreeLesson = !episode.is_premium && (episode.pricing_model as string) === "free";
                return (
                  <div
                    key={episode.id}
                    className="flex items-center gap-4 rounded-lg border border-border bg-surface p-3 transition-all duration-200 hover:border-subtle hover:shadow-md"
                  >
                    <div className="flex h-8 w-12 items-center justify-center rounded bg-surface-hover text-sm font-mono text-text-tertiary">
                      {`S${episode.season_number ?? 1}E${episode.episode_number ?? 1}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {episode.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        {episode.duration_seconds && (
                          <span>{formatDuration(episode.duration_seconds)}</span>
                        )}
                        <Badge
                          variant={episode.is_published ? "free" : "default"}
                        >
                          {episode.is_published ? "Published" : "Draft"}
                        </Badge>
  
                      </div>
                    </div>
                    <div className="flex items-center gap-2">

                      <Input
                        id={`season-${episode.id}`}
                        value={episode.season_number ?? 1}
                        onChange={(e) =>
                          handleUpdateEpisodeOrder(
                            episode.id,
                            Number(e.target.value),
                            episode.episode_number ?? 1
                          )
                        }
                        type="number"
                        min={1}
                        className="w-16 text-center"
                      />
                      <Input
                        id={`episode-${episode.id}`}
                        value={episode.episode_number ?? 1}
                        onChange={(e) =>
                          handleUpdateEpisodeOrder(
                            episode.id,
                            episode.season_number ?? 1,
                            Number(e.target.value)
                          )
                        }
                        type="number"
                        min={1}
                        className="w-16 text-center"
                      />
                      <Link href={`/upload?edit=${episode.id}`}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowDeleteConfirm(false); }}
        >
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-border bg-page-secondary p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-text-primary">
              Delete Series?
            </h3>
            <p className="mt-2 text-sm text-text-secondary">
              This will permanently delete <span className="font-medium text-text-primary">{series.title}</span>. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirmed} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
