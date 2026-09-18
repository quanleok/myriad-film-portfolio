import type { MovementDirection, TrendEvent } from "@/lib/product-model";
import { trendEvents } from "@/lib/sample-data";

export function getTrendingFeed(): TrendEvent[] {
  return [...trendEvents].sort((left, right) => right.signalScore - left.signalScore);
}

export function getTrendTone(movement: MovementDirection): string {
  switch (movement) {
    case "up":
      return "text-positive";
    case "down":
      return "text-danger";
    case "new":
      return "text-warning";
    default:
      return "text-slate-300";
  }
}
