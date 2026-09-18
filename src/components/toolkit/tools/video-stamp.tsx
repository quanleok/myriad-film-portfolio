"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Download, ImageIcon, Move, Type, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToolApp } from "@/lib/toolkit";

const FFMPEG_CORE_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd";

interface VideoStampToolProps {
  tool: ToolApp;
}

interface Position {
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getWatermarkWidthFraction({
  scale,
  hasLogo,
  hasText,
}: {
  scale: number;
  hasLogo: boolean;
  hasText: boolean;
}) {
  if (hasLogo && hasText) return Math.max(scale / 100, 0.18);
  if (hasText) return 0.22;
  return Math.max(scale / 100, 0.12);
}

function createDownload(file: Blob, filename: string) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = url;
  });
}

async function fileToObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

export function VideoStampTool({ tool }: VideoStampToolProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const watermarkRef = useRef<HTMLDivElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const dragStateRef = useRef<{
    rect: DOMRect;
    watermarkRect: DOMRect;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0.72, y: 0.72 });
  const [logoScale, setLogoScale] = useState(18);
  const [opacity, setOpacity] = useState(35);
  const [textEnabled, setTextEnabled] = useState(false);
  const [textValue, setTextValue] = useState("@myriadspring");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(28);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl, videoUrl]);

  const hasWatermark = Boolean(logoUrl || (textEnabled && textValue.trim()));

  const handleVideoSelection = useCallback(async (file: File | null) => {
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const objectUrl = await fileToObjectUrl(file);
    setVideoFile(file);
    setVideoUrl(objectUrl);
    setError(null);
  }, [videoUrl]);

  const handleLogoSelection = useCallback(async (file: File | null) => {
    if (!file) return;
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    const objectUrl = await fileToObjectUrl(file);
    setLogoFile(file);
    setLogoUrl(objectUrl);
    setError(null);
  }, [logoUrl]);

  const handlePreset = useCallback(
    (preset: "tl" | "tr" | "bl" | "br" | "center") => {
      const footprint = getWatermarkWidthFraction({
        scale: logoScale,
        hasLogo: Boolean(logoUrl),
        hasText: textEnabled && Boolean(textValue.trim()),
      });
      const xMax = clamp(1 - footprint - 0.04, 0, 1);
      const yMax = clamp(1 - (textEnabled ? 0.18 : 0.12) - 0.04, 0, 1);

      switch (preset) {
        case "tl":
          setPosition({ x: 0.04, y: 0.04 });
          break;
        case "tr":
          setPosition({ x: xMax, y: 0.04 });
          break;
        case "bl":
          setPosition({ x: 0.04, y: yMax });
          break;
        case "br":
          setPosition({ x: xMax, y: yMax });
          break;
        case "center":
          setPosition({ x: clamp((1 - footprint) / 2, 0, 1), y: clamp((1 - 0.16) / 2, 0, 1) });
          break;
      }
    },
    [logoScale, logoUrl, textEnabled, textValue]
  );

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!previewRef.current || !watermarkRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const watermarkRect = watermarkRef.current.getBoundingClientRect();
    dragStateRef.current = {
      rect,
      watermarkRect,
      offsetX: event.clientX - watermarkRect.left,
      offsetY: event.clientY - watermarkRect.top,
    };
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }, []);

  const handleDragMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const { rect, watermarkRect, offsetX, offsetY } = dragStateRef.current;
    const nextX = clamp(
      (event.clientX - rect.left - offsetX) / rect.width,
      0,
      Math.max(0, (rect.width - watermarkRect.width) / rect.width)
    );
    const nextY = clamp(
      (event.clientY - rect.top - offsetY) / rect.height,
      0,
      Math.max(0, (rect.height - watermarkRect.height) / rect.height)
    );
    setPosition({ x: nextX, y: nextY });
  }, []);

  const handleDragEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
  }, []);

  const renderOverlayBlob = useCallback(async () => {
    if (!hasWatermark) return null;

    const canvas = document.createElement("canvas");
    canvas.width = videoSize.width;
    canvas.height = videoSize.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create overlay canvas");
    }

    const footprint = getWatermarkWidthFraction({
      scale: logoScale,
      hasLogo: Boolean(logoUrl),
      hasText: textEnabled && Boolean(textValue.trim()),
    });

    const padding = Math.round(videoSize.width * 0.02);
    const overlayX = Math.round(position.x * videoSize.width);
    let currentY = Math.round(position.y * videoSize.height);
    const overlayWidth = Math.round(videoSize.width * footprint);

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = opacity / 100;

    if (logoUrl) {
      const image = await loadImage(logoUrl);
      const aspectRatio = image.width / image.height;
      const logoWidth = overlayWidth;
      const logoHeight = logoWidth / aspectRatio;
      context.drawImage(image, overlayX, currentY, logoWidth, logoHeight);
      currentY += logoHeight + padding * 0.6;
    }

    if (textEnabled && textValue.trim()) {
      context.font = `700 ${textSize}px "General Sans", Arial, sans-serif`;
      context.fillStyle = textColor;
      context.textBaseline = "top";
      context.fillText(textValue.trim(), overlayX, currentY);
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Could not render overlay image"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }, [hasWatermark, logoScale, logoUrl, opacity, position.x, position.y, textColor, textEnabled, textSize, textValue, videoSize.height, videoSize.width]);

  const exportVideo = useCallback(async () => {
    if (!videoFile) {
      setError("Upload a video first.");
      return;
    }
    if (!hasWatermark) {
      setError("Add a logo or text watermark before exporting.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setError(null);

    let progressHandler: ((event: { progress: number }) => void) | null = null;

    try {
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
        await ffmpegRef.current.load({
          coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
        });
      }

      const ffmpeg = ffmpegRef.current;
      const overlayBlob = await renderOverlayBlob();
      if (!overlayBlob) {
        throw new Error("Could not build the watermark overlay.");
      }

      progressHandler = ({ progress }: { progress: number }) => {
        setExportProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      };
      ffmpeg.on("progress", progressHandler);

      const inputExtension = videoFile.name.split(".").pop() || "mp4";
      const inputName = `input.${inputExtension}`;
      const outputName = "stamped-output.mp4";
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      await ffmpeg.writeFile("overlay.png", await fetchFile(overlayBlob));

      const exitCode = await ffmpeg.exec([
        "-i",
        inputName,
        "-i",
        "overlay.png",
        "-filter_complex",
        "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
        "-map",
        "[v]",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "22",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputName,
      ]);

      if (exitCode !== 0) {
        throw new Error("FFmpeg failed to export the stamped video.");
      }

      const output = (await ffmpeg.readFile(outputName)) as Uint8Array;
      const outputCopy = new Uint8Array(output.byteLength);
      outputCopy.set(output);
      const videoBlob = new Blob([outputCopy.buffer as ArrayBuffer], { type: "video/mp4" });
      createDownload(
        videoBlob,
        `${videoFile.name.replace(/\.[^.]+$/, "")}-stamped.mp4`
      );

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("overlay.png");
      await ffmpeg.deleteFile(outputName);
      setExportProgress(100);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      if (ffmpegRef.current && progressHandler) {
        ffmpegRef.current.off("progress", progressHandler);
      }
      setIsExporting(false);
    }
  }, [hasWatermark, renderOverlayBlob, videoFile]);

  const watermarkStyle = useMemo(
    () => ({
      left: `${position.x * 100}%`,
      top: `${position.y * 100}%`,
      width: `${getWatermarkWidthFraction({
        scale: logoScale,
        hasLogo: Boolean(logoUrl),
        hasText: textEnabled && Boolean(textValue.trim()),
      }) * 100}%`,
      opacity: opacity / 100,
    }),
    [logoScale, logoUrl, opacity, position.x, position.y, textEnabled, textValue]
  );

  return (
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="border-b border-[rgba(131,92,255,0.12)] p-5 lg:border-b-0 lg:border-r">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cdbfff]">
              Utility
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-text-primary">{tool.name}</h2>
          </div>
          <div className="rounded-full border border-[rgba(54,211,153,0.16)] bg-[rgba(9,31,24,0.84)] px-3 py-1.5 text-xs font-medium text-[#c4ffe7]">
            Your files stay on your device
          </div>
        </div>

        <div
          ref={previewRef}
          className="relative aspect-video overflow-hidden rounded-[1.6rem] border border-[rgba(131,92,255,0.18)] bg-[radial-gradient(circle_at_top,rgba(131,92,255,0.16),rgba(11,10,17,0.92)_48%,rgba(5,6,10,1)_100%)] shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
        >
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="h-full w-full object-contain"
              onLoadedMetadata={(event) => {
                const element = event.currentTarget;
                if (element.videoWidth && element.videoHeight) {
                  setVideoSize({
                    width: element.videoWidth,
                    height: element.videoHeight,
                  });
                }
              }}
            />
          ) : (
            <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-4 text-center text-text-secondary">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(131,92,255,0.18)] bg-[rgba(20,17,33,0.84)]">
                <Upload size={24} className="text-[#cdbfff]" />
              </div>
              <div>
                <p className="text-base font-semibold text-text-primary">Drop a video to start</p>
                <p className="mt-1 text-sm">Watermarks, logo placement, and export all happen in-browser.</p>
              </div>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => void handleVideoSelection(event.target.files?.[0] ?? null)}
              />
            </label>
          )}

          {hasWatermark && videoUrl ? (
            <div
              ref={watermarkRef}
              style={watermarkStyle}
              className="absolute cursor-move select-none rounded-[1rem] border border-[rgba(131,92,255,0.2)] bg-black/18 p-2 shadow-[0_12px_28px_rgba(0,0,0,0.3)] backdrop-blur-sm"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo watermark preview" className="pointer-events-none w-full rounded-[0.8rem]" />
              ) : null}
              {textEnabled && textValue.trim() ? (
                <div
                  className="pointer-events-none mt-2 whitespace-nowrap font-semibold"
                  style={{ color: textColor, fontSize: `${textSize}px` }}
                >
                  {textValue.trim()}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 text-sm text-text-secondary">
          Drag the watermark directly on the preview, or use presets to snap it into position before exporting.
        </div>
      </div>

      <div className="space-y-5 p-5">
        <section className="space-y-3 rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.88)] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Source files
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <label className="cursor-pointer rounded-[1.25rem] border border-dashed border-[rgba(131,92,255,0.2)] bg-[rgba(18,16,31,0.78)] p-4 transition-colors hover:bg-[rgba(24,21,40,0.86)]">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-[#cdbfff]" />
                <div>
                  <p className="font-medium text-text-primary">Upload video</p>
                  <p className="text-sm text-text-secondary">{videoFile?.name ?? "MP4, MOV, or any browser-playable file"}</p>
                </div>
              </div>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => void handleVideoSelection(event.target.files?.[0] ?? null)}
              />
            </label>

            <label className="cursor-pointer rounded-[1.25rem] border border-dashed border-[rgba(131,92,255,0.2)] bg-[rgba(18,16,31,0.78)] p-4 transition-colors hover:bg-[rgba(24,21,40,0.86)]">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-[#cdbfff]" />
                <div>
                  <p className="font-medium text-text-primary">Upload logo</p>
                  <p className="text-sm text-text-secondary">{logoFile?.name ?? "PNG with transparency works best"}</p>
                </div>
              </div>
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={(event) => void handleLogoSelection(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.88)] p-4">
          <div className="flex items-center gap-2">
            <Move className="h-4 w-4 text-[#cdbfff]" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Position
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["tl", "Top left"],
              ["tr", "Top right"],
              ["center", "Center"],
              ["bl", "Bottom left"],
              ["br", "Bottom right"],
            ].map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePreset(preset as "tl" | "tr" | "bl" | "br" | "center")}
                className="press-effect rounded-full border border-[rgba(131,92,255,0.14)] bg-[rgba(18,16,31,0.78)] px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-[rgba(26,22,43,0.92)] hover:text-text-primary"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.88)] p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Watermark controls
          </h3>
          <label className="block text-sm font-medium text-text-secondary">
            Size
            <input
              type="range"
              min="10"
              max="36"
              value={logoScale}
              onChange={(event) => setLogoScale(Number(event.target.value))}
              className="mt-2 w-full accent-[#835cff]"
            />
          </label>
          <label className="block text-sm font-medium text-text-secondary">
            Opacity
            <input
              type="range"
              min="10"
              max="100"
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
              className="mt-2 w-full accent-[#835cff]"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.88)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-[#cdbfff]" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Text watermark
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setTextEnabled((current) => !current)}
              className={`press-effect rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                textEnabled
                  ? "bg-[#835cff] text-white"
                  : "border border-[rgba(131,92,255,0.14)] bg-[rgba(18,16,31,0.78)] text-text-secondary"
              }`}
            >
              {textEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <Input
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="@myriadspring"
            disabled={!textEnabled}
            className="rounded-[1rem] border-[rgba(131,92,255,0.16)] bg-[rgba(16,14,27,0.92)] text-text-primary placeholder:text-text-tertiary focus:border-[rgba(151,114,255,0.42)] focus:ring-[rgba(131,92,255,0.24)]"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-secondary">
              Text color
              <input
                type="color"
                value={textColor}
                disabled={!textEnabled}
                onChange={(event) => setTextColor(event.target.value)}
                className="mt-2 h-11 w-full rounded-[1rem] border border-[rgba(131,92,255,0.16)] bg-[rgba(16,14,27,0.92)] p-1"
              />
            </label>
            <label className="block text-sm font-medium text-text-secondary">
              Text size
              <input
                type="range"
                min="16"
                max="54"
                value={textSize}
                disabled={!textEnabled}
                onChange={(event) => setTextSize(Number(event.target.value))}
                className="mt-4 w-full accent-[#835cff]"
              />
            </label>
          </div>
        </section>

        <section className="space-y-3 rounded-[1.5rem] border border-[rgba(131,92,255,0.14)] bg-[rgba(13,12,20,0.88)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                Export
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Render the watermark directly into a new MP4 on your device.
              </p>
            </div>
            <Button
              onClick={() => void exportVideo()}
              disabled={!videoFile || !hasWatermark || isExporting}
              className="rounded-full bg-[#835cff] text-white hover:bg-[#9772ff]"
              leftIcon={isExporting ? <Wand2 size={16} /> : <Download size={16} />}
            >
              {isExporting ? "Exporting" : "Export MP4"}
            </Button>
          </div>

          {isExporting ? (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[#835cff] transition-[width] duration-200"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-sm text-text-secondary">{exportProgress}% complete</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[1rem] border border-[rgba(255,122,122,0.2)] bg-[rgba(53,11,11,0.34)] px-3 py-2 text-sm text-[#ffb7b7]">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
