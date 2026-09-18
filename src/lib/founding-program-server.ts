import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  FOUNDING_CREATOR_PUBLIC_ENDS_AT,
  buildFoundingProgramStatus,
  resolveCreatorFeeRate,
  type CreatorFeeProfile,
  type FoundingAwardSource,
  type FoundingProgramStatus,
} from "@/lib/founding-program";

interface FoundingAwardRow {
  source: FoundingAwardSource;
  slot_number: number | null;
}

interface FoundingProfileRow extends CreatorFeeProfile {
  is_founding_creator: boolean | null;
}

interface GrantFoundingCreatorAccessParams {
  userId: string;
  source: FoundingAwardSource;
  qualifyingProjectId?: string | null;
}

export interface GrantFoundingCreatorAccessResult extends FoundingProgramStatus {
  awarded: boolean;
  alreadyFounding: boolean;
  slotNumber: number | null;
  grantedAt: string | null;
  source: FoundingAwardSource | null;
}

function parseRpcPayload(data: unknown): {
  awarded: boolean;
  already_founding: boolean;
  source: FoundingAwardSource | null;
  slot_number: number | null;
  granted_at: string | null;
  claimed_teaser_slots: number;
  public_program_open: boolean;
} {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid founding creator grant response");
  }

  const payload = data as Record<string, unknown>;
  return {
    awarded: Boolean(payload.awarded),
    already_founding: Boolean(payload.already_founding),
    source:
      payload.source === "teaser_auto" ||
      payload.source === "invite_code" ||
      payload.source === "application" ||
      payload.source === "legacy_manual"
        ? payload.source
        : null,
    slot_number:
      typeof payload.slot_number === "number" && Number.isFinite(payload.slot_number)
        ? payload.slot_number
        : null,
    granted_at: typeof payload.granted_at === "string" ? payload.granted_at : null,
    claimed_teaser_slots:
      typeof payload.claimed_teaser_slots === "number" && Number.isFinite(payload.claimed_teaser_slots)
        ? payload.claimed_teaser_slots
        : 0,
    public_program_open: Boolean(payload.public_program_open),
  };
}

export async function getCreatorFeeRate(creatorId: string): Promise<number> {
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("is_founding_creator, founding_creator_approved_at")
    .eq("id", creatorId)
    .single();

  return resolveCreatorFeeRate(profile);
}

export async function getFoundingProgramStatus(
  userId?: string | null
): Promise<FoundingProgramStatus> {
  const adminSupabase = createAdminClient();

  const [claimedResult, awardResult, profileResult] = await Promise.all([
    adminSupabase
      .from("founding_creator_awards")
      .select("id", { count: "exact", head: true })
      .eq("source", "teaser_auto"),
    userId
      ? adminSupabase
          .from("founding_creator_awards")
          .select("source, slot_number")
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    userId
      ? adminSupabase
          .from("profiles")
          .select("is_founding_creator")
          .eq("id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const claimedTeaserSlots = claimedResult.count ?? 0;
  const award = (awardResult.data as FoundingAwardRow | null) ?? null;
  const profile = (profileResult.data as FoundingProfileRow | null) ?? null;

  return buildFoundingProgramStatus({
    claimedTeaserSlots,
    currentUserIsFounding: award ? true : Boolean(profile?.is_founding_creator),
    currentUserAwardSource: award?.source ?? null,
    currentUserSlotNumber: award?.slot_number ?? null,
  });
}

export async function grantFoundingCreatorAccess({
  userId,
  source,
  qualifyingProjectId = null,
}: GrantFoundingCreatorAccessParams): Promise<GrantFoundingCreatorAccessResult> {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.rpc("grant_founding_creator_access", {
    p_user_id: userId,
    p_source: source,
    p_qualifying_project_id: qualifyingProjectId,
    p_public_ends_at: FOUNDING_CREATOR_PUBLIC_ENDS_AT,
  } as never);

  if (error) {
    throw new Error(error.message);
  }

  const payload = parseRpcPayload(data);
  const status = buildFoundingProgramStatus({
    claimedTeaserSlots: payload.claimed_teaser_slots,
    currentUserIsFounding: payload.awarded || payload.already_founding,
    currentUserAwardSource: payload.source,
    currentUserSlotNumber: payload.slot_number,
  });

  return {
    ...status,
    publicProgramOpen: payload.public_program_open,
    awarded: payload.awarded,
    alreadyFounding: payload.already_founding,
    slotNumber: payload.slot_number,
    grantedAt: payload.granted_at,
    source: payload.source,
  };
}
