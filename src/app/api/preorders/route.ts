import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("preorder-create", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/preorders", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before preordering" },
        { status: 403 }
      );
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Check if account is frozen (dispute escalation)
    const { data: preorderUserProfile } = await supabase
      .from("profiles")
      .select("account_frozen")
      .eq("id", user.id)
      .single();

    if (preorderUserProfile?.account_frozen) {
      return NextResponse.json(
        { error: "Your account is frozen due to payment disputes. Contact support." },
        { status: 403 }
      );
    }

    let body: { projectId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { projectId } = body;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Fetch the project
    const { data: project } = await supabase
      .from("projects")
      .select("id, creator_id, lifecycle_status, moderation_status, preorder_price_cents, is_test")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Block payments on test projects
    if (project.is_test) {
      return NextResponse.json(
        { error: "Payments are disabled for test projects" },
        { status: 400 }
      );
    }

    // Project must be live and in unlocking or in_production state
    if (!["unlocking", "in_production"].includes(project.lifecycle_status)) {
      return NextResponse.json(
        { error: "This project is not accepting preorders" },
        { status: 400 }
      );
    }

    if (project.moderation_status !== "live") {
      return NextResponse.json(
        { error: "This project is not available" },
        { status: 400 }
      );
    }

    // Validate preorder price
    if (!project.preorder_price_cents || project.preorder_price_cents <= 0) {
      return NextResponse.json(
        { error: "This project does not have a valid preorder price" },
        { status: 400 }
      );
    }

    // Cannot preorder own project
    if (project.creator_id === user.id) {
      return NextResponse.json(
        { error: "You cannot preorder your own project" },
        { status: 400 }
      );
    }

    // Check no existing active/committed preorder for this user + project
    const { data: existingPreorder } = await supabase
      .from("project_preorders")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .in("current_status", ["active", "committed"])
      .maybeSingle();

    if (existingPreorder) {
      return NextResponse.json(
        { error: "You already have an active preorder for this project" },
        { status: 409 }
      );
    }

    // Check creator is not banned
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("id", project.creator_id)
      .single();

    if (creatorProfile?.is_banned) {
      return NextResponse.json(
        { error: "This creator's account has been suspended" },
        { status: 403 }
      );
    }

    // Create Stripe PaymentIntent for in-app Stripe Elements
    // Idempotency key prevents duplicate charges if user double-clicks or request retries
    const stripe = getStripe();
    const idempotencyKey = `preorder_${user.id}_${projectId}`;
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: project.preorder_price_cents,
        currency: "usd",
        metadata: {
          type: "preorder",
          project_id: projectId,
          viewer_id: user.id,
          creator_id: project.creator_id,
        },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey }
    );

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      preorderAmount: project.preorder_price_cents,
    });
  } catch (err) {
    console.error("[api] preorder create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
