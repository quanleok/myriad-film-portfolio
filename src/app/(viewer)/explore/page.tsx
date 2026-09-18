import { redirect } from "next/navigation";
import { ExploreView } from "@/components/projects/explore-view";
import { FF_EXPLORE_ENABLED } from "@/lib/feature-flags";

export const metadata = {
  title: "Explore Projects",
  description: "Swipe through unreleased AI film projects and preorder to unlock the ones you want made.",
};

export default function ExplorePage() {
  if (!FF_EXPLORE_ENABLED) {
    redirect("/browse");
  }

  return <ExploreView />;
}
