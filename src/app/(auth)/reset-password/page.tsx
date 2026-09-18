"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SpringLogo } from "@/components/ui/spring-logo";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || Boolean(session)) {
        setReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      await supabase.auth.signOut();
      router.push("/login?message=Password+updated+successfully");
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-text-primary/[0.07] shadow-lg shadow-text-primary/5">
          <SpringLogo className="h-8 w-8" glowing />
        </div>
        <span className="font-display text-2xl font-bold text-text-primary tracking-tight">Myriad Spring</span>
        <p className="mt-1 text-sm text-text-secondary">Find AI video worth sharing</p>
      </div>

      <div className="w-full rounded-2xl border border-border/60 bg-page-secondary backdrop-blur-sm shadow-xl shadow-black/5 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h1 className="text-xl font-semibold text-text-primary text-center">
            Set new password
          </h1>
          <p className="mt-1 text-center text-sm text-text-tertiary">
            Enter your new password below
          </p>
        </div>
        <div className="px-6 pb-6 pt-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!ready && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              Verifying your reset link...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="password"
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !ready}
            >
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>

          <p className="text-center text-sm text-text-tertiary">
            <Link href="/login" className="font-medium text-text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
