import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function applyInternalPath(url: URL, path: string) {
  const nextUrl = new URL(path, url);
  url.pathname = nextUrl.pathname;
  url.search = nextUrl.search;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = normalizeRedirectPath(searchParams.get("next"));
  const creatorIntent = searchParams.get("creator_intent") === "1";
  const redirectTo = new URL("/", request.url);

  const oauthError = searchParams.get("error");
  const oauthErrorDesc = searchParams.get("error_description");
  if (oauthError) {
    console.error("[callback] OAuth error:", oauthError, oauthErrorDesc);
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "auth_failed");
    redirectTo.searchParams.set("detail", oauthErrorDesc || oauthError);
    if (nextPath) {
      redirectTo.searchParams.set("redirect", nextPath);
    }
    return NextResponse.redirect(redirectTo);
  }

  if (!code) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "missing_code");
    if (nextPath) {
      redirectTo.searchParams.set("redirect", nextPath);
    }
    return NextResponse.redirect(redirectTo);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[callback] exchangeCodeForSession failed:", error.message, error.status);
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("error", "auth_failed");
    redirectTo.searchParams.set("detail", error.message);
    if (nextPath) {
      redirectTo.searchParams.set("redirect", nextPath);
    }
    return NextResponse.redirect(redirectTo);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "is_creator, display_name, created_at, creator_onboarding_completed"
      )
      .eq("id", user.id)
      .single();

    if (profile && user.email) {
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      if (now.getTime() - createdAt.getTime() < 60_000) {
        sendWelcomeEmail(user.email, profile.display_name ?? "there");
      }
    }

    if (profile?.is_creator && !profile.creator_onboarding_completed) {
      redirectTo.pathname = "/onboarding";
      return NextResponse.redirect(redirectTo);
    }

    if (creatorIntent && profile && !profile.is_creator) {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ is_creator: true, role: "creator" })
        .eq("id", user.id);

      redirectTo.pathname = "/onboarding";
      return NextResponse.redirect(redirectTo);
    }
  }

  if (nextPath) {
    applyInternalPath(redirectTo, nextPath);
  }

  return NextResponse.redirect(redirectTo);
}
