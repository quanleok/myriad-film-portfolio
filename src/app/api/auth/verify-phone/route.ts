import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await checkRateLimit("verify-phone", 5);
    if (rateLimited) return rateLimited;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { phone?: unknown; otp?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { phone, otp } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Step 1: Send OTP (no otp provided)
    if (!otp) {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json({ sent: true });
    }

    // Step 2: Verify OTP
    if (typeof otp !== "string") {
      return NextResponse.json(
        { error: "OTP must be a string" },
        { status: 400 }
      );
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });

    if (verifyError) {
      return NextResponse.json(
        { error: verifyError.message },
        { status: 400 }
      );
    }

    // Mark profile as phone verified
    await supabase
      .from("profiles")
      .update({ phone_verified: true })
      .eq("id", user.id);

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("[api] handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
