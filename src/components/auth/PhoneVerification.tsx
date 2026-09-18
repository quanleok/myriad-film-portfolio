"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PhoneVerificationProps {
  onVerified: () => void;
}

export function PhoneVerification({ onVerified }: PhoneVerificationProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to send verification code");
        return;
      }

      setStep("otp");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Invalid verification code");
        return;
      }

      onVerified();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary">
        Verify your phone number
      </h2>
      <p className="text-sm text-text-secondary">
        Phone verification is required before you can upload content.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <div className="space-y-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full rounded-lg border border-border bg-page px-4 py-2.5 text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <Button
            onClick={handleSendOtp}
            disabled={!phone || loading}
            className="w-full"
          >
            {loading ? "Sending..." : "Send verification code"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Enter the 6-digit code sent to {phone}
          </p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            maxLength={6}
            className="w-full rounded-lg border border-border bg-page px-4 py-2.5 text-center text-xl tracking-widest text-text-primary placeholder:text-text-tertiary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <Button
            onClick={handleVerifyOtp}
            disabled={otp.length < 6 || loading}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setOtp(""); }}
            className="text-sm text-text-tertiary hover:text-text-secondary"
          >
            Use a different number
          </button>
        </div>
      )}
    </div>
  );
}
