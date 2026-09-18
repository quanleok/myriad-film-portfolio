import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createConnectAccount,
  createOnboardingLink,
  createOnboardingLinkWithReturnPath,
  getStripeOnboardingStatus,
} from "@/lib/stripe/connect";
import { checkRateLimit } from "@/lib/rate-limit";

function normalizeReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_creator, stripe_account_id, stripe_onboarding_complete")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.stripe_account_id) {
    return NextResponse.json({
      isCreator: profile.is_creator,
      hasAccount: false,
      isOnboarded: Boolean(profile.stripe_onboarding_complete),
    });
  }

  try {
    const isOnboarded = await getStripeOnboardingStatus(profile.stripe_account_id);

    if (isOnboarded !== Boolean(profile.stripe_onboarding_complete)) {
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: isOnboarded })
        .eq("id", user.id);
    }

    return NextResponse.json({
      isCreator: profile.is_creator,
      hasAccount: true,
      isOnboarded,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to check Stripe account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimited = await checkRateLimit("creator-onboard", 5);
  if (rateLimited) return rateLimited;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request
    .json()
    .catch(() => ({} as { returnPath?: unknown }));
  const returnPath = normalizeReturnPath(payload.returnPath);

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_creator, stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      if (!user.email) {
        return NextResponse.json(
          { error: "Account email is required for Stripe Connect" },
          { status: 400 }
        );
      }

      const account = await createConnectAccount(user.email);
      accountId = account.id;

      await supabase
        .from("profiles")
        .update({
          is_creator: true,
          role: "creator",
          stripe_account_id: account.id,
        })
        .eq("id", user.id);
    } else if (!profile.is_creator) {
      await supabase
        .from("profiles")
        .update({
          is_creator: true,
          role: "creator",
        })
        .eq("id", user.id);
    }

    const link = returnPath
      ? await createOnboardingLinkWithReturnPath(accountId, returnPath)
      : await createOnboardingLink(accountId);

    return NextResponse.json({ url: link.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create creator account";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
