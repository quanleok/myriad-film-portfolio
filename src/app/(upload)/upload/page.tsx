import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PublicSurfaceHeader } from "@/components/public/public-surface-header";
import { createClient } from "@/lib/supabase/server";
import { StandaloneUploadForm } from "@/components/upload/standalone-upload-form";

export const metadata: Metadata = {
  title: "Upload Work — Myriad Spring",
  description:
    "Upload work to Myriad Spring with a watch-ready publishing flow for video, description, thumbnail, and optional story context.",
};

interface UploadPageProps {
  searchParams: Promise<{ edit?: string; series?: string; episode?: string }>;
}

function buildRedirectPath(params: { edit?: string; series?: string; episode?: string }) {
  const search = new URLSearchParams();

  if (params.edit) search.set("edit", params.edit);
  if (params.series) search.set("series", params.series);
  if (params.episode) search.set("episode", params.episode);

  const next = search.toString();
  return next ? `/upload?${next}` : "/upload";
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const params = await searchParams;
  const isEditMode = Boolean(params.edit);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(buildRedirectPath(params))}`);
  }

  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen bg-page text-text-primary">
        <PublicSurfaceHeader backHref="/watch" backLabel="Back to watch" />

        <main className="brand-halo-bg mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl items-center px-4 py-12 sm:px-6">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-page/95 p-8 shadow-sm backdrop-blur-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-500">
              Upload locked
            </p>
            <h1 className="mt-4 font-display text-4xl font-black tracking-[-0.06em] text-text-primary sm:text-5xl">
              Verify your email before publishing.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-text-secondary sm:text-base">
              Check your inbox for the verification link, then reload this page. We keep upload
              open only for confirmed accounts so the hub stays clean and searchable.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-text-primary">
      <PublicSurfaceHeader backHref="/watch" backLabel="Back to watch" />

      <main className="brand-halo-bg mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <StandaloneUploadForm
          editVideoId={params.edit ?? null}
          seriesId={params.series ?? null}
          episodeNumber={params.episode ? Number(params.episode) : null}
        />
      </main>
    </div>
  );
}
