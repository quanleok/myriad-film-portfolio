import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { ProjectPageClient } from "@/components/projects/project-page-client";
import { FF_PROJECTS_ENABLED } from "@/lib/feature-flags";
import {
  PROJECT_FORMAT_LABELS,
  PROJECT_GENRE_LABELS,
} from "@/types/project";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

async function fetchProjectMeta(slug: string) {
  const supabase = await createClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let query = supabase
    .from("projects")
    .select(
      `
      id, slug, title, hook, genre, format, teaser_thumbnail_url,
      preorder_count_cache, unlock_target, lifecycle_status,
      preorder_price_cents,
      profiles!projects_creator_id_fkey ( display_name, username )
    `
    );

  if (isUuid) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data } = await query.single();
  return data as {
    id: string;
    slug: string | null;
    title: string;
    hook: string | null;
    genre: string;
    format: string;
    teaser_thumbnail_url: string | null;
    preorder_count_cache: number;
    unlock_target: number | null;
    lifecycle_status: string;
    preorder_price_cents: number | null;
    profiles: { display_name: string; username: string | null } | null;
  } | null;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!FF_PROJECTS_ENABLED) {
    return { title: "Project" };
  }

  const project = await fetchProjectMeta(slug);

  if (!project) {
    return {
      title: "Project Not Found",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = getSiteUrl();
  const creatorName = project.profiles?.display_name ?? "Unknown Creator";
  const projectUrl = `${siteUrl}/project/${project.slug ?? project.id}`;

  const genreLabel = PROJECT_GENRE_LABELS[project.genre] ?? project.genre;
  const formatLabel = PROJECT_FORMAT_LABELS[project.format] ?? project.format;

  // Build a rich description for social cards
  const preorderInfo = project.unlock_target
    ? `${project.preorder_count_cache}/${project.unlock_target} preorders`
    : `${project.preorder_count_cache} preorders`;

  const description = project.hook
    ? `${project.hook} — ${genreLabel} ${formatLabel} by ${creatorName}. ${preorderInfo}.`
    : `${genreLabel} ${formatLabel} by ${creatorName} on Myriad Spring. ${preorderInfo}.`;

  const title = `${project.title} — ${creatorName}`;

  return {
    title,
    description,
    keywords: [
      "AI film",
      "preorder",
      genreLabel,
      formatLabel,
      creatorName,
      "Myriad Spring",
    ],
    alternates: { canonical: projectUrl },
    openGraph: {
      title: project.title,
      description,
      url: projectUrl,
      siteName: "Myriad Spring",
      type: "website",
      images: project.teaser_thumbnail_url
        ? [
            {
              url: project.teaser_thumbnail_url,
              alt: project.title,
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: project.teaser_thumbnail_url
        ? [project.teaser_thumbnail_url]
        : undefined,
    },
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  if (!FF_PROJECTS_ENABLED) {
    redirect("/browse");
  }

  const { slug } = await params;
  return <ProjectPageClient slugOrId={slug} />;
}
