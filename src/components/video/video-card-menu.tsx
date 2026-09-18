"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedCreators } from "@/contexts/BlockedCreatorsContext";
import { ReportModal } from "@/components/video/ReportModal";
import { cn } from "@/lib/utils";

interface VideoCardMenuProps {
  videoId: string;
  creatorId: string;
  creatorUsername: string;
  onHide?: () => void;
  className?: string;
}

export function VideoCardMenu({
  videoId,
  creatorId,
  creatorUsername,
  onHide,
  className,
}: VideoCardMenuProps) {
  const { user, isAdmin } = useAuth();
  const { blockCreator } = useBlockedCreators();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowConfirm(false);
        setShowDeleteConfirm(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleNotInterested() {
    if (!user) return;
    await fetch("/api/video/dislike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    setOpen(false);
    showToast("Hidden");
    onHide?.();
  }

  async function handleAdminDelete() {
    if (!user) return;
    const res = await fetch("/api/video/manage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    setShowDeleteConfirm(false);
    setOpen(false);
    if (res.ok) {
      showToast("Video deleted");
      onHide?.();
    } else {
      showToast("Failed to delete");
    }
  }

  async function handleBlock() {
    await blockCreator(creatorId);
    setShowConfirm(false);
    setOpen(false);
    showToast("Blocked");
    onHide?.();
  }

  if (!user) return null;

  return (
    <>
      <div className={cn("relative", open ? "z-50" : "", className)} ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!open);
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-[#94a59e] transition-all duration-200 hover:bg-[rgba(12,20,15,0.72)] hover:text-[#f2faf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(93,202,165,0.34)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110c]"
          aria-label="More options"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {open && !showConfirm && !showDeleteConfirm && (
          <div
            className="absolute bottom-11 right-0 z-50 w-56 rounded-2xl border border-[rgba(93,202,165,0.14)] bg-[rgba(9,14,11,0.96)] py-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNotInterested();
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-[rgba(12,20,15,0.92)] hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 14V2" />
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z" />
              </svg>
              Hide
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-[rgba(12,20,15,0.92)] hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
              Block
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                setShowReport(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-text-primary transition-colors hover:bg-[rgba(12,20,15,0.92)] hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" x2="4" y1="22" y2="15" />
              </svg>
              Report
            </button>
            {isAdmin && (
              <>
                <div className="mx-3 my-1 border-t border-[rgba(255,255,255,0.08)]" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-red-400 transition-colors hover:bg-[rgba(12,20,15,0.92)] hover:text-red-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete video
                </button>
              </>
            )}
          </div>
        )}

        {open && showConfirm && (
          <div
            className="absolute bottom-11 right-0 z-50 w-64 rounded-2xl border border-[rgba(93,202,165,0.14)] bg-[rgba(9,14,11,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <p className="text-sm text-text-primary mb-3">
              Block @{creatorUsername}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBlock();
                }}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-page hover:bg-red-700 transition-colors"
              >
                Block
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirm(false);
                  setOpen(false);
                }}
                className="flex-1 rounded-lg bg-surface-active px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-active transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {open && showDeleteConfirm && (
          <div
            className="absolute bottom-11 right-0 z-50 w-64 rounded-2xl border border-red-500/20 bg-[rgba(9,14,11,0.96)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <p className="text-sm text-text-primary mb-3">
              Delete this video permanently?
            </p>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAdminDelete();
                }}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-page hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                  setOpen(false);
                }}
                className="flex-1 rounded-lg bg-surface-active px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-active transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-lg bg-surface px-4 py-2.5 text-sm text-text-primary shadow-lg">
          {toast}
        </div>
      )}

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        videoId={videoId}
        onSuccess={() => showToast("Report submitted")}
      />
    </>
  );
}
