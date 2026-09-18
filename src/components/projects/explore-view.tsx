"use client";

import { useIsMobile } from "@/hooks/useIsMobile";
import { ExploreFeed } from "@/components/projects/explore-feed";
import { ExploreDesktopSections } from "@/components/projects/explore-desktop-sections";

export function ExploreView() {
  const isMobile = useIsMobile();

  // Render nothing until the breakpoint resolves to avoid flashing wrong layout
  if (isMobile === null) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-text-secondary">
        Loading...
      </div>
    );
  }

  if (isMobile) {
    return <ExploreFeed />;
  }

  return <ExploreDesktopSections />;
}
