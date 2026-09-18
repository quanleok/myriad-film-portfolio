import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/community`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/toolkit`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${siteUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/premieres`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/creators`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/talent`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/creator-terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return staticRoutes;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const [{ data: videos }, { data: creators }, { data: projects }, { data: newsPosts }, { data: resources }] = await Promise.all([
    supabase
      .from("videos")
      .select("id, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("username, updated_at")
      .eq("is_creator", true)
      .not("username", "is", null),
    supabase
      .from("projects")
      .select("slug, updated_at")
      .eq("moderation_status", "live")
      .eq("visibility", "public")
      .order("updated_at", { ascending: false }),
    supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("resources")
      .select("id, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false }),
  ]);

  const videoRoutes: MetadataRoute.Sitemap = [];

  const creatorRoutes: MetadataRoute.Sitemap = (creators ?? [])
    .filter((creator) => Boolean(creator.username))
    .map((creator) => ({
      url: `${siteUrl}/creator/${creator.username}`,
      lastModified: new Date(creator.updated_at),
      changeFrequency: "daily",
      priority: 0.7,
    }));

  const projectRoutes: MetadataRoute.Sitemap = [];

  const newsRoutes: MetadataRoute.Sitemap = (newsPosts ?? [])
    .filter((post) => Boolean(post.slug))
    .map((post) => ({
      url: `${siteUrl}/news/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));

  const resourceRoutes: MetadataRoute.Sitemap = (resources ?? []).map((resource) => ({
    url: `${siteUrl}/resources/${resource.id}`,
    lastModified: new Date(resource.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...videoRoutes, ...creatorRoutes, ...projectRoutes, ...newsRoutes, ...resourceRoutes];
}
