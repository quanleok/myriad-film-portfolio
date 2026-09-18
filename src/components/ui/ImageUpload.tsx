"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ImageUploadProps {
  bucket: "thumbnails" | "avatars";
  currentUrl: string | null;
  onUpload: (url: string) => void;
  aspectRatio: "video" | "square" | "portrait";
  maxSizeMB?: number;
}

export function ImageUpload({
  bucket,
  currentUrl,
  onUpload,
  aspectRatio,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Keep preview in sync with currentUrl prop
  useEffect(() => {
    setPreview(currentUrl);
  }, [currentUrl]);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return "Invalid image type";
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Max size ${maxSizeMB}MB`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);

      // Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      setUploading(true);

      try {
        const supabase = createClient();

        // Get user ID for the folder prefix
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("You must be logged in to upload images.");
        }

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${user.id}/${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        setPreview(publicUrl);
        onUpload(publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        // Revert preview on failure
        setPreview(currentUrl);
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    },
    [bucket, currentUrl, onUpload, validateFile]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so same file can be re-selected
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

    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function handleRemove() {
    setPreview(null);
    setError(null);
    onUpload("");
  }

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video"
      : aspectRatio === "portrait"
        ? "aspect-[9/16] max-w-[240px]"
        : "aspect-square max-w-[200px]";

  return (
    <div className="space-y-2">
      {/* Drop zone / Preview */}
      {preview ? (
        <div className="relative group">
          <div
            className={`${aspectClass} w-full overflow-hidden rounded-lg border border-border bg-page-secondary`}
          >
            <img
              src={preview}
              alt="Upload preview"
              className="h-full w-full object-cover"
            />
          </div>

          {/* Overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-role-bg-overlay-soft opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="cta-energy rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="rounded-lg bg-surface-active px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-active disabled:opacity-50"
            >
              Remove
            </button>
          </div>

          {/* Loading spinner overlay */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-role-bg-overlay">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-role-cta-bg border-t-transparent" />
                <span className="text-xs text-text-tertiary">Uploading...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
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
          className={`${aspectClass} flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
            dragging
              ? "border-role-border-strong bg-role-bg-glow"
              : "border-border bg-page-secondary hover:border-surface-active hover:bg-surface"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-role-cta-bg border-t-transparent" />
              <span className="text-xs text-text-tertiary">Uploading...</span>
            </div>
          ) : (
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
                JPEG, PNG, WebP, or GIF (max {maxSizeMB}MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-role-danger-fg">{error}</p>
      )}
    </div>
  );
}
