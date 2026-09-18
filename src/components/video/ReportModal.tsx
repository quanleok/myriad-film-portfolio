"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { REPORT_REASONS, type ReportReason } from "@/lib/report-reasons";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  videoId?: string;
  commentId?: string;
  onSuccess?: () => void;
}

export function ReportModal({
  open,
  onClose,
  videoId,
  commentId,
  onSuccess,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!reason) {
      setError("Select a reason");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          commentId,
          reason,
          details: details.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit report");
      }

      setSubmitted(true);
      onSuccess?.();

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setReason("");
    setDetails("");
    setError(null);
    setSubmitted(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {submitted ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">Report submitted</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Thanks for letting us know.
          </p>
        </div>
      ) : (
        <>
          <h3 className="mb-4 text-lg font-semibold text-text-primary">Report content</h3>

          <div className="space-y-3">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  reason === r.value
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-border hover:border-border"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="sr-only"
                />
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    reason === r.value
                      ? "border-brand-500 bg-brand-500"
                      : "border-border"
                  }`}
                >
                  {reason === r.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-sm text-text-primary">{r.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-page-secondary px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-brand-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-page transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
