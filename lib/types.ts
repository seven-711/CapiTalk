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
  created_at: string;
}
