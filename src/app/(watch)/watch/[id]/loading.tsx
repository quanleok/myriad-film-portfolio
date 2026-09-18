export default function WatchLoading() {
  return (
    <>
      {/* Video player skeleton — 16:9 aspect ratio */}
      <div className="mx-auto max-w-7xl">
        <div className="skeleton-shimmer aspect-video w-full bg-black/20" />
      </div>

      {/* Title + creator + actions */}
      <div className="mx-auto max-w-7xl px-4 mt-8 space-y-4">
        {/* Title */}
        <div className="skeleton-shimmer h-6 w-3/4 max-w-xl rounded" />

        {/* Creator info row */}
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 space-y-1.5">
            <div className="skeleton-shimmer h-4 w-32 rounded" />
            <div className="skeleton-shimmer h-3 w-20 rounded" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="skeleton-shimmer h-9 w-20 rounded-full" />
            <div className="skeleton-shimmer h-9 w-24 rounded-full" />
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 rounded-xl skeleton-shimmer h-10 w-full" />

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-b border-border py-2">
          <div className="skeleton-shimmer h-8 w-24 rounded-full" />
          <div className="skeleton-shimmer h-8 w-20 rounded-full" />
          <div className="skeleton-shimmer h-8 w-16 rounded-full" />
          <div className="skeleton-shimmer h-8 w-16 rounded-full" />
          <div className="skeleton-shimmer h-8 w-16 rounded-full" />
          <div className="skeleton-shimmer h-8 w-16 rounded-full" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2 pt-1">
          <div className="skeleton-shimmer h-3.5 w-full rounded" />
          <div className="skeleton-shimmer h-3.5 w-5/6 rounded" />
          <div className="skeleton-shimmer h-3.5 w-2/3 rounded" />
        </div>
      </div>

      {/* Comments + Related videos */}
      <div className="mx-auto max-w-7xl px-4 mt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_480px]">
          {/* LEFT — Comment section skeleton */}
          <div className="min-w-0 space-y-4">
            <div className="skeleton-shimmer h-5 w-28 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton-shimmer h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton-shimmer h-3.5 w-24 rounded" />
                  <div className="skeleton-shimmer h-3 w-full rounded" />
                  <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — Related videos sidebar skeleton */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-3">
              <div className="skeleton-shimmer h-5 w-36 rounded" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton-shimmer h-20 w-36 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="skeleton-shimmer h-3.5 w-full rounded" />
                    <div className="skeleton-shimmer h-3 w-3/4 rounded" />
                    <div className="skeleton-shimmer h-3 w-1/2 rounded" />
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
