export interface ChatRoom {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  admin_only: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  reply_to_id: string | null;
  image_url: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ChatMessageWithProfile extends ChatMessage {
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    body: string;
    profile: {
      display_name: string | null;
      username: string | null;
    };
  } | null;
  reactions: ChatReactionAggregate[];
}

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatReactionAggregate {
  emoji: string;
  count: number;
  reacted: boolean; // whether current user reacted
}

export interface ChatMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
}

// Common emojis for the reaction picker
export const CHAT_EMOJIS = [
  "👍", "❤️", "🔥", "😂", "😮", "🎬", "✨", "🙌", "💯", "🤔",
] as const;

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGES_PER_PAGE = 50;
