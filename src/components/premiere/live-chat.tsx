"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  // Joined from profiles
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
}

interface LiveChatProps {
  videoId: string;
  creatorId: string;
  userId: string | null;
  readOnly?: boolean;
}

function timeAgoShort(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function LiveChat({ videoId, creatorId, userId, readOnly = false }: LiveChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Load initial messages
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from("video_chats")
        .select("*")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) {
        // Fetch profiles for the messages
        const userIds = Array.from(new Set(data.map((m: any) => m.user_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(
          (profiles ?? []).map((p: any) => [p.id, p])
        );

        setMessages(
          data.map((m: any) => {
            const profile = profileMap.get(m.user_id);
            return {
              ...m,
              display_name: profile?.display_name ?? "Anonymous",
              username: profile?.username,
              avatar_url: profile?.avatar_url ?? null,
            };
          })
        );
      }
    }

    loadMessages();
  }, [supabase, videoId]);

  // Subscribe to new messages via realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_chats",
          filter: `video_id=eq.${videoId}`,
        },
        async (payload: any) => {
          const msg = payload.new;
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .eq("id", msg.user_id)
            .single();

          const enriched: ChatMessage = {
            ...msg,
            display_name: profile?.display_name ?? "Anonymous",
            username: profile?.username,
            avatar_url: profile?.avatar_url ?? null,
          };

          setMessages((prev) => [...prev, enriched]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, videoId]);

  // Presence tracking (viewer count)
  useEffect(() => {
    const presence = supabase.channel(`presence:${videoId}`);

    presence
      .on("presence", { event: "sync" }, () => {
        const state = presence.presenceState();
        setViewerCount(Object.keys(state).length);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ user_id: userId ?? "anonymous" });
        }
      });

    return () => {
      supabase.removeChannel(presence);
    };
  }, [supabase, videoId, userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 50;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newMessage.trim() || sending || readOnly) return;

    // Rate limit: 1 message per 3 seconds
    const now = Date.now();
    if (now - lastSentAt < 3000) return;

    setSending(true);
    const { error } = await supabase.from("video_chats").insert({
      video_id: videoId,
      user_id: userId,
      message: newMessage.trim().slice(0, 500),
    });

    if (!error) {
      setNewMessage("");
      setLastSentAt(Date.now());
    }
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-page-secondary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium text-text-primary">
          Live Chat
        </h3>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          {viewerCount} watching
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[200px] max-h-[400px]"
      >
        {messages.map((msg) => {
          const isCreatorMsg = msg.user_id === creatorId;
          return (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 ${
                isCreatorMsg
                  ? "border-l-2 border-brand-500 bg-brand-500/10"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {msg.avatar_url ? (
                  <Image
                    src={msg.avatar_url}
                    alt={msg.display_name ?? ""}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-hover text-[10px] font-medium text-text-secondary">
                    {msg.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className={`text-sm font-medium ${isCreatorMsg ? "text-brand-400" : "text-text-primary"}`}>
                  {msg.display_name}
                  {isCreatorMsg && (
                    <span className="ml-1 rounded bg-text-primary/30 px-1 py-0.5 text-[9px] uppercase tracking-wider text-text-secondary">
                      Creator
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-text-tertiary">
                  {timeAgoShort(msg.created_at)}
                </span>
              </div>
              <p className="mt-0.5 pl-8 text-sm text-text-primary">{msg.message}</p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-3">
        {readOnly ? (
          <p className="text-center text-xs text-text-tertiary">Chat is read-only</p>
        ) : userId ? (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              maxLength={500}
              className="h-9 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-600/50"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-page transition-colors hover:opacity-80 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-text-tertiary">
            <a href="/login" className="text-brand-400 hover:underline">
              Sign in
            </a>{" "}
            to chat
          </p>
        )}
      </div>
    </div>
  );
}
