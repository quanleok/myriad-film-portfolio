import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned } from "@/lib/auth-checks";
import { sendProjectUnlockedEmail } from "@/lib/email/send";
import { indexProjectById } from "@/lib/meilisearch/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-greenlight", 5);
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Verify ownership and eligibility
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, preorder_count_cache, unlock_target, title, slug, estimated_delivery_at, grace_period_end")
      .eq("id", id)
      .single();

    if (!project || project.creator_id !== user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.lifecycle_status !== "unlocking") {
      return NextResponse.json(
        { error: "This project is not eligible for manual greenlight" },
        { status: 400 }
      );
    }

    // Check if greenlight window has expired (48h after campaign deadline)
    if (project.grace_period_end && new Date(project.grace_period_end) < new Date()) {
      return NextResponse.json(
        { error: "The greenlight window has expired. Your project has been moved to failed status." },
        { status: 400 }
      );
    }

    // Creator can greenlight as soon as they reach 50% of target
    const target = project.unlock_target ?? 0;
    const pct = target > 0 ? project.preorder_count_cache / target : 0;
    if (pct < 0.5) {
      const currentPct = Math.round(pct * 100);
      return NextResponse.json(
        { error: `Your project needs at least 50% of its target to greenlight. Currently at ${currentPct}%.` },
        { status: 400 }
      );
    }

    // Execute manual greenlight
    const adminSupabase = createAdminClient();
    const { data: didGreenlight } = await adminSupabase.rpc("manual_greenlight_project", {
      p_project_id: id,
    });

    if (!didGreenlight) {
      return NextResponse.json(
        { error: "Greenlight failed — project may have changed state" },
        { status: 409 }
      );
    }

    // Record greenlit_at and greenlit_by
    await adminSupabase
      .from("projects")
      .update({ greenlit_at: new Date().toISOString(), greenlit_by: "manual" })
      .eq("id", id);

    // Credit creator balance
    await adminSupabase.rpc("credit_creator_balance", {
      p_project_id: id,
      p_creator_id: user.id,
    });

    // Record status history
    await adminSupabase.from("project_status_history").insert({
      project_id: id,
      from_status: "unlocking",
      to_status: "in_production",
      reason: `Creator manually greenlit project (${Math.round(pct * 100)}% of target)`,
      actor_user_id: user.id,
    });

    // Send unlock emails to creator and all backers
    try {
      const estimatedDelivery = project.estimated_delivery_at
        ? new Date(project.estimated_delivery_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "TBD";
      const slug = project.slug ?? id;

      // Email creator
      const { data: creatorAuth } = await adminSupabase.auth.admin.getUserById(user.id);
      if (creatorAuth?.user?.email) {
        sendProjectUnlockedEmail(creatorAuth.user.email, project.title, slug, estimatedDelivery);
      }

      // Email all backers
      const { data: backerPreorders } = await adminSupabase
        .from("project_preorders")
        .select("user_id")
        .eq("project_id", id)
        .in("current_status", ["active", "committed"]);

      if (backerPreorders && backerPreorders.length > 0) {
        const backerIds = [...new Set(backerPreorders.map((p: { user_id: string }) => p.user_id))];
        const { data: backerProfiles } = await adminSupabase
          .from("profiles")
          .select("id, email")
          .in("id", backerIds);

        if (backerProfiles) {
          for (const backer of backerProfiles) {
            if (backer.email) {
              sendProjectUnlockedEmail(backer.email, project.title, slug, estimatedDelivery);
            }
          }
        }
      }
    } catch (emailErr) {
      console.error("[api] greenlight email error:", emailErr);
    }

    // Reindex (status changed to in_production)
    indexProjectById(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] greenlight error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
