"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SpringLogo } from "@/components/ui/spring-logo";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
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
            Reset your password
          </h1>
          <p className="mt-1 text-center text-sm text-text-tertiary">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>
        <div className="px-6 pb-6 pt-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {success ? (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              Check your email for a reset link
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-sm text-text-tertiary">
            <Link href="/login" className="font-medium text-text-primary hover:underline">
              Back to login
            </Link>
            <Link href="/signup" className="font-medium text-text-primary hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
