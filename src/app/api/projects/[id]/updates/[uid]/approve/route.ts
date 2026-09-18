import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sendProgressProofApprovedEmail,
  sendProgressProofRejectedEmail,
} from "@/lib/email/send";

interface RouteContext {
  params: Promise<{ id: string; uid: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("project-proof-review", 10);
    if (rateLimited) return rateLimited;

    const { id, uid } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse optional body for rejection
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine — defaults to approval
    }

    const isRejected = body.rejected === true;

    const adminSupabase = createAdminClient();

    // Fetch the update and verify it's a pending progress proof
    const { data: update, error: fetchError } = await adminSupabase
      .from("project_updates")
      .select("id, project_id, is_progress_proof, review_status")
      .eq("id", uid)
      .eq("project_id", id)
      .single();

    if (fetchError || !update) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    if (!update.is_progress_proof) {
      return NextResponse.json(
        { error: "This update is not a progress proof" },
        { status: 400 }
      );
    }

    if (update.review_status !== "pending") {
      return NextResponse.json(
        { error: "This progress proof has already been reviewed" },
        { status: 400 }
      );
    }

    const newStatus = isRejected ? "rejected" : "approved";

    // Update the review status
    const { error: updateError } = await adminSupabase
      .from("project_updates")
      .update({ review_status: newStatus })
      .eq("id", uid);

    if (updateError) {
      console.error("[api] update review status error:", updateError);
      return NextResponse.json(
        { error: "Failed to update review status" },
        { status: 500 }
      );
    }

    // If approved, make the progress_proof payout release available
    if (!isRejected) {
      const now = new Date().toISOString();

      const { error: payoutError } = await adminSupabase
        .from("project_payout_releases")
        .update({
          status: "available",
          available_at: now,
        })
        .eq("project_id", id)
        .eq("release_type", "progress_proof");

      if (payoutError) {
        console.error("[api] payout release update error:", payoutError);
      }
    }

    // Send email notification to creator
    try {
      const { data: project } = await adminSupabase
        .from("projects")
        .select("title, creator_id")
        .eq("id", id)
        .single();

      if (project) {
        const { data: creator } = await adminSupabase
          .from("profiles")
          .select("email")
          .eq("id", project.creator_id)
          .single();

        if (creator?.email) {
          if (!isRejected) {
            // Fetch payout amount for the approval email
            const { data: release } = await adminSupabase
              .from("project_payout_releases")
              .select("amount_cents")
              .eq("project_id", id)
              .eq("release_type", "progress_proof")
              .single();

            await sendProgressProofApprovedEmail(
              creator.email,
              project.title,
              release?.amount_cents ?? 0
            );
          } else {
            const adminNote = typeof body.note === "string" ? body.note : undefined;
            await sendProgressProofRejectedEmail(
              creator.email,
              project.title,
              adminNote
            );
          }
        }
      }
    } catch (emailErr) {
      console.error("[api] proof review email error:", emailErr);
    }

    return NextResponse.json({
      review_status: newStatus,
    });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
