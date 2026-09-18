import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

interface RouteContext {
  params: Promise<{ id: string; eid: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { eid } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const paymentIntentId = typeof body.payment_intent_id === "string" ? body.payment_intent_id : "";
    if (!paymentIntentId) {
      return NextResponse.json({ error: "payment_intent_id required" }, { status: 400 });
    }

    // Verify the payment intent is succeeded
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Verify metadata matches
    if (pi.metadata.extra_id !== eid || pi.metadata.user_id !== user.id) {
      return NextResponse.json({ error: "Payment mismatch" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check not already recorded
    const { data: existing } = await adminSupabase
      .from("project_extra_purchases")
      .select("id")
      .eq("extra_id", eid)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, alreadyRecorded: true });
    }

    const { error } = await adminSupabase
      .from("project_extra_purchases")
      .insert({
        extra_id: eid,
        user_id: user.id,
        amount_cents: pi.amount,
        payment_intent_id: paymentIntentId,
      });

    if (error) {
      console.error("[api] record extra purchase error:", error);
      return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
