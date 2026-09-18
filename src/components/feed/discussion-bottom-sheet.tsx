"use client";

import { useEffect } from "react";
import { ProjectDiscussion } from "@/components/projects/project-discussion";

interface DiscussionBottomSheetProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  title: string;
  isLoggedIn: boolean;
}

export function DiscussionBottomSheet({
  open,
  onClose,
  projectId,
  title,
  isLoggedIn,
}: DiscussionBottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close discussion"
        onClick={onClose}
      />

      <div className="absolute bottom-0 left-0 right-0 flex max-h-[75vh] flex-col rounded-t-2xl bg-page shadow-2xl md:left-1/2 md:max-h-[80vh] md:w-[520px] md:-translate-x-1/2 md:rounded-2xl md:bottom-6">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="mx-auto mb-0 h-1.5 w-12 rounded-full bg-text-tertiary/40 md:hidden absolute top-2 left-1/2 -translate-x-1/2" />
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <ProjectDiscussion projectId={projectId} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </div>
  );
}
