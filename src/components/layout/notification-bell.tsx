"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  // Legacy
  new_subscriber: "\uD83C\uDF1F",
  new_purchase: "\uD83D\uDCB0",
  new_comment: "\uD83D\uDCAC",
  comment_reply: "\u21A9\uFE0F",
  new_video: "\uD83C\uDFA5",
  new_follower: "\uD83D\uDC64",
  // Project lifecycle
  new_preorder: "\uD83C\uDF9F\uFE0F",
  project_unlocked: "\uD83D\uDD13",
  film_delivered: "\uD83C\uDFAC",
  failed_to_unlock: "\u274C",
  project_approved: "\u2705",
  project_rejected: "\uD83D\uDEAB",
  premiere: "\uD83C\uDFAD",
  delivery_reminder: "\u23F0",
  delivery_overdue: "\u23F0",
  delivery_overdue_strike: "\uD83D\uDD34",
  manual_greenlight_available: "\uD83D\uDCA1",
  // Creator feedback
  proof_approved: "\u2705",
  proof_rejected: "\uD83D\uDD04",
  // Admin
  admin_moderation: "\u26A0\uFE0F",
  admin_strike: "\uD83D\uDD34",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bouncing, setBouncing] = useState(false);
  const prevUnreadRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      const json = await res.json();
      setNotifications(json.data ?? []);
      setUnreadCount(json.unreadCount ?? 0);
      setError(null);
    } catch {
      setError("Unable to refresh notifications");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Bounce once when new unread notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && unreadCount > 0) {
      setBouncing(true);
      const timer = setTimeout(() => setBouncing(false), 500);
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (!user) return null;

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error("Failed to mark notifications");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setError(null);
    } catch {
      setError("Unable to mark notifications as read");
    }
  }

  async function handleClick(notification: Notification) {
    // Mark as read
    if (!notification.is_read) {
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notification.id }),
        });
        if (!res.ok) throw new Error("Failed to mark notification");
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        setError(null);
      } catch {
        setError("Unable to update notification state");
      }
    }

    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-text-primary ${bouncing ? "animate-notification-bounce" : ""}`}
        title="Notifications"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="notification-dropdown"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-role-danger-fg text-[10px] font-bold text-role-fg-contrast">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-dropdown"
          className="fixed inset-x-3 top-14 z-50 animate-fade-in rounded-xl border border-border bg-page shadow-2xl sm:absolute sm:inset-x-auto sm:top-10 sm:right-0 sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-text-primary underline hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error && (
              <p className="mx-4 mt-3 rounded-lg border border-role-danger-border bg-role-danger-bg px-3 py-2 text-xs text-role-danger-fg">
                {error}
              </p>
            )}
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-tertiary">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface ${
                    !n.is_read ? "bg-text-primary/5" : ""
                  }`}
                >
                  <span className="mt-0.5 text-base flex-shrink-0">
                    {TYPE_ICONS[n.type] ?? "\uD83D\uDD14"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      {!n.is_read && (
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-text-primary" />
                      )}
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-text-tertiary truncate">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
