import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";
import {
  isOpportunityCompanyType,
  isOpportunityListingKind,
  isOpportunityPromotionTier,
  isOpportunityWorkType,
  normalizeOpportunityTags,
  sanitizeOpportunityText,
  type OpportunityCompanyType,
  type OpportunityListingDraftInput,
  type OpportunityListingKind,
  type OpportunityPromotionTier,
  type OpportunityWorkType,
} from "@/lib/opportunities";
import {
  countPosterActiveFreeListings,
  ensureUniqueOpportunitySlug,
  getOpportunityEditableStatuses,
  getOpportunityListingFeeForTier,
  listPublicOpportunityListings,
} from "@/lib/opportunities-server";

function parseOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseDraftBody(body: Record<string, unknown>) {
  const title = sanitizeOpportunityText(String(body.title ?? ""));
  const companyName = sanitizeOpportunityText(String(body.companyName ?? ""));
  const companyType = String(body.companyType ?? "");
  const workType = String(body.workType ?? "");
  const listingKind = String(body.listingKind ?? "");
  const promotionTier = String(body.promotionTier ?? "");
  const summary = String(body.summary ?? "").trim();
  const description = String(body.description ?? "").trim();
  const timelineText = sanitizeOpportunityText(String(body.timelineText ?? ""));
  const locationText = sanitizeOpportunityText(String(body.locationText ?? ""));
  const applyUrlInput = String(body.applyUrl ?? "").trim();
  const contactEmailInput = String(body.contactEmail ?? "").trim();
  const budgetMinCents = parseOptionalInteger(body.budgetMinCents);
  const budgetMaxCents = parseOptionalInteger(body.budgetMaxCents);
  const serviceTags = normalizeOpportunityTags(
    Array.isArray(body.serviceTags) ? body.serviceTags.map(String) : []
  );

  if (!title) return { error: "Title is required" } as const;
  if (!companyName) return { error: "Company or client name is required" } as const;
  if (!isOpportunityCompanyType(companyType)) {
    return { error: "Company type is invalid" } as const;
  }
  if (!isOpportunityWorkType(workType)) {
    return { error: "Work type is invalid" } as const;
  }
  if (!isOpportunityListingKind(listingKind)) {
    return { error: "Listing kind is invalid" } as const;
  }
  if (!isOpportunityPromotionTier(promotionTier)) {
    return { error: "Promotion tier is invalid" } as const;
  }
  if (!summary) return { error: "Summary is required" } as const;
  if (!description) return { error: "Description is required" } as const;
  if (!timelineText) return { error: "Timeline is required" } as const;
  if (!locationText) return { error: "Location is required" } as const;

  if (Number.isNaN(budgetMinCents) || Number.isNaN(budgetMaxCents)) {
    return { error: "Budget values must be whole numbers in cents" } as const;
  }

  if (
    budgetMinCents !== null &&
    budgetMaxCents !== null &&
    budgetMinCents > budgetMaxCents
  ) {
    return { error: "Budget minimum cannot be greater than budget maximum" } as const;
  }

  const applyUrl = normalizeUrl(applyUrlInput);
  const contactEmail = contactEmailInput || null;
  const hasApplyUrl = Boolean(applyUrl);
  const hasContactEmail = Boolean(contactEmail);

  if (hasApplyUrl === hasContactEmail) {
    return { error: "Provide either an apply URL or a contact email" } as const;
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    return { error: "Contact email is invalid" } as const;
  }

  return {
    value: {
      title,
      companyName,
      companyType: companyType as OpportunityCompanyType,
      workType: workType as OpportunityWorkType,
      listingKind: listingKind as OpportunityListingKind,
      promotionTier: promotionTier as OpportunityPromotionTier,
      summary,
      description,
      budgetMinCents,
      budgetMaxCents,
      timelineText,
      locationText,
      serviceTags,
      applyUrl,
      contactEmail,
    } satisfies OpportunityListingDraftInput,
  } as const;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("opportunity-list", 60);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const listings = await listPublicOpportunityListings({
      query: searchParams.get("q") ?? "",
      kind: searchParams.get("kind") ?? "",
      type: searchParams.get("type") ?? "",
      tier: searchParams.get("tier") ?? "",
      tag: searchParams.get("tag") ?? "",
      sort: searchParams.get("sort") ?? "",
    });

    return NextResponse.json({ listings });
  } catch (error) {
    console.error("[api] opportunities list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("opportunity-draft", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/opportunities", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before posting" },
        { status: 403 }
      );
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = parseDraftBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const listingId =
      typeof body.id === "string" && body.id.trim() ? body.id.trim() : null;
    const editableStatuses = getOpportunityEditableStatuses();
    const admin = createAdminClient();

    if (parsed.value.promotionTier === "free") {
      const activeFreeListings = await countPosterActiveFreeListings(
        user.id,
        listingId ?? undefined
      );

      if (activeFreeListings >= 1) {
        return NextResponse.json(
          {
            error:
              "You already have an active free listing. Close or expire it before posting another free listing.",
          },
          { status: 409 }
        );
      }
    }

    if (listingId) {
      const { data: existing, error: fetchError } = await admin
        .from("opportunity_listings")
        .select("id, poster_id, status, paid_at, promotion_tier")
        .eq("id", listingId)
        .eq("poster_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("[api] opportunity fetch error:", fetchError);
        return NextResponse.json({ error: "Unable to load listing" }, { status: 500 });
      }

      if (!existing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }

      if (!editableStatuses.has(existing.status)) {
        return NextResponse.json(
          { error: "This listing can no longer be edited" },
          { status: 400 }
        );
      }

      if (
        existing.paid_at &&
        existing.promotion_tier !== parsed.value.promotionTier
      ) {
        return NextResponse.json(
          { error: "Paid listings cannot switch tiers after checkout." },
          { status: 400 }
        );
      }

      const slug = await ensureUniqueOpportunitySlug(
        parsed.value.title,
        parsed.value.companyName,
        existing.id
      );
      const listingFeeCents = getOpportunityListingFeeForTier(
        parsed.value.promotionTier
      );
      const nextStatus =
        parsed.value.promotionTier === "free"
          ? "pending_review"
          : existing.paid_at
            ? "pending_review"
            : "draft";

      const { data: updated, error: updateError } = await admin
        .from("opportunity_listings")
        .update({
          slug,
          title: parsed.value.title,
          company_name: parsed.value.companyName,
          company_type: parsed.value.companyType,
          work_type: parsed.value.workType,
          listing_kind: parsed.value.listingKind,
          promotion_tier: parsed.value.promotionTier,
          summary: parsed.value.summary,
          description: parsed.value.description,
          budget_min_cents: parsed.value.budgetMinCents,
          budget_max_cents: parsed.value.budgetMaxCents,
          timeline_text: parsed.value.timelineText,
          location_text: parsed.value.locationText,
          service_tags: parsed.value.serviceTags,
          apply_url: parsed.value.applyUrl,
          contact_email: parsed.value.contactEmail,
          listing_fee_cents: listingFeeCents,
          status: nextStatus,
          stripe_checkout_session_id:
            parsed.value.promotionTier === "free"
              ? null
              : undefined,
          stripe_payment_status:
            parsed.value.promotionTier === "free"
              ? null
              : undefined,
        })
        .eq("id", existing.id)
        .eq("poster_id", user.id)
        .select("id, slug, status, paid_at, promotion_tier")
        .single();

      if (updateError || !updated) {
        console.error("[api] opportunity update error:", updateError);
        return NextResponse.json({ error: "Unable to save listing" }, { status: 500 });
      }

      return NextResponse.json({
        listingId: updated.id,
        slug: updated.slug,
        status: updated.status,
        requiresPayment:
          updated.promotion_tier === "featured" && !updated.paid_at,
      });
    }

    const slug = await ensureUniqueOpportunitySlug(
      parsed.value.title,
      parsed.value.companyName
    );
    const listingFeeCents = getOpportunityListingFeeForTier(
      parsed.value.promotionTier
    );

    const { data: created, error: insertError } = await admin
      .from("opportunity_listings")
      .insert({
        slug,
        poster_id: user.id,
        title: parsed.value.title,
        company_name: parsed.value.companyName,
        company_type: parsed.value.companyType,
        work_type: parsed.value.workType,
        listing_kind: parsed.value.listingKind,
        promotion_tier: parsed.value.promotionTier,
        summary: parsed.value.summary,
        description: parsed.value.description,
        budget_min_cents: parsed.value.budgetMinCents,
        budget_max_cents: parsed.value.budgetMaxCents,
        timeline_text: parsed.value.timelineText,
        location_text: parsed.value.locationText,
        service_tags: parsed.value.serviceTags,
        apply_url: parsed.value.applyUrl,
        contact_email: parsed.value.contactEmail,
        listing_fee_cents: listingFeeCents,
        status:
          parsed.value.promotionTier === "featured" ? "draft" : "pending_review",
      })
      .select("id, slug, status, paid_at, promotion_tier")
      .single();

    if (insertError || !created) {
      console.error("[api] opportunity insert error:", insertError);
      return NextResponse.json({ error: "Unable to create listing" }, { status: 500 });
    }

    return NextResponse.json({
      listingId: created.id,
      slug: created.slug,
      status: created.status,
      requiresPayment:
        created.promotion_tier === "featured" && !created.paid_at,
    });
  } catch (error) {
    console.error("[api] opportunities post error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
