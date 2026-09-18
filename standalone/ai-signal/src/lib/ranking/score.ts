import type { CategorySlug, LeaderboardEntry, LeaderboardLens } from "@/lib/product-model";
import { leaderboardEntries } from "@/lib/sample-data";

export function getLeaderboard(category: CategorySlug, lens: LeaderboardLens = "overall"): LeaderboardEntry[] {
  return leaderboardEntries
    .filter((entry) => entry.category === category && entry.lens === lens)
    .sort((left, right) => left.rank - right.rank);
}

export function getMovementLabel(entry: LeaderboardEntry): string {
  if (entry.movement === "new") return "New entry";
  if (entry.previousRank === null || entry.previousRank === entry.rank) return "Holding position";
  if (entry.previousRank > entry.rank) return `Up ${entry.previousRank - entry.rank}`;
  return `Down ${entry.rank - entry.previousRank}`;
}

export function getLeaderboardPulse(entry: LeaderboardEntry): number {
  return Math.round((entry.editorialWeight + entry.communityWeight + entry.velocityWeight) / 3);
}
