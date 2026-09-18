"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReportModal } from "@/components/video/ReportModal";

interface ReportButtonProps {
  videoId: string;
  compact?: boolean;
  className?: string;
}

export function ReportButton({
  videoId,
  compact = false,
  className,
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/56 transition-colors hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
            : "flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-secondary transition-all duration-200 hover:bg-surface-hover hover:text-text-primary hover:scale-110",
          className
        )}
        title="Report"
        aria-label="Report"
      >
        <svg
          width={compact ? "16" : "20"}
          height={compact ? "16" : "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      </button>

      <ReportModal
        open={showModal}
        onClose={() => setShowModal(false)}
        videoId={videoId}
        onSuccess={() => {
          setToast("Report submitted. We'll review it shortly.");
          setTimeout(() => setToast(null), 3000);
        }}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-lg bg-surface px-4 py-2.5 text-sm text-text-primary shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
