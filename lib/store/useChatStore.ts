'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, ChatRoom, ChatMessage, QueueFilter, UserReport, FreedomPost, UserFeedback, WallNotification, ViewState, BlockedUserInfo, KeptConnection, PendingFriendRequest, PendingOutgoingConnection, LoudspeakerBooking } from '../types';
import { BOT_PARTNERS, BOT_RESPONSES, DepartmentType, getAvatarForPseudonym } from '../constants';
import { matchmakingEngine } from '../realtime/matchmakingEngine';
import { roomManager } from '../realtime/roomManager';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { checkProfanity } from '../utils/profanityFilter';
import { getOrCreatePersistentUUID } from '../utils/uuid';
import { getAdminToken, purgeLegacyAdminKeys } from '../auth/adminAuth';
import { playLoudspeakerChime } from '../utils/audioChime';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('capitalk_global_realtime');
  } catch (e) {}
}

let activeSupabaseAnnChannel: any = null;

export function broadcastGlobalRealtime(event: string, payload: any) {
  if (!supabase || !isSupabaseConfigured) return;
  try {
    if (activeSupabaseAnnChannel) {
      activeSupabaseAnnChannel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } else {
      const chan = supabase.channel('capitalk_global_announcements_v1');
      chan.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          activeSupabaseAnnChannel = chan;
          chan.send({
            type: 'broadcast',
            event,
            payload,
          });
        }
      });
    }
  } catch (e) {
    console.warn('[Global Realtime Broadcast Error]', e);
  }
}

export const appendDirectMessageLocally = (
  pairKey: string,
  message: {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isMe?: boolean;
    read?: boolean;
    reply_to?: any;
    reactions?: any;
  },
  currentUserId?: string
) => {
  if (typeof window === 'undefined') return [];
  const storageKey = `capitalk_dm_${pairKey}`;
  try {
    const saved = localStorage.getItem(storageKey);
    const existing: any[] = saved ? JSON.parse(saved) : [];
    const exists = existing.some((m) => m.id === message.id);
    if (!exists) {
      const isMe = currentUserId ? message.senderId === currentUserId : Boolean(message.isMe);
      const updated = [...existing, { ...message, isMe }];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    }
    return existing;
  } catch (e) {
    return [];
  }
};

let partnerPresenceWatchdog: any = null;

export const onPartnerPresenceHeartbeat = (userId?: string, username?: string, timestamp?: number) => {
  if (typeof window === 'undefined') return;
  try {
    const store = useChatStore.getState();
    const kept = store.keptConnection;
    if (!kept) return;

    const uIdClean = (userId || '').trim().toLowerCase();
    const uNameClean = (username || '').trim().toLowerCase().replace(/^@/, '');
    const keptIdClean = (kept.user_id || '').trim().toLowerCase();
    const keptNameClean = (kept.username || '').trim().toLowerCase().replace(/^@/, '');

    const isMatch =
      (uIdClean && keptIdClean && uIdClean === keptIdClean) ||
      (uNameClean && keptNameClean && uNameClean === keptNameClean) ||
      (uIdClean && keptNameClean && uIdClean === keptNameClean) ||
      (uNameClean && keptIdClean && uNameClean === keptIdClean);

    if (isMatch) {
      useChatStore.setState({
        isKeptPartnerOnline: true,
        keptPartnerLastSeen: timestamp || Date.now(),
      });

      if (partnerPresenceWatchdog) clearTimeout(partnerPresenceWatchdog);
      partnerPresenceWatchdog = setTimeout(() => {
        useChatStore.setState({
          isKeptPartnerOnline: false,
          keptPartnerLastSeen: Date.now(),
        });
      }, 14000);
    }
  } catch (e) {}
};

export const onFriendRequestAccepted = (sender: any, targetUserId?: string, targetUsername?: string) => {
  if (typeof window === 'undefined' || !sender) return;
  try {
    const store = useChatStore.getState();
    const myUser = store.currentUser;
    const myIdClean = (myUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') : '') || '').trim().toLowerCase();
    const myNameClean = (myUser?.username || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') : '') || '').trim().toLowerCase().replace(/^@/, '');

    const targetIdClean = (targetUserId || '').trim().toLowerCase();
    const targetNameClean = (targetUsername || '').trim().toLowerCase().replace(/^@/, '');

    const pendingTargetId = (store.pendingOutgoingConnection?.target_user_id || '').trim().toLowerCase();
    const pendingTargetName = (store.pendingOutgoingConnection?.target_username || '').trim().toLowerCase().replace(/^@/, '');

    const senderIdClean = (sender.id || '').trim().toLowerCase();
    const senderNameClean = (sender.username || '').trim().toLowerCase().replace(/^@/, '');

    const isTargetMe =
      (targetIdClean && myIdClean && targetIdClean === myIdClean) ||
      (targetNameClean && myNameClean && targetNameClean === myNameClean) ||
      (targetIdClean && myNameClean && targetIdClean === myNameClean) ||
      (targetNameClean && myIdClean && targetNameClean === myIdClean) ||
      (pendingTargetId && senderIdClean && pendingTargetId === senderIdClean) ||
      (pendingTargetName && senderNameClean && pendingTargetName === senderNameClean) ||
      (pendingTargetId && senderNameClean && pendingTargetId === senderNameClean) ||
      (pendingTargetName && senderIdClean && pendingTargetName === senderIdClean);

    if (isTargetMe) {
      const newConn: KeptConnection = {
        id: 'kc_' + Date.now(),
        user_id: sender.id,
        username: sender.username,
        department: sender.department || 'General',
        avatar_url: sender.avatar_url,
        bio: sender.bio,
        added_at: new Date().toISOString(),
        last_chat_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      useChatStore.setState({
        keptConnection: newConn,
        pendingOutgoingConnection: null,
        hasNewConnectionNotif: true,
        isKeptPartnerOnline: true,
        keptPartnerLastSeen: Date.now(),
      });

      try {
        localStorage.setItem('capitalk_kept_connection_v1', JSON.stringify(newConn));
        localStorage.removeItem('capitalk_pending_outgoing_v1');
        localStorage.setItem('capitalk_has_new_conn_notif', 'true');
      } catch (e) {}

      try {
        const audio = new Audio('/audio/sent_msg.webm');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      store.addWallNotification({
        post_id: 'accepted_' + Date.now(),
        type: 'friend_accept',
        actor_alias: `@${sender.username}`,
        actor_username: sender.username,
        actor_avatar: sender.avatar_url || getAvatarForPseudonym(sender.username),
        actor_department: sender.department || 'General',
        message_snippet: `Accepted your friend request! You can now send direct messages.`,
      });

      store.setActionToast({
        type: 'info',
        message: `✨ @${sender.username} accepted your friend request!`,
      });

      store.sendGlobalPresenceHeartbeat();
      store.queryPartnerPresence();
    }
  } catch (e) {}
};

export const onFriendRequestIncoming = (sender: any, targetUserId?: string, targetUsername?: string) => {
  if (typeof window === 'undefined' || !sender) return;
  try {
    const store = useChatStore.getState();
    const myUser = store.currentUser;
    const myIdClean = (myUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') : '') || '').trim().toLowerCase();
    const myNameClean = (myUser?.username || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') : '') || '').trim().toLowerCase().replace(/^@/, '');

    const targetIdClean = (targetUserId || '').trim().toLowerCase();
    const targetNameClean = (targetUsername || '').trim().toLowerCase().replace(/^@/, '');

    const isTargetMe =
      (targetIdClean && myIdClean && targetIdClean === myIdClean) ||
      (targetNameClean && myNameClean && targetNameClean === myNameClean) ||
      (targetIdClean && myNameClean && targetIdClean === myNameClean) ||
      (targetNameClean && myIdClean && targetNameClean === myIdClean);

    if (isTargetMe && sender.id !== myIdClean) {
      const incomingReq: PendingFriendRequest = {
        id: 'fr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sender_id: sender.id,
        sender_username: sender.username,
        sender_department: sender.department || 'General',
        sender_avatar: sender.avatar_url,
        sender_bio: sender.bio,
        created_at: new Date().toISOString(),
      };

      const existing = (store.pendingIncomingRequests || []).filter((r) => r.sender_id !== sender.id);
      const updated = [incomingReq, ...existing];

      useChatStore.setState({
        pendingIncomingRequests: updated,
        hasNewConnectionNotif: true,
      });

      try {
        localStorage.setItem('capitalk_pending_incoming_v1', JSON.stringify(updated));
        localStorage.setItem('capitalk_has_new_conn_notif', 'true');
      } catch (e) {}

      try {
        const audio = new Audio('/audio/sent_msg.webm');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      store.addWallNotification({
        post_id: 'fr_' + Date.now(),
        type: 'friend_request',
        actor_alias: `@${sender.username}`,
        actor_username: sender.username,
        actor_avatar: sender.avatar_url || getAvatarForPseudonym(sender.username),
        actor_department: sender.department || 'General',
        message_snippet: `Sent you a friend request.`,
      });

      store.setActionToast({
        type: 'info',
        message: `✨ @${sender.username} sent you a friend request!`,
      });
    }
  } catch (e) {}
};

export const onFriendRequestDeclined = (senderUsername?: string, targetUserId?: string, targetUsername?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const store = useChatStore.getState();
    const myUser = store.currentUser;
    const myIdClean = (myUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') : '') || '').trim().toLowerCase();
    const myNameClean = (myUser?.username || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') : '') || '').trim().toLowerCase().replace(/^@/, '');

    const targetIdClean = (targetUserId || '').trim().toLowerCase();
    const targetNameClean = (targetUsername || '').trim().toLowerCase().replace(/^@/, '');

    const isTargetMe =
      (targetIdClean && myIdClean && targetIdClean === myIdClean) ||
      (targetNameClean && myNameClean && targetNameClean === myNameClean) ||
      (targetIdClean && myNameClean && targetIdClean === myNameClean) ||
      (targetNameClean && myIdClean && targetNameClean === myIdClean);

    if (isTargetMe) {
      useChatStore.setState({ pendingOutgoingConnection: null });
      try { localStorage.removeItem('capitalk_pending_outgoing_v1'); } catch (e) {}
      store.setActionToast({
        type: 'info',
        message: `@${senderUsername || 'Partner'} declined the friend request.`,
      });
    }
  } catch (e) {}
};

export const onFriendRequestCancelled = (senderId?: string, targetUserId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const store = useChatStore.getState();
    const myUser = store.currentUser;
    const myIdClean = (myUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') : '') || '').trim().toLowerCase();

    if (targetUserId && myIdClean && targetUserId.toLowerCase() === myIdClean) {
      const updated = (store.pendingIncomingRequests || []).filter((r) => r.sender_id !== senderId);
      useChatStore.setState({ pendingIncomingRequests: updated });
      try { localStorage.setItem('capitalk_pending_incoming_v1', JSON.stringify(updated)); } catch (e) {}
    }
  } catch (e) {}
};

export const onTwoWayConnectionRemoved = (senderId: string, targetUserId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const store = useChatStore.getState();
    const myUser = store.currentUser;
    const myIdClean = (myUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') : '') || '').trim().toLowerCase();

    if (!targetUserId || targetUserId.toLowerCase() === myIdClean) {
      if (store.keptConnection && store.keptConnection.user_id === senderId) {
        useChatStore.setState({
          keptConnection: null,
          actionToast: {
            type: 'info',
            message: `@${store.keptConnection.username} removed the connection.`,
          },
        });
        try {
          localStorage.removeItem('capitalk_kept_connection_v1');
        } catch (e) {}
      }
    }
  } catch (e) {}
};

interface ChatStoreState {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  
  viewState: ViewState;
  viewHistory: ViewState[];
  setViewState: (view: ViewState, pushHistory?: boolean) => void;
  goBack: () => void;
  popViewHistory: () => void;

  queueFilter: QueueFilter;
  setQueueFilter: (filter: QueueFilter) => void;
  searchingTimeSeconds: number;
  isSearching: boolean;
  waitingCount: number;

  activeRoom: ChatRoom | null;
  messages: ChatMessage[];
  partnerTyping: boolean;
  partnerLeft: boolean;
  partnerLeftReason: 'inactivity' | 'left' | 'disconnected' | 'exited' | 'skipped' | null;
  isMatchTransitioning: boolean;
  setIsMatchTransitioning: (transitioning: boolean) => void;
  
  blockedUserIds: string[];
  blockedUsers: BlockedUserInfo[];
  reports: UserReport[];
  bannedUserIds: string[];
  profanityStrikes: number;
  bayotCount: number;
  freedomPosts: FreedomPost[];
  feedbackList: UserFeedback[];
  wallNotifications: WallNotification[];
  myPostIds: string[];
  myPseudonyms: string[];
  addPseudonym: (pseudonym: string) => void;
  targetPostId: string | null;
  setTargetPostId: (id: string | null) => void;

  loudspeakerBookings: LoudspeakerBooking[];
  activeLoudspeaker: LoudspeakerBooking | null;
  showLoudspeakerModal: boolean;
  setShowLoudspeakerModal: (show: boolean) => void;
  loudspeakerReactionBursts: { id: string; emoji: 'fire' | 'heart' | 'clap' | 'horn'; timestamp: number }[];
  bookLoudspeakerSlot: (booking: Omit<LoudspeakerBooking, 'id' | 'status' | 'created_at' | 'reaction_counts'>) => void;
  cancelLoudspeakerBooking: (bookingId: string) => void;
  reactToLoudspeaker: (emoji: 'fire' | 'heart' | 'clap' | 'horn') => void;

  actionToast: { type: 'block' | 'report' | 'announcement' | 'ban' | 'error' | 'info'; message: string } | null;
  setActionToast: (toast: { type: 'block' | 'report' | 'announcement' | 'ban' | 'error' | 'info'; message: string } | null) => void;
  systemAnnouncement: { id: string; message: string; timestamp: string } | null;
  showQueueTimeoutModal: boolean;
  setShowQueueTimeoutModal: (show: boolean) => void;
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;

  clientIp: string | null;
  banReason: string | null;
  checkBanStatus: () => Promise<boolean>;
  banUserWithIP: (targetIdentifier: string, targetIp?: string, reason?: string) => Promise<void>;

  initSession: () => void;
  registerUser: (username: string, department: DepartmentType, avatarUrl?: string, bio?: string) => void;
  startSearch: () => void;
  cancelSearch: () => void;
  sendMessage: (text?: string, imageUrl?: string, replyTo?: ChatMessage['reply_to'], gameData?: ChatMessage['game_data']) => void;
  updateGameInviteStatus: (sessionId: string, status: 'accepted' | 'declined' | 'completed') => void;
  toggleReaction: (messageId: string, emojiKey: string) => void;
  sendTypingSignal: (isTyping: boolean) => void;
  nextMatch: () => void;
  leaveRoom: () => void;
  reportPartner: (reason: string, description: string) => void;
  reportFreedomPost: (postId: string, postAuthorAlias: string, postMessage: string, reason: string, description: string) => void;
  blockPartner: () => void;
  unblockUser: (userId: string) => void;
  unblockAllUsers: () => void;
  triggerBotMatch: () => void;

  resolveReport: (reportId: string, action: 'dismiss' | 'ban' | 'delete_post', adminRemark?: string) => void;
  toggleBanUser: (userId: string) => void;

  addFreedomPost: (post: Omit<FreedomPost, 'id' | 'likes_count' | 'liked_by_users' | 'created_at'> & { id?: string }, honeypot?: string, deviceId?: string) => Promise<boolean>;
  deleteFreedomPost: (postId: string) => void;
  approveFreedomPost: (postId: string) => void;
  likeFreedomPost: (postId: string) => void;
  voteFreedomPoll: (postId: string, optionId: string) => void;
  togglePinFreedomPost: (postId: string) => void;
  submitFeedback: (input: { category: UserFeedback['category']; rating: number; message: string }) => void;

  addWallNotification: (notif: Omit<WallNotification, 'id' | 'created_at' | 'read'>) => void;
  markWallNotificationsAsRead: () => void;
  markSingleNotificationAsRead: (id: string) => void;
  clearWallNotifications: () => void;
  readFreedomPostIds: string[];
  readMusicPostIds: string[];
  markFreedomPostsAsRead: () => void;
  markMusicPostsAsRead: () => void;
  keptConnection: KeptConnection | null;
  isKeptPartnerOnline: boolean;
  keptPartnerLastSeen: number | null;
  sendGlobalPresenceHeartbeat: () => void;
  queryPartnerPresence: () => void;
  hasNewConnectionNotif: boolean;
  setHasNewConnectionNotif: (hasNotif: boolean) => void;
  pendingIncomingRequests: PendingFriendRequest[];
  pendingOutgoingConnection: PendingOutgoingConnection | null;
  sendFriendRequest: (partnerProfile: UserProfile) => { success: boolean; message: string };
  keepPartner: (partnerProfile: UserProfile, isReciprocal?: boolean) => { success: boolean; pending?: boolean; message: string };
  acceptPendingRequest: (requestId: string) => void;
  declinePendingRequest: (requestId: string) => void;
  cancelPendingOutgoingConnection: () => void;
  removeKeptConnection: () => void;

  streakCount: number;
  lastStreakDate: string | null;
  isStreakTriggeredToday: boolean;
  showStreakCelebrationModal: boolean;
  setShowStreakCelebrationModal: (show: boolean) => void;
  checkAndTriggerStreak: (forceShowModal?: boolean) => { streakCount: number; isNewTrigger: boolean };

  clearToast: () => void;
  broadcastAnnouncement: (message: string) => void;
  dismissAnnouncement: () => void;

  themeMode: 0 | 1;
  toggleThemeMode: (event?: React.MouseEvent | React.TouchEvent | any) => void;
}

const DEMO_FREEDOM_POSTS: FreedomPost[] = [];

const DEMO_WALL_NOTIFICATIONS: WallNotification[] = [];

const recentNotifTimestamps = new Map<string, number>();

export function getCanonicalNotificationSignature(notif: {
  type: string;
  post_id?: string;
  actor_alias?: string;
  actor_username?: string;
  comment_text?: string;
  message_snippet?: string;
  admin_remark?: string;
}): string {
  const actor = (notif.actor_username || notif.actor_alias || '').replace(/^@/, '').trim().toLowerCase();
  const postId = (notif.post_id || '').trim();
  const type = notif.type;

  if (type === 'like') {
    return `like:${postId}:${actor}`;
  }
  if (type === 'comment') {
    const textSnippet = (notif.comment_text || notif.message_snippet || '').trim().slice(0, 40).toLowerCase();
    return `comment:${postId}:${actor}:${textSnippet}`;
  }
  if (type === 'friend_add') {
    return `friend_add:${actor}`;
  }
  if (type === 'friend_remove') {
    return `friend_remove:${actor}`;
  }
  if (type === 'dm') {
    const snippet = (notif.message_snippet || '').trim().slice(0, 40).toLowerCase();
    return `dm:${actor}:${snippet}`;
  }
  if (type === 'admin_remark') {
    return `admin_remark:${postId}:${(notif.admin_remark || '').trim().slice(0, 40).toLowerCase()}`;
  }
  return `${type}:${postId}:${actor}`;
}

export function deduplicateNotificationsList(notifications: WallNotification[]): WallNotification[] {
  if (!Array.isArray(notifications)) return [];
  const seenSignatures = new Set<string>();
  const deduped: WallNotification[] = [];

  for (const notif of notifications) {
    const sig = getCanonicalNotificationSignature(notif);
    const dedupeKey = `${sig}_${notif.read ? 'read' : 'unread'}`;
    if (!seenSignatures.has(dedupeKey)) {
      seenSignatures.add(dedupeKey);
      deduped.push(notif);
    }
  }

  return deduped;
}

let searchTimer: NodeJS.Timeout | null = null;
let unsubscribeMatch: (() => void) | null = null;
let sessionInitialized = false;
let globalPollInterval: NodeJS.Timeout | null = null;
export function getPhilippineDateStr(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

export function encodePostColor(post: Partial<FreedomPost>): string {
  const baseColor = post.color || '#ffc900';
  const status = post.status || (post.is_admin ? 'approved' : 'pending');
  const profilesMeta = JSON.stringify(post.liked_by_profiles || {});
  const pollMeta = (post.poll_options && post.poll_options.length > 0)
    ? JSON.stringify({ question: post.poll_question || '', options: post.poll_options })
    : '';
  const profileMeta = JSON.stringify({
    avatar: post.author_avatar || '',
    bio: post.author_bio || '',
  });
  const songMeta = post.song_title
    ? JSON.stringify({
        title: post.song_title,
        artist: post.song_artist || '',
        image: post.song_image_url || '',
        preview: post.song_preview_url || '',
        link: post.song_link || '',
        dedicated_to: post.dedicated_to || '',
      })
    : '';

  return `${baseColor}||${status}||${profilesMeta}||${pollMeta}||${profileMeta}||${songMeta}`;
}

export function mapDbRowToPost(row: any, existingLocal?: FreedomPost): FreedomPost {
  const dbLikedBy: string[] = Array.isArray(row.liked_by_users) ? row.liked_by_users : [];
  const localLikedBy: string[] = existingLocal?.liked_by_users || [];
  const useLikedBy = localLikedBy.length !== dbLikedBy.length ? localLikedBy : dbLikedBy;

  const rawColor = row.color || '#ffc900';
  const parts = rawColor.split('||');
  const dbColor = parts[0];
  const dbStatus = row.status || parts[1] || (row.is_admin ? 'approved' : 'pending');
  let dbProfiles = typeof row.liked_by_profiles === 'object' && row.liked_by_profiles !== null ? row.liked_by_profiles : {};
  try { if (parts[2]) dbProfiles = JSON.parse(parts[2]); } catch (e) {}

  let dbPollOptions = existingLocal?.poll_options || row.poll_options;
  let dbPollQuestion = existingLocal?.poll_question || row.poll_question;
  try {
    if (parts[3]) {
      const parsedPoll = JSON.parse(parts[3]);
      if (parsedPoll.options) dbPollOptions = parsedPoll.options;
      if (parsedPoll.question) dbPollQuestion = parsedPoll.question;
    }
  } catch (e) {}

  let extractedAvatar = existingLocal?.author_avatar || row.author_avatar;
  let extractedBio = existingLocal?.author_bio || row.author_bio;
  try {
    if (parts[4]) {
      const parsedProfile = JSON.parse(parts[4]);
      if (parsedProfile.avatar) extractedAvatar = parsedProfile.avatar;
      if (parsedProfile.bio) extractedBio = parsedProfile.bio;
    }
  } catch (e) {}

  let songTitle = row.song_title || existingLocal?.song_title;
  let songArtist = row.song_artist || existingLocal?.song_artist;
  let songImageUrl = row.song_image_url || existingLocal?.song_image_url;
  let songPreviewUrl = row.song_preview_url || existingLocal?.song_preview_url;
  let songLink = row.song_link || existingLocal?.song_link;
  let dedicatedTo = row.dedicated_to || existingLocal?.dedicated_to;
  try {
    if (parts[5]) {
      const parsedSong = JSON.parse(parts[5]);
      if (parsedSong.title && !songTitle) songTitle = parsedSong.title;
      if (parsedSong.artist && !songArtist) songArtist = parsedSong.artist;
      if (parsedSong.image && !songImageUrl) songImageUrl = parsedSong.image;
      if (parsedSong.preview && !songPreviewUrl) songPreviewUrl = parsedSong.preview;
      if (parsedSong.link && !songLink) songLink = parsedSong.link;
      if (parsedSong.dedicated_to && !dedicatedTo) dedicatedTo = parsedSong.dedicated_to;
    }
  } catch (e) {}

  return {
    id: row.id,
    author_id: row.author_id,
    author_alias: row.author_alias || 'Anon Student',
    department: row.department || 'General',
    author_avatar: extractedAvatar || getAvatarForPseudonym(row.author_alias || 'Anon'),
    author_bio: extractedBio || '',
    message: row.message,
    color: dbColor,
    likes_count: useLikedBy.length,
    liked_by_users: useLikedBy,
    liked_by_profiles: { ...(existingLocal?.liked_by_profiles || {}), ...dbProfiles },
    is_admin: !!row.is_admin,
    is_pinned: !!row.is_pinned,
    pinned_at: row.pinned_at || undefined,
    status: dbStatus,
    created_at: row.created_at,
    image_url: row.image_url || existingLocal?.image_url,
    image_type: row.image_type || existingLocal?.image_type,
    song_title: songTitle,
    song_artist: songArtist,
    song_image_url: songImageUrl,
    song_preview_url: songPreviewUrl,
    song_link: songLink,
    dedicated_to: dedicatedTo,
    poll_question: dbPollQuestion,
    poll_options: dbPollOptions,
  };
}

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      // existing state fields ...
      // ... (no change to previous lines up to here)
      // Clear all demo data (freedom posts, localStorage)
      clearAllDemoData: () => {
        // Reset state arrays
        set({ freedomPosts: [] });
        // Remove from localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('capitalk_freedom_wall_v1');
            // Remove any comment entries
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith('capitalk_comments_')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {}
        }
      },

      currentUser: typeof window !== 'undefined'
        ? (() => {
            try {
              purgeLegacyAdminKeys();
              const hasAdminToken = Boolean(getAdminToken());
              const standalone = localStorage.getItem('capitalk_current_user_profile_v1');
              if (standalone) {
                const user = JSON.parse(standalone);
                if (user && !hasAdminToken && user.is_admin) user.is_admin = false;
                return user;
              }
              const zustandRaw = localStorage.getItem('capitalk-storage');
              if (zustandRaw) {
                const parsed = JSON.parse(zustandRaw);
                if (parsed.state?.currentUser) {
                  const user = parsed.state.currentUser;
                  if (user && !hasAdminToken && user.is_admin) user.is_admin = false;
                  return user;
                }
              }
            } catch (e) {}
            return null;
          })()
        : null,
      setCurrentUser: (user: UserProfile | null) => {
        if (typeof window !== 'undefined') {
          try {
            if (user) {
              localStorage.setItem('capitalk_current_user_profile_v1', JSON.stringify(user));
              localStorage.setItem('capitalk_user_pseudonym', user.username);
              localStorage.setItem('capitalk_user_id', user.id);
            } else {
              localStorage.removeItem('capitalk_current_user_profile_v1');
            }
          } catch (e) {}
        }
        set({ currentUser: user });
      },

      streakCount: typeof window !== 'undefined'
        ? parseInt(localStorage.getItem('capitalk_streak_count_v2') || '1', 10)
        : 1,
      lastStreakDate: typeof window !== 'undefined'
        ? localStorage.getItem('capitalk_streak_last_date_v2')
        : null,
      isStreakTriggeredToday: typeof window !== 'undefined'
        ? (() => {
            const todayStr = getPhilippineDateStr();
            return localStorage.getItem('capitalk_streak_last_date_v2') === todayStr;
          })()
        : false,
      showStreakCelebrationModal: false,
      setShowStreakCelebrationModal: (show: boolean) => set({ showStreakCelebrationModal: show }),

      checkAndTriggerStreak: (forceShowModal = false) => {
        if (typeof window === 'undefined') return { streakCount: 1, isNewTrigger: false };

        const todayStr = getPhilippineDateStr();
        const yesterdayStr = getPhilippineDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));

        const storedDate = localStorage.getItem('capitalk_streak_last_date_v2');
        const storedCount = parseInt(localStorage.getItem('capitalk_streak_count_v2') || '0', 10);

        if (storedDate === todayStr) {
          set({
            streakCount: storedCount > 0 ? storedCount : 1,
            lastStreakDate: todayStr,
            isStreakTriggeredToday: true,
            showStreakCelebrationModal: forceShowModal ? true : get().showStreakCelebrationModal,
          });
          return { streakCount: storedCount > 0 ? storedCount : 1, isNewTrigger: false };
        }

        let newCount = 1;
        if (storedDate === yesterdayStr) {
          newCount = (storedCount > 0 ? storedCount : 1) + 1;
        } else {
          newCount = 1;
        }

        try {
          localStorage.setItem('capitalk_streak_last_date_v2', todayStr);
          localStorage.setItem('capitalk_streak_count_v2', String(newCount));
        } catch (e) {}

        set({
          streakCount: newCount,
          lastStreakDate: todayStr,
          isStreakTriggeredToday: true,
          showStreakCelebrationModal: true,
        });

        return { streakCount: newCount, isNewTrigger: true };
      },

      themeMode: typeof window !== 'undefined'
        ? (() => {
            try {
              const standalone = localStorage.getItem('capitalk_theme');
              if (standalone !== null) {
                const mode = standalone === '1' ? 1 : 0;
                if (mode === 1) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
                return mode;
              }
              const zustandRaw = localStorage.getItem('capitalk-storage');
              if (zustandRaw) {
                const parsed = JSON.parse(zustandRaw);
                if (typeof parsed?.state?.themeMode === 'number') {
                  const mode = parsed.state.themeMode === 1 ? 1 : 0;
                  if (mode === 1) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                  return mode;
                }
              }
            } catch (e) {}
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            return 0;
          })()
        : 0,
      toggleThemeMode: (event?: React.MouseEvent | React.TouchEvent | any) => {
        const next = (get().themeMode ^ 1) as 0 | 1;
        const applyTheme = () => {
          set({ themeMode: next });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('capitalk_theme', String(next));
              if (next === 1) {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.setAttribute('data-theme', 'light');
              }
            } catch (e) {}
          }
        };

        if (typeof window !== 'undefined' && typeof (document as any).startViewTransition === 'function') {
          let x = window.innerWidth / 2;
          let y = 0;

          if (event) {
            if (typeof event.clientX === 'number' && (event.clientX !== 0 || event.clientY !== 0)) {
              x = event.clientX;
              y = event.clientY;
            } else if (event.touches && event.touches[0]) {
              x = event.touches[0].clientX;
              y = event.touches[0].clientY;
            } else if (event.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function') {
              const rect = event.currentTarget.getBoundingClientRect();
              x = rect.left + rect.width / 2;
              y = rect.top + rect.height / 2;
            }
          }

          const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
          );

          try {
            const transition = (document as any).startViewTransition(() => {
              applyTheme();
            });

            if (transition && transition.ready) {
              transition.ready.then(() => {
                document.documentElement.animate(
                  {
                    clipPath: [
                      `circle(0px at ${x}px ${y}px)`,
                      `circle(${endRadius}px at ${x}px ${y}px)`,
                    ],
                  },
                  {
                    duration: 550,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: '::view-transition-new(root)',
                  }
                );
              }).catch(() => {});
            }
          } catch (err) {
            applyTheme();
          }
        } else {
          applyTheme();
        }
      },

      isMatchTransitioning: false,
      setIsMatchTransitioning: (isMatchTransitioning: boolean) => set({ isMatchTransitioning }),

      hasNewConnectionNotif: typeof window !== 'undefined' ? localStorage.getItem('capitalk_has_new_conn_notif') === 'true' : false,
      setHasNewConnectionNotif: (hasNotif: boolean) => {
        set({ hasNewConnectionNotif: hasNotif });
        if (typeof window !== 'undefined') {
          if (hasNotif) {
            try { localStorage.setItem('capitalk_has_new_conn_notif', 'true'); } catch (e) {}
          } else {
            try { localStorage.removeItem('capitalk_has_new_conn_notif'); } catch (e) {}
          }
        }
      },

      keptConnection: typeof window !== 'undefined'
        ? (() => {
            try {
              const standalone = localStorage.getItem('capitalk_kept_connection_v1');
              if (standalone) return JSON.parse(standalone);
              const zustandRaw = localStorage.getItem('capitalk-storage');
              if (zustandRaw) {
                const parsed = JSON.parse(zustandRaw);
                if (parsed.state?.keptConnection) return parsed.state.keptConnection;
              }
            } catch (e) {}
            return null;
          })()
        : null,
      isKeptPartnerOnline: false,
      keptPartnerLastSeen: null,

      sendGlobalPresenceHeartbeat: () => {
        const store = get();
        let currentUser = store.currentUser;
        if (!currentUser && typeof window !== 'undefined') {
          try {
            const rawUser = localStorage.getItem('capitalk_current_user_profile_v1');
            if (rawUser) currentUser = JSON.parse(rawUser);
            else {
              const uid = localStorage.getItem('capitalk_user_id');
              const uname = localStorage.getItem('capitalk_user_pseudonym');
              if (uid && uname) {
                currentUser = { id: uid, username: uname, department: 'College of Arts and Sciences', status: 'online' };
              }
            }
          } catch (e) {}
        }
        if (!currentUser) return;

        const payload = {
          type: 'USER_PRESENCE_HEARTBEAT',
          userId: currentUser.id,
          username: currentUser.username,
          timestamp: Date.now(),
        };

        if (broadcastChannel) {
          try { broadcastChannel.postMessage(payload); } catch (e) {}
        }
        broadcastGlobalRealtime('user_presence_heartbeat', payload);
        matchmakingEngine.send(payload);
      },

      queryPartnerPresence: () => {
        const store = get();
        let currentUser = store.currentUser;
        const kept = store.keptConnection;
        if (!currentUser && typeof window !== 'undefined') {
          try {
            const rawUser = localStorage.getItem('capitalk_current_user_profile_v1');
            if (rawUser) currentUser = JSON.parse(rawUser);
          } catch (e) {}
        }
        if (!currentUser || !kept) return;

        const payload = {
          type: 'USER_PRESENCE_QUERY',
          targetUserId: kept.user_id,
          targetUsername: kept.username,
          senderId: currentUser.id,
          senderUsername: currentUser.username,
          timestamp: Date.now(),
        };

        if (broadcastChannel) {
          try { broadcastChannel.postMessage(payload); } catch (e) {}
        }
        broadcastGlobalRealtime('user_presence_query', payload);
        matchmakingEngine.send(payload);
      },

      pendingIncomingRequests: typeof window !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem('capitalk_pending_incoming_v1');
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })()
        : [],
      pendingOutgoingConnection: typeof window !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem('capitalk_pending_outgoing_v1');
              return raw ? JSON.parse(raw) : null;
            } catch {
              return null;
            }
          })()
        : null,

      sendFriendRequest: (partnerProfile: UserProfile) => {
        const store = get();
        const currentUser = store.currentUser;
        if (!currentUser) return { success: false, message: 'You must be logged in to send friend requests' };

        const currentKept = store.keptConnection;
        if (currentKept && currentKept.user_id !== partnerProfile.id) {
          return {
            success: false,
            message: `You already have @${currentKept.username} saved. You can only keep 1 friend at a time!`,
          };
        }

        const outgoingReq: PendingOutgoingConnection = {
          target_user_id: partnerProfile.id,
          target_username: partnerProfile.username,
          target_department: partnerProfile.department,
          target_avatar: partnerProfile.avatar_url || getAvatarForPseudonym(partnerProfile.username),
          created_at: new Date().toISOString(),
        };

        set({
          pendingOutgoingConnection: outgoingReq,
          actionToast: {
            type: 'info',
            message: `Friend request sent to @${partnerProfile.username}!`,
          },
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_pending_outgoing_v1', JSON.stringify(outgoingReq));
          } catch (e) {}
        }

        const payload = {
          type: 'FRIEND_REQUEST_INCOMING',
          sender: currentUser,
          targetUserId: partnerProfile.id,
          targetUsername: partnerProfile.username,
          timestamp: Date.now(),
        };

        if (broadcastChannel) {
          try { broadcastChannel.postMessage(payload); } catch (e) {}
        }
        broadcastGlobalRealtime('friend_request_incoming', payload);
        matchmakingEngine.send(payload);

        if (supabase && isSupabaseConfigured) {
          try {
            const globalChan = supabase.channel('capitalk_global_announcements_v1');
            globalChan.send({
              type: 'broadcast',
              event: 'friend_request_incoming',
              payload,
            });

            supabase.from('notifications').insert({
              id: 'notif_fr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              target_user_id: partnerProfile.id,
              post_id: 'fr_' + Date.now(),
              type: 'friend_request',
              actor_alias: `@${currentUser.username}`,
              actor_username: currentUser.username,
              actor_department: currentUser.department,
              actor_avatar: currentUser.avatar_url || getAvatarForPseudonym(currentUser.username),
              message_snippet: `Sent you a friend request.`,
              read: false,
            }).then(() => {}, () => {});
          } catch (e) {}
        }

        try {
          const ws = (window as any).__capitalk_ws;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
          }
        } catch (e) {}

        try {
          roomManager.sendFriendAddSignal(currentUser);
        } catch (e) {}

        return {
          success: true,
          message: `Friend request sent to @${partnerProfile.username}.`,
        };
      },

      keepPartner: (partnerProfile: UserProfile, isReciprocal = false) => {
        const current = get().keptConnection;
        if (current && current.user_id !== partnerProfile.id) {
          return {
            success: false,
            message: `You already have @${current.username} saved. You can only keep 1 person at a time!`,
          };
        }

        const newConn: KeptConnection = {
          id: 'kc_' + Date.now(),
          user_id: partnerProfile.id,
          username: partnerProfile.username,
          department: partnerProfile.department,
          avatar_url: partnerProfile.avatar_url,
          bio: partnerProfile.bio,
          added_at: new Date().toISOString(),
          last_chat_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };

        set({
          keptConnection: newConn,
          pendingOutgoingConnection: null,
          hasNewConnectionNotif: true,
          isKeptPartnerOnline: true,
          keptPartnerLastSeen: Date.now(),
          actionToast: {
            type: 'info',
            message: isReciprocal
              ? `✨ @${partnerProfile.username} added you as a friend!`
              : `✨ Connected with @${partnerProfile.username}!`,
          },
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_kept_connection_v1', JSON.stringify(newConn));
            localStorage.removeItem('capitalk_pending_outgoing_v1');
            localStorage.setItem('capitalk_has_new_conn_notif', 'true');
          } catch (e) {}
        }

        if (isReciprocal) {
          get().addWallNotification({
            post_id: 'conn_' + Date.now(),
            type: 'friend_add',
            actor_alias: `@${partnerProfile.username}`,
            actor_username: partnerProfile.username,
            actor_avatar: partnerProfile.avatar_url || getAvatarForPseudonym(partnerProfile.username),
            actor_department: partnerProfile.department,
            message_snippet: `✨ @${partnerProfile.username} added you as a friend!`,
          });
        }

        // Broadcast to partner if this is the originating action
        if (!isReciprocal) {
          const currentUser = get().currentUser;
          if (currentUser) {
            const syncPayload = {
              type: 'CONNECTION_ADDED_TWO_WAY',
              sender: currentUser,
              targetUserId: partnerProfile.id,
              targetUsername: partnerProfile.username,
              timestamp: Date.now(),
            };

            if (broadcastChannel) {
              try { broadcastChannel.postMessage(syncPayload); } catch (e) {}
            }
            broadcastGlobalRealtime('connection_added_two_way', syncPayload);
            matchmakingEngine.send(syncPayload);

            if (supabase && isSupabaseConfigured) {
              try {
                const globalChan = supabase.channel('capitalk_global_announcements_v1');
                globalChan.send({
                  type: 'broadcast',
                  event: 'connection_added_two_way',
                  payload: syncPayload,
                });
              } catch (e) {}
            }

            try {
              roomManager.sendFriendAddSignal(currentUser);
            } catch (e) {}
          }
        }

        return {
          success: true,
          message: `Connected with @${partnerProfile.username}.`,
        };
      },

      acceptPendingRequest: (requestId: string) => {
        const store = get();
        const req = store.pendingIncomingRequests.find((r) => r.id === requestId);
        if (!req) return;

        const currentFriend = store.keptConnection;
        const currentUser = store.currentUser;

        // 1. If currently have a friend, unfriend them first and notify them
        if (currentFriend && currentUser && currentFriend.user_id !== req.sender_id) {
          const unfriendPayload = {
            type: 'CONNECTION_REMOVED_TWO_WAY',
            senderId: currentUser.id,
            senderUsername: currentUser.username,
            senderAvatar: currentUser.avatar_url,
            senderDept: currentUser.department,
            targetUserId: currentFriend.user_id,
            targetUsername: currentFriend.username,
            timestamp: Date.now(),
          };
          if (broadcastChannel) {
            try { broadcastChannel.postMessage(unfriendPayload); } catch (e) {}
          }
          broadcastGlobalRealtime('connection_removed_two_way', unfriendPayload);
          matchmakingEngine.send(unfriendPayload);

          if (supabase && isSupabaseConfigured) {
            try {
              const chan = supabase.channel('capitalk_global_announcements_v1');
              chan.send({
                type: 'broadcast',
                event: 'connection_removed_two_way',
                payload: unfriendPayload,
              });
            } catch (e) {}
          }
        }

        // 2. Set new friend
        const newConn: KeptConnection = {
          id: 'kc_' + Date.now(),
          user_id: req.sender_id,
          username: req.sender_username,
          department: req.sender_department,
          avatar_url: req.sender_avatar,
          bio: req.sender_bio,
          added_at: new Date().toISOString(),
          last_chat_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };

        const updatedPending = store.pendingIncomingRequests.filter((r) => r.id !== requestId);

        set({
          keptConnection: newConn,
          pendingIncomingRequests: updatedPending,
          hasNewConnectionNotif: false,
          isKeptPartnerOnline: true,
          keptPartnerLastSeen: Date.now(),
          actionToast: {
            type: 'info',
            message: `✨ Connected with @${req.sender_username}!`,
          },
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_kept_connection_v1', JSON.stringify(newConn));
            localStorage.setItem('capitalk_pending_incoming_v1', JSON.stringify(updatedPending));
            localStorage.removeItem('capitalk_has_new_conn_notif');
          } catch (e) {}
        }

        // 3. Broadcast FRIEND_REQUEST_ACCEPTED & CONNECTION_ACCEPTED_TWO_WAY to requester
        if (currentUser) {
          const acceptPayload = {
            type: 'FRIEND_REQUEST_ACCEPTED',
            sender: currentUser,
            targetUserId: req.sender_id,
            targetUsername: req.sender_username,
            timestamp: Date.now(),
          };

          if (broadcastChannel) {
            try { broadcastChannel.postMessage(acceptPayload); } catch (e) {}
          }
          broadcastGlobalRealtime('friend_request_accepted', acceptPayload);
          broadcastGlobalRealtime('connection_accepted_two_way', acceptPayload);
          matchmakingEngine.send(acceptPayload);
          matchmakingEngine.send({ ...acceptPayload, type: 'CONNECTION_ACCEPTED_TWO_WAY' });

          if (supabase && isSupabaseConfigured) {
            try {
              const chan = supabase.channel('capitalk_global_announcements_v1');
              chan.send({
                type: 'broadcast',
                event: 'friend_request_accepted',
                payload: acceptPayload,
              });

              supabase.from('notifications').insert({
                id: 'notif_fa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                target_user_id: req.sender_id,
                post_id: 'fa_' + Date.now(),
                type: 'friend_accept',
                actor_alias: `@${currentUser.username}`,
                actor_username: currentUser.username,
                actor_department: currentUser.department,
                actor_avatar: currentUser.avatar_url || getAvatarForPseudonym(currentUser.username),
                message_snippet: `Accepted your friend request! You can now send direct messages.`,
                read: false,
              }).then(() => {}, () => {});
            } catch (e) {}
          }
          try {
            const ws = (window as any).__capitalk_ws;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(acceptPayload));
            }
          } catch (e) {}
        }
        
        store.sendGlobalPresenceHeartbeat();
        store.queryPartnerPresence();
      },

      declinePendingRequest: (requestId: string) => {
        const store = get();
        const req = store.pendingIncomingRequests.find((r) => r.id === requestId);
        const updated = store.pendingIncomingRequests.filter((r) => r.id !== requestId);
        set({
          pendingIncomingRequests: updated,
          actionToast: {
            type: 'info',
            message: req ? `Declined request from @${req.sender_username}.` : 'Request declined.',
          },
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_pending_incoming_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (req && store.currentUser) {
          const declinePayload = {
            type: 'FRIEND_REQUEST_DECLINED',
            senderId: store.currentUser.id,
            senderUsername: store.currentUser.username,
            targetUserId: req.sender_id,
            targetUsername: req.sender_username,
            timestamp: Date.now(),
          };
          if (broadcastChannel) {
            try { broadcastChannel.postMessage(declinePayload); } catch (e) {}
          }
          broadcastGlobalRealtime('friend_request_declined', declinePayload);
          matchmakingEngine.send(declinePayload);
          matchmakingEngine.send({ ...declinePayload, type: 'CONNECTION_DECLINED_TWO_WAY' });

          if (supabase && isSupabaseConfigured) {
            try {
              const chan = supabase.channel('capitalk_global_announcements_v1');
              chan.send({
                type: 'broadcast',
                event: 'friend_request_declined',
                payload: declinePayload,
              });
            } catch (e) {}
          }
          try {
            const ws = (window as any).__capitalk_ws;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(declinePayload));
            }
          } catch (e) {}
        }
      },

      cancelPendingOutgoingConnection: () => {
        const store = get();
        const outgoing = store.pendingOutgoingConnection;
        set({
          pendingOutgoingConnection: null,
          actionToast: {
            type: 'info',
            message: 'Cancelled pending friend request.',
          },
        });
        if (typeof window !== 'undefined') {
          try { localStorage.removeItem('capitalk_pending_outgoing_v1'); } catch (e) {}
        }

        if (outgoing && store.currentUser) {
          const cancelPayload = {
            type: 'CONNECTION_CANCELLED_TWO_WAY',
            senderId: store.currentUser.id,
            senderUsername: store.currentUser.username,
            targetUserId: outgoing.target_user_id,
            targetUsername: outgoing.target_username,
            timestamp: Date.now(),
          };
          if (broadcastChannel) {
            try { broadcastChannel.postMessage(cancelPayload); } catch (e) {}
          }
          broadcastGlobalRealtime('friend_request_cancelled', cancelPayload);
          broadcastGlobalRealtime('connection_cancelled_two_way', cancelPayload);
          matchmakingEngine.send(cancelPayload);
          matchmakingEngine.send({ ...cancelPayload, type: 'FRIEND_REQUEST_CANCELLED' });

          if (supabase && isSupabaseConfigured) {
            try {
              const chan = supabase.channel('capitalk_global_announcements_v1');
              chan.send({
                type: 'broadcast',
                event: 'connection_cancelled_two_way',
                payload: cancelPayload,
              });
            } catch (e) {}
          }
        }
      },

      removeKeptConnection: () => {
        const current = get().keptConnection;
        const currentUser = get().currentUser;
        set({
          keptConnection: null,
          hasNewConnectionNotif: false,
          actionToast: {
            type: 'info',
            message: '🗑️ Connection removed from your list.',
          },
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('capitalk_kept_connection_v1');
            localStorage.removeItem('capitalk_has_new_conn_notif');
          } catch (e) {}
        }

        if (current && currentUser) {
          const removePayload = {
            type: 'CONNECTION_REMOVED_TWO_WAY',
            senderId: currentUser.id,
            senderUsername: currentUser.username,
            senderAvatar: currentUser.avatar_url || getAvatarForPseudonym(currentUser.username),
            senderDept: currentUser.department,
            targetUserId: current.user_id,
            targetUsername: current.username,
            timestamp: Date.now(),
          };

          if (broadcastChannel) {
            try {
              broadcastChannel.postMessage(removePayload);
            } catch (e) {}
          }
          broadcastGlobalRealtime('connection_removed_two_way', removePayload);
          matchmakingEngine.send(removePayload);

          if (supabase && isSupabaseConfigured) {
            try {
              const globalChan = supabase.channel('capitalk_global_announcements_v1');
              globalChan.send({
                type: 'broadcast',
                event: 'connection_removed_two_way',
                payload: removePayload,
              });
            } catch (e) {}
          }
        }
      },

      viewState: 'landing',
      viewHistory: [],
      setViewState: (view: ViewState, pushHistory = true) => {
        const current = get().viewState;
        if (current === view) return;
        const currentHistory = get().viewHistory || [];
        const updatedHistory = pushHistory ? [...currentHistory.slice(-19), current] : currentHistory;
        set({ viewState: view, viewHistory: updatedHistory });

        if (pushHistory && typeof window !== 'undefined') {
          try {
            window.history.pushState({ viewState: view, historyIndex: updatedHistory.length }, '', window.location.pathname);
          } catch (e) {}
        }
      },
      popViewHistory: () => {
        const history = get().viewHistory || [];
        if (history.length > 0) {
          set({ viewHistory: history.slice(0, -1) });
        }
      },
      goBack: () => {
        const { viewHistory, viewState } = get();
        if (viewHistory && viewHistory.length > 0) {
          const prevView = viewHistory[viewHistory.length - 1];
          const updatedHistory = viewHistory.slice(0, -1);
          set({ viewState: prevView, viewHistory: updatedHistory });
          if (typeof window !== 'undefined') {
            try {
              window.history.replaceState({ viewState: prevView, historyIndex: updatedHistory.length }, '', window.location.pathname);
            } catch (e) {}
          }
        } else {
          if (viewState !== 'landing') {
            set({ viewState: 'landing', viewHistory: [] });
            if (typeof window !== 'undefined') {
              try {
                window.history.replaceState({ viewState: 'landing', historyIndex: 0 }, '', window.location.pathname);
              } catch (e) {}
            }
          }
        }
      },

      wallNotifications: typeof window !== 'undefined'
        ? (() => {
            try {
              const stored = localStorage.getItem('capitalk_wall_notifications_v2');
              if (stored) {
                const parsed = JSON.parse(stored);
                const deduped = deduplicateNotificationsList(parsed);
                try {
                  localStorage.setItem('capitalk_wall_notifications_v2', JSON.stringify(deduped));
                } catch (e) {}
                return deduped;
              }
              return DEMO_WALL_NOTIFICATIONS;
            } catch (e) {
              return DEMO_WALL_NOTIFICATIONS;
            }
          })()
        : DEMO_WALL_NOTIFICATIONS,

      targetPostId: null,
      setTargetPostId: (id: string | null) => set({ targetPostId: id }),

      myPostIds: typeof window !== 'undefined'
        ? (() => {
            try {
              const stored = localStorage.getItem('capitalk_my_post_ids_v1');
              return stored ? JSON.parse(stored) : ['post_1'];
            } catch (e) {
              return ['post_1'];
            }
          })()
        : ['post_1'],

      myPseudonyms: typeof window !== 'undefined'
        ? (() => {
            try {
              const stored = localStorage.getItem('capitalk_my_pseudonyms_v1');
              const list: string[] = stored ? JSON.parse(stored) : [];
              const current = localStorage.getItem('capitalk_user_pseudonym');
              if (current && !list.some((p) => p.toLowerCase() === current.toLowerCase())) {
                list.push(current);
              }
              return list;
            } catch (e) {
              return [];
            }
          })()
        : [],

      addPseudonym: (pseudonym: string) => {
        const clean = pseudonym.replace(/^@/, '').trim();
        if (!clean || clean.toLowerCase() === 'anon' || clean.toLowerCase() === 'anon student') return;
        const current = get().myPseudonyms || [];
        if (!current.some((p) => p.toLowerCase() === clean.toLowerCase())) {
          const updated = [...current, clean];
          set({ myPseudonyms: updated });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('capitalk_my_pseudonyms_v1', JSON.stringify(updated));
            } catch (e) {}
          }
          if (broadcastChannel) {
            try {
              broadcastChannel.postMessage({ type: 'MY_PSEUDONYMS_UPDATE', pseudonyms: updated });
            } catch (e) {}
          }
        }
      },

      addWallNotification: (notifData) => {
        const sig = getCanonicalNotificationSignature(notifData);
        const now = Date.now();

        // 1. In-memory debounce window check (10 seconds debounce for identical action)
        const lastTime = recentNotifTimestamps.get(sig);
        if (lastTime && (now - lastTime < 10000)) {
          return;
        }
        recentNotifTimestamps.set(sig, now);

        // 2. Check if identical notification already exists in recent state
        const existing = get().wallNotifications || [];
        const isDuplicateInState = existing.some((n) => {
          if (n.type !== notifData.type) return false;
          const existingSig = getCanonicalNotificationSignature(n);
          if (existingSig === sig) {
            const age = now - new Date(n.created_at).getTime();
            return age < 30000 || !n.read;
          }
          return false;
        });

        if (isDuplicateInState) {
          return;
        }

        const newNotif: WallNotification = {
          id: 'notif_' + now + '_' + Math.random().toString(36).substring(2, 6),
          post_id: notifData.post_id,
          type: notifData.type,
          actor_alias: notifData.actor_alias,
          actor_username: notifData.actor_username,
          actor_department: notifData.actor_department,
          actor_avatar: notifData.actor_avatar,
          message_snippet: notifData.message_snippet,
          comment_text: notifData.comment_text,
          admin_remark: notifData.admin_remark,
          created_at: new Date().toISOString(),
          read: false,
        };

        const updated = deduplicateNotificationsList([newNotif, ...existing]);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_wall_notifications_v2', JSON.stringify(updated));
          } catch (e) {}
        }
        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'WALL_NOTIFICATIONS_UPDATE', notifications: updated });
          } catch (e) {}
        }
        if (supabase && isSupabaseConfigured) {
          try {
            const user = get().currentUser;
            const currentUserId = user ? user.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');
            supabase
              .from('notifications')
              .insert({
                id: newNotif.id,
                target_user_id: currentUserId,
                post_id: newNotif.post_id,
                type: newNotif.type,
                actor_alias: newNotif.actor_alias,
                actor_department: newNotif.actor_department,
                message_snippet: newNotif.message_snippet,
                comment_text: newNotif.comment_text,
                admin_remark: newNotif.admin_remark,
                read: newNotif.read,
                created_at: newNotif.created_at,
              })
              .then(() => {}, () => {});
          } catch (e) {}
        }

        set({ wallNotifications: updated });
      },

      markWallNotificationsAsRead: () => {
        const updated = get().wallNotifications.map((n) => ({ ...n, read: true }));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_wall_notifications_v2', JSON.stringify(updated));
          } catch (e) {}
        }
        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'WALL_NOTIFICATIONS_UPDATE', notifications: updated });
          } catch (e) {}
        }
        set({ wallNotifications: updated });
      },

      markSingleNotificationAsRead: (id: string) => {
        const updated = get().wallNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_wall_notifications_v2', JSON.stringify(updated));
          } catch (e) {}
        }
        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'WALL_NOTIFICATIONS_UPDATE', notifications: updated });
          } catch (e) {}
        }
        set({ wallNotifications: updated });
      },

      clearWallNotifications: () => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_wall_notifications_v2', JSON.stringify([]));
          } catch (e) {}
        }
        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'WALL_NOTIFICATIONS_UPDATE', notifications: [] });
          } catch (e) {}
        }
        set({ wallNotifications: [] });
      },

      readFreedomPostIds: typeof window !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem('capitalk_read_freedom_ids_v1');
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })()
        : [],

      readMusicPostIds: typeof window !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem('capitalk_read_music_ids_v1');
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })()
        : [],

      markFreedomPostsAsRead: () => {
        const allApprovedIds = get().freedomPosts
          .filter((p) => !p.song_title && (p.status === 'approved' || !p.status || p.is_admin))
          .map((p) => p.id);
        const merged = Array.from(new Set([...(get().readFreedomPostIds || []), ...allApprovedIds]));
        set({ readFreedomPostIds: merged });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_read_freedom_ids_v1', JSON.stringify(merged));
          } catch (e) {}
        }
      },

      markMusicPostsAsRead: () => {
        const allApprovedSongIds = get().freedomPosts
          .filter((p) => Boolean(p.song_title) && (p.status === 'approved' || !p.status || p.is_admin))
          .map((p) => p.id);
        const merged = Array.from(new Set([...(get().readMusicPostIds || []), ...allApprovedSongIds]));
        set({ readMusicPostIds: merged });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_read_music_ids_v1', JSON.stringify(merged));
          } catch (e) {}
        }
      },

      queueFilter: 'anyone',
      setQueueFilter: (filter: QueueFilter) => set({ queueFilter: filter }),
      searchingTimeSeconds: 0,
      isSearching: false,
      waitingCount: 0,

      activeRoom: null,
      messages: [],
      partnerTyping: false,
      partnerLeft: false,
      partnerLeftReason: null,

      blockedUserIds: [],
      blockedUsers: [],
      reports: [],
      bannedUserIds: [],
      profanityStrikes: 0,
      bayotCount: 0,
      freedomPosts: [],

      loudspeakerBookings: [],
      activeLoudspeaker: null,
      showLoudspeakerModal: false,
      setShowLoudspeakerModal: (show: boolean) => set({ showLoudspeakerModal: show }),
      loudspeakerReactionBursts: [],

      actionToast: null,
      systemAnnouncement: null,
      showQueueTimeoutModal: false,
      setShowQueueTimeoutModal: (show: boolean) => set({ showQueueTimeoutModal: show }),
      feedbackList: [],
      showFeedbackModal: false,
      setShowFeedbackModal: (show: boolean) => set({ showFeedbackModal: show }),

      clientIp: null,
      banReason: null,

      checkBanStatus: async () => {
        if (typeof window === 'undefined') return false;
        const { currentUser } = get();
        const deviceId = getOrCreatePersistentUUID();
        try {
          const queryParams = new URLSearchParams({
            userId: currentUser?.id || '',
            username: currentUser?.username || '',
            deviceId: deviceId || '',
          });
          const res = await fetch(`/api/auth/ban-check?${queryParams.toString()}`);
          if (res.ok) {
            const data = await res.json();
            if (data.ip) {
              set({ clientIp: data.ip });
            }
            if (data.isAdmin && currentUser && !currentUser.is_admin) {
              set({ currentUser: { ...currentUser, is_admin: true } });
            }
            if (data.isBanned) {
              try { get().cancelSearch(); } catch (e) {}
              try { roomManager.leaveRoom(); } catch (e) {}
              set({
                viewState: 'ceased',
                banReason: data.banReason || 'Account or IP address restricted by CapiTalk Administrator.',
              });
              localStorage.setItem('capitalk_is_banned', 'true');
              return true;
            } else {
              // Account is NOT banned (or has been unbanned by admin)
              if (typeof window !== 'undefined') {
                localStorage.removeItem('capitalk_is_banned');
              }

              const currentViewState = get().viewState;
              const myUserId = currentUser?.id?.toLowerCase();
              const myUsername = currentUser?.username?.toLowerCase();
              const myIp = data.ip || get().clientIp;

              // Prune own identity from local bannedUserIds list
              const currentBans = get().bannedUserIds || [];
              const cleanedBans = currentBans.filter((id) => {
                const lower = id.toLowerCase();
                return lower !== myUserId && lower !== myUsername && id !== deviceId && id !== myIp;
              });

              const updates: Partial<ChatStoreState> = {
                bannedUserIds: cleanedBans,
                banReason: null,
              };

              // If currently stuck on the ceased / suspended screen, restore back to landing
              if (currentViewState === 'ceased') {
                updates.viewState = 'landing';
                updates.actionToast = {
                  type: 'announcement',
                  message: '✅ Account access restored. Welcome back to CapiTalk!',
                };
              }

              set(updates);

              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(cleanedBans));
                } catch (e) {}
              }
              return false;
            }
          }
        } catch (e) {}
        return false;
      },

      initSession: () => {
        // Guard: prevent stacking storage listeners and intervals on repeated calls
        // (e.g. page reload while persisted room is active, HMR, component remount)
        if (sessionInitialized) return;
        sessionInitialized = true;

        // Fallback profile, kept connection, and theme restoration
        if (typeof window !== 'undefined') {
          try {
            if (!get().currentUser) {
              const rawUser = localStorage.getItem('capitalk_current_user_profile_v1');
              if (rawUser) set({ currentUser: JSON.parse(rawUser) });
            }
            if (!get().keptConnection) {
              const rawKept = localStorage.getItem('capitalk_kept_connection_v1');
              if (rawKept) set({ keptConnection: JSON.parse(rawKept) });
            }
            const standaloneTheme = localStorage.getItem('capitalk_theme');
            let isDark = false;
            if (standaloneTheme !== null) {
              isDark = standaloneTheme === '1';
            } else {
              const zustandRaw = localStorage.getItem('capitalk-storage');
              if (zustandRaw) {
                const parsed = JSON.parse(zustandRaw);
                if (typeof parsed?.state?.themeMode === 'number') {
                  isDark = parsed.state.themeMode === 1;
                }
              }
            }
            const mode = isDark ? 1 : 0;
            if (get().themeMode !== mode) {
              set({ themeMode: mode });
            }
            if (isDark) {
              document.documentElement.classList.add('dark');
              document.documentElement.setAttribute('data-theme', 'dark');
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.setAttribute('data-theme', 'light');
            }
          } catch (e) {}
        }

        // Connect to WebSocket server immediately so live loudspeaker broadcasts & platform updates are always received
        if (typeof window !== 'undefined') {
          matchmakingEngine.connect();

          // ── Global User Presence Heartbeat Ticker (every 4s across the whole website) ──
          if ((window as any).__presenceTicker) {
            clearInterval((window as any).__presenceTicker);
          }
          (window as any).__presenceTicker = setInterval(() => {
            get().sendGlobalPresenceHeartbeat();
          }, 4000);

          // Send immediately on session start
          get().sendGlobalPresenceHeartbeat();
          if (get().keptConnection) {
            get().queryPartnerPresence();
          }

          // Handle visibility change (tab focus/blur) & true browser close
          if (!(window as any).__presenceVisibilityAttached) {
            (window as any).__presenceVisibilityAttached = true;
            document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                get().sendGlobalPresenceHeartbeat();
                if (get().keptConnection) {
                  get().queryPartnerPresence();
                }
              }
            });

            window.addEventListener('beforeunload', () => {
              const cur = get().currentUser;
              if (cur) {
                const leavePayload = { type: 'USER_PRESENCE_LEAVE', userId: cur.id, timestamp: Date.now() };
                try { broadcastChannel?.postMessage(leavePayload); } catch (e) {}
                try { broadcastGlobalRealtime('user_presence_leave', leavePayload); } catch (e) {}
                try { matchmakingEngine.send(leavePayload); } catch (e) {}
              }
            });
          }
        }

        // Initial real-time ban check via API
        get().checkBanStatus();

        const { activeRoom, currentUser, isSearching } = get();

        // 1. Sync reports & bans across browser tabs & sessions via shared localStorage
        if (typeof window !== 'undefined') {
          try {
            const rawReports = localStorage.getItem('capitalk_shared_reports_v5');
            const rawBans = localStorage.getItem('capitalk_shared_bans_v5');
            const loadedReports: UserReport[] = rawReports ? JSON.parse(rawReports) : [];
            const loadedBans: string[] = rawBans ? JSON.parse(rawBans) : [];

            const currentReports = get().reports;
            const currentBans = get().bannedUserIds;

            const reportMap = new Map<string, UserReport>();
            [...loadedReports, ...currentReports].forEach((r) => reportMap.set(r.id, r));
            const mergedReports = Array.from(reportMap.values());
            const mergedBans = [...new Set([...loadedBans, ...currentBans])];

            const rawAnnouncement = localStorage.getItem('capitalk_shared_announcement_v5');
            const loadedAnnouncement = rawAnnouncement ? JSON.parse(rawAnnouncement) : null;

            const rawLoudspeaker = localStorage.getItem('capitalk_shared_loudspeaker_v1');
            const loadedLoudspeaker: LoudspeakerBooking[] = (rawLoudspeaker ? JSON.parse(rawLoudspeaker) : []).filter(
              (b: any) => b.id !== 'ls_sample_1'
            );

            const rawFreedom = localStorage.getItem('capitalk_freedom_wall_v1');
            const loadedFreedom: FreedomPost[] = rawFreedom ? JSON.parse(rawFreedom) : DEMO_FREEDOM_POSTS;

            set({
              reports: mergedReports,
              bannedUserIds: mergedBans,
              systemAnnouncement: loadedAnnouncement,
              freedomPosts: loadedFreedom,
              loudspeakerBookings: loadedLoudspeaker.length > 0 ? loadedLoudspeaker : (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1'),
            });
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(mergedReports));
            localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(mergedBans));
            if (!rawFreedom) {
              localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(DEMO_FREEDOM_POSTS));
            }

            // Sync Freedom Wall posts from Supabase PostgreSQL Database across all devices
            if (supabase && isSupabaseConfigured) {
              try {
                supabase
                  .from('freedom_posts')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .then(({ data, error }) => {
                    if (data && data.length > 0 && !error) {
                      const localMap = new Map((get().freedomPosts || []).map((p) => [p.id, p]));
                      const loadedFromDb: FreedomPost[] = data.map((row: any) => mapDbRowToPost(row, localMap.get(row.id)));
                      set({ freedomPosts: loadedFromDb });
                      localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(loadedFromDb));
                    }
                  }, () => {});
              } catch (e) {}

              // Sync Loudspeaker Bookings from Supabase Database for cross-device & persistent consistency
              try {
                supabase
                  .from('loudspeaker_bookings')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .limit(50)
                  .then(({ data, error }) => {
                    if (data && data.length > 0 && !error) {
                      const dbBookings: LoudspeakerBooking[] = data
                        .filter((row: any) => row.id !== 'ls_sample_1')
                        .map((row: any) => ({
                          id: row.id,
                          user_id: row.user_id || 'anon',
                          author_alias: row.author_alias || 'Anonymous Student',
                          department: row.department || 'College of Arts and Sciences',
                          message: row.message,
                          theme_color: row.theme_color || '#701a31',
                          song_title: row.song_title || undefined,
                          song_artist: row.song_artist || undefined,
                          scheduled_at: row.scheduled_at,
                          slot_label: row.slot_label || 'Broadcast Slot',
                          duration_seconds: row.duration_seconds || 30,
                          status: row.status || 'scheduled',
                          reaction_counts: row.reaction_counts || { fire: 0, heart: 0, clap: 0, horn: 0 },
                          created_at: row.created_at || new Date().toISOString(),
                        }));

                      const localBookings = (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1');
                      const bookingMap = new Map<string, LoudspeakerBooking>();
                      localBookings.forEach((b) => bookingMap.set(b.id, b));
                      dbBookings.forEach((b) => bookingMap.set(b.id, b));
                      const mergedBookings = Array.from(bookingMap.values());

                      const now = Date.now();
                      const currentlyLive = mergedBookings.find((b) => {
                        if (b.status === 'cancelled' || b.status === 'completed') return false;
                        const schedTime = new Date(b.scheduled_at).getTime();
                        const durMs = (b.duration_seconds || 30) * 1000;
                        return schedTime <= now && (schedTime + durMs) > now;
                      });

                      set({
                        loudspeakerBookings: mergedBookings,
                        activeLoudspeaker: currentlyLive ? { ...currentlyLive, status: 'live' } : null,
                      });
                      try {
                        localStorage.setItem('capitalk_shared_loudspeaker_v1', JSON.stringify(mergedBookings));
                      } catch (e) {}
                    }
                  }, () => {});
              } catch (e) {}

              // Sync bidirectional block list from Supabase Database
              try {
                const user = get().currentUser;
                if (user) {
                  supabase
                    .from('blocks')
                    .select('*')
                    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`)
                    .then(({ data, error }) => {
                      if (data && data.length > 0 && !error) {
                        const dbBlockedIds = data.map((b: any) => b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
                        const currentBlocked = get().blockedUserIds;
                        const merged = [...new Set([...currentBlocked, ...dbBlockedIds])];
                        set({ blockedUserIds: merged });
                      }
                    }, () => {});
                }
              } catch (e) {}

              // Sync banned users list from Supabase Database (authoritative source of truth)
              try {
                supabase
                  .from('banned_users')
                  .select('user_id, device_id, ip_address, username')
                  .then(({ data, error }) => {
                    if (!error && Array.isArray(data)) {
                      const dbBans = data.flatMap((b: any) => [b.user_id, b.device_id, b.ip_address, b.username]).filter(Boolean);
                      set({ bannedUserIds: dbBans });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(dbBans));
                      }
                    }
                  }, () => {});

                // Supabase Realtime subscription to banned_users table for instant eviction AND instant unban
                const bannedChannel = supabase
                  .channel('public:banned_users')
                  .on('postgres_changes', { event: '*', schema: 'public', table: 'banned_users' }, (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                      const newBan = payload.new;
                      if (newBan) {
                        const store = get();
                        const myUserId = store.currentUser?.id?.toLowerCase();
                        const myUsername = store.currentUser?.username?.toLowerCase();
                        const myDeviceId = typeof window !== 'undefined' ? localStorage.getItem('capitalk_anon_user_id') : null;
                        const myIp = store.clientIp;

                        const targetUser = newBan.user_id?.toLowerCase();
                        const targetName = newBan.username?.toLowerCase();
                        const targetDevice = newBan.device_id;
                        const targetIp = newBan.ip_address;

                        const isBanned =
                          (targetUser && (targetUser === myUserId || targetUser === myUsername)) ||
                          (targetName && (targetName === myUsername || targetName === myUserId)) ||
                          (targetDevice && targetDevice === myDeviceId) ||
                          (targetIp && targetIp === myIp);

                        if (isBanned) {
                          try { get().cancelSearch(); } catch (e) {}
                          try { roomManager.leaveRoom(); } catch (e) {}
                          set({
                            viewState: 'ceased',
                            banReason: newBan.reason || 'Account or IP address restricted by CapiTalk Administrator.',
                          });
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('capitalk_is_banned', 'true');
                          }
                        }
                      }
                    } else if (payload.eventType === 'DELETE') {
                      // Realtime unban event from Supabase database
                      get().checkBanStatus();
                      if (supabase) {
                        supabase
                          .from('banned_users')
                          .select('user_id, device_id, ip_address, username')
                          .then(({ data, error }) => {
                            if (!error && Array.isArray(data)) {
                              const dbBans = data.flatMap((b: any) => [b.user_id, b.device_id, b.ip_address, b.username]).filter(Boolean);
                              set({ bannedUserIds: dbBans });
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(dbBans));
                              }
                            }
                          }, () => {});
                      }
                    }
                  })
                  .subscribe();
              } catch (e) {}
            }

            window.addEventListener('storage', (e) => {
              if (e.key === 'capitalk_shared_reports_v5' && e.newValue) {
                try {
                  const updated: UserReport[] = JSON.parse(e.newValue);
                  set({ reports: updated });
                } catch (err) {}
              } else if (e.key === 'capitalk_shared_bans_v5' && e.newValue) {
                try {
                  const updated: string[] = JSON.parse(e.newValue);
                  set({ bannedUserIds: updated });
                } catch (err) {}
              } else if (e.key === 'capitalk_shared_announcement_v5') {
                try {
                  const updated = e.newValue ? JSON.parse(e.newValue) : null;
                  set((state) => {
                    let updatedMessages = state.messages;
                    if (updated && state.activeRoom) {
                      const annMsgId = 'msg_ann_' + updated.id;
                      if (!updatedMessages.some((m) => m.id === annMsgId)) {
                        const annMsg: ChatMessage = {
                          id: annMsgId,
                          room_id: state.activeRoom.id,
                          sender_id: 'system_announcement',
                          sender_username: '📢 Campus Announcement',
                          message: updated.message,
                          created_at: new Date().toISOString(),
                        };
                        updatedMessages = [...updatedMessages, annMsg];
                        try {
                          roomManager.persistMessage(annMsg);
                        } catch (e) {}
                      }
                    }
                    return {
                      systemAnnouncement: updated,
                      messages: updatedMessages,
                      actionToast: updated ? { type: 'announcement', message: updated.message } : null,
                    };
                  });
                } catch (err) {}
              }
            });

            // HTML5 BroadcastChannel multi-tab real-time listener
            if (broadcastChannel) {
              broadcastChannel.onmessage = (event) => {
                if (event.data?.type === 'ANNOUNCEMENT_BROADCAST') {
                  const announcement = event.data.announcement;
                  set((state) => {
                    let updatedMessages = state.messages;
                    if (announcement && state.activeRoom) {
                      const annMsgId = 'msg_ann_' + announcement.id;
                      if (!updatedMessages.some((m) => m.id === annMsgId)) {
                        const annMsg: ChatMessage = {
                          id: annMsgId,
                          room_id: state.activeRoom.id,
                          sender_id: 'system_announcement',
                          sender_username: '📢 Campus Announcement',
                          message: announcement.message,
                          created_at: new Date().toISOString(),
                        };
                        updatedMessages = [...updatedMessages, annMsg];
                        try {
                          roomManager.injectSystemMessage(annMsg);
                        } catch (e) {}
                      }
                    }
                    return {
                      systemAnnouncement: announcement,
                      messages: updatedMessages,
                      actionToast: announcement ? { type: 'announcement', message: announcement.message } : null,
                    };
                  });
                } else if (event.data?.type === 'FREEDOM_WALL_UPDATE') {
                  set({ freedomPosts: event.data.posts });
                } else if (event.data?.type === 'LOUDSPEAKER_BOOKINGS_UPDATED') {
                  set({ loudspeakerBookings: event.data.bookings });
                } else if (event.data?.type === 'LOUDSPEAKER_LIVE_START') {
                  playLoudspeakerChime();
                  set({ activeLoudspeaker: event.data.booking });
                } else if (event.data?.type === 'LOUDSPEAKER_LIVE_END') {
                  set({ activeLoudspeaker: null });
                } else if (event.data?.type === 'WALL_NOTIFICATIONS_UPDATE') {
                  set({ wallNotifications: event.data.notifications });
                } else if (event.data?.type === 'USER_BANNED') {
                  const { bannedTarget, bannedIp, banReason } = event.data;
                  const store = get();
                  const myUserId = store.currentUser?.id?.toLowerCase();
                  const myUsername = store.currentUser?.username?.toLowerCase();
                  const myDeviceId = typeof window !== 'undefined' ? localStorage.getItem('capitalk_anon_user_id') : null;
                  const myIp = store.clientIp;

                  const targetStr = (bannedTarget || '').toLowerCase();
                  const isMatch =
                    targetStr === myUserId ||
                    targetStr === myUsername ||
                    bannedTarget === myDeviceId ||
                    (bannedIp && bannedIp === myIp);

                  if (isMatch) {
                    try { get().cancelSearch(); } catch (e) {}
                    try { roomManager.leaveRoom(); } catch (e) {}
                    set({
                      viewState: 'ceased',
                      banReason: banReason || 'Account or IP address restricted by CapiTalk Administrator.',
                    });
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('capitalk_is_banned', 'true');
                    }
                  }
                } else if (event.data?.type === 'USER_UNBANNED') {
                  const { unbannedTarget } = event.data;
                  const store = get();
                  const myUserId = store.currentUser?.id?.toLowerCase();
                  const myUsername = store.currentUser?.username?.toLowerCase();
                  const myDeviceId = typeof window !== 'undefined' ? localStorage.getItem('capitalk_anon_user_id') : null;
                  const myIp = store.clientIp;

                  const targetStr = (unbannedTarget || '').toLowerCase();
                  const isMatch =
                    targetStr === myUserId ||
                    targetStr === myUsername ||
                    unbannedTarget === myDeviceId ||
                    (unbannedTarget && unbannedTarget === myIp);

                  if (isMatch || store.viewState === 'ceased') {
                    get().checkBanStatus();
                  } else {
                    const currentBans = store.bannedUserIds || [];
                    const updated = currentBans.filter((b) => b !== unbannedTarget);
                    set({ bannedUserIds: updated });
                    if (typeof window !== 'undefined') {
                      try {
                        localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(updated));
                      } catch (e) {}
                    }
                  }
                } else if (event.data?.type === 'FREEDOM_WALL_LIKE') {
                  const { postId, actorAlias, actorDept, messageSnippet, likerId, actorUsername, actorAvatar, targetAuthorId, targetAuthorAlias } = event.data;
                  const store = get();
                  const { myPostIds, myPseudonyms, currentUser, freedomPosts } = store;
                  const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : '');
                  const currentUsername = currentUser ? currentUser.username : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') || '' : '');
                  const targetPost = freedomPosts.find((p) => p.id === postId);

                  const allMyAliases = Array.from(new Set([
                    ...(myPseudonyms || []),
                    ...(currentUsername ? [currentUsername] : []),
                  ])).map((p) => p.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);

                  const matchesPseudonym = (alias?: string) => {
                    if (!alias) return false;
                    const clean = alias.replace(/^@/, '').trim().toLowerCase();
                    return allMyAliases.includes(clean);
                  };

                  const isMyNote =
                    (myPostIds || []).includes(postId) ||
                    (currentUserId && targetAuthorId && targetAuthorId === currentUserId) ||
                    (currentUserId && targetPost?.author_id && targetPost.author_id === currentUserId) ||
                    matchesPseudonym(targetAuthorAlias) ||
                    matchesPseudonym(targetPost?.author_alias);

                  if (isMyNote && likerId !== currentUserId) {
                    if (!myPostIds.includes(postId)) {
                      const updatedIds = [postId, ...myPostIds];
                      set({ myPostIds: updatedIds });
                      try { localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(updatedIds)); } catch (e) {}
                    }
                    const resolvedUsername = actorUsername || (actorAlias?.startsWith('@') ? actorAlias.slice(1) : actorAlias);
                    const resolvedAlias = resolvedUsername ? (resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`) : actorAlias;
                    get().addWallNotification({
                      post_id: postId,
                      type: 'like',
                      actor_alias: resolvedAlias,
                      actor_username: resolvedUsername,
                      actor_avatar: actorAvatar || getAvatarForPseudonym(resolvedUsername),
                      actor_department: actorDept,
                      message_snippet: messageSnippet || targetPost?.message?.slice(0, 60) || 'Someone reacted to your note',
                    });
                  }
                } else if (event.data?.type === 'FREEDOM_WALL_COMMENT') {
                  const { postId, actorAlias, actorDept, messageSnippet, commentText, commenterId, actorUsername, actorAvatar, targetAuthorId, targetAuthorAlias } = event.data;
                  const store = get();
                  const { myPostIds, myPseudonyms, currentUser, freedomPosts } = store;
                  const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : '');
                  const currentUsername = currentUser ? currentUser.username : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') || '' : '');
                  const targetPost = freedomPosts.find((p) => p.id === postId);

                  const allMyAliases = Array.from(new Set([
                    ...(myPseudonyms || []),
                    ...(currentUsername ? [currentUsername] : []),
                  ])).map((p) => p.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);

                  const matchesPseudonym = (alias?: string) => {
                    if (!alias) return false;
                    const clean = alias.replace(/^@/, '').trim().toLowerCase();
                    return allMyAliases.includes(clean);
                  };

                  const isMyNote =
                    (myPostIds || []).includes(postId) ||
                    (currentUserId && targetAuthorId && targetAuthorId === currentUserId) ||
                    (currentUserId && targetPost?.author_id && targetPost.author_id === currentUserId) ||
                    matchesPseudonym(targetAuthorAlias) ||
                    matchesPseudonym(targetPost?.author_alias);

                  if (isMyNote && commenterId !== currentUserId) {
                    if (!myPostIds.includes(postId)) {
                      const updatedIds = [postId, ...myPostIds];
                      set({ myPostIds: updatedIds });
                      try { localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(updatedIds)); } catch (e) {}
                    }
                    const resolvedUsername = actorUsername || (actorAlias?.startsWith('@') ? actorAlias.slice(1) : actorAlias);
                    const resolvedAlias = resolvedUsername ? (resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`) : actorAlias;
                    get().addWallNotification({
                      post_id: postId,
                      type: 'comment',
                      actor_alias: resolvedAlias,
                      actor_username: resolvedUsername,
                      actor_avatar: actorAvatar || getAvatarForPseudonym(resolvedUsername),
                      actor_department: actorDept,
                      message_snippet: messageSnippet || targetPost?.message?.slice(0, 60) || 'Someone commented on your note',
                      comment_text: commentText,
                    });
                  }
                } else if (event.data?.type === 'MY_PSEUDONYMS_UPDATE') {
                  const { pseudonyms } = event.data;
                  if (Array.isArray(pseudonyms)) {
                    const merged = Array.from(new Set([...(get().myPseudonyms || []), ...pseudonyms]));
                    set({ myPseudonyms: merged });
                    try { localStorage.setItem('capitalk_my_pseudonyms_v1', JSON.stringify(merged)); } catch (e) {}
                  }
                } else if (event.data?.type === 'FREEDOM_WALL_ADMIN_REMARK') {
                  const { postId, messageSnippet, adminRemark, reportedUsername, reporterUsername } = event.data;
                  const { myPostIds, currentUser } = get();
                  const myUsername = currentUser ? currentUser.username : '';
                  if (myPostIds.includes(postId) || myUsername === reportedUsername || myUsername === reporterUsername) {
                    get().addWallNotification({
                      post_id: postId,
                      type: 'admin_remark',
                      actor_alias: '👑 CapiTalk Admin',
                      message_snippet: messageSnippet,
                      admin_remark: adminRemark,
                    });
                  }
                } else if (event.data?.type === 'FRIEND_REQUEST_INCOMING' || event.data?.type === 'CONNECTION_ADDED_TWO_WAY') {
                  const { sender, targetUserId, targetUsername } = event.data;
                  onFriendRequestIncoming(sender, targetUserId, targetUsername);
                } else if (event.data?.type === 'FRIEND_REQUEST_ACCEPTED' || event.data?.type === 'CONNECTION_ACCEPTED_TWO_WAY') {
                  const { sender, targetUserId, targetUsername } = event.data;
                  onFriendRequestAccepted(sender, targetUserId, targetUsername);
                } else if (event.data?.type === 'FRIEND_REQUEST_DECLINED' || event.data?.type === 'CONNECTION_DECLINED_TWO_WAY') {
                  const { senderUsername, targetUserId, targetUsername } = event.data;
                  onFriendRequestDeclined(senderUsername, targetUserId, targetUsername);
                } else if (event.data?.type === 'FRIEND_REQUEST_CANCELLED' || event.data?.type === 'CONNECTION_CANCELLED_TWO_WAY') {
                  const { senderId, targetUserId } = event.data;
                  onFriendRequestCancelled(senderId, targetUserId);
                } else if (event.data?.type === 'CONNECTION_REMOVED_TWO_WAY') {
                  const { senderId, targetUserId } = event.data;
                  onTwoWayConnectionRemoved(senderId, targetUserId);
                } else if (event.data?.type === 'GLOBAL_DM_MESSAGE') {
                  const { message, recipientId, senderName } = event.data;
                  const store = get();
                  const myUserId = store.currentUser?.id;
                  if (myUserId && (recipientId === myUserId || message?.senderId === myUserId)) {
                    const pairKey = [message.senderId, recipientId].sort().join('__');
                    appendDirectMessageLocally(pairKey, message, myUserId);

                    if (recipientId === myUserId) {
                      set({ hasNewConnectionNotif: true });
                      try { localStorage.setItem('capitalk_has_new_conn_notif', 'true'); } catch (e) {}

                      try {
                        const audio = new Audio('/audio/sent_msg.webm');
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                      } catch (e) {}

                      if (store.viewState !== 'kept_connections') {
                        store.addWallNotification({
                          post_id: 'dm_' + Date.now(),
                          type: 'dm',
                          actor_alias: `@${senderName}`,
                          actor_username: senderName,
                          actor_avatar: getAvatarForPseudonym(senderName),
                          message_snippet: message.text || 'Sent you a direct message',
                        });
                        store.setActionToast({
                          type: 'info',
                          message: `💬 Message from @${senderName}: "${message.text ? (message.text.length > 25 ? message.text.slice(0, 25) + '...' : message.text) : 'Sent a message'}"`,
                        });
                      }
                    }
                  }
                } else if (event.data?.type === 'USER_PRESENCE_HEARTBEAT') {
                  const { userId, username, timestamp } = event.data;
                  if (userId || username) onPartnerPresenceHeartbeat(userId, username, timestamp);
                } else if (event.data?.type === 'USER_PRESENCE_QUERY') {
                  const { targetUserId, targetUsername } = event.data;
                  const store = get();
                  const myUser = store.currentUser;
                  const myIdClean = (myUser?.id || '').trim().toLowerCase();
                  const myNameClean = (myUser?.username || '').trim().toLowerCase().replace(/^@/, '');
                  const targetIdClean = (targetUserId || '').trim().toLowerCase();
                  const targetNameClean = (targetUsername || '').trim().toLowerCase().replace(/^@/, '');

                  const isForMe =
                    (targetIdClean && myIdClean && targetIdClean === myIdClean) ||
                    (targetNameClean && myNameClean && targetNameClean === myNameClean) ||
                    (targetIdClean && myNameClean && targetIdClean === myNameClean) ||
                    (targetNameClean && myIdClean && targetNameClean === myIdClean);

                  if (isForMe) {
                    store.sendGlobalPresenceHeartbeat();
                  }
                } else if (event.data?.type === 'USER_PRESENCE_LEAVE') {
                  const { userId } = event.data;
                  const store = get();
                  if (store.keptConnection?.user_id === userId) {
                    if (partnerPresenceWatchdog) clearTimeout(partnerPresenceWatchdog);
                    set({ isKeptPartnerOnline: false, keptPartnerLastSeen: Date.now() });
                  }
                }
              };
            }

            // Supabase Realtime Global Announcement Channel (for Vercel & cross-device real-time sync)
            if (supabase && isSupabaseConfigured) {
              try {
                const annChannel = supabase.channel('capitalk_global_announcements_v1', {
                  config: {
                    broadcast: { self: true },
                  },
                });
                activeSupabaseAnnChannel = annChannel;

                annChannel
                  .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'loudspeaker_bookings' },
                    (payload: any) => {
                      const newRow = payload?.new;
                      if (!newRow || newRow.id === 'ls_sample_1') return;

                      const formattedBooking: LoudspeakerBooking = {
                        id: newRow.id,
                        user_id: newRow.user_id || 'anon',
                        author_alias: newRow.author_alias || 'Anonymous Student',
                        department: newRow.department || 'College of Arts and Sciences',
                        message: newRow.message,
                        theme_color: newRow.theme_color || '#701a31',
                        song_title: newRow.song_title || undefined,
                        song_artist: newRow.song_artist || undefined,
                        scheduled_at: newRow.scheduled_at,
                        slot_label: newRow.slot_label || 'Broadcast Slot',
                        duration_seconds: newRow.duration_seconds || 30,
                        status: newRow.status || 'scheduled',
                        reaction_counts: newRow.reaction_counts || { fire: 0, heart: 0, clap: 0, horn: 0 },
                        created_at: newRow.created_at || new Date().toISOString(),
                      };

                      const currentBookings = (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1');
                      const existingIndex = currentBookings.findIndex((b) => b.id === formattedBooking.id);
                      let updatedBookings: LoudspeakerBooking[];
                      if (existingIndex >= 0) {
                        updatedBookings = currentBookings.map((b) => b.id === formattedBooking.id ? formattedBooking : b);
                      } else {
                        updatedBookings = [...currentBookings, formattedBooking];
                      }

                      const now = Date.now();
                      const schedTime = new Date(formattedBooking.scheduled_at).getTime();
                      const durMs = (formattedBooking.duration_seconds || 30) * 1000;
                      const isLiveNow = (formattedBooking.status === 'live' || (schedTime <= now && (schedTime + durMs) > now)) && formattedBooking.status !== 'cancelled';

                      set({
                        loudspeakerBookings: updatedBookings,
                        activeLoudspeaker: isLiveNow ? { ...formattedBooking, status: 'live' } : get().activeLoudspeaker,
                      });

                      if (isLiveNow && (!get().activeLoudspeaker || get().activeLoudspeaker?.id !== formattedBooking.id)) {
                        try { playLoudspeakerChime(); } catch (e) {}
                      }

                      try {
                        localStorage.setItem('capitalk_shared_loudspeaker_v1', JSON.stringify(updatedBookings));
                      } catch (e) {}
                    }
                  )
                  .on('broadcast', { event: 'announcement' }, (payload: any) => {
                    const announcement = payload?.payload;
                    if (announcement) {
                      set((state) => {
                        let updatedMessages = state.messages;
                        if (state.activeRoom) {
                          const annMsgId = 'msg_ann_' + announcement.id;
                          if (!updatedMessages.some((m) => m.id === annMsgId)) {
                            const annMsg: ChatMessage = {
                              id: annMsgId,
                              room_id: state.activeRoom.id,
                              sender_id: 'system_announcement',
                              sender_username: '📢 Campus Announcement',
                              message: announcement.message,
                              created_at: new Date().toISOString(),
                            };
                            updatedMessages = [...updatedMessages, annMsg];
                            try {
                              roomManager.injectSystemMessage(annMsg);
                            } catch (e) {}
                          }
                        }
                        return {
                          systemAnnouncement: announcement,
                          messages: updatedMessages,
                          actionToast: announcement ? { type: 'announcement', message: announcement.message } : null,
                        };
                      });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('capitalk_shared_announcement_v5', JSON.stringify(announcement));
                      }
                    }
                  })
                  .on('broadcast', { event: 'loudspeaker_live_start' }, ({ payload }: any) => {
                    const booking = payload;
                    if (booking) {
                      try { playLoudspeakerChime(); } catch (e) {}
                      set({ activeLoudspeaker: booking });
                    }
                  })
                  .on('broadcast', { event: 'loudspeaker_live_end' }, () => {
                    set({ activeLoudspeaker: null });
                  })
                  .on('broadcast', { event: 'loudspeaker_reaction' }, ({ payload }: any) => {
                    const validEmoji = payload?.emoji as 'fire' | 'heart' | 'clap' | 'horn';
                    if (validEmoji && ['fire', 'heart', 'clap', 'horn'].includes(validEmoji)) {
                      const burst = {
                        id: 'burst_' + Math.random().toString(36).substring(2, 9),
                        emoji: validEmoji,
                        timestamp: Date.now(),
                      };
                      const current = get().loudspeakerReactionBursts || [];
                      const active = get().activeLoudspeaker;
                      const updatedActive = active ? {
                        ...active,
                        reaction_counts: {
                          ...active.reaction_counts,
                          [validEmoji]: ((active.reaction_counts as any)[validEmoji] || 0) + 1,
                        },
                      } : null;
                      set({
                        activeLoudspeaker: updatedActive || active,
                        loudspeakerReactionBursts: [...current.slice(-20), burst],
                      });
                    }
                  })
                  .on('broadcast', { event: 'loudspeaker_book' }, ({ payload }: any) => {
                    if (payload) {
                      const current = (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1');
                      if (!current.some((b) => b.id === payload.id)) {
                        const updated = [...current, payload];
                        set({ loudspeakerBookings: updated });
                        try { localStorage.setItem('capitalk_shared_loudspeaker_v1', JSON.stringify(updated)); } catch (e) {}
                      }
                    }
                  })
                  .on('broadcast', { event: 'loudspeaker_cancel' }, ({ payload }: any) => {
                    if (payload?.bookingId) {
                      const current = (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1');
                      const updated = current.map((b) => b.id === payload.bookingId ? { ...b, status: 'cancelled' as const } : b);
                      set({ loudspeakerBookings: updated });
                      try { localStorage.setItem('capitalk_shared_loudspeaker_v1', JSON.stringify(updated)); } catch (e) {}
                    }
                  })
                  .on('broadcast', { event: 'friend_request_incoming' }, ({ payload }: any) => {
                    if (payload) {
                      const { sender, targetUserId, targetUsername } = payload;
                      onFriendRequestIncoming(sender, targetUserId, targetUsername);
                    }
                  })
                  .on('broadcast', { event: 'connection_added_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { sender, targetUserId, targetUsername } = payload;
                      onFriendRequestIncoming(sender, targetUserId, targetUsername);
                    }
                  })
                  .on('broadcast', { event: 'friend_request_accepted' }, ({ payload }: any) => {
                    if (payload) {
                      const { sender, targetUserId, targetUsername } = payload;
                      onFriendRequestAccepted(sender, targetUserId, targetUsername);
                    }
                  })
                  .on('broadcast', { event: 'connection_accepted_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { sender, targetUserId, targetUsername } = payload;
                      onFriendRequestAccepted(sender, targetUserId, targetUsername);
                    }
                  })
                  .on('broadcast', { event: 'friend_request_declined' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderUsername, targetUserId, targetUsername } = payload;
                      onFriendRequestDeclined(senderUsername, targetUserId, targetUsername);
                    }
                  })
                  .on('broadcast', { event: 'connection_declined_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderUsername, targetUserId, targetUsername } = payload;
                      onFriendRequestDeclined(senderUsername, targetUserId, targetUsername);
                    }
                  })
                  .on('broadcast', { event: 'friend_request_cancelled' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderId, targetUserId } = payload;
                      onFriendRequestCancelled(senderId, targetUserId);
                    }
                  })
                  .on('broadcast', { event: 'connection_cancelled_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderId, targetUserId } = payload;
                      onFriendRequestCancelled(senderId, targetUserId);
                    }
                  })
                  .on('broadcast', { event: 'connection_removed_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderId, targetUserId } = payload;
                      onTwoWayConnectionRemoved(senderId, targetUserId);
                    }
                  })
                  .on('broadcast', { event: 'connection_cancelled_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderId, targetUserId } = payload;
                      const store = get();
                      const myUserId = store.currentUser?.id;
                      if (myUserId && targetUserId === myUserId) {
                        const updatedPending = (store.pendingIncomingRequests || []).filter((r) => r.sender_id !== senderId);
                        set({ pendingIncomingRequests: updatedPending });
                        try { localStorage.setItem('capitalk_pending_incoming_v1', JSON.stringify(updatedPending)); } catch (e) {}
                      }
                    }
                  })
                  .on('broadcast', { event: 'connection_removed_two_way' }, ({ payload }: any) => {
                    if (payload) {
                      const { senderId, senderUsername, senderAvatar, senderDept, targetUserId } = payload;
                      const store = get();
                      const myUserId = store.currentUser?.id;
                      if (myUserId && targetUserId === myUserId) {
                        const currentKept = store.keptConnection;
                        const partnerName = senderUsername || (currentKept?.user_id === senderId ? currentKept?.username : '') || 'Your friend';
                        const partnerPic = senderAvatar || (currentKept?.user_id === senderId ? currentKept?.avatar_url : '') || getAvatarForPseudonym(partnerName);

                        if (currentKept?.user_id === senderId) {
                          set({ keptConnection: null, hasNewConnectionNotif: false });
                          try { localStorage.removeItem('capitalk_has_new_conn_notif'); } catch (e) {}
                        }

                        store.addWallNotification({
                          post_id: 'unfriend_' + Date.now(),
                          type: 'friend_remove',
                          actor_alias: `@${partnerName}`,
                          actor_username: partnerName,
                          actor_avatar: partnerPic,
                          actor_department: senderDept || currentKept?.department,
                          message_snippet: `@${partnerName} removed you from their friends list.`,
                        });

                        store.setActionToast({
                          type: 'info',
                          message: `💔 @${partnerName} unfriended you. Your 1 connection slot is now free.`,
                        });
                      }
                    }
                  })
                  .on('broadcast', { event: 'global_dm_message' }, ({ payload }: any) => {
                    if (payload) {
                      const { message, recipientId, senderName } = payload;
                      const store = get();
                      const myUserId = store.currentUser?.id;
                      if (myUserId && (recipientId === myUserId || message?.senderId === myUserId)) {
                        const pairKey = [message.senderId, recipientId].sort().join('__');
                        appendDirectMessageLocally(pairKey, message, myUserId);

                        if (recipientId === myUserId) {
                          set({ hasNewConnectionNotif: true });
                          try { localStorage.setItem('capitalk_has_new_conn_notif', 'true'); } catch (e) {}

                          try {
                            const audio = new Audio('/audio/sent_msg.webm');
                            audio.volume = 0.5;
                            audio.play().catch(() => {});
                          } catch (e) {}

                          if (store.viewState !== 'kept_connections') {
                            store.addWallNotification({
                              post_id: 'dm_' + Date.now(),
                              type: 'dm',
                              actor_alias: `@${senderName}`,
                              actor_username: senderName,
                              actor_avatar: getAvatarForPseudonym(senderName),
                              message_snippet: message.text || 'Sent you a direct message',
                            });
                            store.setActionToast({
                              type: 'info',
                              message: `💬 Message from @${senderName}: "${message.text ? (message.text.length > 25 ? message.text.slice(0, 25) + '...' : message.text) : 'Sent a message'}"`,
                            });
                          }
                        }
                      }
                    }
                  })
                  .on('broadcast', { event: 'user_presence_heartbeat' }, ({ payload }: any) => {
                    if (payload?.userId || payload?.username) {
                      onPartnerPresenceHeartbeat(payload.userId, payload.username, payload.timestamp);
                    }
                  })
                  .on('broadcast', { event: 'user_presence_query' }, ({ payload }: any) => {
                    const store = get();
                    const myUser = store.currentUser;
                    const myIdClean = (myUser?.id || '').trim().toLowerCase();
                    const myNameClean = (myUser?.username || '').trim().toLowerCase().replace(/^@/, '');
                    const targetIdClean = (payload?.targetUserId || '').trim().toLowerCase();
                    const targetNameClean = (payload?.targetUsername || '').trim().toLowerCase().replace(/^@/, '');

                    const isForMe =
                      (targetIdClean && myIdClean && targetIdClean === myIdClean) ||
                      (targetNameClean && myNameClean && targetNameClean === myNameClean) ||
                      (targetIdClean && myNameClean && targetIdClean === myNameClean) ||
                      (targetNameClean && myIdClean && targetNameClean === myIdClean);

                    if (isForMe) {
                      store.sendGlobalPresenceHeartbeat();
                    }
                  })
                  .on('broadcast', { event: 'user_presence_leave' }, ({ payload }: any) => {
                    const store = get();
                    if (store.keptConnection?.user_id === payload?.userId) {
                      if (partnerPresenceWatchdog) clearTimeout(partnerPresenceWatchdog);
                      set({ isKeptPartnerOnline: false, keptPartnerLastSeen: Date.now() });
                    }
                  })
                  .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                      activeSupabaseAnnChannel = annChannel;
                    }
                  });

                // ── Client-Side Realtime Loudspeaker Airtime Ticker (every 1s) ───────────────
                if (typeof window !== 'undefined') {
                  if ((window as any).__loudspeakerTicker) {
                    clearInterval((window as any).__loudspeakerTicker);
                  }
                  (window as any).__loudspeakerTicker = setInterval(() => {
                    const store = get();
                    const now = Date.now();
                    const currentActive = store.activeLoudspeaker;

                    // 1. Dismiss broadcast when 30-second duration expires
                    if (currentActive) {
                      const startTime = new Date(currentActive.scheduled_at).getTime();
                      const durMs = (currentActive.duration_seconds || 30) * 1000;
                      if (now >= startTime + durMs) {
                        set({ activeLoudspeaker: null });
                        try {
                          roomManager.sendLoudspeakerEvent('end', {});
                        } catch (e) {}
                      }
                    }

                    // 2. Automatically trigger live broadcast if any booking is due right now
                    if (!currentActive) {
                      const due = (store.loudspeakerBookings || []).find((b) => {
                        if (b.status === 'cancelled' || b.status === 'completed' || b.id === 'ls_sample_1') return false;
                        const schedTime = new Date(b.scheduled_at).getTime();
                        const durMs = (b.duration_seconds || 30) * 1000;
                        return (schedTime - 1000) <= now && (schedTime + durMs) > now;
                      });

                      if (due) {
                        try { playLoudspeakerChime(); } catch (e) {}
                        const liveBooking: LoudspeakerBooking = { ...due, status: 'live' };
                        set({ activeLoudspeaker: liveBooking });

                        // Broadcast across active room, other open tabs, and Supabase channel!
                        try {
                          roomManager.sendLoudspeakerEvent('start', { booking: liveBooking });
                        } catch (e) {}
                        if (broadcastChannel) {
                          try {
                            broadcastChannel.postMessage({
                              type: 'LOUDSPEAKER_LIVE_START',
                              booking: liveBooking,
                            });
                          } catch (e) {}
                        }
                        broadcastGlobalRealtime('loudspeaker_live_start', liveBooking);
                      }
                    }
                  }, 1000);
                }

                const wallChannel = supabase.channel('capitalk_global_wall_events');
                wallChannel
                  .on('broadcast', { event: 'FREEDOM_WALL_LIKE' }, (payload: any) => {
                    const { postId, actorAlias, actorDept, messageSnippet, likerId, actorUsername, actorAvatar, targetAuthorId, targetAuthorAlias } = payload?.payload || {};
                    const store = get();
                    const { myPostIds, myPseudonyms, currentUser, freedomPosts } = store;
                    const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : '');
                    const currentUsername = currentUser ? currentUser.username : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') || '' : '');
                    const targetPost = freedomPosts.find((p) => p.id === postId);

                    const allMyAliases = Array.from(new Set([
                      ...(myPseudonyms || []),
                      ...(currentUsername ? [currentUsername] : []),
                    ])).map((p) => p.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);

                    const matchesPseudonym = (alias?: string) => {
                      if (!alias) return false;
                      const clean = alias.replace(/^@/, '').trim().toLowerCase();
                      return allMyAliases.includes(clean);
                    };

                    const isMyNote =
                      (myPostIds || []).includes(postId) ||
                      (currentUserId && targetAuthorId && targetAuthorId === currentUserId) ||
                      (currentUserId && targetPost?.author_id && targetPost.author_id === currentUserId) ||
                      matchesPseudonym(targetAuthorAlias) ||
                      matchesPseudonym(targetPost?.author_alias);

                    if (isMyNote && likerId !== currentUserId) {
                      if (!myPostIds.includes(postId)) {
                        const updatedIds = [postId, ...myPostIds];
                        set({ myPostIds: updatedIds });
                        try { localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(updatedIds)); } catch (e) {}
                      }
                      const resolvedUsername = actorUsername || (actorAlias?.startsWith('@') ? actorAlias.slice(1) : actorAlias);
                      const resolvedAlias = resolvedUsername ? (resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`) : actorAlias;
                      get().addWallNotification({
                        post_id: postId,
                        type: 'like',
                        actor_alias: resolvedAlias,
                        actor_username: resolvedUsername,
                        actor_avatar: actorAvatar || getAvatarForPseudonym(resolvedUsername),
                        actor_department: actorDept,
                        message_snippet: messageSnippet || targetPost?.message?.slice(0, 60) || 'Someone reacted to your note',
                      });
                    }
                  })
                  .on('broadcast', { event: 'FREEDOM_WALL_COMMENT' }, (payload: any) => {
                    const { postId, actorAlias, actorDept, messageSnippet, commentText, commenterId, actorUsername, actorAvatar, targetAuthorId, targetAuthorAlias } = payload?.payload || {};
                    const store = get();
                    const { myPostIds, myPseudonyms, currentUser, freedomPosts } = store;
                    const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : '');
                    const currentUsername = currentUser ? currentUser.username : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') || '' : '');
                    const targetPost = freedomPosts.find((p) => p.id === postId);

                    const allMyAliases = Array.from(new Set([
                      ...(myPseudonyms || []),
                      ...(currentUsername ? [currentUsername] : []),
                    ])).map((p) => p.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);

                    const matchesPseudonym = (alias?: string) => {
                      if (!alias) return false;
                      const clean = alias.replace(/^@/, '').trim().toLowerCase();
                      return allMyAliases.includes(clean);
                    };

                    const isMyNote =
                      (myPostIds || []).includes(postId) ||
                      (currentUserId && targetAuthorId && targetAuthorId === currentUserId) ||
                      (currentUserId && targetPost?.author_id && targetPost.author_id === currentUserId) ||
                      matchesPseudonym(targetAuthorAlias) ||
                      matchesPseudonym(targetPost?.author_alias);

                    if (isMyNote && commenterId !== currentUserId) {
                      if (!myPostIds.includes(postId)) {
                        const updatedIds = [postId, ...myPostIds];
                        set({ myPostIds: updatedIds });
                        try { localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(updatedIds)); } catch (e) {}
                      }
                      const resolvedUsername = actorUsername || (actorAlias?.startsWith('@') ? actorAlias.slice(1) : actorAlias);
                      const resolvedAlias = resolvedUsername ? (resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`) : actorAlias;
                      get().addWallNotification({
                        post_id: postId,
                        type: 'comment',
                        actor_alias: resolvedAlias,
                        actor_username: resolvedUsername,
                        actor_avatar: actorAvatar || getAvatarForPseudonym(resolvedUsername),
                        actor_department: actorDept,
                        message_snippet: messageSnippet || targetPost?.message?.slice(0, 60) || 'Someone commented on your note',
                        comment_text: commentText,
                      });
                    }
                  })
                  .on('broadcast', { event: 'FREEDOM_WALL_ADMIN_REMARK' }, (payload: any) => {
                    const { postId, messageSnippet, adminRemark, reportedUsername, reporterUsername } = payload?.payload || {};
                    const { myPostIds, currentUser } = get();
                    const myUsername = currentUser ? currentUser.username : '';
                    if (myPostIds.includes(postId) || myUsername === reportedUsername || myUsername === reporterUsername) {
                      get().addWallNotification({
                        post_id: postId,
                        type: 'admin_remark',
                        actor_alias: '👑 CapiTalk Admin',
                        message_snippet: messageSnippet,
                        admin_remark: adminRemark,
                      });
                    }
                  })
                  .subscribe();

                const user = get().currentUser;
                const currentUserId = user ? user.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');
                const userNotifChannel = supabase.channel(`user:${currentUserId}:notifications`);
                userNotifChannel
                  .on('broadcast', { event: 'new_notification' }, (payload: any) => {
                    const notif = payload?.payload;
                    if (notif) {
                      const resolvedUsername = notif.actor_username || (notif.actor_alias?.startsWith('@') ? notif.actor_alias.slice(1) : notif.actor_alias);
                      const resolvedAlias = resolvedUsername ? (resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`) : notif.actor_alias;
                      get().addWallNotification({
                        post_id: notif.post_id,
                        type: notif.type,
                        actor_alias: resolvedAlias,
                        actor_username: resolvedUsername,
                        actor_avatar: notif.actor_avatar || getAvatarForPseudonym(resolvedUsername),
                        actor_department: notif.actor_department,
                        message_snippet: notif.message_snippet,
                        comment_text: notif.comment_text,
                        admin_remark: notif.admin_remark,
                      });
                    }
                  })
                  .subscribe();
              } catch (e) {}
            }

            // ─── Realtime Subscriptions (replaces polling loop) ────────────────
            // Row mapper: converts a raw DB row into a FreedomPost, merging local
            // optimistic state (liked_by_users) so UI stays consistent.
            if (supabase && isSupabaseConfigured) {
              try {
                // ── 1. Initial one-time load of freedom_posts ──────────────────
                supabase
                  .from('freedom_posts')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .then(({ data, error }) => {
                    if (data && data.length > 0 && !error) {
                      const store = get();
                      const localMap = new Map(store.freedomPosts.map((p) => [p.id, p]));
                      const dbIds = new Set(data.map((r: any) => r.id));
                      const localOnlyPosts = store.freedomPosts.filter((p) => !dbIds.has(p.id) && p.status === 'pending');
                      const loadedFromDb = data.map((row: any) => mapDbRowToPost(row, localMap.get(row.id)));
                      const finalPosts = [...localOnlyPosts, ...loadedFromDb].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      
                      const currentUserId = store.currentUser ? store.currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : '');
                      const currentUsername = store.currentUser ? store.currentUser.username : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_pseudonym') || '' : '');
                      const existingMyPostIds = store.myPostIds || [];
                      const existingMyPseudonyms = store.myPseudonyms || [];

                      // 1-to-Many Discovery: extract all pseudonyms authored by this persistent visitor UUID
                      const discoveredPseudonyms: string[] = [];
                      if (currentUsername) discoveredPseudonyms.push(currentUsername.replace(/^@/, '').trim());

                      finalPosts.forEach((p) => {
                        if (p.author_id && currentUserId && p.author_id === currentUserId) {
                          const clean = p.author_alias?.replace(/^@/, '').trim();
                          if (clean && clean.toLowerCase() !== 'anon' && clean.toLowerCase() !== 'anon student') {
                            discoveredPseudonyms.push(clean);
                          }
                        }
                      });

                      const mergedPseudonyms = Array.from(new Set([...existingMyPseudonyms, ...discoveredPseudonyms])).filter(Boolean);
                      const allCleanAliases = mergedPseudonyms.map((p) => p.toLowerCase());

                      // Link all notes matching any pseudonym in this UUID's 1-to-many pool
                      const myIdsFromAll = finalPosts.filter((p) => {
                        if (existingMyPostIds.includes(p.id)) return true;
                        if (p.author_id && currentUserId && p.author_id === currentUserId) return true;
                        const cleanAlias = p.author_alias?.replace(/^@/, '').trim().toLowerCase();
                        if (cleanAlias && allCleanAliases.includes(cleanAlias)) return true;
                        return false;
                      }).map((p) => p.id);

                      const mergedMyPostIds = Array.from(new Set([...existingMyPostIds, ...myIdsFromAll]));

                      set({ freedomPosts: finalPosts, myPostIds: mergedMyPostIds, myPseudonyms: mergedPseudonyms });
                      try {
                        localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(finalPosts));
                        localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(mergedMyPostIds));
                        localStorage.setItem('capitalk_my_pseudonyms_v1', JSON.stringify(mergedPseudonyms));
                      } catch (e) {}
                    }
                  }, () => {});

                // ── 2. Realtime subscription: freedom_posts INSERT/UPDATE/DELETE ─
                supabase
                  .channel('public:freedom_posts:changes')
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'freedom_posts' }, (payload: any) => {
                    const newRow = payload.new;
                    if (!newRow) return;
                    set((state) => {
                      // Skip if we already have it (optimistic insert from addFreedomPost)
                      if (state.freedomPosts.some((p) => p.id === newRow.id)) return state;
                      const newPost = mapDbRowToPost(newRow);
                      const updated = [newPost, ...state.freedomPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                      try { localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated)); } catch (e) {}
                      return { freedomPosts: updated };
                    });
                  })
                  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'freedom_posts' }, (payload: any) => {
                    const updatedRow = payload.new;
                    if (!updatedRow) return;
                    set((state) => {
                      const localPost = state.freedomPosts.find((p) => p.id === updatedRow.id);
                      const merged = mapDbRowToPost(updatedRow, localPost);
                      const updated = state.freedomPosts.map((p) => p.id === updatedRow.id ? merged : p);
                      try { localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated)); } catch (e) {}
                      if (broadcastChannel) {
                        try { broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated }); } catch (e) {}
                      }
                      return { freedomPosts: updated };
                    });
                  })
                  .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'freedom_posts' }, (payload: any) => {
                    const deletedId = payload.old?.id;
                    if (!deletedId) return;
                    set((state) => {
                      const updated = state.freedomPosts.filter((p) => p.id !== deletedId);
                      try { localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated)); } catch (e) {}
                      return { freedomPosts: updated };
                    });
                  })
                  .subscribe();

                // ── 3. Initial one-time load of reports ────────────────────────
                supabase
                  .from('reports')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .then(({ data }) => {
                    if (data && data.length > 0) {
                      const dbReports: UserReport[] = data.map((r: any) => ({
                        id: r.id,
                        reporter_id: r.reporter_id || 'anon',
                        reporter_username: r.reporter_username || 'Student',
                        reported_user_id: r.reported_user_id,
                        reported_username: r.reported_username || 'User',
                        reason: r.reason,
                        description: r.description,
                        status: r.status || 'pending',
                        created_at: r.created_at,
                      }));
                      set({ reports: dbReports });
                      try { localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(dbReports)); } catch (e) {}
                    }
                  }, () => {});

                // ── 4. Realtime subscription: reports INSERT/UPDATE ────────────
                supabase
                  .channel('public:reports:changes')
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload: any) => {
                    const newRow = payload.new;
                    if (!newRow) return;
                    set((state) => {
                      if (state.reports.some((r) => r.id === newRow.id)) return state;
                      const newReport: UserReport = {
                        id: newRow.id,
                        reporter_id: newRow.reporter_id || 'anon',
                        reporter_username: newRow.reporter_username || 'Student',
                        reported_user_id: newRow.reported_user_id,
                        reported_username: newRow.reported_username || 'User',
                        reason: newRow.reason,
                        description: newRow.description,
                        status: newRow.status || 'pending',
                        created_at: newRow.created_at,
                      };
                      const updated = [newReport, ...state.reports];
                      try { localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updated)); } catch (e) {}
                      return { reports: updated };
                    });
                  })
                  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload: any) => {
                    const updatedRow = payload.new;
                    if (!updatedRow) return;
                    set((state) => {
                      const updated = state.reports.map((r) =>
                        r.id === updatedRow.id
                          ? { ...r, status: updatedRow.status || r.status, admin_remark: updatedRow.admin_remark }
                          : r
                      );
                      try { localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updated)); } catch (e) {}
                      return { reports: updated };
                    });
                  })
                  .subscribe();

                // ── 5. Initial one-time load of feedback (admin-only, no realtime needed) ─
                supabase
                  .from('feedback')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .then(({ data }) => {
                    if (data && data.length > 0) {
                      const dbFeedback: UserFeedback[] = data.map((f: any) => ({
                        id: f.id,
                        user_id: f.user_id,
                        username: f.username,
                        category: f.category,
                        rating: f.rating,
                        message: f.message,
                        created_at: f.created_at,
                      }));
                      set({ feedbackList: dbFeedback });
                      try { localStorage.setItem('capitalk_feedback_v1', JSON.stringify(dbFeedback)); } catch (e) {}
                    }
                  }, () => {});

              } catch (e) {}
            } else {
              // No Supabase: fall back to localStorage
              try {
                const rawFreedom = localStorage.getItem('capitalk_freedom_wall_v1');
                if (rawFreedom) set({ freedomPosts: JSON.parse(rawFreedom) });
                const rawReports = localStorage.getItem('capitalk_shared_reports_v5');
                if (rawReports) set({ reports: JSON.parse(rawReports) });
                const rawBans = localStorage.getItem('capitalk_shared_bans_v5');
                if (rawBans) set({ bannedUserIds: JSON.parse(rawBans) });
              } catch (e) {}
            }

            // ── 6. Lightweight 60-second fallback (catches any missed Realtime events) ─
            // Fetches only essential columns, capped at 200 rows — ~95% less data than the old poll.
            if (globalPollInterval) clearInterval(globalPollInterval);
            globalPollInterval = setInterval(() => {
              if (!supabase || !isSupabaseConfigured) return;
              try {
                supabase
                  .from('freedom_posts')
                  .select('id,color,status,likes_count,liked_by_users,liked_by_profiles,is_pinned,created_at')
                  .order('created_at', { ascending: false })
                  .limit(200)
                  .then(({ data, error }) => {
                    if (!data || error) return;
                    set((state) => {
                      const localMap = new Map(state.freedomPosts.map((p) => [p.id, p]));
                      let changed = false;
                      const updated = state.freedomPosts.map((post) => {
                        const row = data.find((r: any) => r.id === post.id);
                        if (!row) return post;
                        const rawColor = row.color || '#ffc900';
                        const parts = rawColor.split('||');
                        const dbStatus = parts[1] || row.status || post.status;
                        const dbLikedBy: string[] = Array.isArray(row.liked_by_users) ? row.liked_by_users : [];
                        const useLikedBy = dbLikedBy.length >= (post.liked_by_users?.length || 0) ? dbLikedBy : post.liked_by_users;
                        if (post.status !== dbStatus || post.likes_count !== useLikedBy.length || !!post.is_pinned !== !!row.is_pinned) {
                          changed = true;
                          return { ...post, status: dbStatus as any, likes_count: useLikedBy.length, liked_by_users: useLikedBy, is_pinned: !!row.is_pinned };
                        }
                        return post;
                      });
                      if (!changed) return state;
                      try { localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated)); } catch (e) {}
                      return { freedomPosts: updated };
                    });
                  }, () => {});
              } catch (e) {}
            }, 60000);
          } catch (e) {}
        }

        // Auto-connect WebSocket on session initialization
        try {
          matchmakingEngine.connect();
        } catch (e) {}

        if (activeRoom && currentUser) {
          const partner = activeRoom.user_two;
          roomManager.setPartnerId(partner.id);
          // Reconnect room listeners on page reload
          roomManager.joinRoom(
            activeRoom.id,
            currentUser,
            (incomingMsg) => {
              set((state) => {
                if (incomingMsg.reaction_update) {
                  if (currentUser && incomingMsg.sender_id === currentUser.id) return state;

                  if (typeof window !== 'undefined') {
                    try {
                      const audio = new Audio('/audio/sent_msg.webm');
                      audio.volume = 0.5;
                      audio.play().catch(() => {});
                    } catch (e) {}
                  }

                  const { message_id, emoji_key } = incomingMsg.reaction_update;
                  const updatedMessages = state.messages.map((m) => {
                    if (m.id !== message_id) return m;
                    const rxns = { ...(m.reactions || {}) };
                    const userList = rxns[emoji_key] || [];
                    const has = userList.includes(incomingMsg.sender_id);
                    const newList = has
                      ? userList.filter((id) => id !== incomingMsg.sender_id)
                      : [...userList, incomingMsg.sender_id];
                    if (newList.length > 0) rxns[emoji_key] = newList;
                    else delete rxns[emoji_key];
                    return { ...m, reactions: rxns };
                  });
                  return { messages: updatedMessages };
                }
                if (state.messages.some((m) => m.id === incomingMsg.id)) return state;
                return { messages: [...state.messages, incomingMsg] };
              });
            },
            (isTyping) => {
              set({ partnerTyping: isTyping });
            },
            (reason?: string) => {
              set((state) => {
                if (state.partnerLeft) return state;
                const isInactive = reason === 'inactivity';
                const isDisconnected = reason === 'disconnected';
                const isExited = reason === 'exited';
                const isSkipped = reason === 'skipped';

                let msgText = 'Your partner has left the conversation.';
                let leftReason: 'inactivity' | 'left' | 'disconnected' | 'exited' | 'skipped' = 'left';

                if (isInactive) {
                  msgText = '⏱️ Your partner has been disconnected due to inactivity.';
                  leftReason = 'inactivity';
                } else if (isDisconnected) {
                  msgText = '🔌 Connection lost: Your partner has disconnected.';
                  leftReason = 'disconnected';
                } else if (isExited) {
                  msgText = '🚪 Your partner has exited the chat.';
                  leftReason = 'exited';
                } else if (isSkipped) {
                  msgText = '⏭️ Your partner skipped to another chat.';
                  leftReason = 'skipped';
                }

                const leaveMsg: ChatMessage = {
                  id: 'msg_leave_' + Date.now(),
                  room_id: activeRoom.id,
                  sender_id: 'system',
                  sender_username: 'CapiTalk System',
                  message: msgText,
                  created_at: new Date().toISOString(),
                };
                return { messages: [...state.messages, leaveMsg], partnerLeft: true, partnerLeftReason: leftReason };
              });
            },
            null // no existing WS after reload
          );
        } else if (isSearching && currentUser) {
          // Auto-resume searching if page reloaded while searching
          get().startSearch();
        }
      },

      registerUser: (username: string, department: DepartmentType, avatarUrl?: string, bio?: string) => {
        const persistentId = getOrCreatePersistentUUID();
        const trimmedUsername = username.trim().slice(0, 12);
        const newUser: UserProfile = {
          id: persistentId,
          username: trimmedUsername,
          department,
          avatar_url: avatarUrl || getAvatarForPseudonym(trimmedUsername),
          bio: bio?.trim() || '',
          status: 'online',
          created_at: new Date().toISOString(),
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_current_user_profile_v1', JSON.stringify(newUser));
            localStorage.setItem('capitalk_user_pseudonym', trimmedUsername);
            localStorage.setItem('capitalk_user_id', persistentId);
            localStorage.setItem('capitalk_anon_user_id', persistentId);
            const raw = localStorage.getItem('capitalk_taken_usernames_v1');
            const takenMap: Record<string, string> = raw ? JSON.parse(raw) : {};
            takenMap[trimmedUsername.toLowerCase()] = persistentId;
            localStorage.setItem('capitalk_taken_usernames_v1', JSON.stringify(takenMap));
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('users')
              .upsert(
                {
                  id: persistentId,
                  username: trimmedUsername,
                  department,
                  avatar_url: newUser.avatar_url,
                  bio: newUser.bio,
                  status: 'online',
                },
                { onConflict: 'id' }
              )
              .then(() => {}, () => {});
          } catch (e) {}
        }

        const freedomPosts = get().freedomPosts || [];
        const existingMyIds = get().myPostIds || [];
        const myIdsFromAll = freedomPosts.filter((p) => {
          if (existingMyIds.includes(p.id)) return true;
          if (p.author_id && p.author_id === persistentId) return true;
          const cleanAlias = p.author_alias?.replace(/^@/, '').trim().toLowerCase();
          const cleanUser = trimmedUsername.toLowerCase();
          return cleanAlias && cleanUser && cleanAlias === cleanUser;
        }).map((p) => p.id);

        const mergedIds = Array.from(new Set([...existingMyIds, ...myIdsFromAll]));
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(mergedIds)); } catch (e) {}
        }

        set({ currentUser: newUser, myPostIds: mergedIds, viewState: 'queue' });
      },

      startSearch: () => {
        const { currentUser, queueFilter, bannedUserIds } = get();
        if (!currentUser) {
          set({ viewState: 'register' });
          return;
        }

        if (bannedUserIds.includes(currentUser.id)) {
          set({
            actionToast: {
              type: 'error',
              message: '⛔ Account Suspended: Your access has been restricted by platform moderators.',
            },
            viewState: 'queue',
          });
          return;
        }

        purgeLegacyAdminKeys();
        const isAdmin = Boolean(
          Boolean(getAdminToken()) ||
          currentUser.is_admin === true
        );

        const sanitizedUser: UserProfile = {
          ...currentUser,
          is_admin: isAdmin,
        };

        if (isAdmin && !currentUser.is_admin) {
          set({ currentUser: sanitizedUser });
        }

        roomManager.leaveRoom();

        set({
          isSearching: true,
          searchingTimeSeconds: 0,
          viewState: 'queue',
          activeRoom: null,
          messages: [],
          partnerLeft: false,
        });

        if (searchTimer) clearInterval(searchTimer);

        let elapsed = 0;
        searchTimer = setInterval(() => {
          elapsed += 1;
          set({
            searchingTimeSeconds: elapsed,
            waitingCount: matchmakingEngine.getWaitingCount(),
          });

          if (elapsed >= 35) {
            if (searchTimer) clearInterval(searchTimer);
            get().cancelSearch();
            set({ showQueueTimeoutModal: true });
          }
        }, 1000);

        if (unsubscribeMatch) unsubscribeMatch();

        unsubscribeMatch = matchmakingEngine.onMatchFound((match) => {
          if (searchTimer) clearInterval(searchTimer);

          const myProfile = match.userOne.id === sanitizedUser.id ? match.userOne : match.userTwo;
          const partner = match.userOne.id === sanitizedUser.id ? match.userTwo : match.userOne;

          const newRoom: ChatRoom = {
            id: match.roomId,
            user_one: myProfile,
            user_two: partner,
            started_at: new Date().toISOString(),
            status: 'active',
          };

          const welcomeMsg: ChatMessage = {
            id: 'msg_welcome_' + Date.now(),
            room_id: newRoom.id,
            sender_id: 'system',
            sender_username: 'CapiTalk System',
            message: `You are now connected to ${partner.username} from ${partner.department}`,
            created_at: new Date().toISOString(),
          };

          if (typeof window !== 'undefined') {
            try {
              const audio = new Audio('/audio/sent_msg.webm');
              audio.volume = 0.4;
              audio.play().catch(() => {});
            } catch (e) {}
          }

          set({
            isSearching: false,
            searchingTimeSeconds: 0,
            activeRoom: newRoom,
            messages: [welcomeMsg],
            isMatchTransitioning: true,
            viewState: 'chat',
            bayotCount: 0,
          });

          roomManager.setPartnerId(partner.id);
          roomManager.joinRoom(
            match.roomId,
            currentUser,
            (incomingMsg) => {
              set((state) => {
                if (incomingMsg.reaction_update) {
                  if (currentUser && incomingMsg.sender_id === currentUser.id) return state;

                  if (typeof window !== 'undefined') {
                    try {
                      const audio = new Audio('/audio/sent_msg.webm');
                      audio.volume = 0.5;
                      audio.play().catch(() => {});
                    } catch (e) {}
                  }

                  const { message_id, emoji_key } = incomingMsg.reaction_update;
                  const updatedMessages = state.messages.map((m) => {
                    if (m.id !== message_id) return m;
                    const rxns = { ...(m.reactions || {}) };
                    const userList = rxns[emoji_key] || [];
                    const has = userList.includes(incomingMsg.sender_id);
                    const newList = has
                      ? userList.filter((id) => id !== incomingMsg.sender_id)
                      : [...userList, incomingMsg.sender_id];
                    if (newList.length > 0) rxns[emoji_key] = newList;
                    else delete rxns[emoji_key];
                    return { ...m, reactions: rxns };
                  });
                  return { messages: updatedMessages };
                }
                if (state.messages.some((m) => m.id === incomingMsg.id)) return state;
                return { messages: [...state.messages, incomingMsg] };
              });
            },
            (isTyping) => {
              set({ partnerTyping: isTyping });
            },
            (reason?: string) => {
              if (typeof window !== 'undefined') {
                try {
                  const audio = new Audio('/audio/skip_sfx.mp3');
                  audio.volume = 0.6;
                  audio.play().catch(() => {});
                } catch (e) {}
              }
              set((state) => {
                if (state.partnerLeft) return state;
                const isInactive = reason === 'inactivity';
                const isDisconnected = reason === 'disconnected';
                const isExited = reason === 'exited';
                const isSkipped = reason === 'skipped';

                let msgText = 'Your partner has left the conversation.';
                let leftReason: 'inactivity' | 'left' | 'disconnected' | 'exited' | 'skipped' = 'left';

                if (isInactive) {
                  msgText = 'Your partner has been disconnected due to inactivity.';
                  leftReason = 'inactivity';
                } else if (isDisconnected) {
                  msgText = 'Connection lost: Your partner has disconnected.';
                  leftReason = 'disconnected';
                } else if (isExited) {
                  msgText = 'Your partner has exited the chat.';
                  leftReason = 'exited';
                } else if (isSkipped) {
                  msgText = 'Your partner skipped to another chat.';
                  leftReason = 'skipped';
                }

                const leaveMsg: ChatMessage = {
                  id: 'msg_leave_' + Date.now(),
                  room_id: match.roomId,
                  sender_id: 'system',
                  sender_username: 'CapiTalk System',
                  message: msgText,
                  created_at: new Date().toISOString(),
                };
                return { messages: [...state.messages, leaveMsg], partnerLeft: true, partnerLeftReason: leftReason };
              });
            },
            matchmakingEngine.getWebSocket() // reuse the matchmaking WS connection
          );
        });

        matchmakingEngine.joinQueue(currentUser, queueFilter);
      },

      cancelSearch: () => {
        const { currentUser } = get();
        if (searchTimer) clearInterval(searchTimer);
        if (currentUser) matchmakingEngine.leaveQueue(currentUser.id);
        set({ isSearching: false, searchingTimeSeconds: 0, viewState: 'queue' });
      },

      sendMessage: (text?: string, imageUrl?: string, replyTo?: ChatMessage['reply_to'], gameData?: ChatMessage['game_data']) => {
        const { activeRoom, currentUser, messages, profanityStrikes, bannedUserIds, bayotCount } = get();
        if (!activeRoom || !currentUser) return;

        let newBayotCount = bayotCount;
        if (text && text.toLowerCase().includes('bayot')) {
          newBayotCount = bayotCount + 1;
          set({ bayotCount: newBayotCount });
        }

        // Check for profanity in text with repetition count
        const { isProfane, word } = checkProfanity(text || '', newBayotCount);
        let newStrikes = profanityStrikes;
        let isProfaneMsg = false;

        if (isProfane && text) {
          newStrikes = profanityStrikes + 1;
          isProfaneMsg = true;
          set({ profanityStrikes: newStrikes });
        }

        const newMsg: ChatMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 9),
          room_id: activeRoom.id,
          sender_id: currentUser.id,
          sender_username: currentUser.username,
          message: text,
          image_url: imageUrl,
          reply_to: replyTo,
          game_data: gameData,
          is_profane: isProfaneMsg,
          strike_count: isProfaneMsg ? newStrikes : undefined,
          created_at: new Date().toISOString(),
        };

        let updatedMessages = [...messages, newMsg];

        if (isProfaneMsg) {
          if (newStrikes < 3) {
            const warningMsg: ChatMessage = {
              id: 'msg_warn_' + Date.now(),
              room_id: activeRoom.id,
              sender_id: 'system',
              sender_username: 'CapiTalk Moderation',
              message: `⚠️ Profanity Warning (Strike ${newStrikes}/3): Inappropriate language detected ("${word}"). Sending profane language 3 times will result in an automatic account ban.`,
              created_at: new Date().toISOString(),
            };
            updatedMessages = [...updatedMessages, warningMsg];

            set({
              messages: updatedMessages,
              actionToast: {
                type: 'error',
                message: `⚠️ Profanity Warning (Strike ${newStrikes}/3)! 3 strikes will ban your account.`,
              },
            });
          } else {
            // 3 Strikes -> AUTO BAN USER
            const banMsg: ChatMessage = {
              id: 'msg_ban_' + Date.now(),
              room_id: activeRoom.id,
              sender_id: 'system',
              sender_username: 'CapiTalk Moderation',
              message: `⛔ Account Suspended: You have been automatically banned from CapiTalk for repeated profanity violations (3/3 strikes).`,
              created_at: new Date().toISOString(),
            };
            updatedMessages = [...updatedMessages, banMsg];

            const updatedBans = [...new Set([...bannedUserIds, currentUser.id])];
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(updatedBans));
              } catch (e) {}
            }

            set({
              messages: updatedMessages,
              bannedUserIds: updatedBans,
              actionToast: {
                type: 'ban',
                message: '⛔ Account Banned: You have been suspended for repeated profanity violations (3/3 strikes).',
              },
            });

            setTimeout(() => {
              get().leaveRoom();
            }, 2500);
          }
        } else {
          set({ messages: updatedMessages });
        }

        roomManager.sendMessage(newMsg);

        if (typeof window !== 'undefined') {
          try {
            const audio = new Audio('/audio/sent_msg.webm');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}
        }

        // If matched with a Bot partner, simulate realistic text response
        const partner = activeRoom.user_two.id === currentUser.id ? activeRoom.user_one : activeRoom.user_two;
        if (partner.id.startsWith('bot_')) {
          setTimeout(() => {
            set({ partnerTyping: true });
          }, 600);

          setTimeout(() => {
            set({ partnerTyping: false });
            const randomReply = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)];
            const botMsg: ChatMessage = {
              id: 'msg_bot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
              room_id: activeRoom.id,
              sender_id: partner.id,
              sender_username: partner.username,
              message: randomReply,
              created_at: new Date().toISOString(),
            };
            set((state) => ({
              messages: [...state.messages, botMsg],
            }));
            roomManager.persistMessage(botMsg);
          }, 1800);
        }
      },

      updateGameInviteStatus: (sessionId: string, status: 'accepted' | 'declined' | 'completed') => {
        const { messages, activeRoom } = get();
        if (!activeRoom) return;

        const updatedMessages = messages.map((msg) => {
          if (msg.game_data && msg.game_data.session_id === sessionId) {
            return {
              ...msg,
              game_data: {
                ...msg.game_data,
                status,
              },
            };
          }
          return msg;
        });

        set({ messages: updatedMessages });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_msgs_v4_' + activeRoom.id, JSON.stringify(updatedMessages));
          } catch (e) {}
        }
      },

      toggleReaction: (messageId: string, emojiKey: string) => {
        const { messages, currentUser, activeRoom } = get();
        if (!currentUser || !activeRoom) return;

        if (typeof window !== 'undefined') {
          try {
            const audio = new Audio('/audio/sent_msg.webm');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch (e) {}
        }

        const updatedMessages = messages.map((msg) => {
          if (msg.id !== messageId) return msg;

          const currentReactions = msg.reactions || {};
          const userList = currentReactions[emojiKey] || [];
          const hasReacted = userList.includes(currentUser.id);

          let updatedUserList: string[];
          if (hasReacted) {
            updatedUserList = userList.filter((id) => id !== currentUser.id);
          } else {
            updatedUserList = [...userList, currentUser.id];
          }

          const newReactions = { ...currentReactions };
          if (updatedUserList.length > 0) {
            newReactions[emojiKey] = updatedUserList;
          } else {
            delete newReactions[emojiKey];
          }

          return { ...msg, reactions: newReactions };
        });

        set({ messages: updatedMessages });

        roomManager.sendMessage({
          id: 'rxn_' + Date.now(),
          room_id: activeRoom.id,
          sender_id: currentUser.id,
          sender_username: currentUser.username,
          created_at: new Date().toISOString(),
          reaction_update: {
            message_id: messageId,
            emoji_key: emojiKey,
          },
        } as any);
      },

      sendTypingSignal: (isTyping: boolean) => {
        roomManager.sendTypingSignal(isTyping);
      },

      nextMatch: () => {
        const { activeRoom } = get();
        if (typeof window !== 'undefined') {
          try {
            const audio = new Audio('/audio/skip_sfx.mp3');
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch (e) {}
        }
        if (activeRoom) {
          roomManager.sendSkipSignal('skipped');
          roomManager.leaveRoom();
        }
        set({ partnerLeft: false, partnerLeftReason: null });
        get().startSearch();
      },

      leaveRoom: () => {
        const { currentUser, activeRoom } = get();
        if (typeof window !== 'undefined') {
          try {
            const audio = new Audio('/audio/skip_sfx.mp3');
            audio.volume = 0.6;
            audio.play().catch(() => {});
          } catch (e) {}
        }
        if (activeRoom) {
          roomManager.sendSkipSignal('exited');
          roomManager.leaveRoom();
        }
        if (currentUser) matchmakingEngine.leaveQueue(currentUser.id);
        set({ activeRoom: null, messages: [], viewState: 'queue', partnerLeft: false, partnerLeftReason: null, bayotCount: 0 });
      },

      reportPartner: (reason: string, description: string) => {
        const { activeRoom, currentUser, reports, blockedUserIds } = get();
        if (!activeRoom || !currentUser) return;

        const partner = activeRoom.user_two.id === currentUser.id ? activeRoom.user_one : activeRoom.user_two;

        const newReport: UserReport = {
          id: 'rep_' + Math.random().toString(36).substring(2, 9),
          reporter_id: currentUser.id,
          reporter_username: currentUser.username,
          reported_user_id: partner.id,
          reported_username: partner.username,
          reason,
          description,
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        const updatedReports = [newReport, ...reports];
        const updatedBlocked = [...new Set([...blockedUserIds, partner.id])];
        const newBlockedInfo: BlockedUserInfo = {
          id: partner.id,
          username: partner.username,
          department: partner.department,
          avatar_url: partner.avatar_url,
          blocked_at: new Date().toISOString(),
        };
        const updatedBlockedUsers = [
          newBlockedInfo,
          ...(get().blockedUsers || []).filter((u) => u.id !== partner.id),
        ];

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updatedReports));
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('reports')
              .insert({
                id: newReport.id,
                reporter_id: newReport.reporter_id,
                reporter_username: newReport.reporter_username,
                reported_user_id: newReport.reported_user_id,
                reported_username: newReport.reported_username,
                reason: newReport.reason,
                description: newReport.description,
                status: 'pending',
                created_at: newReport.created_at,
              })
              .then(() => {}, () => {});
          } catch (e) {}
        }

        // Send real-time WS report broadcast if connection available
        try {
          const ws = matchmakingEngine.getWebSocket();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'REPORT_SUBMITTED', report: newReport }));
          }
        } catch (e) {}

        set({
          reports: updatedReports,
          blockedUserIds: updatedBlocked,
          blockedUsers: updatedBlockedUsers,
          actionToast: {
            type: 'report',
            message: `⚠️ Report submitted for ${partner.username}. Thank you for keeping CapiTalk safe.`,
          },
        });
        get().nextMatch();
      },

      blockPartner: () => {
        const { activeRoom, currentUser, blockedUserIds, blockedUsers } = get();
        if (!activeRoom || !currentUser) return;

        const partner = activeRoom.user_two.id === currentUser.id ? activeRoom.user_one : activeRoom.user_two;
        const updatedBlocked = [...new Set([...blockedUserIds, partner.id])];
        const newBlockedInfo: BlockedUserInfo = {
          id: partner.id,
          username: partner.username,
          department: partner.department,
          avatar_url: partner.avatar_url,
          blocked_at: new Date().toISOString(),
        };
        const updatedBlockedUsers = [
          newBlockedInfo,
          ...(blockedUsers || []).filter((u) => u.id !== partner.id),
        ];

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('blocks')
              .upsert(
                { blocker_id: currentUser.id, blocked_id: partner.id },
                { onConflict: 'blocker_id,blocked_id' }
              )
              .then(({ error }) => {
                if (error && !error.message?.includes('duplicate key')) {
                  console.error('[Supabase Block Error]', error.message);
                }
              }, () => {});
          } catch (e) {}
        }

        set({
          blockedUserIds: updatedBlocked,
          blockedUsers: updatedBlockedUsers,
          actionToast: {
            type: 'block',
            message: `🚫 ${partner.username} blocked. You will no longer be paired with them.`,
          },
        });
        get().nextMatch();
      },

      unblockUser: (userId: string) => {
        const { currentUser, blockedUserIds, blockedUsers } = get();
        const unblockedUser = (blockedUsers || []).find((u) => u.id === userId);
        const name = unblockedUser ? unblockedUser.username : 'Student';

        const updatedBlockedIds = (blockedUserIds || []).filter((id) => id !== userId);
        const updatedBlockedUsers = (blockedUsers || []).filter((u) => u.id !== userId);

        if (supabase && isSupabaseConfigured && currentUser) {
          try {
            supabase
              .from('blocks')
              .delete()
              .or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${currentUser.id})`)
              .then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          blockedUserIds: updatedBlockedIds,
          blockedUsers: updatedBlockedUsers,
          actionToast: {
            type: 'info',
            message: `✅ ${name} unblocked. You can now match with them again.`,
          },
        });
      },

      unblockAllUsers: () => {
        const { currentUser } = get();
        if (supabase && isSupabaseConfigured && currentUser) {
          try {
            supabase
              .from('blocks')
              .delete()
              .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)
              .then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          blockedUserIds: [],
          blockedUsers: [],
          actionToast: {
            type: 'info',
            message: `✅ All blocked users have been unblocked.`,
          },
        });
      },

      triggerBotMatch: () => {
        const { currentUser, queueFilter } = get();
        if (!currentUser) return;
        matchmakingEngine.triggerManualBotMatch(currentUser, queueFilter);
      },

      reportFreedomPost: (postId: string, postAuthorAlias: string, postMessage: string, reason: string, description: string) => {
        const { currentUser, reports } = get();
        const reporterId = currentUser ? currentUser.id : 'guest_' + Date.now();
        const reporterUsername = currentUser ? currentUser.username : 'Anonymous Student';

        const newReport: UserReport = {
          id: 'rep_post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          reporter_id: reporterId,
          reporter_username: reporterUsername,
          reported_user_id: 'wall_author_' + postId,
          reported_username: postAuthorAlias || 'Anon Student',
          reason,
          description,
          status: 'pending',
          target_type: 'freedom_post',
          post_id: postId,
          post_author_alias: postAuthorAlias,
          post_message: postMessage,
          created_at: new Date().toISOString(),
        };

        const updatedReports = [newReport, ...reports];

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updatedReports));
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('reports')
              .insert({
                id: newReport.id,
                reporter_id: newReport.reporter_id,
                reporter_username: newReport.reporter_username,
                reported_user_id: newReport.reported_user_id,
                reported_username: newReport.reported_username,
                reason: newReport.reason,
                description: newReport.description,
                status: 'pending',
                target_type: 'freedom_post',
                post_id: postId,
                created_at: newReport.created_at,
              })
              .then(() => {}, () => {});
          } catch (e) {}
        }

        try {
          const ws = matchmakingEngine.getWebSocket();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'REPORT_SUBMITTED', report: newReport }));
          }
        } catch (e) {}

        set({
          reports: updatedReports,
          actionToast: {
            type: 'report',
            message: `⚠️ Campus wall note reported. CapiTalk moderators will review it shortly.`,
          },
        });
      },

      resolveReport: (reportId: string, action: 'dismiss' | 'ban' | 'delete_post', adminRemark?: string) => {
        const { reports, bannedUserIds, deleteFreedomPost, addWallNotification } = get();
        const targetReport = reports.find((r) => r.id === reportId);

        if (action === 'delete_post' && targetReport?.post_id) {
          deleteFreedomPost(targetReport.post_id);
        }

        const defaultRemark =
          action === 'delete_post'
            ? 'Admin reviewed the report: Note was deleted for community guideline violation.'
            : action === 'ban'
            ? 'Admin reviewed the report: User account was issued an official warning & ban.'
            : 'Admin reviewed the report and dismissed it as no violation was found.';

        const remarkText = adminRemark && adminRemark.trim() ? adminRemark.trim() : defaultRemark;

        const updatedReports = reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                status: (action === 'ban' || action === 'delete_post') ? ('reviewed' as const) : ('dismissed' as const),
                admin_remark: remarkText,
              }
            : r
        );

        let updatedBans = bannedUserIds;
        if (action === 'ban' && targetReport) {
          updatedBans = [...new Set([...bannedUserIds, targetReport.reported_user_id])];
        }

        if (broadcastChannel && targetReport) {
          try {
            broadcastChannel.postMessage({
              type: 'FREEDOM_WALL_ADMIN_REMARK',
              postId: targetReport.post_id || 'admin_action',
              messageSnippet: targetReport.post_message ? targetReport.post_message.slice(0, 60) : 'Reported Content',
              adminRemark: remarkText,
              reportedUsername: targetReport.reported_username,
              reporterUsername: targetReport.reporter_username,
            });
          } catch (e) {}
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updatedReports));
            if (action === 'ban') {
              localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(updatedBans));
            }
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('reports')
              .update({ status: (action === 'ban' || action === 'delete_post') ? 'reviewed' : 'dismissed' })
              .eq('id', reportId)
              .then(() => {}, () => {});

            if (action === 'ban' && targetReport) {
              supabase
                .from('banned_users')
                .upsert({ user_id: targetReport.reported_user_id })
                .then(() => {}, () => {});
            }
          } catch (e) {}
        }

        set({
          reports: updatedReports,
          bannedUserIds: updatedBans,
          actionToast: {
            type: action === 'ban' ? 'ban' : 'announcement',
            message:
              action === 'delete_post'
                ? '🗑️ Reported note deleted & Admin remark notification sent.'
                : action === 'ban'
                ? '🚫 Student user banned & Admin warning remark sent.'
                : 'Report dismissed & notification updated.',
          },
        });
      },

      toggleBanUser: (userId: string) => {
        get().banUserWithIP(userId);
      },

      banUserWithIP: async (targetIdentifier: string, targetIp?: string, reason?: string) => {
        const cleanTarget = targetIdentifier.trim();
        if (!cleanTarget) return;

        const { bannedUserIds, clientIp } = get();
        const effectiveIp = targetIp || (cleanTarget.includes('.') || cleanTarget.includes(':') ? cleanTarget : clientIp);
        const banReason = reason || 'Restricted by CapiTalk Administrator.';

        const isCurrentlyBanned = bannedUserIds.includes(cleanTarget);
        const updatedBans = isCurrentlyBanned
          ? bannedUserIds.filter((id) => id !== cleanTarget)
          : [...bannedUserIds, cleanTarget];

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(updatedBans));
          } catch (e) {}
        }

        // HTML5 BroadcastChannel multi-tab real-time notify
        if (broadcastChannel) {
          try {
            if (isCurrentlyBanned) {
              broadcastChannel.postMessage({
                type: 'USER_UNBANNED',
                unbannedTarget: cleanTarget,
              });
            } else {
              broadcastChannel.postMessage({
                type: 'USER_BANNED',
                bannedTarget: cleanTarget,
                bannedIp: effectiveIp,
                banReason,
              });
            }
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            if (isCurrentlyBanned) {
              supabase
                .from('banned_users')
                .delete()
                .or(`user_id.eq.${cleanTarget},username.ilike.${cleanTarget},ip_address.eq.${cleanTarget},device_id.eq.${cleanTarget}`)
                .then(() => {}, () => {});

              try {
                supabase
                  .from('device_sessions')
                  .update({ is_banned: false, risk_score: 0 })
                  .or(`device_id.eq.${cleanTarget},ip_address.eq.${cleanTarget}`)
                  .then(() => {}, () => {});
              } catch (e) {}
            } else {
              const isIpFormat = cleanTarget.includes('.') || cleanTarget.includes(':');
              const payload: any = {
                reason: banReason,
                banned_at: new Date().toISOString(),
              };
              if (isIpFormat) {
                payload.ip_address = cleanTarget;
              } else {
                payload.user_id = cleanTarget;
                payload.username = cleanTarget;
                if (effectiveIp) payload.ip_address = effectiveIp;
              }

              supabase.from('banned_users').upsert(payload).then(() => {}, () => {});
            }
          } catch (e) {}
        }

        set({
          bannedUserIds: updatedBans,
          actionToast: {
            type: isCurrentlyBanned ? 'announcement' : 'ban',
            message: isCurrentlyBanned
              ? `User/IP "${cleanTarget}" unbanned successfully.`
              : `🚫 User/IP "${cleanTarget}" banned in real-time.`,
          },
        });

        if (isCurrentlyBanned) {
          get().checkBanStatus();
        }
      },

      addFreedomPost: async (postData, honeypot, deviceId) => {
        const { freedomPosts, currentUser } = get();
        const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');
        const newPost: FreedomPost = {
          id: (postData as any).id || ('post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
          author_id: currentUserId,
          author_alias: postData.author_alias || (currentUser ? currentUser.username : 'Anon Student'),
          department: postData.department || (currentUser ? currentUser.department : 'General'),
          author_avatar: postData.author_avatar || currentUser?.avatar_url || getAvatarForPseudonym(postData.author_alias || 'Anon'),
          author_bio: postData.author_bio || currentUser?.bio || '',
          message: postData.message,
          color: postData.color || '#ffc900',
          song_title: postData.song_title,
          song_artist: postData.song_artist,
          song_image_url: postData.song_image_url,
          song_preview_url: postData.song_preview_url,
          song_link: postData.song_link,
          dedicated_to: postData.dedicated_to,
          poll_question: postData.poll_question,
          poll_options: postData.poll_options,
          image_url: postData.image_url,
          image_type: postData.image_type,
          likes_count: 0,
          liked_by_users: [],
          is_admin: !!postData.is_admin,
          status: postData.is_admin ? 'approved' : 'pending',
          created_at: new Date().toISOString(),
        };

        try {
          const adminToken = getAdminToken();
          const res = await fetch('/api/freedom-wall/post', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-device-id': deviceId || 'unknown',
              ...(adminToken ? { 'x-admin-token': adminToken } : {}),
            },
            body: JSON.stringify({ honeypot, postData: newPost })
          });
          
          if (!res.ok) {
            let errorMsg = `Server error (${res.status})`;
            try {
              const errorData = await res.json();
              if (errorData && errorData.error) errorMsg = errorData.error;
            } catch (e) {
              try {
                const text = await res.text();
                if (text) errorMsg = text;
              } catch (e2) {}
            }
            console.error('Failed to publish note to server:', errorMsg);
            set({
              actionToast: {
                type: 'error',
                message: errorMsg,
              },
            });
            return false;
          }

          let serverImageUrl: string | undefined = undefined;
          try {
            const resJson = await res.json();
            if (resJson && resJson.imageUrl) {
              serverImageUrl = resJson.imageUrl;
            }
          } catch (e) {}

          const finalizedPost = {
            ...newPost,
            ...(serverImageUrl ? { image_url: serverImageUrl } : {}),
          };

          // ONLY update local state and broadcast after server approves the post
          const currentList = get().freedomPosts;
          const updated = [finalizedPost, ...currentList];
          const updatedMyPostIds = [finalizedPost.id, ...get().myPostIds];

          if (finalizedPost.author_alias) {
            get().addPseudonym(finalizedPost.author_alias);
          }

          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated));
              localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(updatedMyPostIds));
            } catch (e) {}
          }

          if (broadcastChannel) {
            try {
              broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated });
            } catch (e) {}
          }

          set({
            freedomPosts: updated,
            myPostIds: updatedMyPostIds,
            actionToast: {
              type: 'announcement',
              message: postData.is_admin
                ? (postData.song_title ? '✨ Admin song dedication published!' : '✨ Admin post published to Freedom Wall!')
                : (postData.song_title ? '🎵 Song Dedication Submitted! Pending review.' : '⏳ Note Submitted! Your note is pending admin review and will be visible once approved.'),
            },
          });
          return true;
        } catch (e: any) {
          console.error('Error posting note:', e);
          set({
            actionToast: {
              type: 'error',
              message: e?.message || 'Network error while posting.',
            },
          });
          return false;
        }
      },

      approveFreedomPost: (postId: string) => {
        const { freedomPosts } = get();
        const updated = freedomPosts.map((post) => {
          if (post.id !== postId) return post;
          return { ...post, status: 'approved' as const };
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            const post = updated.find(p => p.id === postId);
            if (post) {
              const encodedColor = encodePostColor(post);
              supabase.from('freedom_posts').update({ color: encodedColor, status: 'approved' }).eq('id', postId).then(() => {}, () => {});
            }
          } catch (e) {}
        }

        set({
          freedomPosts: updated,
          actionToast: { type: 'announcement', message: '🟢 Note approved & published to Freedom Wall!' },
        });
      },

      deleteFreedomPost: (postId: string) => {
        const { freedomPosts, myPostIds } = get();
        const updated = freedomPosts.filter((p) => p.id !== postId);
        const updatedMyPostIds = (myPostIds || []).filter((id) => id !== postId);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated));
            localStorage.setItem('capitalk_my_post_ids_v1', JSON.stringify(updatedMyPostIds));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase.from('freedom_posts').delete().eq('id', postId).then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          freedomPosts: updated,
          myPostIds: updatedMyPostIds,
          actionToast: {
            type: 'announcement',
            message: '🗑️ Freedom Wall note deleted successfully.',
          },
        });
      },

      togglePinFreedomPost: (postId: string) => {
        const { freedomPosts } = get();
        const target = freedomPosts.find((p) => p.id === postId);
        if (!target) return;

        const isNowPinned = !target.is_pinned;
        const nowIso = new Date().toISOString();

        const updated = freedomPosts.map((post) =>
          post.id === postId
            ? { ...post, is_pinned: isNowPinned, pinned_at: isNowPinned ? nowIso : undefined }
            : post
        );

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('freedom_posts')
              .update({ is_pinned: isNowPinned, pinned_at: isNowPinned ? nowIso : null })
              .eq('id', postId)
              .then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          freedomPosts: updated,
          actionToast: {
            type: 'announcement',
            message: isNowPinned ? '📌 Note pinned to top of Freedom Wall!' : '📌 Note unpinned from Freedom Wall.',
          },
        });
      },

      likeFreedomPost: (postId: string) => {
        const { freedomPosts, currentUser } = get();
        const userId = currentUser
          ? currentUser.id
          : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'guest_anon');
        const targetPost = freedomPosts.find((p) => p.id === postId);

        const updated = freedomPosts.map((post) => {
          if (post.id !== postId) return post;
          const likedUsers = post.liked_by_users || [];
          const hasLiked = likedUsers.includes(userId);

          let newLikedUsers: string[];
          if (hasLiked) {
            newLikedUsers = likedUsers.filter((id) => id !== userId);
          } else {
            newLikedUsers = [...likedUsers, userId];
          }

          // Update liked_by_profiles map: add or remove the current user's profile
          const profiles = { ...(post.liked_by_profiles || {}) };
          if (hasLiked) {
            delete profiles[userId];
          } else {
            const username = currentUser ? currentUser.username : `Student #${userId.slice(-4)}`;
            const department = currentUser ? currentUser.department : 'General';
            const avatar_url = currentUser?.avatar_url || getAvatarForPseudonym(username);
            profiles[userId] = {
              username,
              department,
              avatar_url,
            };
          }

          return {
            ...post,
            liked_by_users: newLikedUsers,
            liked_by_profiles: profiles,
            likes_count: newLikedUsers.length,
          };
        });

        const isNewLike = targetPost && !targetPost.liked_by_users?.includes(userId);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated });
            if (isNewLike && targetPost) {
              const actorUsername = currentUser?.username || 'CU Student';
              const actorAlias = `@${actorUsername}`;
              const actorAvatar = currentUser?.avatar_url || getAvatarForPseudonym(actorUsername);
              broadcastChannel.postMessage({
                type: 'FREEDOM_WALL_LIKE',
                postId,
                actorAlias,
                actorUsername,
                actorAvatar,
                actorDept: currentUser?.department || 'Engineering',
                messageSnippet: targetPost.message.slice(0, 60),
                likerId: userId,
                targetAuthorId: targetPost.author_id,
                targetAuthorAlias: targetPost.author_alias,
              });
            }
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            const updatedPost = updated.find((p) => p.id === postId);
            if (updatedPost) {
              const encodedColor = encodePostColor(updatedPost);
              supabase
                .from('freedom_posts')
                .update({
                  likes_count: updatedPost.likes_count,
                  liked_by_users: updatedPost.liked_by_users,
                  liked_by_profiles: updatedPost.liked_by_profiles || {},
                  color: encodedColor,
                })
                .eq('id', postId)
                .then(
                  ({ error }) => {
                    if (error) console.error('Error updating post like in Supabase:', error);
                  },
                  (err) => console.error('Supabase update error:', err)
                );

              if (isNewLike) {
                const actorUsername = currentUser?.username || 'CU Student';
                const actorAlias = `@${actorUsername}`;
                const actorAvatar = currentUser?.avatar_url || getAvatarForPseudonym(actorUsername);
                const targetUserId = targetPost.author_id || targetPost.id;
                
                // 1. Send to user-specific channel
                const userChannel = supabase.channel(`user:${targetUserId}:notifications`);
                userChannel.send({
                  type: 'broadcast',
                  event: 'new_notification',
                  payload: {
                    target_user_id: targetUserId,
                    post_id: postId,
                    type: 'like',
                    actor_alias: actorAlias,
                    actor_username: actorUsername,
                    actor_avatar: actorAvatar,
                    actor_department: currentUser?.department || 'Engineering',
                    message_snippet: targetPost.message.slice(0, 60),
                  },
                }).then(() => {}, () => {});

                // 2. Broadcast to global wall events channel (guarantees delivery across all pagination pages/devices)
                const wallChan = supabase.channel('capitalk_global_wall_events');
                wallChan.send({
                  type: 'broadcast',
                  event: 'FREEDOM_WALL_LIKE',
                  payload: {
                    postId,
                    actorAlias,
                    actorUsername,
                    actorAvatar,
                    actorDept: currentUser?.department || 'Engineering',
                    messageSnippet: targetPost.message.slice(0, 60),
                    likerId: userId,
                    targetAuthorId: targetPost.author_id,
                    targetAuthorAlias: targetPost.author_alias,
                  },
                }).then(() => {}, () => {});

                supabase.from('notifications').insert({
                  id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                  target_user_id: targetUserId,
                  post_id: postId,
                  type: 'like',
                  actor_alias: actorAlias,
                  actor_department: currentUser?.department || 'Engineering',
                  message_snippet: targetPost.message.slice(0, 60),
                  read: false,
                }).then(() => {}, () => {});
              }
            }
          } catch (e) {}
        }

        set({ freedomPosts: updated });
      },

      voteFreedomPoll: (postId: string, optionId: string) => {
        const { freedomPosts, currentUser } = get();
        const userId = currentUser
          ? currentUser.id
          : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'guest_anon');

        const targetPost = freedomPosts.find((p) => p.id === postId);
        if (!targetPost || !targetPost.poll_options || targetPost.poll_options.length === 0) return;

        const alreadyVotedOption = targetPost.poll_options.find((opt) => opt.voted_users?.includes(userId));
        if (alreadyVotedOption && alreadyVotedOption.id === optionId) return;

        const updatedOptions = targetPost.poll_options.map((opt) => {
          const votedUsers = opt.voted_users || [];
          const isTargetOpt = opt.id === optionId;
          const isPrevOpt = alreadyVotedOption && opt.id === alreadyVotedOption.id;

          let newVotedUsers = votedUsers;
          if (isPrevOpt) {
            newVotedUsers = votedUsers.filter((id) => id !== userId);
          }
          if (isTargetOpt) {
            newVotedUsers = [...newVotedUsers.filter((id) => id !== userId), userId];
          }

          return {
            ...opt,
            voted_users: newVotedUsers,
            votes_count: newVotedUsers.length,
          };
        });

        const updated = freedomPosts.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            poll_options: updatedOptions,
          };
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'FREEDOM_WALL_UPDATE', posts: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            const updatedPost = updated.find((p) => p.id === postId);
            if (updatedPost) {
              const pollMeta = JSON.stringify({ question: updatedPost.poll_question || '', options: updatedPost.poll_options });
              const encodedColor = `${updatedPost.color}||${updatedPost.status || 'approved'}||${JSON.stringify(updatedPost.liked_by_profiles || {})}||${pollMeta}`;
              supabase
                .from('freedom_posts')
                .update({
                  color: encodedColor,
                  poll_question: updatedPost.poll_question || null,
                  poll_options: updatedPost.poll_options || [],
                })
                .eq('id', postId)
                .then(
                  () => {},
                  () => {}
                );
            }
          } catch (e) {}
        }

        set({ freedomPosts: updated });
      },

      clearToast: () => set({ actionToast: null }),
      setActionToast: (toast) => set({ actionToast: toast }),

      broadcastAnnouncement: (message: string) => {
        const announcementObj = {
          id: 'ann_' + Date.now(),
          message: message.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_announcement_v5', JSON.stringify(announcementObj));
          } catch (e) {}
        }

        // 1. Post to HTML5 BroadcastChannel for instant cross-tab sync
        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'ANNOUNCEMENT_BROADCAST', announcement: announcementObj });
          } catch (e) {}
        }

        // 2. Ensure WebSocket is connected and send real-time broadcast
        try {
          matchmakingEngine.connect(() => {
            const ws = matchmakingEngine.getWebSocket();
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ANNOUNCEMENT', announcement: announcementObj }));
            }
          });
        } catch (e) {}



        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('messages')
              .insert({
                id: 'msg_ann_' + announcementObj.id,
                room_id: 'global_broadcast',
                sender_id: 'system_announcement',
                sender_username: '📢 Campus Announcement',
                message: message.trim(),
                created_at: new Date().toISOString(),
              })
              .then(() => {}, () => {});

            const annChannel = supabase.channel('capitalk_global_announcements_v1');
            annChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                annChannel.send({
                  type: 'broadcast',
                  event: 'announcement',
                  payload: announcementObj,
                });
              }
            });
          } catch (e) {}
        }

        const { activeRoom, messages } = get();
        let updatedMessages = messages;
        if (activeRoom) {
          const annMsgId = 'msg_ann_' + announcementObj.id;
          if (!updatedMessages.some((m) => m.id === annMsgId)) {
            const annMsg: ChatMessage = {
              id: annMsgId,
              room_id: activeRoom.id,
              sender_id: 'system_announcement',
              sender_username: '📢 Campus Announcement',
              message: message.trim(),
              created_at: new Date().toISOString(),
            };
            updatedMessages = [...updatedMessages, annMsg];
            try {
              roomManager.injectSystemMessage(annMsg);
            } catch (e) {}
          }
        }

        set({
          systemAnnouncement: announcementObj,
          messages: updatedMessages,
          actionToast: { type: 'announcement', message: '📢 Campus announcement broadcast live to all students!' },
        });
      },

      dismissAnnouncement: () => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('capitalk_shared_announcement_v5');
          } catch (e) {}
        }
        set({ systemAnnouncement: null });
      },

      submitFeedback: ({ category, rating, message }) => {
        const { currentUser, feedbackList } = get();
        const newFeedback: UserFeedback = {
          id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          user_id: currentUser?.id,
          username: currentUser?.username || 'Anonymous Student',
          category,
          rating,
          message: message.trim(),
          created_at: new Date().toISOString(),
        };

        const updated = [newFeedback, ...feedbackList];
        set({
          feedbackList: updated,
          showFeedbackModal: false,
          actionToast: { type: 'announcement', message: '🎉 Thank you! Your feedback has been received.' },
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_feedback_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('feedback')
              .insert({
                user_id: newFeedback.user_id,
                username: newFeedback.username,
                category: newFeedback.category,
                rating: newFeedback.rating,
                message: newFeedback.message,
              })
              .then(() => {}, () => {});
          } catch (e) {}
        }
      },

      bookLoudspeakerSlot: (bookingInput) => {
        const id = 'ls_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const isInstant = bookingInput.scheduled_at === 'instant' || new Date(bookingInput.scheduled_at).getTime() <= Date.now() + 1500;
        const scheduledTime = isInstant
          ? new Date().toISOString()
          : bookingInput.scheduled_at;

        const newBooking: LoudspeakerBooking = {
          ...bookingInput,
          id,
          scheduled_at: scheduledTime,
          status: isInstant ? 'live' : 'scheduled',
          reaction_counts: { fire: 0, heart: 0, clap: 0, horn: 0 },
          created_at: new Date().toISOString(),
        };

        const currentBookings = (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1');
        const updated = [...currentBookings, newBooking];

        set({
          loudspeakerBookings: updated,
          activeLoudspeaker: isInstant ? newBooking : get().activeLoudspeaker,
          showLoudspeakerModal: false,
          actionToast: {
            type: 'announcement',
            message: isInstant
              ? `Broadcast live right now across the campus!`
              : `Loudspeaker broadcast booked for ${newBooking.slot_label || 'your chosen slot'}!`,
          },
        });

        if (isInstant) {
          try { playLoudspeakerChime(); } catch (e) {}
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_loudspeaker_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        // 1. Send to local WebSocket server
        matchmakingEngine.sendWs({
          type: 'LOUDSPEAKER_BOOK',
          booking: newBooking,
        });

        // 2. Broadcast across open browser tabs
        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({
              type: 'LOUDSPEAKER_BOOKINGS_UPDATED',
              bookings: updated,
            });
            if (isInstant) {
              broadcastChannel.postMessage({
                type: 'LOUDSPEAKER_LIVE_START',
                booking: newBooking,
              });
            }
          } catch (e) {}
        }

        // 3. Broadcast to Supabase Realtime channel for ALL devices/browsers
        broadcastGlobalRealtime('loudspeaker_book', newBooking);
        if (isInstant) {
          broadcastGlobalRealtime('loudspeaker_live_start', newBooking);
          try {
            roomManager.sendLoudspeakerEvent('start', { booking: newBooking });
          } catch (e) {}
        }

        // 4. Persist to PostgreSQL database for cross-device consistency
        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('loudspeaker_bookings')
              .upsert({
                id: newBooking.id,
                user_id: newBooking.user_id,
                author_alias: newBooking.author_alias,
                department: newBooking.department,
                message: newBooking.message,
                theme_color: newBooking.theme_color,
                song_title: newBooking.song_title || null,
                song_artist: newBooking.song_artist || null,
                scheduled_at: newBooking.scheduled_at,
                slot_label: newBooking.slot_label || null,
                duration_seconds: newBooking.duration_seconds || 30,
                status: newBooking.status,
                reaction_counts: newBooking.reaction_counts,
                created_at: newBooking.created_at,
              })
              .then(({ error }) => {
                if (error) {
                  console.warn('[Loudspeaker DB Error]', error.message);
                }
              }, (err) => console.warn('[Loudspeaker DB Error]', err));
          } catch (e) {}
        }
      },

      cancelLoudspeakerBooking: (bookingId: string) => {
        const currentBookings = (get().loudspeakerBookings || []).filter((b) => b.id !== 'ls_sample_1');
        const updated = currentBookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        );

        set({
          loudspeakerBookings: updated,
          actionToast: { type: 'info', message: 'Loudspeaker broadcast reservation cancelled.' },
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_loudspeaker_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        matchmakingEngine.sendWs({
          type: 'LOUDSPEAKER_CANCEL',
          bookingId,
        });

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({
              type: 'LOUDSPEAKER_BOOKINGS_UPDATED',
              bookings: updated,
            });
          } catch (e) {}
        }

        broadcastGlobalRealtime('loudspeaker_cancel', { bookingId });
        try {
          roomManager.sendLoudspeakerEvent('end', {});
        } catch (e) {}

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('loudspeaker_bookings')
              .update({ status: 'cancelled' })
              .eq('id', bookingId)
              .then(() => {}, () => {});
          } catch (e) {}
        }
      },

      reactToLoudspeaker: (emoji: 'fire' | 'heart' | 'clap' | 'horn') => {
        const active = get().activeLoudspeaker;
        if (!active) return;

        const burst = {
          id: 'burst_' + Math.random().toString(36).substring(2, 9),
          emoji,
          timestamp: Date.now(),
        };

        const currentBursts = get().loudspeakerReactionBursts || [];
        const updatedBursts = [...currentBursts.slice(-20), burst];

        const updatedActive = {
          ...active,
          reaction_counts: {
            ...active.reaction_counts,
            [emoji]: ((active.reaction_counts as any)[emoji] || 0) + 1,
          },
        };

        set({
          activeLoudspeaker: updatedActive,
          loudspeakerReactionBursts: updatedBursts,
        });

        matchmakingEngine.sendWs({
          type: 'LOUDSPEAKER_REACT',
          bookingId: active.id,
          emoji,
        });

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({
              type: 'LOUDSPEAKER_REACTION_BURST',
              emoji,
              bookingId: active.id,
            });
          } catch (e) {}
        }

        broadcastGlobalRealtime('loudspeaker_reaction', {
          bookingId: active.id,
          emoji,
        });

        try {
          roomManager.sendLoudspeakerEvent('react', { emoji });
        } catch (e) {}

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('loudspeaker_bookings')
              .update({ reaction_counts: updatedActive.reaction_counts })
              .eq('id', active.id)
              .then(() => {}, () => {});
          } catch (e) {}
        }
      },
    }),
    {
      name: 'capitalk-storage',
      partialize: (state: ChatStoreState) => ({
        currentUser: state.currentUser,
        activeRoom: state.activeRoom,
        // NOTE: messages are intentionally excluded from persistence.
        // roomManager already persists them under capitalk_msgs_v4_<roomId>
        // and reloads them on joinRoom. Persisting here caused a full
        // JSON serialization of the entire message array on every set() call.
        viewState: state.viewState,
        partnerLeft: state.partnerLeft,
        blockedUserIds: state.blockedUserIds,
        blockedUsers: state.blockedUsers,
        reports: state.reports,
        bannedUserIds: state.bannedUserIds,
        wallNotifications: state.wallNotifications,
        myPostIds: state.myPostIds,
        keptConnection: state.keptConnection,
        themeMode: state.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          const standalone = localStorage.getItem('capitalk_theme');
          const isDark = standalone !== null
            ? standalone === '1'
            : state.themeMode === 1;
          const finalMode = isDark ? 1 : 0;
          if (state.themeMode !== finalMode) {
            useChatStore.setState({ themeMode: finalMode });
          }
          if (finalMode === 1) {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
          }
        }
      },
    }
  )
);
