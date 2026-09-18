"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowDownToLine, Heart, Share2 } from "lucide-react";
import { VideoHubHeader } from "@/components/landing/video-hub-header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ResourceFileList } from "@/components/resources/resource-file-list";
import { ResourceComments } from "@/components/resources/resource-comments";
import { ResourceCard } from "@/components/resources/resource-card";
import {
  formatResourceCount,
  RESOURCE_CATEGORY_LABELS,
  RESOURCE_LICENSE_LABELS,
  type ResourceCommentRecord,
  type ResourceDetail as ResourceDetailRecord,
  type ResourceSummary,
} from "@/lib/resources";

interface ResourceDetailProps {
  resource: ResourceDetailRecord;
  moreByCreator: ResourceSummary[];
  similarResources: ResourceSummary[];
}

export function ResourceDetail({ resource, moreByCreator, similarResources }: ResourceDetailProps) {
  const [likedByViewer, setLikedByViewer] = useState(resource.likedByViewer);
  const [likeCount, setLikeCount] = useState(resource.like_count);
  const [comments, setComments] = useState<ResourceCommentRecord[]>(resource.comments);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(
    resource.thumbnail_url ?? resource.files.find((file) => file.file_type?.startsWith("image"))?.file_url ?? null
  );

  const previewImages = useMemo(
    () =>
      resource.files.filter((file) => file.file_type?.startsWith("image")).slice(0, 5),
    [resource.files]
  );

  async function toggleLike() {
    if (resource.isSample) return;
    const response = await fetch(`/api/resources/${resource.id}/like`, { method: "POST" });
    const payload = (await response.json()) as {
      liked?: boolean;
      like_count?: number;
    };
    if (typeof payload.liked === "boolean") setLikedByViewer(payload.liked);
    if (typeof payload.like_count === "number") setLikeCount(payload.like_count);
  }

  async function downloadFile(fileUrl: string) {
    if (!fileUrl || resource.isSample) return;
    await fetch(`/api/resources/${resource.id}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl }),
    });
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  async function downloadAll() {
    if (resource.isSample) return;
    await fetch(`/api/resources/${resource.id}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: resource.files[0]?.file_url ?? null }),
    });
    resource.files.forEach((file) => {
      window.open(file.file_url, "_blank", "noopener,noreferrer");
    });
  }

  async function shareResource() {
    const href = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: resource.title, url: href });
      return;
    }
    await navigator.clipboard.writeText(href);
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(78,213,255,0.18),rgba(16,15,26,0.94)_38%,rgba(7,17,12,0.98)_100%)]">
        <VideoHubHeader
          activeTab="resources"
          primaryHref="/resources/upload"
          primaryLabel="Upload resource"
          primaryShortLabel="Upload"
          primaryIcon="plus"
        />

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/resources"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-text-primary transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          >
            <ArrowLeft size={15} />
            Back to Resources
          </Link>

          <section className="rounded-[2rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[rgba(78,213,255,0.22)] bg-[rgba(11,37,49,0.82)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c8f4ff]">
                    {RESOURCE_CATEGORY_LABELS[resource.category]}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    {RESOURCE_LICENSE_LABELS[resource.license]}
                  </span>
                  {resource.isSample ? (
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      Sample shelf
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-4 font-display text-[clamp(2rem,4.8vw,4rem)] font-semibold tracking-[-0.07em] text-white">
                  {resource.title}
                </h1>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar
                    src={resource.creator?.avatar_url}
                    fallback={resource.creator?.display_name ?? resource.creator?.username ?? "R"}
                    size="md"
                    className="rounded-[16px] ring-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {resource.creator?.display_name ?? "Community creator"}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {resource.creator?.username ? `@${resource.creator.username}` : "Community upload"} · Uploaded{" "}
                      {new Date(resource.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="secondary" onClick={toggleLike} disabled={resource.isSample} leftIcon={<Heart size={15} />}>
                  Like ({formatResourceCount(likeCount)})
                </Button>
                <Button type="button" leftIcon={<ArrowDownToLine size={15} />} onClick={downloadAll} disabled={resource.isSample}>
                  Download ({formatResourceCount(resource.download_count)})
                </Button>
                <Button type="button" variant="secondary" leftIcon={<Share2 size={15} />} onClick={() => void shareResource()}>
                  Share
                </Button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
            <div className="space-y-6">
              <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                  Preview
                </p>
                <div className="mt-4 aspect-[16/10] overflow-hidden rounded-[1.4rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(78,213,255,0.16),rgba(18,16,32,0.96)_40%,rgba(7,17,12,0.98)_100%)]">
                  {activePreviewUrl ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.28)), url(${activePreviewUrl})` }}
                    />
                  ) : null}
                </div>
                {previewImages.length ? (
                  <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                    {previewImages.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setActivePreviewUrl(file.file_url)}
                        className="h-24 w-36 shrink-0 overflow-hidden rounded-[1rem] border border-white/8 bg-[rgba(255,255,255,0.04)]"
                      >
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${file.file_url})` }}
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                  Description
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-text-secondary">
                  {resource.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[11px] text-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              <ResourceFileList
                resource={resource}
                files={resource.files}
                onDownload={(file) => void downloadFile(file.file_url)}
                onDownloadAll={() => void downloadAll()}
              />

              <ResourceComments
                resourceId={resource.id}
                comments={comments}
                onCommentsUpdate={setComments}
                disabled={resource.isSample}
              />
            </div>

            <div className="space-y-6">
              {moreByCreator.length ? (
                <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    More by {resource.creator?.username ? `@${resource.creator.username}` : "this creator"}
                  </p>
                  <div className="mt-4 space-y-4">
                    {moreByCreator.map((item) => (
                      <ResourceCard key={item.id} resource={item} />
                    ))}
                  </div>
                </section>
              ) : null}

              {similarResources.length ? (
                <section className="rounded-[1.8rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
                    Similar resources
                  </p>
                  <div className="mt-4 space-y-4">
                    {similarResources.map((item) => (
                      <ResourceCard key={item.id} resource={item} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
