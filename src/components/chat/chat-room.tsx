"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Hash, Megaphone, Users, LogIn } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { ChatMessageItem } from "./chat-message-item";
import { ChatInput } from "./chat-input";
import type { ChatRoom as ChatRoomType, ChatMessageWithProfile } from "@/types/chat";

export function ChatRoom() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { user, isAdmin, loading: authLoading } = useAuthContext();

  const [rooms, setRooms] = useState<ChatRoomType[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageWithProfile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ id: string; username: string; avatar_url: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  // Load rooms (only when authenticated)
  useEffect(() => {
    if (!user) return;
    fetch("/api/chat/rooms")
      .then((r) => r.json())
      .then((data) => {
        setRooms(data.rooms ?? []);
        // Set active room from URL or default to first
        const urlRoom = searchParams.get("room");
        const match = (data.rooms ?? []).find((r: ChatRoomType) => r.id === urlRoom || r.slug === urlRoom);
        setActiveRoomId(match?.id ?? data.rooms?.[0]?.id ?? null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages when room changes
  const loadMessages = useCallback(async (roomId: string) => {
    setLoading(true);
    setMessages([]);
    initialScrollDone.current = false;
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setHasMore(data.hasMore ?? false);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeRoomId) loadMessages(activeRoomId);
  }, [activeRoomId, loadMessages]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (!loading && messages.length > 0 && !initialScrollDone.current) {
      messagesEndRef.current?.scrollIntoView();
      initialScrollDone.current = true;
    }
  }, [loading, messages.length]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!activeRoomId) return;

    const channel = supabase
      .channel(`chat-room-${activeRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${activeRoomId}`,
        },
        async () => {
          // Fetch the full message with profile
          const res = await fetch(`/api/chat/rooms/${activeRoomId}/messages?limit=1`);
          const data = await res.json();
          if (data.messages?.length) {
            setMessages((prev) => {
              // Avoid duplicates
              const exists = prev.some((m) => m.id === data.messages[0].id);
              if (exists) return prev;
              return [...prev, data.messages[data.messages.length - 1]];
            });
            // Auto-scroll to bottom for new messages
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${activeRoomId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessageWithProfile;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe();

    // Presence
    const presenceChannel = supabase.channel(`presence-${activeRoomId}`);
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state)
          .flat()
          .map((p: Record<string, string>) => ({
            id: p.user_id,
            username: p.username || "anonymous",
            avatar_url: p.avatar_url || "",
          }));
        // Dedupe
        const seen = new Set<string>();
        setOnlineUsers(users.filter((u) => {
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Fetch display name from profiles table (not auth metadata)
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, username, avatar_url")
              .eq("id", user.id)
              .single();
            await presenceChannel.track({
              user_id: user.id,
              username: profile?.display_name || profile?.username || user.email?.split("@")[0] || "anonymous",
              avatar_url: profile?.avatar_url || "",
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [activeRoomId, supabase]);

  // Load older messages on scroll up
  const loadOlder = async () => {
    if (!activeRoomId || loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0]?.created_at;
    try {
      const res = await fetch(
        `/api/chat/rooms/${activeRoomId}/messages?limit=50&before=${oldest}`
      );
      const data = await res.json();
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMore(data.hasMore ?? false);
    } catch {
      // ignore
    }
    setLoadingMore(false);
  };

  const switchRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setReplyTo(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("room", roomId);
    router.replace(`/community?${params.toString()}`, { scroll: false });
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const handleMessageSent = () => {
    setReplyTo(null);
  };

  // Guest gate — show sign-in prompt instead of chat UI
  if (!authLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="rounded-full border border-border bg-surface p-4">
          <LogIn size={24} className="text-text-tertiary" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">Sign in to join the chat</h3>
        <p className="max-w-sm text-sm text-text-secondary">
          Create an account or sign in to chat with the Myriad community, get support, and share your work.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup?redirect=/community"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-role-fg-brand transition-colors hover:bg-brand-500"
          >
            Sign Up
          </Link>
          <Link
            href="/login?redirect=/community"
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Room sidebar — hidden on mobile, horizontal pills instead */}
      <div className="hidden md:flex flex-col w-56 border-r border-border bg-page-secondary shrink-0">
        <div className="p-3 border-b border-border">
          <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Rooms</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => switchRoom(room.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeRoomId === room.id
                  ? "bg-green-500/10 text-green-400"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              {room.admin_only ? (
                <Megaphone size={14} className="shrink-0 opacity-50" />
              ) : (
                <Hash size={14} className="shrink-0 opacity-50" />
              )}
              {room.name}
            </button>
          ))}
        </div>
        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="p-3 border-t border-border">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
              Online — {onlineUsers.length}
            </h3>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-xs text-text-secondary truncate">{u.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile room pills */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border overflow-x-auto scrollbar-hide">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => switchRoom(room.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeRoomId === room.id
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-surface text-text-tertiary border border-border hover:text-text-secondary"
              }`}
            >
              # {room.name}
            </button>
          ))}
        </div>

        {/* Room header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-text-tertiary" />
            <span className="font-semibold text-text-primary">{activeRoom?.name ?? "..."}</span>
            {activeRoom?.description && (
              <span className="text-xs text-text-tertiary hidden sm:inline">— {activeRoom.description}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-text-tertiary">
            <Users size={14} />
            <span className="text-xs">{onlineUsers.length}</span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollTop < 100 && hasMore && !loadingMore) {
              loadOlder();
            }
          }}
        >
          {loadingMore && (
            <div className="text-center text-xs text-text-tertiary py-2">Loading older messages...</div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
              Loading...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-tertiary text-sm gap-2">
              <Hash size={32} className="opacity-30" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const prev = i > 0 ? messages[i - 1] : null;
              const isGrouped =
                prev &&
                prev.user_id === msg.user_id &&
                !msg.reply_to_id &&
                new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 120000;

              const isReadOnly = !!(activeRoom?.admin_only && !isAdmin);
              return (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isGrouped={!!isGrouped}
                  readOnly={isReadOnly}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  onReply={() => setReplyTo(msg)}
                  onReactionChange={() => {
                    // Refresh messages to get updated reactions
                    if (activeRoomId) loadMessages(activeRoomId);
                  }}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input — hidden for non-admins in admin-only rooms */}
        {activeRoom?.admin_only && !isAdmin ? (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border text-text-tertiary text-sm">
            <Megaphone size={14} />
            <span>Only admins can post in this channel</span>
          </div>
        ) : (
          <ChatInput
            roomId={activeRoomId}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onMessageSent={handleMessageSent}
          />
        )}
      </div>
    </div>
  );
}
