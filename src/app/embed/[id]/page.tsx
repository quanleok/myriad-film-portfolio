import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { EmbedPlayer } from "@/components/video/EmbedPlayer";
import { getSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

interface EmbedPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autoplay?: string; muted?: string }>;
}

function parseBoolean(value: string | undefined) {
  return value === "1" || value === "true";
}

export async function generateMetadata({
  params,
}: EmbedPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video } = await supabase
    .from("videos")
    .select("title, description, thumbnail_url, is_published")
    .eq("id", id)
    .single();

  if (!video || !video.is_published) {
    return { title: "Embed — Myriad Spring" };
  }

  return {
    title: `${video.title} — Embed`,
    description: video.description ?? "Embedded video from Myriad Spring.",
    openGraph: {
      title: `${video.title} — Embed`,
      description: video.description ?? "Embedded video from Myriad Spring.",
      type: "video.other",
      images: video.thumbnail_url ? [{ url: video.thumbnail_url }] : undefined,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EmbedPage({
  params,
  searchParams,
}: EmbedPageProps) {
  const { id } = await params;
  const { autoplay, muted } = await searchParams;
  const supabase = await createClient();
  const siteUrl = getSiteUrl();

  const { data: video } = await supabase
    .from("videos")
    .select(
      `
      id,
      title,
      bunny_video_id,
      video_url,
      is_published,
      pricing_model,
      preview_seconds,
      is_premiere,
      premiere_at,
      profiles!videos_creator_id_fkey (
        display_name,
        username
      )
    `
    )
    .eq("id", id)
    .single();

  if (!video || !video.is_published) {
    notFound();
  }

  const creator = (video as any).profiles as {
    display_name: string;
    username: string;
  } | null;

  // Handle future premiere
  if ((video as any).is_premiere && (video as any).premiere_at) {
    const premiereDate = new Date((video as any).premiere_at);
    if (premiereDate > new Date()) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 text-center text-sm text-white/50">
          Premieres on {premiereDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
        </div>
      );
    }
  }

  const isPremium = video.pricing_model !== "free";

  // SECURITY: Only pass unsigned URL for free videos. Premium embeds show a
  // "Watch on Myriad Spring" link instead of exposing the full stream.
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;
  const embedStreamUrl = isPremium
    ? null
    : video.bunny_video_id && cdnHostname
      ? `https://${cdnHostname}/${video.bunny_video_id}/playlist.m3u8`
      : video.video_url ?? null;

  if (!embedStreamUrl) {
    const watchUrl = `${siteUrl}/watch/${video.id}`;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-4 text-center text-sm text-white/50">
        {isPremium ? (
          <>
            <p>This is premium content.</p>
            <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="rounded bg-white/10 px-4 py-2 text-white hover:bg-white/20 transition">
              Watch on Myriad Spring
            </a>
          </>
        ) : (
          <p>Video stream URL is not available for embedding.</p>
        )}
      </div>
    );
  }
  const watchUrl = `${siteUrl}/watch/${video.id}`;

  return (
    <div className="min-h-screen bg-black">
      <EmbedPlayer
        videoUrl={embedStreamUrl}
        title={video.title}
        autoplay={parseBoolean(autoplay)}
        muted={parseBoolean(muted)}
        isPremium={isPremium}
        previewSeconds={video.preview_seconds ?? 10}
        creatorName={creator?.display_name ?? "this creator"}
        watchUrl={watchUrl}
      />
    </div>
  );
}
