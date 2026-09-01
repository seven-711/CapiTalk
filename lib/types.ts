import { DepartmentType } from "./constants";

export type UserStatus = "online" | "searching" | "in_chat" | "offline";

export type ViewState = 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'privacy' | 'terms' | 'add_note' | 'dedicate_song' | 'blocked_users' | 'midterm_szn' | 'kept_connections';

export interface KeptConnection {
  id: string;
  user_id: string;
  username: string;
  department: string;
  avatar_url?: string;
  bio?: string;
  added_at: string;
  last_chat_date?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  department: DepartmentType;
  avatar_url?: string;
  bio?: string;
  status: UserStatus;
  is_banned?: boolean;
  is_admin?: boolean;
  created_at?: string;
}

export type QueueFilter = "anyone" | "same" | "different" | DepartmentType;

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
  game_data?: {
    game_id: string;
    game_name: string;
    game_emoji: string;
    session_id: string;
    status: 'invited' | 'accepted' | 'declined' | 'completed';
    scores?: Record<string, number>;
    state?: any;
    game_state?: any;
    winner_id?: string;
  };
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
  author_id?: string;
  author_alias: string;
  department?: string;
  author_avatar?: string;
  author_bio?: string;
  message: string;
  reply_to_comment_id?: string;
  reply_to_alias?: string;
  likes_count?: number;
  liked_by_users?: string[];
  liked_by_profiles?: Record<string, { username: string; department?: string; avatar_url?: string; reacted_at?: number }>;
  is_admin?: boolean;
  created_at: string;
}

export interface FreedomPollOption {
  id: string;
  text: string;
  votes_count: number;
  voted_users: string[];
}

export interface FreedomPost {
  id: string;
  author_id?: string;
  author_alias: string;
  department: string;
  author_avatar?: string;
  author_bio?: string;
  message: string;
  color: string;
  likes_count: number;
  liked_by_users: string[];
  liked_by_profiles?: Record<string, { username: string; department: string; avatar_url?: string }>;
  comments_count?: number;
  is_admin?: boolean;
  is_pinned?: boolean;
  pinned_at?: string;
  status?: 'pending' | 'approved' | 'rejected';
  song_title?: string;
  song_artist?: string;
  song_image_url?: string;
  song_preview_url?: string;
  song_link?: string;
  song_start_time?: number;
  song_duration?: number;
  song_lyrics?: string;
  dedicated_to?: string;
  poll_question?: string;
  poll_options?: FreedomPollOption[];
  image_url?: string;
  image_type?: 'image' | 'gif';
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
  type: 'like' | 'comment' | 'admin_remark' | 'friend_add' | 'friend_remove' | 'friend_request' | 'friend_request_pending' | 'friend_accept' | 'dm';
  actor_alias: string; // e.g. "Someone from Engr." or "👑 CapiTalk Admin"
  actor_username?: string;
  actor_department?: string;
  actor_avatar?: string;
  message_snippet: string;
  comment_text?: string;
  admin_remark?: string;
  created_at: string;
  read: boolean;
}

export interface BlockedUserInfo {
  id: string;
  username: string;
  department: string;
  avatar_url?: string;
  blocked_at: string;
}

export interface PendingFriendRequest {
  id: string;
  sender_id: string;
  sender_username: string;
  sender_department: string;
  sender_avatar?: string;
  sender_bio?: string;
  created_at: string;
}

export interface PendingOutgoingConnection {
  target_user_id: string;
  target_username: string;
  target_department: string;
  target_avatar?: string;
  target_bio?: string;
  created_at: string;
}

export interface LoudspeakerBooking {
  id: string;
  user_id: string;
  author_alias: string;
  department: string;
  message: string;
  theme_color?: string; // e.g. '#701a31', '#ffc900', '#ff90e8', '#00e599', '#3b82f6'
  song_title?: string;
  song_artist?: string;
  song_preview_url?: string;
  scheduled_at: string; // ISO timestamp string or time string
  slot_label?: string; // e.g. "12:00 PM - 12:15 PM"
  duration_seconds: number; // default 30
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  reaction_counts: {
    fire: number;
    heart: number;
    clap: number;
    horn: number;
  };
  created_at: string;
}


