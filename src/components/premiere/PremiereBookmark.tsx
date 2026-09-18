"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { formatCount } from "@/lib/utils";

interface PremiereBookmarkProps {
  videoId: string;
  className?: string;
  size?: "sm" | "lg";
}

export function PremiereBookmark({
  videoId,
  className,
  size = "lg",
}: PremiereBookmarkProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/watchlist/count?videoId=${videoId}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setSaved(data.saved ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId]);

  async function handleToggle() {
    if (!user) {
      router.push("/login");
      return;
    }

    const wasSaved = saved;
    setSaved(!wasSaved);
    setCount((c) => c + (wasSaved ? -1 : 1));

    try {
      const res = await fetch("/api/watchlist", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      if (!res.ok) {
        setSaved(wasSaved);
        setCount((c) => c + (wasSaved ? 1 : -1));
      }
    } catch {
      setSaved(wasSaved);
      setCount((c) => c + (wasSaved ? 1 : -1));
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
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
          saved
            ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
            : "border-border text-text-secondary hover:border-[#F59E0B]/60 hover:text-[#F59E0B]"
        } disabled:opacity-60 ${className ?? ""}`}
      >
        <Bookmark
          size={13}
          className={saved ? "fill-[#F59E0B]" : ""}
        />
        {count > 0 && <span>{formatCount(count)}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`group/bm flex items-center gap-3 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${
        saved
          ? "bg-[#F59E0B]/15 text-[#F59E0B] border-2 border-[#F59E0B]/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          : "bg-[#F59E0B] text-black hover:bg-[#F59E0B]/90 hover:shadow-[0_0_24px_rgba(245,158,11,0.3)]"
      } disabled:opacity-60 ${className ?? ""}`}
    >
      <Bookmark
        size={22}
        className={`transition-transform duration-200 group-hover/bm:scale-110 ${
          saved ? "fill-[#F59E0B]" : "fill-black"
        }`}
      />
      <span>{saved ? "Bookmarked" : "Bookmark"}</span>
      {count > 0 && (
        <span
          className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            saved
              ? "bg-[#F59E0B]/20 text-[#F59E0B]"
              : "bg-black/20 text-black"
          }`}
        >
          {formatCount(count)}
        </span>
      )}
    </button>
  );
}
