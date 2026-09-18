"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SpringLogo } from "@/components/ui/spring-logo";
import { Input } from "@/components/ui/input";

function normalizeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function getRedirectContextLabel(path: string | null): string | null {
  if (!path) return null;
  if (path === "/" || path.startsWith("/?")) return "IronForge";
  if (path === "/upload" || path.startsWith("/upload?")) return "uploads";
  if (path === "/dashboard" || path.startsWith("/dashboard?")) return "your dashboard";
  if (path === "/library" || path.startsWith("/library?")) return "your library";
  if (path === "/talent" || path.startsWith("/talent?")) return "talent discovery";
  if (path === "/toolkit" || path.startsWith("/toolkit?")) return "IronForge";
  return null;
}

function formatAuthError(errorCode: string | null, detail: string | null): string | null {
  if (!errorCode) return null;
  if (errorCode === "missing_code") {
    return "Sign-in link is missing required information. Please try again.";
  }
  if (errorCode === "auth_failed") {
    const msg = "Could not complete sign-in. Please try again.";
    return detail ? `${msg} (${detail})` : msg;
  }
  return "Authentication failed. Please try again.";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const callbackError = formatAuthError(searchParams.get("error"), searchParams.get("detail"));
  const requestedRedirect = normalizeRedirectPath(searchParams.get("redirect"));
  const redirectContextLabel = getRedirectContextLabel(requestedRedirect);
  const signupHref = requestedRedirect
    ? `/signup?redirect=${encodeURIComponent(requestedRedirect)}`
    : "/signup";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      let destination = requestedRedirect ?? "/";

      if (data.user) {
        await supabase
          .from("profiles")
          .update({ last_active_at: new Date().toISOString() })
          .eq("id", data.user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_creator, creator_onboarding_completed")
          .eq("id", data.user.id)
          .single();

        if (profile?.is_creator && !profile.creator_onboarding_completed) {
          destination = "/onboarding";
        }
      }

      router.push(destination);
      router.refresh();
    }
  }

  async function handleOAuth() {
    if (oauthLoading) return;
    setOauthLoading(true);
    setError(null);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (requestedRedirect) {
      callbackUrl.searchParams.set("next", requestedRedirect);
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Logo + branding */}
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface shadow-[0_12px_28px_-20px_rgba(0,0,0,0.6)]">
          <SpringLogo className="h-8 w-8" glowing />
        </div>
        <span className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Myriad Spring
        </span>
        <p className="mt-1 text-sm text-text-secondary">
          Find creators, studios, and work worth hiring.
        </p>
      </div>

      {/* Card */}
      <div className="surface-edge-glow w-full overflow-hidden rounded-[28px] border border-border bg-page-secondary backdrop-blur-sm shadow-[var(--role-surface-elev-2)]">
        <div className="px-6 pt-6 pb-2">
          <h1 className="font-display text-xl font-semibold text-center text-text-primary">
            Welcome back
          </h1>
          <p className="mt-1 text-center text-sm text-text-tertiary">
            {redirectContextLabel
              ? `Sign in to access ${redirectContextLabel}`
              : "Log in to continue"}
          </p>
        </div>
        <div className="px-6 pb-6 pt-4 space-y-5">
          {message && (
            <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
              {message}
            </div>
          )}

          {callbackError && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {callbackError}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleOAuth}
            type="button"
            disabled={loading || oauthLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-page px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-50"
          >
            <GoogleIcon />
            {oauthLoading ? "Redirecting..." : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-page-secondary px-3 text-text-tertiary">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-text-tertiary transition-colors hover:text-text-primary"
              >
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading || oauthLoading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <p className="text-center text-sm text-text-tertiary">
            Don&apos;t have an account?{" "}
            <Link href={signupHref} className="font-medium text-text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
