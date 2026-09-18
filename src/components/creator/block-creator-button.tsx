"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedCreators } from "@/contexts/BlockedCreatorsContext";

interface BlockCreatorButtonProps {
  creatorId: string;
  creatorUsername: string;
}

export function BlockCreatorButton({ creatorId, creatorUsername }: BlockCreatorButtonProps) {
  const { user } = useAuth();
  const { isBlocked, blockCreator, unblockCreator } = useBlockedCreators();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const blocked = isBlocked(creatorId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowConfirm(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user || user.id === creatorId) return null;

  async function handleBlock() {
    await blockCreator(creatorId);
    setShowConfirm(false);
    setOpen(false);
    setToast("Blocked");
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUnblock() {
    await unblockCreator(creatorId);
    setOpen(false);
    setToast("Unblocked");
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
          aria-label="More options"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {open && !showConfirm && (
          <div className="absolute right-0 top-11 z-50 w-52 rounded-lg border border-border bg-surface py-1 shadow-xl">
            {blocked ? (
              <button
                onClick={handleUnblock}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.9 4.9 14.2 14.2" />
                </svg>
                Unblock
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.9 4.9 14.2 14.2" />
                </svg>
                Block
              </button>
            )}
          </div>
        )}

        {open && showConfirm && (
          <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-border bg-surface p-4 shadow-xl">
            <p className="text-sm text-text-primary mb-3">
              Block @{creatorUsername}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleBlock}
                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Block
              </button>
              <button
                onClick={() => { setShowConfirm(false); setOpen(false); }}
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
    </>
  );
}
