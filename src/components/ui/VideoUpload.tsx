"use client";

import { useCallback, useRef, useState } from "react";
import { useVideoUpload } from "@/hooks/useVideoUpload";

const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatEta(seconds: number | null): string {
  if (seconds === null) return "";
  if (seconds < 60) return `${seconds}s remaining`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s remaining`;
}

function formatSizeLimit(maxSizeMB: number): string {
  if (maxSizeMB >= 1000) {
    const sizeInGb = maxSizeMB / 1000;
    return Number.isInteger(sizeInGb) ? `${sizeInGb} GB` : `${sizeInGb.toFixed(1)} GB`;
  }
  return `${maxSizeMB} MB`;
}

interface VideoUploadProps {
  /** Current Bunny video GUID (for showing "uploaded" state) */
  currentAssetId: string | null;
  /** Called with the Bunny video GUID when upload completes */
  onUpload: (bunnyVideoId: string) => void;
  /** Title for the Bunny video entry */
  title?: string;
  /** Max file size in MB (default: 500) */
  maxSizeMB?: number;
  /** API route that creates the Bunny upload session */
  uploadPath?: string;
}

export function VideoUpload({
  currentAssetId,
  onUpload,
  title,
  maxSizeMB = 500,
  uploadPath,
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { phase, progress, etaSeconds, error, file, startUpload, reset } =
    useVideoUpload({
      onComplete: onUpload,
      title,
      createUploadPath: uploadPath,
    });

  const hasAsset = currentAssetId && phase !== "uploading" && phase !== "creating";

  const validateAndUpload = useCallback(
    (selectedFile: File) => {
      setValidationError(null);

      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        setValidationError("Please upload MP4, MOV, WebM, or AVI");
        return;
      }
      if (selectedFile.size > maxSizeMB * 1024 * 1024) {
        setValidationError(`Max size ${formatSizeLimit(maxSizeMB)}`);
        return;
      }

      startUpload(selectedFile);
    },
    [maxSizeMB, startUpload]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) validateAndUpload(f);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndUpload(f);
  }

  function handleRemove() {
    reset();
    setValidationError(null);
    onUpload("");
  }

  // Uploading / creating state
  if (phase === "creating" || phase === "uploading") {
    return (
      <div className="space-y-2">
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-page-secondary flex flex-col items-center justify-center gap-3 p-6">
          {phase === "creating" ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-role-cta-bg border-t-transparent" />
              <p className="text-sm text-text-tertiary">Preparing upload...</p>
            </>
          ) : (
            <>
              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="mb-2 flex items-center justify-between text-xs text-text-tertiary">
                  <span>{progress}%</span>
                  <span>{formatEta(etaSeconds)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-role-cta-bg shadow-[0_0_8px_var(--role-glow-soft)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              {file && (
                <p className="text-xs text-text-tertiary truncate max-w-[250px]">
                  {file.name} ({formatBytes(file.size)})
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Has asset (uploaded or pre-existing)
  if (hasAsset) {
    return (
      <div className="space-y-2">
        <div className="relative group aspect-video w-full overflow-hidden rounded-lg border border-border bg-page-secondary flex flex-col items-center justify-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-role-success-fg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-text-secondary">Video uploaded</p>
          <p className="text-xs text-text-tertiary font-mono truncate max-w-[200px]">
            {currentAssetId}
          </p>

          {/* Overlay */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-role-bg-overlay-soft opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cta-energy rounded-lg px-3 py-1.5 text-sm font-semibold"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg bg-surface-active px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-active"
            >
              Remove
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={handleFileChange}
          className="hidden"
        />

        {(error || validationError) && (
          <p className="text-sm text-role-danger-fg">{error || validationError}</p>
        )}
      </div>
    );
  }

  // Empty / error state — drop zone
  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`aspect-video flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          dragging
            ? "border-role-border-strong bg-role-bg-glow"
            : "border-border bg-page-secondary hover:border-surface-active hover:bg-surface"
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-text-secondary">
            Drag & drop or click to upload
          </p>
          <p className="text-xs text-text-tertiary">
            MP4, MOV, WebM, or AVI (max {formatSizeLimit(maxSizeMB)})
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
        onChange={handleFileChange}
        className="hidden"
      />

      {(error || validationError) && (
        <p className="text-sm text-role-danger-fg">
          {error || validationError}
          {phase === "error" && (
            <button
              type="button"
              onClick={() => {
                reset();
                setValidationError(null);
              }}
              className="ml-2 underline hover:text-role-danger-fg"
            >
              Try again
            </button>
          )}
        </p>
      )}
    </div>
  );
}
