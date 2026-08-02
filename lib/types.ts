import { DepartmentType } from "./constants";

export type UserStatus = "online" | "searching" | "in_chat" | "offline";

export interface UserProfile {
  id: string;
  username: string;
  department: DepartmentType;
  avatar_url?: string;
  bio?: string;
  status: UserStatus;
  is_banned?: boolean;
  created_at?: string;
}

export type QueueFilter = "anyone" | "same" | "different";

export interface ChatRoom {
  id: string;
  user_one: UserProfile;
  user_two: UserProfile;
  started_at: string;
  ended_at?: string;
  status: "active" | "ended";
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_username: string;
  message?: string;
  image_url?: string;
  reply_to?: {
    id: string;
    sender_username: string;
    message?: string;
  };
  reactions?: Record<string, string[]>; // reaction_emoji -> array of user_ids
  reaction_update?: { message_id: string; emoji_key: string };
  is_profane?: boolean;
  strike_count?: number;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reporter_username: string;
  reported_user_id: string;
  reported_username: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "dismissed";
  target_type?: "user" | "freedom_post";
  post_id?: string;
  post_author_alias?: string;
  post_message?: string;
  admin_remark?: string;
  created_at: string;
}

export interface FreedomComment {
  id: string;
  post_id: string;
  author_alias: string;
  department?: string;
  message: string;
  created_at: string;
}

export interface FreedomPost {
  id: string;
  author_id?: string;
  author_alias: string;
  department: string;
  message: string;
  color: string;
  likes_count: number;
  liked_by_users: string[];
  comments_count?: number;
  is_admin?: boolean;
  is_pinned?: boolean;
  created_at: string;
}

export interface UserFeedback {
  id: string;
  user_id?: string;
  username?: string;
  category: 'bug' | 'suggestion' | 'ui_ux' | 'general';
  rating: number;
  message: string;
  created_at: string;
}

export interface WallNotification {
  id: string;
  post_id: string;
  type: 'like' | 'comment' | 'admin_remark';
  actor_alias: string; // e.g. "Someone from Engr." or "👑 CapiTalk Admin"
  actor_department?: string;
  message_snippet: string;
  comment_text?: string;
  admin_remark?: string;
  created_at: string;
  read: boolean;
}
