"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

export function ForumCommentForm({
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  disabled,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!body.trim() || submitting || disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(body.trim());
      setBody("");
      setMode("write");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not post comment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/12 p-4">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("write")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "write" ? "bg-[rgba(0,232,123,0.14)] text-white" : "text-text-secondary"}`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${mode === "preview" ? "bg-[rgba(127,119,221,0.16)] text-white" : "text-text-secondary"}`}
        >
          Preview
        </button>
      </div>

      {mode === "write" ? (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[120px] resize-y rounded-[1rem] border-white/10 bg-[rgba(255,255,255,0.03)]"
        />
      ) : (
        <div className="min-h-[120px] rounded-[1rem] border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3">
          {body.trim() ? (
            <MarkdownRenderer content={body} />
          ) : (
            <p className="text-sm text-text-tertiary">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      <div className="mt-3 flex justify-between gap-3">
        <p className="text-xs text-text-tertiary">Markdown supported.</p>
        <div className="flex gap-2">
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="button" onClick={handleSubmit} disabled={!body.trim() || disabled} loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

