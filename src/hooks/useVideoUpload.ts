"use client";

import { useCallback, useState } from "react";

interface UseVideoUploadOptions {
  /** Called with the Bunny video GUID after successful upload */
  onComplete: (bunnyVideoId: string) => void;
  /** Optional callback for errors */
  onError?: (error: string) => void;
  /** Title for the Bunny video entry (defaults to file name) */
  title?: string;
  /** API route that creates the Bunny upload session */
  createUploadPath?: string;
}

interface UseVideoUploadReturn {
  phase: "idle" | "creating" | "uploading" | "done" | "error";
  progress: number;
  etaSeconds: number | null;
  error: string | null;
  file: File | null;
  startUpload: (file: File) => Promise<void>;
  reset: () => void;
}

export function useVideoUpload({
  onComplete,
  onError,
  title,
  createUploadPath = "/api/projects/media/upload-video",
}: UseVideoUploadOptions): UseVideoUploadReturn {
  const [phase, setPhase] = useState<UseVideoUploadReturn["phase"]>("idle");
  const [progress, setProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setEtaSeconds(null);
    setError(null);
    setFile(null);
  }, []);

  const startUpload = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setPhase("creating");
      setProgress(0);
      setError(null);
      setEtaSeconds(null);

      try {
        // Step 1: Create Bunny video + get presigned TUS credentials
        const res = await fetch(createUploadPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title || selectedFile.name }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create upload");

        const { bunnyVideoId, uploadUrl, uploadHeaders } = data;

        // Step 2: TUS resumable upload
        setPhase("uploading");
        const startedAt = Date.now();
        const { Upload } = await import("tus-js-client");

        await new Promise<void>((resolve, reject) => {
          const upload = new Upload(selectedFile, {
            endpoint: uploadUrl,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: uploadHeaders,
            metadata: {
              filetype: selectedFile.type,
              title: selectedFile.name,
            },
            onProgress(bytesUploaded, bytesTotal) {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100);
              setProgress(pct);

              const elapsed = Math.max((Date.now() - startedAt) / 1000, 1);
              const bps = bytesUploaded / elapsed;
              const remaining = Math.max(bytesTotal - bytesUploaded, 0);
              setEtaSeconds(bps > 0 ? Math.round(remaining / bps) : null);
            },
            onSuccess() {
              resolve();
            },
            onError(err) {
              reject(err);
            },
          });

          upload.findPreviousUploads().then((prev) => {
            if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
            upload.start();
          });
        });

        setPhase("done");
        setProgress(100);
        onComplete(bunnyVideoId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        setPhase("error");
        onError?.(msg);
      }
    },
    [createUploadPath, onComplete, onError, title]
  );

  return { phase, progress, etaSeconds, error, file, startUpload, reset };
}
