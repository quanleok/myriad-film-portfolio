import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProjectsSurfacePage } from "@/components/landing/projects-surface-page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Film Projects — Preorder & Premiere",
  description: "Discover AI film projects. Preorder to unlock, follow productions, and watch premieres.",
  alternates: {
    canonical: "/projects",
  },
};

async function fetchSection(status: string, sort: string, limit: number) {
  const { getSiteUrl } = await import("@/lib/site-url");
  const base = getSiteUrl();
  const params = new URLSearchParams({ sort, limit: String(limit) });
  if (status) params.set("status", status);
  try {
    const res = await fetch(`${base}/api/projects/browse?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.projects ?? [];
  } catch {
    return [];
  }
}

export default async function ProjectsLandingPage() {
  const [premiering, unlocking, inProduction, released, editorial] =
    await Promise.all([
      fetchSection("premiering", "recent_activity", 8),
      fetchSection("unlocking", "momentum", 8),
      fetchSection("in_production", "recent_activity", 8),
      fetchSection("released", "recent_activity", 8),
      fetchSection("", "recent_activity", 9),
    ]);

  return (
    <ProjectsSurfacePage
      initialSections={{
        premiering,
        unlocking,
        in_production: inProduction,
        released,
      }}
      initialEditorial={editorial}
    />
  );
}
