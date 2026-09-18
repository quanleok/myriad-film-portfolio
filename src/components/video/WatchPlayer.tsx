"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { VideoPlayer } from "./VideoPlayer";
import { PaywallOverlay } from "./PaywallOverlay";
import { createClient } from "@/lib/supabase/client";
import { useMiniPlayer } from "@/contexts/MiniPlayerContext";


interface WatchPlayerProps {
  videoId: string;
  /** HLS stream URL generated server-side (unsigned for free, or preview URL for premium) */
  streamUrl: string | null;
  thumbnailUrl?: string | null;
  previewSeconds: number;
  pricingModel: string;
  priceCents: number;
  creatorId: string;
  subscriptionPriceCents: number;
  creatorName?: string;
  creatorUsername?: string;
  durationSeconds?: number;
  initialPosition?: number;
  /** Auto-trigger checkout after login redirect */
  autoCheckout?: "purchase" | "subscribe";
  /** Called when the video finishes playing */
  onEnded?: () => void;
}

export function WatchPlayer({
  videoId,
  streamUrl,
  thumbnailUrl,
  previewSeconds,
  pricingModel,
  priceCents,
  creatorId,
  subscriptionPriceCents,
  creatorName,
  creatorUsername,
  durationSeconds,
  initialPosition,
  autoCheckout,
  onEnded,
}: WatchPlayerProps) {
  const isFree = pricingModel === "free";
  const [hasAccess, setHasAccess] = useState(isFree);
  const [videoUrl, setVideoUrl] = useState<string | null>(streamUrl);
  const [showPaywall, setShowPaywall] = useState(false);
  const [loading, setLoading] = useState(!isFree);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // If mini player was playing this video, resume from its position
  const { miniPlayer } = useMiniPlayer();
  const resumePosition =
    miniPlayer?.videoId === videoId
      ? miniPlayer.currentTime
      : initialPosition;

  useEffect(() => {
    if (isFree) return;

    async function checkAccess() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/video/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });

        if (res.ok) {
          const data = await res.json();
          setVideoUrl(data.url);
          setHasAccess(true);
        }
      } catch {
        // No access — will show preview with streamUrl
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [videoId, isFree]);

  const handlePreviewEnd = useCallback(() => {
    setShowPaywall(true);
  }, []);

  const handlePurchase = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/payments/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, returnPath: `/watch/${videoId}` }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/watch/${videoId}?checkout=purchase`)}`;
        return null;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return null;
      }
      return data.error ?? "Checkout failed";
    } catch {
      return "Network error";
    }
  }, [videoId]);

  const handleSubscribe = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId, returnPath: `/watch/${videoId}` }),
      });
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(`/watch/${videoId}?checkout=subscribe`)}`;
        return null;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return null;
      }
      return data.error ?? "Checkout failed";
    } catch {
      return "Network error";
    }
  }, [creatorId, videoId]);

  // Auto-trigger checkout after login redirect (user clicked Unlock → got 401 → logged in → came back)
  const autoCheckoutTriggered = useRef(false);
  useEffect(() => {
    if (!autoCheckout || autoCheckoutTriggered.current || loading) return;
    autoCheckoutTriggered.current = true;

    // Clean the ?checkout= param from the URL so refresh doesn't re-trigger
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());

    if (autoCheckout === "purchase") {
      handlePurchase();
    } else if (autoCheckout === "subscribe") {
      handleSubscribe();
    }
  }, [autoCheckout, loading, handlePurchase, handleSubscribe]);

  if (loading) {
    return (
      <div className="relative aspect-video w-full max-h-[80vh] overflow-hidden bg-black">
        {thumbnailUrl && (
          <Image src={thumbnailUrl} alt="" fill sizes="100vw" className="object-contain" priority />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </div>
    );
  }

  const playerUrl = videoUrl ?? "";

  return (
    <div className="relative">
      {playerUrl ? (
        <VideoPlayer
          videoUrl={playerUrl}
          videoId={videoId}
          posterUrl={thumbnailUrl || undefined}
          previewSeconds={previewSeconds}
          hasAccess={hasAccess}
          onPreviewEnd={handlePreviewEnd}
          onEnded={onEnded}
          initialPosition={hasAccess ? resumePosition : undefined}
          onVideoElement={setVideoEl}
        />
      ) : (
        <div className="relative aspect-video w-full max-h-[80vh] overflow-hidden bg-black">
          {thumbnailUrl && (
            <Image src={thumbnailUrl} alt="" fill sizes="100vw" className="object-contain" priority />
          )}
          {/* Only show "processing" message for free videos; premium without stream shows paywall below */}
          {(isFree || hasAccess) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center space-y-4">
                <div className="text-6xl text-white/30">&#9654;</div>
                <p className="text-white/50 text-sm">
                  Video is processing — check back shortly
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {(showPaywall || (!hasAccess && !isFree && !loading && !playerUrl)) && !hasAccess && (
        <PaywallOverlay
          priceCents={priceCents}
          subscriptionPriceCents={subscriptionPriceCents}
          onPurchase={handlePurchase}
          onSubscribe={handleSubscribe}
          creatorName={creatorName}
          creatorUsername={creatorUsername}
          durationSeconds={durationSeconds}
        />
      )}
    </div>
  );
}
