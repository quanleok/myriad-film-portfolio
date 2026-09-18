"use client";

import { useState } from "react";
import Link from "next/link";
import { Reply, Pencil, Trash2, SmilePlus } from "lucide-react";
import { ChatReactionPicker } from "./chat-reaction-picker";
import type { ChatMessageWithProfile } from "@/types/chat";

interface Props {
  message: ChatMessageWithProfile;
  isGrouped: boolean;
  onReply: () => void;
  onReactionChange: () => void;
  readOnly?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ChatMessageItem({ message, isGrouped, onReply, onReactionChange, readOnly, currentUserId, isAdmin }: Props) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);

  const displayName = message.profile?.display_name || message.profile?.username || "Anonymous";
  const avatarUrl = message.profile?.avatar_url;
  const profileSlug = message.profile?.username;
  const profileHref = profileSlug ? `/creator/${profileSlug}` : undefined;
  const isDeleted = !!message.deleted_at;

  const handleEdit = async () => {
    if (!editBody.trim() || editBody === message.body) {
      setEditing(false);
      return;
    }
    await fetch(`/api/chat/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody.trim() }),
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    await fetch(`/api/chat/messages/${message.id}`, { method: "DELETE" });
  };

  const handleReaction = async (emoji: string) => {
    const existing = message.reactions.find((r) => r.emoji === emoji && r.reacted);
    if (existing) {
      await fetch(`/api/chat/messages/${message.id}/reactions?emoji=${encodeURIComponent(emoji)}`, {
        method: "DELETE",
      });
    } else {
      await fetch(`/api/chat/messages/${message.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    }
    setShowReactionPicker(false);
    onReactionChange();
  };

  if (isDeleted) {
    return (
      <div className="px-2 py-1">
        <span className="text-xs text-text-tertiary italic">[message deleted]</span>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex gap-3 px-2 rounded-lg hover:bg-surface-hover/50 ${
        isGrouped ? "py-0.5" : "py-2 mt-1"
      } ${showActions || showReactionPicker ? "z-10" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      {/* Avatar or spacer */}
      {isGrouped ? (
        <div className="w-8 shrink-0" />
      ) : profileHref ? (
        <Link href={profileHref} className="w-8 h-8 shrink-0 rounded-full bg-surface overflow-hidden mt-0.5 hover:ring-2 hover:ring-green-500/30 transition-all">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-tertiary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      ) : (
        <div className="w-8 h-8 shrink-0 rounded-full bg-surface overflow-hidden mt-0.5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-tertiary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Name + timestamp */}
        {!isGrouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            {profileHref ? (
              <Link href={profileHref} className="text-sm font-semibold text-text-primary hover:text-green-400 transition-colors">
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-text-primary">{displayName}</span>
            )}
            <span className="text-xs text-text-tertiary">{timeAgo(message.created_at)}</span>
            {message.edited_at && (
              <span className="text-xs text-text-tertiary">(edited)</span>
            )}
          </div>
        )}

        {/* Reply-to preview */}
        {message.reply_to && (
          <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-green-500/30">
            <span className="text-xs font-medium text-green-400">
              {message.reply_to.profile?.display_name || message.reply_to.profile?.username}
            </span>
            <span className="text-xs text-text-tertiary truncate max-w-[200px]">
              {message.reply_to.body}
            </span>
          </div>
        )}

        {/* Message body */}
        {editing ? (
          <div className="flex gap-2">
            <input
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 bg-surface border border-border rounded px-2 py-1 text-sm text-text-primary"
              autoFocus
            />
            <button onClick={handleEdit} className="text-xs text-green-400 hover:text-green-300">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-text-tertiary hover:text-text-secondary">Cancel</button>
          </div>
        ) : (
          <p className="text-sm text-text-primary break-words whitespace-pre-wrap">{message.body}</p>
        )}

        {/* Image attachment */}
        {message.image_url && (
          <div className="mt-1.5">
            <img
              src={message.image_url}
              alt="attachment"
              className="max-w-xs max-h-64 rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.image_url!, "_blank")}
            />
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => !readOnly && handleReaction(r.emoji)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${readOnly ? "cursor-default " : ""}${
                  r.reacted
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-surface border-border text-text-tertiary hover:border-green-500/20"
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions — hidden in read-only (announcement) rooms */}
      {showActions && !editing && !readOnly && (
        <div className="absolute top-0 right-2 flex items-center gap-0.5 bg-page border border-border rounded-lg shadow-lg px-1 py-0.5 z-10">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary"
            title="React"
          >
            <SmilePlus size={14} />
          </button>
          <button
            onClick={onReply}
            className="p-1.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary"
            title="Reply"
          >
            <Reply size={14} />
          </button>
          {/* Edit — only your own messages */}
          {currentUserId === message.user_id && (
            <button
              onClick={() => { setEditing(true); setEditBody(message.body); }}
              className="p-1.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-text-primary"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          {/* Delete — own messages + admin can delete anyone's */}
          {(currentUserId === message.user_id || isAdmin) && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded hover:bg-surface-hover text-text-tertiary hover:text-danger-fg"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Reaction picker */}
      {showReactionPicker && (
        <ChatReactionPicker
          onSelect={handleReaction}
          onClose={() => setShowReactionPicker(false)}
        />
      )}
    </div>
  );
}
