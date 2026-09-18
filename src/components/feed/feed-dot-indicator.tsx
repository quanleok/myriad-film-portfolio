"use client";

interface FeedDotIndicatorProps {
  total: number;
  current: number;
}

export function FeedDotIndicator({ total, current }: FeedDotIndicatorProps) {
  if (total <= 1) return null;

  // For 8+ slides use condensed style: show window of 7 dots around current
  const MAX_VISIBLE = 7;
  const useCondensed = total > MAX_VISIBLE;

  let dots: Array<{ index: number; scale: number }>;

  if (!useCondensed) {
    dots = Array.from({ length: total }, (_, i) => ({ index: i, scale: 1 }));
  } else {
    // Show a sliding window with shrinking dots at edges
    const half = Math.floor(MAX_VISIBLE / 2);
    let start = current - half;
    let end = current + half;

    if (start < 0) {
      start = 0;
      end = MAX_VISIBLE - 1;
    }
    if (end >= total) {
      end = total - 1;
      start = Math.max(0, total - MAX_VISIBLE);
    }

    dots = [];
    for (let i = start; i <= end; i++) {
      const distFromCurrent = Math.abs(i - current);
      const distFromEdge = Math.min(i - start, end - i);
      let scale = 1;
      if (distFromEdge === 0 && distFromCurrent > 1) scale = 0.5;
      else if (distFromEdge === 1 && distFromCurrent > 1) scale = 0.75;
      dots.push({ index: i, scale });
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 backdrop-blur-md">
      <div className="flex items-center gap-1">
        {dots.map(({ index, scale }) => (
          <span
            key={index}
            className="block rounded-full transition-all duration-200"
            style={{
              width: `${7 * scale}px`,
              height: `${7 * scale}px`,
              backgroundColor: index === current ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>

      <span className="text-[10px] tabular-nums font-medium text-white/75">
        {current + 1} / {total}
      </span>

      <span className="text-[10px] uppercase tracking-[0.12em] text-white/50 sm:hidden">Swipe</span>
      <span className="hidden text-[10px] uppercase tracking-[0.12em] text-white/50 sm:inline">← →</span>
    </div>
  );
}
