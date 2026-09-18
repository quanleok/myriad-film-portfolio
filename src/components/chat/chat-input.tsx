"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import type { ChatMessageWithProfile } from "@/types/chat";
import { MESSAGE_MAX_LENGTH } from "@/types/chat";

interface Props {
  roomId: string | null;
  replyTo: ChatMessageWithProfile | null;
  onCancelReply: () => void;
  onMessageSent: () => void;
}

export function ChatInput({ roomId, replyTo, onCancelReply, onMessageSent }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(3);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const send = useCallback(async () => {
    if (!roomId || (!body.trim() && !imageUrl) || sending || cooldown > 0) return;

    setSending(true);
    try {
      await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim() || (imageUrl ? "[image]" : ""),
          reply_to_id: replyTo?.id || undefined,
          image_url: imageUrl || undefined,
        }),
      });

      setBody("");
      setImageUrl(null);
      onMessageSent();
      startCooldown();
    } catch {
      // ignore
    }
    setSending(false);
  }, [roomId, body, imageUrl, replyTo, sending, cooldown, onMessageSent, startCooldown]);

  const handleImageUpload = async (file: File) => {
    setUploadError(null);
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image too large — max 5 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Only images are allowed");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch {
      setUploadError("Upload failed");
    }
    setUploading(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
  };

  return (
    <div className="border-t border-border bg-page px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between mb-2 pl-3 border-l-2 border-green-500/30 text-xs">
          <span className="text-text-tertiary">
            Replying to <span className="text-green-400 font-medium">{replyTo.profile?.display_name || replyTo.profile?.username}</span>
          </span>
          <button onClick={onCancelReply} className="p-1 text-text-tertiary hover:text-text-primary">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imageUrl && (
        <div className="relative inline-block mb-2">
          <img src={imageUrl} alt="attachment" className="h-20 rounded-lg border border-border" />
          <button
            onClick={() => setImageUrl(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger-bg border border-danger-border flex items-center justify-center"
          >
            <X size={10} className="text-danger-fg" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
        >
          <ImagePlus size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-green-500/30 transition-colors"
          style={{ minHeight: "38px", maxHeight: "120px" }}
        />
        <button
          onClick={send}
          disabled={sending || cooldown > 0 || (!body.trim() && !imageUrl)}
          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 relative"
        >
          {cooldown > 0 ? (
            <span className="text-xs font-mono w-[18px] text-center">{cooldown}</span>
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {uploading && (
        <p className="text-xs text-text-tertiary mt-1">Uploading image...</p>
      )}
      {uploadError && (
        <p className="text-xs text-danger-fg mt-1">{uploadError}</p>
      )}
    </div>
  );
}
