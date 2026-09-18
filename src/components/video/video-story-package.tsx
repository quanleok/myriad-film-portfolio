import type { VideoStoryCard, VideoStoryElements } from "@/types/video";

const STORY_SECTIONS: Array<{
  key: keyof VideoStoryElements;
  title: string;
  eyebrow: string;
}> = [
  { key: "characters", title: "Characters", eyebrow: "Cast" },
  { key: "locations", title: "Locations", eyebrow: "World" },
  { key: "props", title: "Props", eyebrow: "Details" },
];

function StoryCard({ card }: { card: VideoStoryCard }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]">
      {card.image_url ? (
        <div className="aspect-[4/3] overflow-hidden bg-black">
          <img
            src={card.image_url}
            alt={card.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="space-y-2 p-4">
        <h4 className="text-sm font-semibold text-text-primary">{card.name}</h4>
        {card.description ? (
          <p className="text-sm leading-6 text-text-secondary">{card.description}</p>
        ) : (
          <p className="text-sm text-text-tertiary">Reference card</p>
        )}
      </div>
    </article>
  );
}

export function VideoStoryPackage({
  storyElements,
}: {
  storyElements: VideoStoryElements;
}) {
  const activeSections = STORY_SECTIONS.filter(
    (section) => storyElements[section.key].length > 0
  );

  if (activeSections.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-white/8 bg-[#050807] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-400">
            Story package
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-text-primary">
            More than just the video file.
          </h2>
        </div>
        <p className="text-sm text-text-tertiary">
          Optional references the creator attached to this clip.
        </p>
      </div>

      <div className="mt-5 space-y-5">
        {activeSections.map((section) => (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                  {section.eyebrow}
                </p>
                <h3 className="mt-1 text-base font-semibold text-text-primary">
                  {section.title}
                </h3>
              </div>
              <span className="text-xs text-text-tertiary">
                {storyElements[section.key].length}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {storyElements[section.key].map((card) => (
                <StoryCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
