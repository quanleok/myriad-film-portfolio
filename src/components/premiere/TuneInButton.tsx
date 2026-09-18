"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface TuneInButtonProps {
  videoId: string;
  className?: string;
  size?: "sm" | "md";
}

export function TuneInButton({ videoId, className, size = "md" }: TuneInButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [tunedIn, setTunedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetch(`/api/premiere-reminders?videoId=${videoId}`)
      .then((res) => res.json())
      .then((data) => setTunedIn(data.tuned_in))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId, user]);

  async function handleToggle() {
    if (!user) {
      router.push("/login");
      return;
    }

    // Optimistic update
    setTunedIn((prev) => !prev);

    try {
      const res = await fetch("/api/premiere-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!res.ok) {
        // Revert on error
        setTunedIn((prev) => !prev);
        return;
      }

      const data = await res.json();
      setTunedIn(data.tuned_in);
    } catch {
      // Revert on error
      setTunedIn((prev) => !prev);
    }
  }

  if (size === "sm") {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        disabled={loading}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
          tunedIn
            ? "border-brand-600 text-brand-400"
            : "border-border text-text-secondary hover:border-brand-600 hover:text-brand-400"
        } disabled:opacity-60 ${className ?? ""}`}
      >
        {tunedIn ? <BellRing size={12} /> : <Bell size={12} />}
        {tunedIn ? "Tuned In" : "Tune In"}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
        tunedIn
          ? "bg-brand-600/20 text-brand-400 border border-brand-600"
          : "bg-brand-600 text-page hover:opacity-80"
      } disabled:opacity-60 ${className ?? ""}`}
    >
      {tunedIn ? <BellRing size={16} /> : <Bell size={16} />}
      {tunedIn ? "Tuned In" : "Tune In"}
    </button>
  );
}
