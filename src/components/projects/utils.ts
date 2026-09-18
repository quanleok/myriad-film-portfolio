import {
  PROJECT_FORMAT_LABELS,
  PROJECT_GENRE_LABELS,
  PROJECT_TONE_LABELS,
  type ProjectLifecycleStatus,
} from "@/types/project";
import { getLifecycleBadgeClassName, PROJECT_STATUS_LABELS } from "./lifecycle-visuals";

export { PROJECT_STATUS_LABELS };

export function statusBadgeClass(status: ProjectLifecycleStatus): string {
  return getLifecycleBadgeClassName(status);
}

export function getProjectTeaserUrl(
  teaserAssetId: string | null,
  quality: "480p" | "720p" = "480p"
): string | null {
  const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;
  if (!host || !teaserAssetId) return null;
  return `https://${host}/${teaserAssetId}/play_${quality}.mp4`;
}

export function getProjectTeaserThumbnailUrl(
  teaserThumbnailUrl: string | null,
  teaserAssetId: string | null
): string | null {
  if (teaserThumbnailUrl) return teaserThumbnailUrl;
  const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;
  if (!host || !teaserAssetId) return null;
  return `https://${host}/${teaserAssetId}/thumbnail.jpg`;
}

export function getCardMediaUrl(
  assetId: string | null,
  mediaType: "image" | "video" | null
): string | null {
  const host = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME;
  if (!host || !assetId) return null;
  if (mediaType === "video") {
    return `https://${host}/${assetId}/play_480p.mp4`;
  }
  // Image assets use thumbnail endpoint
  return `https://${host}/${assetId}/thumbnail.jpg`;
}

export function safeProgress(current: number, target: number | null): number {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.round((current / target) * 100));
}

export function isFreeWatchProject(
  status: ProjectLifecycleStatus,
  releasePriceCents: number | null | undefined
): boolean {
  return (
    (status === "premiering" || status === "released") &&
    (releasePriceCents == null || releasePriceCents <= 0)
  );
}

export function lifecyclePrimaryCta(
  status: ProjectLifecycleStatus,
  options: {
    priceCents: number | null;
    releasePriceCents?: number | null;
    hasPreordered?: boolean;
    hasPurchased?: boolean;
  }
): string {
  const hasAccess = options.hasPreordered || options.hasPurchased;
  const isFreeWatch = isFreeWatchProject(status, options.releasePriceCents);
  const fmtPrice = (cents: number | null | undefined) =>
    cents ? `$${(cents / 100).toFixed(0)}` : "";

  switch (status) {
    case "teaser":
      return "Watch Teaser";
    case "unlocking":
      if (options.hasPreordered) return "Preordered \u2713";
      return `Seed${options.priceCents ? ` — ${fmtPrice(options.priceCents)}` : ""}`;
    case "in_production":
      if (options.hasPreordered) return "Preordered \u2713";
      return `Preorder${options.priceCents ? ` — ${fmtPrice(options.priceCents)}` : ""}`;
    case "premiering":
      if (hasAccess || isFreeWatch) return "Watch Premiere";
      return `Buy Access${options.releasePriceCents ? ` — ${fmtPrice(options.releasePriceCents)}` : ""}`;
    case "released":
      if (hasAccess) return "Watch Now";
      if (isFreeWatch) return "Watch Free";
      return `Watch${options.releasePriceCents ? ` — ${fmtPrice(options.releasePriceCents)}` : ""}`;
    case "failed_to_unlock":
      return "Follow for Relaunch";
    case "cancelled":
      return "View Details";
    default:
      return "Edit Draft";
  }
}

export function lifecycleTrustCopy(
  status: ProjectLifecycleStatus,
  options?: { releasePriceCents?: number | null }
): string {
  const isFreeWatch = isFreeWatchProject(status, options?.releasePriceCents);
  switch (status) {
    case "teaser":
      return "Watch the teaser, explore the concept, and follow the creator before this turns into a full launch.";
    case "unlocking":
      return "Seed it early. If the project does not unlock, your preorder is refunded automatically.";
    case "in_production":
      return "This project is already in production. Preorder now to watch first when the premiere opens.";
    case "failed_to_unlock":
      return "All preorders have been refunded.";
    case "cancelled":
      return "This project was cancelled. All preorders have been refunded.";
    case "released":
      return isFreeWatch ? "Available to watch free now." : "Available to watch now.";
    default:
      return "";
  }
}

export function formatProjectGenre(genre: string | null): string {
  if (!genre) return "Unknown";
  return PROJECT_GENRE_LABELS[genre] ?? genre.replaceAll("_", " ");
}

export function formatProjectFormat(format: string | null): string {
  if (!format) return "Unknown";
  return PROJECT_FORMAT_LABELS[format] ?? format.replaceAll("_", " ");
}

export function formatProjectTone(tone: string | null): string {
  if (!tone) return "Unknown";
  return PROJECT_TONE_LABELS[tone] ?? tone.replaceAll("_", " ");
}

/** Format runtime: "1h 32m", "23 min", or null */
export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format relative countdown: "in 3 days", "in 12 hours", "Tomorrow", or "Now" for past dates */
export function formatCountdown(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Now";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "Tomorrow";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `in ${hours}h`;
  return "Soon";
}

/** Format campaign end: "Ends Mar 21" or "Ends in 2 days" when < 3 days */
export function formatCampaignEnd(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const daysLeft = Math.floor((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return "Ended";
  if (daysLeft <= 3) return `Ends in ${daysLeft === 0 ? "< 1 day" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}`;
  return `Ends ${target.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/** Days until delivery deadline, or null if no deadline */
export function daysUntilDelivery(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
