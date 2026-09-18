"use client";

import { CHAT_EMOJIS } from "@/types/chat";

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ChatReactionPicker({ onSelect }: Props) {
  return (
    <div className="absolute top-8 right-2 flex items-center gap-0.5 bg-page border border-border rounded-lg shadow-lg px-1.5 py-1 z-20">
      {CHAT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="p-1 rounded hover:bg-surface-hover text-base transition-transform hover:scale-125"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
