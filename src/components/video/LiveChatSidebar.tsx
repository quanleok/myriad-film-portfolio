"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
}

interface LiveChatSidebarProps {
  videoId: string;
  creatorId: string;
  /** Force chat open (e.g. for premieres) */
  forceOpen?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────
function timeAgoShort(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

// ── Thresholds ─────────────────────────────────────────────────────
const COLLAPSED_THRESHOLD = 3;

export function LiveChatSidebar({
  videoId,
  creatorId,
  forceOpen = false,
}: LiveChatSidebarProps) {
  const { user } = useAuth();
  const supabase = createClient();

  // Stable anonymous ID to prevent viewer count inflation across tabs
  const anonId = useMemo(
    () => `anon-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(0);

  // Visibility state: "collapsed" | "open"
  const [chatState, setChatState] = useState<"collapsed" | "open">(
    forceOpen ? "open" : "collapsed"
  );
  // Track if user manually toggled
  const [userToggled, setUserToggled] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // ── Presence: viewer count ───────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel(`presence:${videoId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.values(state).reduce(
          (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0
        );
        setViewerCount(count);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user?.id ?? anonId,
            at: Date.now(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, videoId, user?.id]);

  // ── Auto-open when viewer count is high enough ──────────────────
  useEffect(() => {
    if (forceOpen || userToggled) return;

    if (viewerCount >= COLLAPSED_THRESHOLD) {
      setChatState("open");
    } else {
      setChatState("collapsed");
    }
  }, [viewerCount, forceOpen, userToggled]);

  // ── Load initial messages ────────────────────────────────────────
  useEffect(() => {

    async function loadMessages() {
      const { data } = await supabase
        .from("video_chats")
        .select("*")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) {
        const userIds = Array.from(new Set(data.map((m: any) => m.user_id)));
        if (userIds.length === 0) {
          setMessages([]);
          return;
        }
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

  // ── Realtime subscription ────────────────────────────────────────
  useEffect(() => {

    const channel = supabase
      .channel(`video-chat:${videoId}`)
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

  // ── Auto-scroll (within chat container only) ────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (isAtBottom && container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, isAtBottom]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const atBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    setIsAtBottom(atBottom);
  }, []);

  // ── Send message ─────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newMessage.trim() || sending) return;

    const now = Date.now();
    if (now - lastSentAt < 3000) return;

    setSending(true);
    const { error } = await supabase.from("video_chats").insert({
      video_id: videoId,
      user_id: user.id,
      message: newMessage.trim().slice(0, 500),
    });

    if (!error) {
      setNewMessage("");
      setLastSentAt(Date.now());
    }
    setSending(false);
  }

  // ── Toggle helpers ───────────────────────────────────────────────
  function handleOpen() {
    setChatState("open");
    setUserToggled(true);
  }

  function handleClose() {
    setChatState("collapsed");
    setUserToggled(true);
  }

  // ── Render: collapsed toggle button ──────────────────────────────
  if (chatState === "collapsed") {
    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={handleOpen}
          className="flex w-full items-center gap-2 rounded-xl border border-border bg-page-secondary px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          aria-expanded={false}
          aria-controls={`live-chat-${videoId}`}
        >
          <MessageCircle size={16} />
          <span className="font-medium">Live Chat</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {viewerCount} watching
          </span>
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  // ── Render: open chat panel ──────────────────────────────────────
  return (
    <div className="flex flex-col rounded-xl border border-border bg-page-secondary lg:h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-brand-400" />
          <h3 className="text-sm font-medium text-text-primary">Live Chat</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {viewerCount}
          </span>
          {!forceOpen && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
              aria-label="Minimize chat"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        id={`live-chat-${videoId}`}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-[200px] lg:min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center py-8">
            <p className="text-xs text-text-tertiary">No messages yet. Say hi!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isCreator = msg.user_id === creatorId;
          return (
            <div
              key={msg.id}
              className={`rounded-lg px-2.5 py-1.5 ${
                isCreator
                  ? "border-l-2 border-brand-500 bg-brand-500/10"
                  : "hover:bg-surface"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {msg.avatar_url ? (
                  <img
                    src={msg.avatar_url}
                    alt={msg.display_name}
                    className="h-5 w-5 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-surface-hover text-[9px] font-medium text-text-secondary">
                    {msg.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span
                  className={`text-xs font-medium ${
                    isCreator ? "text-brand-400" : "text-text-primary"
                  }`}
                >
                  {msg.display_name}
                  {isCreator && (
                    <span className="ml-1 rounded bg-text-primary/30 px-1 py-0.5 text-[8px] uppercase tracking-wider text-text-secondary">
                      Creator
                    </span>
                  )}
                </span>
                <span className="text-[9px] text-text-tertiary">
                  {timeAgoShort(msg.created_at)}
                </span>
              </div>
              <p className="mt-0.5 pl-[26px] text-xs text-text-secondary leading-relaxed">
                {msg.message}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2.5">
        {user ? (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              maxLength={500}
              className="h-8 flex-1 rounded-full border border-border bg-surface px-3 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-brand-600/50"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-page transition-colors hover:opacity-80 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-text-tertiary">
            <Link href="/login" className="text-brand-400 hover:underline">
              Sign in
            </Link>{" "}
            to chat
          </p>
        )}
      </div>
    </div>
  );
}
