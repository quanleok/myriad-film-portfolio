import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkBanned, logFailedAuth } from "@/lib/auth-checks";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("purchase", 10);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logFailedAuth("/api/purchases", "POST");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email before purchasing" },
        { status: 403 }
      );
    }

    const banned = await checkBanned(user.id);
    if (banned) return banned;

    // Check if account is frozen (dispute escalation)
    const { data: purchaseUserProfile } = await supabase
      .from("profiles")
      .select("account_frozen")
      .eq("id", user.id)
      .single();

    if (purchaseUserProfile?.account_frozen) {
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

    // Fetch project — must be premiering or released with a release price
    const { data: project } = await supabase
      .from("projects")
      .select("id, title, release_price_cents, lifecycle_status, moderation_status, creator_id, is_test")
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

    if (!["premiering", "released"].includes(project.lifecycle_status)) {
      return NextResponse.json(
        { error: "This project is not available for purchase" },
        { status: 400 }
      );
    }

    if (project.moderation_status !== "live") {
      return NextResponse.json(
        { error: "This project is not available" },
        { status: 400 }
      );
    }

    if (!project.release_price_cents) {
      return NextResponse.json(
        { error: "Release price not set" },
        { status: 400 }
      );
    }

    // Cannot purchase own project
    if (project.creator_id === user.id) {
      return NextResponse.json(
        { error: "You cannot purchase your own project" },
        { status: 400 }
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

    // Check if user already has access (preorder or previous purchase)
    const adminSupabase = createAdminClient();

    const { data: existingPreorder } = await adminSupabase
      .from("project_preorders")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .in("current_status", ["active", "committed"])
      .maybeSingle();

    if (existingPreorder) {
      return NextResponse.json(
        { error: "You already have access via preorder" },
        { status: 400 }
      );
    }

    const { data: existingPurchase } = await adminSupabase
      .from("post_release_purchases")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already purchased this project" },
        { status: 400 }
      );
    }

    // Create Stripe PaymentIntent with idempotency key to prevent double charges
    const stripe = getStripe();
    const idempotencyKey = `purchase_${user.id}_${projectId}`;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: project.release_price_cents,
      currency: "usd",
      metadata: {
        type: "post_release_purchase",
        project_id: projectId,
        viewer_id: user.id,
        creator_id: project.creator_id,
      },
      automatic_payment_methods: { enabled: true },
    }, { idempotencyKey });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: project.release_price_cents,
    });
  } catch (err) {
    console.error("[api] purchase error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
