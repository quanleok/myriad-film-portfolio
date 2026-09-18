export const DEFAULT_PLATFORM_FEE_RATE = 0.2;
export const FOUNDING_CREATOR_PROMO_FEE_RATE = 0.05;
export const FOUNDING_CREATOR_LIFETIME_FEE_RATE = 0.1;
export const FOUNDING_CREATOR_PROMO_DAYS = 365;
export const FOUNDING_CREATOR_PUBLIC_TEASER_SLOT_LIMIT = 100;
export const FOUNDING_CREATOR_DISPLAY_OFFSET = 11; // pre-launch claims not in DB
export const FOUNDING_CREATOR_PUBLIC_ENDS_AT = "2026-06-22T04:59:59.000Z";

export type FoundingAwardSource =
  | "teaser_auto"
  | "invite_code"
  | "application"
  | "legacy_manual";

export interface CreatorFeeProfile {
  is_founding_creator: boolean | null;
  founding_creator_approved_at: string | null;
}

export interface FoundingProgramStatus {
  totalSlots: number;
  claimedTeaserSlots: number;
  remainingTeaserSlots: number;
  publicEndsAt: string;
  publicProgramOpen: boolean;
  currentUserIsFounding: boolean;
  currentUserReceivedTeaserAward: boolean;
  currentUserAwardSource: FoundingAwardSource | null;
  currentUserSlotNumber: number | null;
}

export function resolveCreatorFeeRate(profile: CreatorFeeProfile | null | undefined): number {
  if (!profile?.is_founding_creator) {
    return DEFAULT_PLATFORM_FEE_RATE;
  }

  if (!profile.founding_creator_approved_at) {
    return FOUNDING_CREATOR_LIFETIME_FEE_RATE;
  }

  const approvedAt = new Date(profile.founding_creator_approved_at);
  const promoEndsAt = new Date(approvedAt.getTime() + FOUNDING_CREATOR_PROMO_DAYS * 24 * 60 * 60 * 1000);

  return promoEndsAt > new Date()
    ? FOUNDING_CREATOR_PROMO_FEE_RATE
    : FOUNDING_CREATOR_LIFETIME_FEE_RATE;
}

export function getFoundingCreatorPublicEndDate(): Date {
  return new Date(FOUNDING_CREATOR_PUBLIC_ENDS_AT);
}

export function isFoundingCreatorPublicWindowOpen(now: Date = new Date()): boolean {
  return getFoundingCreatorPublicEndDate().getTime() > now.getTime();
}

export function resolveFoundingProgramOpen({
  claimedTeaserSlots,
  now = new Date(),
}: {
  claimedTeaserSlots: number;
  now?: Date;
}): boolean {
  return (
    isFoundingCreatorPublicWindowOpen(now) &&
    claimedTeaserSlots < FOUNDING_CREATOR_PUBLIC_TEASER_SLOT_LIMIT
  );
}

export function buildFoundingProgramStatus({
  claimedTeaserSlots,
  currentUserIsFounding = false,
  currentUserAwardSource = null,
  currentUserSlotNumber = null,
  now = new Date(),
}: {
  claimedTeaserSlots: number;
  currentUserIsFounding?: boolean;
  currentUserAwardSource?: FoundingAwardSource | null;
  currentUserSlotNumber?: number | null;
  now?: Date;
}): FoundingProgramStatus {
  const totalSlots = FOUNDING_CREATOR_PUBLIC_TEASER_SLOT_LIMIT;
  const dbClaimed = Math.max(0, Math.min(totalSlots, Math.trunc(claimedTeaserSlots)));
  const safeClaimed = Math.min(totalSlots, dbClaimed + FOUNDING_CREATOR_DISPLAY_OFFSET);
  const remainingTeaserSlots = Math.max(totalSlots - safeClaimed, 0);

  return {
    totalSlots,
    claimedTeaserSlots: safeClaimed,
    remainingTeaserSlots,
    publicEndsAt: FOUNDING_CREATOR_PUBLIC_ENDS_AT,
    publicProgramOpen: resolveFoundingProgramOpen({
      claimedTeaserSlots: dbClaimed,
      now,
    }),
    currentUserIsFounding,
    currentUserReceivedTeaserAward: currentUserAwardSource === "teaser_auto",
    currentUserAwardSource,
    currentUserSlotNumber,
  };
}
