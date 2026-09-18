export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
      {/* Genre filter pills skeleton */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-8 rounded-full"
            style={{ width: `${60 + (i % 3) * 20}px` }}
          />
        ))}
      </div>

      {/* Sort / view controls skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
          <div className="skeleton-shimmer h-8 w-24 rounded-lg" />
        </div>
        <div className="skeleton-shimmer h-8 w-20 rounded-lg" />
      </div>

      {/* Video card grid skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-surface overflow-hidden">
            <div className="skeleton-shimmer aspect-video" />
            <div className="flex gap-3 px-3 py-3">
              <div className="skeleton-shimmer h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-shimmer h-4 w-4/5 rounded" />
                <div className="skeleton-shimmer h-3 w-1/2 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
