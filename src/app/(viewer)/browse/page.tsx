import type { Metadata } from "next";
import { BrowseContent } from "./browse-content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Browse Projects",
  description:
    "Browse teaser projects, watchable films, upcoming premieres, and live launches on Myriad Spring.",
};

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    format?: string;
    status?: string;
    sort?: "trending" | "new" | "almost_unlocked" | "recent_activity" | "momentum";
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;

  return (
    <BrowseContent
      initialQuery={(params.q ?? "").trim()}
      initialGenre={(params.genre ?? "").trim()}
      initialFormat={(params.format ?? "").trim()}
      initialStatus={(params.status ?? "all").trim()}
      initialSort={(params.sort ?? "recent_activity") as "trending" | "new" | "almost_unlocked" | "recent_activity" | "momentum"}
    />
  );
}
