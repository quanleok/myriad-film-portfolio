export type CreatorTrustBadgeKey = "founding_member" | "verified_delivery";

export interface CreatorTrustInput {
  isFoundingCreator?: boolean | null;
  releasedProjectCount?: number | null;
}

export interface CreatorTrustState {
  foundingMember: boolean;
  verifiedDelivery: boolean;
  releasedProjectCount: number;
  badges: CreatorTrustBadgeKey[];
}

export function resolveCreatorTrust({
  isFoundingCreator = false,
  releasedProjectCount = 0,
}: CreatorTrustInput): CreatorTrustState {
  const safeReleasedProjectCount = Math.max(0, Math.floor(releasedProjectCount ?? 0));
  const foundingMember = Boolean(isFoundingCreator);
  const verifiedDelivery = safeReleasedProjectCount > 0;
  const badges: CreatorTrustBadgeKey[] = [];

  if (foundingMember) {
    badges.push("founding_member");
  }

  if (verifiedDelivery) {
    badges.push("verified_delivery");
  }

  return {
    foundingMember,
    verifiedDelivery,
    releasedProjectCount: safeReleasedProjectCount,
    badges,
  };
}

export function formatCreatorDeliverySummary(
  trustOrCount: CreatorTrustState | number | null | undefined
): string {
  const releasedProjectCount =
    typeof trustOrCount === "number"
      ? Math.max(0, Math.floor(trustOrCount))
      : Math.max(0, Math.floor(trustOrCount?.releasedProjectCount ?? 0));

  if (releasedProjectCount <= 0) {
    return "New creator";
  }

  return `${releasedProjectCount} released project${releasedProjectCount === 1 ? "" : "s"}`;
}

export function getCreatorTrustBadgeLabel(badge: CreatorTrustBadgeKey): string {
  return badge === "founding_member" ? "Founding Member" : "Verified Delivery";
}
