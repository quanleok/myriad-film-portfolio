export default function SeriesLoading() {
  return (
    <>
      {/* Hero skeleton */}
      <div className="relative w-full">
        <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
          <div className="skeleton-shimmer h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-page via-page/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-page/80 to-transparent" />
        </div>

        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-6xl px-4 pb-8 space-y-3">
            <div className="skeleton-shimmer h-10 w-80 max-w-full rounded" />
            <div className="flex items-center gap-3">
              <div className="skeleton-shimmer h-8 w-8 rounded-full" />
              <div className="skeleton-shimmer h-4 w-28 rounded" />
            </div>
            <div className="flex gap-3">
              <div className="skeleton-shimmer h-4 w-24 rounded" />
              <div className="skeleton-shimmer h-4 w-20 rounded" />
              <div className="skeleton-shimmer h-4 w-16 rounded" />
            </div>
            <div className="skeleton-shimmer mt-2 h-10 w-44 rounded-full" />
          </div>
        </div>
      </div>

      {/* Episode list skeleton */}
      <div className="mx-auto max-w-6xl px-4 mt-8 pb-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            <div className="skeleton-shimmer mb-4 h-6 w-32 rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-lg p-3">
                <div className="skeleton-shimmer h-5 w-8 rounded" />
                <div className="skeleton-shimmer aspect-video w-40 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                  <div className="skeleton-shimmer h-3 w-20 rounded" />
                  <div className="skeleton-shimmer h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>

          <aside className="hidden lg:block space-y-6">
            <div className="space-y-3">
              <div className="skeleton-shimmer h-4 w-36 rounded" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-2">
                  <div className="skeleton-shimmer aspect-video w-28 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton-shimmer h-4 w-full rounded" />
                    <div className="skeleton-shimmer h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
