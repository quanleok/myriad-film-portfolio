import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import {
  CAMPAIGN_DURATION_MIN,
  CAMPAIGN_DURATION_MAX,
  PRODUCTION_WINDOW_MIN,
  PRODUCTION_WINDOW_MAX,
  FEES_WAIVED,
  calculateDurationFee,
  CAMPAIGN_FEE_MAX_CENTS,
  PRODUCTION_FEE_MAX_CENTS,
} from "@/types/project";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/projects/[id]/extend
 * Extend campaign duration or production window.
 * Body: { type: "campaign" | "production", additional_days: number }
 * Fee is calculated proportionally (max $100), currently waived.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-extend", 5);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const extendType = body.type as string;
    const additionalDays = Number(body.additional_days);

    if (!extendType || !["campaign", "production"].includes(extendType)) {
      return NextResponse.json({ error: "type must be 'campaign' or 'production'" }, { status: 400 });
    }

    if (!additionalDays || additionalDays < 1 || additionalDays > 180) {
      return NextResponse.json({ error: "additional_days must be 1–180" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: project, error: fetchError } = await admin
      .from("projects")
      .select("id, creator_id, lifecycle_status, campaign_duration_days, campaign_ends_at, production_window_days, delivery_deadline")
      .eq("id", id)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.creator_id !== user.id) {
      return NextResponse.json({ error: "Only the creator can extend" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};

    if (extendType === "campaign") {
      if (project.lifecycle_status !== "unlocking") {
        return NextResponse.json({ error: "Campaign can only be extended during unlocking phase" }, { status: 400 });
      }

      const currentDays = project.campaign_duration_days || 30;
      const newTotal = currentDays + additionalDays;

      if (newTotal > CAMPAIGN_DURATION_MAX) {
        return NextResponse.json(
          { error: `Total campaign cannot exceed ${CAMPAIGN_DURATION_MAX} days (currently ${currentDays} days)` },
          { status: 400 }
        );
      }

      // Calculate fee for the extension
      const feeCents = calculateDurationFee(additionalDays, CAMPAIGN_DURATION_MAX, CAMPAIGN_FEE_MAX_CENTS);

      // Extend campaign_ends_at
      if (project.campaign_ends_at) {
        const newEnd = new Date(project.campaign_ends_at);
        newEnd.setDate(newEnd.getDate() + additionalDays);
        updates.campaign_ends_at = newEnd.toISOString();
      }
      updates.campaign_duration_days = newTotal;

      // Log extension event
      await admin.from("project_financial_events").insert({
        project_id: id,
        event_type: "campaign_extension",
        amount_cents: feeCents,
        metadata_json: {
          additional_days: additionalDays,
          new_total_days: newTotal,
          fee_waived: FEES_WAIVED,
        },
      });

    } else {
      // production extension
      if (!["in_production", "unlocking"].includes(project.lifecycle_status)) {
        return NextResponse.json({ error: "Production window can only be extended during unlocking or production phase" }, { status: 400 });
      }

      const currentDays = project.production_window_days || 60;
      const newTotal = currentDays + additionalDays;

      if (newTotal > PRODUCTION_WINDOW_MAX) {
        return NextResponse.json(
          { error: `Total production window cannot exceed ${PRODUCTION_WINDOW_MAX} days (currently ${currentDays} days)` },
          { status: 400 }
        );
      }

      const feeCents = calculateDurationFee(additionalDays, PRODUCTION_WINDOW_MAX, PRODUCTION_FEE_MAX_CENTS);

      // Extend delivery_deadline
      if (project.delivery_deadline) {
        const newDeadline = new Date(project.delivery_deadline);
        newDeadline.setDate(newDeadline.getDate() + additionalDays);
        updates.delivery_deadline = newDeadline.toISOString();
      }
      updates.production_window_days = newTotal;

      await admin.from("project_financial_events").insert({
        project_id: id,
        event_type: "production_extension",
        amount_cents: feeCents,
        metadata_json: {
          additional_days: additionalDays,
          new_total_days: newTotal,
          fee_waived: FEES_WAIVED,
        },
      });
    }

    const { error: updateError } = await admin
      .from("projects")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error("[api] project extend error:", updateError);
      return NextResponse.json({ error: "Failed to extend" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      type: extendType,
      additional_days: additionalDays,
      fee_waived: FEES_WAIVED,
    });
  } catch (err) {
    console.error("[api] extend handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
