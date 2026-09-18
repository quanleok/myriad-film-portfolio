import { TutorialListCard } from "@/components/tutorials/tutorial-list-card";
import type { TutorialSummary } from "@/types/tutorial";

export function TutorialList({ tutorials }: { tutorials: TutorialSummary[] }) {
  if (!tutorials.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-black/10 px-6 py-12 text-center">
        <p className="text-base font-medium text-text-primary">No tutorials found.</p>
        <p className="mt-2 text-sm text-text-secondary">
          Try a different search or clear one of the active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tutorials.map((tutorial) => (
        <TutorialListCard key={tutorial.id} tutorial={tutorial} />
      ))}
    </div>
  );
}
