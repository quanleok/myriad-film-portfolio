"use client";

interface EmbedPaywallOverlayProps {
  creatorName: string;
  watchUrl: string;
}

export function EmbedPaywallOverlay({
  creatorName,
  watchUrl,
}: EmbedPaywallOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className="mx-4 w-full max-w-sm text-center space-y-4">
        <h3 className="text-lg font-semibold text-white">Premium Content</h3>
        <p className="text-sm text-white/60">
          Subscribe to {creatorName} to watch the full video
        </p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:opacity-80 transition-colors"
        >
          Watch on Myriad
        </a>
      </div>
    </div>
  );
}
