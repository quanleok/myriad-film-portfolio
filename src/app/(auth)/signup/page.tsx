"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SpringLogo } from "@/components/ui/spring-logo";
import { Input } from "@/components/ui/input";
import { FoundingProgramPanel } from "@/components/founding/founding-program-panel";
import { useFoundingProgramStatus } from "@/hooks/use-founding-program-status";

function normalizeRedirectPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
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

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = normalizeRedirectPath(searchParams.get("redirect"));
  const loginHref = requestedRedirect
    ? `/login?redirect=${encodeURIComponent(requestedRedirect)}`
    : "/login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { status: foundingProgramStatus } = useFoundingProgramStatus();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSignupSuccess(false);

    const trimmedDisplayName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedDisplayName) {
      setError("Display name is required");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: trimmedDisplayName,
          is_creator: isCreator,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (data.session) {
        router.push(requestedRedirect ?? "/");
        router.refresh();
      } else {
        setSignupSuccess(true);
        setLoading(false);
      }
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
    if (isCreator) {
      callbackUrl.searchParams.set("creator_intent", "1");
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
          Create a public profile for talent, work, and opportunities.
        </p>
      </div>

      {/* Card */}
      <div className="surface-edge-glow w-full overflow-hidden rounded-[28px] border border-border bg-page-secondary backdrop-blur-sm shadow-[var(--role-surface-elev-2)]">
        <div className="px-6 pt-6 pb-2">
          <h1 className="font-display text-xl font-semibold text-center text-text-primary">
            Create your account
          </h1>
          <p className="mt-1 text-center text-sm text-text-tertiary">
            Join the network of creators, studios, and buyers.
          </p>
        </div>
        <div className="px-6 pb-6 pt-4 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {signupSuccess && (
            <div className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
              Check your email to confirm your account, then log in.
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
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              id="displayName"
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
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
              minLength={8}
              required
            />

            {/* Creator toggle */}
            <label
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                isCreator
                  ? "border-border bg-surface"
                  : "border-border bg-page hover:bg-surface"
              }`}
              aria-label="Toggle creator account"
            >
              <input
                type="checkbox"
                checked={isCreator}
                onChange={(e) => setIsCreator(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                  isCreator
                    ? "border-brand-500 bg-brand-500 text-page"
                    : "border-border"
                }`}
              >
                {isCreator && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  I want to be a creator
                </p>
                <p className="text-xs text-text-tertiary">
                  Build a public profile, publish work, and get discovered.
                </p>
              </div>
            </label>

            {isCreator ? (
              <FoundingProgramPanel
                status={foundingProgramStatus}
                title="Creator bonus: lock in founding pricing while you build."
                body="If the countdown is open, the first 100 creators who launch a public profile lock in 5% platform fee for 12 months, then 10% for life."
                primaryCtaHref="/founding-creators"
                primaryCtaLabel="How it works"
              />
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={loading || oauthLoading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-text-tertiary">
            Already have an account?{" "}
            <Link href={loginHref} className="font-medium text-text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
