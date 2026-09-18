"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Modal({ open, onClose, children, className, title }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="fixed inset-0 bg-role-bg-overlay backdrop-blur-md" />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg animate-slide-up rounded-xl border border-role-border-strong bg-role-bg-page-secondary p-6 text-role-fg-primary shadow-[var(--role-surface-elev-2)]",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded p-1 text-role-fg-secondary transition-colors hover:text-role-fg-primary"
          aria-label="Close modal"
        >
          &#10005;
        </button>
        {title ? <h2 className="mb-4 text-lg font-semibold">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
