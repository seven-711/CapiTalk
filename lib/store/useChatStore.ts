'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, ChatRoom, ChatMessage, QueueFilter, UserReport, FreedomPost, UserFeedback, WallNotification } from '../types';
import { BOT_PARTNERS, BOT_RESPONSES, DepartmentType } from '../constants';
import { matchmakingEngine } from '../realtime/matchmakingEngine';
import { roomManager } from '../realtime/roomManager';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { checkProfanity } from '../utils/profanityFilter';
import { getOrCreatePersistentUUID } from '../utils/uuid';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('capitalk_global_realtime');
  } catch (e) {}
}


interface ChatStoreState {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  
  viewState: 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'privacy';
  setViewState: (view: 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'privacy') => void;

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
  
  blockedUserIds: string[];
  reports: UserReport[];
  bannedUserIds: string[];
  profanityStrikes: number;
  bayotCount: number;
  freedomPosts: FreedomPost[];
  feedbackList: UserFeedback[];
  wallNotifications: WallNotification[];
  myPostIds: string[];
  targetPostId: string | null;
  setTargetPostId: (id: string | null) => void;

  actionToast: { type: 'block' | 'report' | 'announcement' | 'ban' | 'error'; message: string } | null;
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
  toggleReaction: (messageId: string, emojiKey: string) => void;
  sendTypingSignal: (isTyping: boolean) => void;
  nextMatch: () => void;
  leaveRoom: () => void;
  reportPartner: (reason: string, description: string) => void;
  reportFreedomPost: (postId: string, postAuthorAlias: string, postMessage: string, reason: string, description: string) => void;
  blockPartner: () => void;
  triggerBotMatch: () => void;

  resolveReport: (reportId: string, action: 'dismiss' | 'ban' | 'delete_post', adminRemark?: string) => void;
  toggleBanUser: (userId: string) => void;

  addFreedomPost: (post: Omit<FreedomPost, 'id' | 'likes_count' | 'liked_by_users' | 'created_at'>, honeypot?: string, deviceId?: string) => Promise<boolean>;
  deleteFreedomPost: (postId: string) => void;
  approveFreedomPost: (postId: string) => void;
  likeFreedomPost: (postId: string) => void;
  voteFreedomPoll: (postId: string, optionId: string) => void;
  togglePinFreedomPost: (postId: string) => void;
  submitFeedback: (input: { category: UserFeedback['category']; rating: number; message: string }) => void;

  addWallNotification: (notif: Omit<WallNotification, 'id' | 'created_at' | 'read'>) => void;
  markWallNotificationsAsRead: () => void;
  clearWallNotifications: () => void;

  clearToast: () => void;
  broadcastAnnouncement: (message: string) => void;
  dismissAnnouncement: () => void;
}

const DEMO_FREEDOM_POSTS: FreedomPost[] = [];

const DEMO_WALL_NOTIFICATIONS: WallNotification[] = [];

let searchTimer: NodeJS.Timeout | null = null;
let unsubscribeMatch: (() => void) | null = null;
let sessionInitialized = false;
let globalPollInterval: NodeJS.Timeout | null = null;

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

      currentUser: null,
      setCurrentUser: (user: UserProfile | null) => set({ currentUser: user }),

      viewState: 'landing',
      setViewState: (view: 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'privacy') => {
        set({ viewState: view });
      },

      wallNotifications: typeof window !== 'undefined'
        ? (() => {
            try {
              const stored = localStorage.getItem('capitalk_wall_notifications_v2');
              return stored ? JSON.parse(stored) : DEMO_WALL_NOTIFICATIONS;
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

      addWallNotification: (notifData) => {
        const newNotif: WallNotification = {
          id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          post_id: notifData.post_id,
          type: notifData.type,
          actor_alias: notifData.actor_alias,
          actor_department: notifData.actor_department,
          message_snippet: notifData.message_snippet,
          comment_text: notifData.comment_text,
          admin_remark: notifData.admin_remark,
          created_at: new Date().toISOString(),
          read: false,
        };
        const updated = [newNotif, ...get().wallNotifications];
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
      reports: [],
      bannedUserIds: [],
      profanityStrikes: 0,
      bayotCount: 0,
      freedomPosts: [],

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

        const { activeRoom, currentUser, isSearching } = get();
        
        // Initial real-time ban check via API
        get().checkBanStatus();

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

            const rawFreedom = localStorage.getItem('capitalk_freedom_wall_v1');
            const loadedFreedom: FreedomPost[] = rawFreedom ? JSON.parse(rawFreedom) : DEMO_FREEDOM_POSTS;

            set({ reports: mergedReports, bannedUserIds: mergedBans, systemAnnouncement: loadedAnnouncement, freedomPosts: loadedFreedom });
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
                      const loadedFromDb: FreedomPost[] = data.map((row: any) => {
                        const rawColor = row.color || '#ffc900';
                        const parts = rawColor.split('||');
                        const dbColor = parts[0];
                        const dbStatus = parts[1] || row.status || 'approved';
                        let dbProfiles = typeof row.liked_by_profiles === 'object' && row.liked_by_profiles !== null ? row.liked_by_profiles : {};
                        try { if (parts[2]) dbProfiles = JSON.parse(parts[2]); } catch (e) {}

                        let dbPollOptions = row.poll_options;
                        let dbPollQuestion = row.poll_question;
                        try {
                          if (parts[3]) {
                            const parsedPoll = JSON.parse(parts[3]);
                            if (parsedPoll.options) dbPollOptions = parsedPoll.options;
                            if (parsedPoll.question) dbPollQuestion = parsedPoll.question;
                          }
                        } catch (e) {}

                        return {
                          id: row.id,
                          author_id: row.author_id,
                          author_alias: row.author_alias || 'Anon Student',
                          department: row.department || 'General',
                          message: row.message,
                          color: dbColor,
                          likes_count: row.likes_count || 0,
                          liked_by_users: Array.isArray(row.liked_by_users) ? row.liked_by_users : [],
                          liked_by_profiles: dbProfiles,
                          is_admin: !!row.is_admin,
                          is_pinned: !!row.is_pinned,
                          pinned_at: row.pinned_at || undefined,
                          status: dbStatus,
                          created_at: row.created_at,
                          song_title: row.song_title,
                          song_artist: row.song_artist,
                          song_image_url: row.song_image_url,
                          song_preview_url: row.song_preview_url,
                          song_link: row.song_link,
                          dedicated_to: row.dedicated_to,
                          poll_question: dbPollQuestion,
                          poll_options: dbPollOptions,
                        };
                      });
                      set({ freedomPosts: loadedFromDb });
                      localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(loadedFromDb));
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

              // Sync banned users list from Supabase Database
              try {
                supabase
                  .from('banned_users')
                  .select('user_id, device_id, ip_address, username')
                  .then(({ data, error }) => {
                    if (data && data.length > 0 && !error) {
                      const dbBans = data.flatMap((b: any) => [b.user_id, b.device_id, b.ip_address, b.username]).filter(Boolean);
                      const currentBans = get().bannedUserIds;
                      const mergedBans = [...new Set([...currentBans, ...dbBans])];
                      set({ bannedUserIds: mergedBans });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(mergedBans));
                      }
                    }
                  }, () => {});

                // Supabase Realtime subscription to banned_users table for instant eviction
                const bannedChannel = supabase
                  .channel('public:banned_users')
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banned_users' }, (payload: any) => {
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
                } else if (event.data?.type === 'FREEDOM_WALL_LIKE') {
                  const { postId, actorAlias, actorDept, messageSnippet, likerId } = event.data;
                  const { myPostIds, currentUser } = get();
                  const currentUserId = currentUser ? currentUser.id : '';
                  if (myPostIds.includes(postId) && likerId !== currentUserId) {
                    get().addWallNotification({
                      post_id: postId,
                      type: 'like',
                      actor_alias: actorAlias,
                      actor_department: actorDept,
                      message_snippet: messageSnippet,
                    });
                  }
                } else if (event.data?.type === 'FREEDOM_WALL_COMMENT') {
                  const { postId, actorAlias, actorDept, messageSnippet, commentText, commenterId } = event.data;
                  const { myPostIds, currentUser } = get();
                  const currentUserId = currentUser ? currentUser.id : '';
                  if (myPostIds.includes(postId) && commenterId !== currentUserId) {
                    get().addWallNotification({
                      post_id: postId,
                      type: 'comment',
                      actor_alias: actorAlias,
                      actor_department: actorDept,
                      message_snippet: messageSnippet,
                      comment_text: commentText,
                    });
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
                }
              };
            }

            // Supabase Realtime Global Announcement Channel (for Vercel & cross-device real-time sync)
            if (supabase && isSupabaseConfigured) {
              try {
                const annChannel = supabase.channel('capitalk_global_announcements_v1');
                annChannel
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
                  .subscribe();

                const wallChannel = supabase.channel('capitalk_global_wall_events');
                wallChannel
                  .on('broadcast', { event: 'FREEDOM_WALL_LIKE' }, (payload: any) => {
                    const { postId, actorAlias, actorDept, messageSnippet, likerId } = payload?.payload || {};
                    const { myPostIds, currentUser } = get();
                    const currentUserId = currentUser ? currentUser.id : '';
                    if (myPostIds.includes(postId) && likerId !== currentUserId) {
                      get().addWallNotification({
                        post_id: postId,
                        type: 'like',
                        actor_alias: actorAlias,
                        actor_department: actorDept,
                        message_snippet: messageSnippet,
                      });
                    }
                  })
                  .on('broadcast', { event: 'FREEDOM_WALL_COMMENT' }, (payload: any) => {
                    const { postId, actorAlias, actorDept, messageSnippet, commentText, commenterId } = payload?.payload || {};
                    const { myPostIds, currentUser } = get();
                    const currentUserId = currentUser ? currentUser.id : '';
                    if (myPostIds.includes(postId) && commenterId !== currentUserId) {
                      get().addWallNotification({
                        post_id: postId,
                        type: 'comment',
                        actor_alias: actorAlias,
                        actor_department: actorDept,
                        message_snippet: messageSnippet,
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
                      get().addWallNotification({
                        post_id: notif.post_id,
                        type: notif.type,
                        actor_alias: notif.actor_alias,
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
                const mapDbRowToPost = (row: any, existingLocal?: FreedomPost): FreedomPost => {
                  const dbLikedBy: string[] = Array.isArray(row.liked_by_users) ? row.liked_by_users : [];
                  const localLikedBy: string[] = existingLocal?.liked_by_users || [];
                  const useLikedBy = localLikedBy.length !== dbLikedBy.length ? localLikedBy : dbLikedBy;

                  const rawColor = row.color || '#ffc900';
                  const parts = rawColor.split('||');
                  const dbColor = parts[0];
                  const dbStatus = parts[1] || row.status || 'approved';
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

                  return {
                    id: row.id,
                    author_id: row.author_id,
                    author_alias: row.author_alias || 'Anon Student',
                    department: row.department || 'General',
                    author_avatar: extractedAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(row.author_alias || 'Anon')}&backgroundColor=ffc900`,
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
                    song_title: row.song_title,
                    song_artist: row.song_artist,
                    song_image_url: row.song_image_url,
                    song_preview_url: row.song_preview_url,
                    song_link: row.song_link,
                    dedicated_to: row.dedicated_to,
                    poll_question: dbPollQuestion,
                    poll_options: dbPollOptions,
                  };
                };

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
                      set({ freedomPosts: finalPosts });
                      try { localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(finalPosts)); } catch (e) {}
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
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${trimmedUsername}`,
          bio: bio?.trim() || '',
          status: 'online',
          created_at: new Date().toISOString(),
        };

        if (typeof window !== 'undefined') {
          try {
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

        set({ currentUser: newUser, viewState: 'queue' });
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

        const isAdmin = Boolean(
          (typeof window !== 'undefined' && localStorage.getItem('capitalk_admin_auth_v1') === 'true') ||
          get().viewState === 'admin' ||
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
            message: `🎉 Connected! You are now chatting with ${partner.username} from ${partner.department}. Say hi!`,
            created_at: new Date().toISOString(),
          };

          set({
            isSearching: false,
            searchingTimeSeconds: 0,
            activeRoom: newRoom,
            messages: [welcomeMsg],
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
              id: 'msg_bot_' + Date.now(),
              room_id: activeRoom.id,
              sender_id: partner.id,
              sender_username: partner.username,
              message: randomReply,
              created_at: new Date().toISOString(),
            };
            set((state) => ({
              messages: [...state.messages, botMsg],
            }));
          }, 1800);
        }
      },

      toggleReaction: (messageId: string, emojiKey: string) => {
        const { messages, currentUser, activeRoom } = get();
        if (!currentUser || !activeRoom) return;

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
        if (activeRoom) {
          roomManager.sendSkipSignal('skipped');
          roomManager.leaveRoom();
        }
        set({ partnerLeft: false, partnerLeftReason: null });
        get().startSearch();
      },

      leaveRoom: () => {
        const { currentUser, activeRoom } = get();
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
          actionToast: {
            type: 'report',
            message: `⚠️ Report submitted for ${partner.username}. Thank you for keeping CapiTalk safe.`,
          },
        });
        get().nextMatch();
      },

      blockPartner: () => {
        const { activeRoom, currentUser, blockedUserIds } = get();
        if (!activeRoom || !currentUser) return;

        const partner = activeRoom.user_two.id === currentUser.id ? activeRoom.user_one : activeRoom.user_two;
        const updatedBlocked = [...new Set([...blockedUserIds, partner.id])];

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
          actionToast: {
            type: 'block',
            message: `🚫 ${partner.username} blocked. You will no longer be paired with them.`,
          },
        });
        get().nextMatch();
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
        if (broadcastChannel && !isCurrentlyBanned) {
          try {
            broadcastChannel.postMessage({
              type: 'USER_BANNED',
              bannedTarget: cleanTarget,
              bannedIp: effectiveIp,
              banReason,
            });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            if (isCurrentlyBanned) {
              supabase
                .from('banned_users')
                .delete()
                .or(`user_id.eq.${cleanTarget},username.ilike.${cleanTarget},ip_address.eq.${cleanTarget}`)
                .then(() => {}, () => {});
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
      },

      addFreedomPost: async (postData, honeypot, deviceId) => {
        const { freedomPosts, currentUser } = get();
        const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');
        const newPost: FreedomPost = {
          id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          author_id: currentUserId,
          author_alias: postData.author_alias || (currentUser ? currentUser.username : 'Anon Student'),
          department: postData.department || (currentUser ? currentUser.department : 'General'),
          author_avatar: postData.author_avatar || currentUser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(postData.author_alias || 'Anon')}&backgroundColor=ffc900`,
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
          likes_count: 0,
          liked_by_users: [],
          is_admin: !!postData.is_admin,
          status: postData.is_admin ? 'approved' : 'pending',
          created_at: new Date().toISOString(),
        };

        try {
          const res = await fetch('/api/freedom-wall/post', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-device-id': deviceId || 'unknown'
            },
            body: JSON.stringify({ honeypot, postData: newPost })
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Failed to publish note to server:', errorData);
            set({
              actionToast: {
                type: 'error',
                message: errorData.error || 'Failed to publish note to server.',
              },
            });
            return false;
          }

          // ONLY update local state and broadcast after server approves the post
          const currentList = get().freedomPosts;
          const updated = [newPost, ...currentList];
          const updatedMyPostIds = [newPost.id, ...get().myPostIds];

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
                ? '✨ Admin post published to Freedom Wall!'
                : '⏳ Note Submitted! Your note is pending admin review and will be visible once approved.',
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
            const post = freedomPosts.find(p => p.id === postId);
            if (post) {
              const encodedColor = `${post.color}||approved||${JSON.stringify(post.liked_by_profiles || {})}`;
              supabase.from('freedom_posts').update({ color: encodedColor }).eq('id', postId).then(() => {}, () => {});
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
            profiles[userId] = {
              username,
              department,
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
              const deptShort = (currentUser?.department || 'Engineering').replace('College of ', '');
              const actorAlias = `Someone from ${deptShort}`;
              broadcastChannel.postMessage({
                type: 'FREEDOM_WALL_LIKE',
                postId,
                actorAlias,
                actorDept: currentUser?.department || 'Engineering',
                messageSnippet: targetPost.message.slice(0, 60),
                likerId: userId,
              });
            }
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            const targetPost = updated.find((p) => p.id === postId);
            if (targetPost) {
              const pollMeta = (targetPost.poll_options && targetPost.poll_options.length > 0)
                ? JSON.stringify({ question: targetPost.poll_question || '', options: targetPost.poll_options })
                : '';
              const encodedColor = `${targetPost.color}||${targetPost.status}||${JSON.stringify(targetPost.liked_by_profiles || {})}||${pollMeta}`;
              supabase
                .from('freedom_posts')
                .update({
                  likes_count: targetPost.likes_count,
                  liked_by_users: targetPost.liked_by_users,
                  liked_by_profiles: targetPost.liked_by_profiles || {},
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
                const deptShort = (currentUser?.department || 'Engineering').replace('College of ', '');
                const actorAlias = `Someone from ${deptShort}`;
                const targetUserId = targetPost.author_id || targetPost.id;
                
                const userChannel = supabase.channel(`user:${targetUserId}:notifications`);
                userChannel.send({
                  type: 'broadcast',
                  event: 'new_notification',
                  payload: {
                    target_user_id: targetUserId,
                    post_id: postId,
                    type: 'like',
                    actor_alias: actorAlias,
                    actor_department: currentUser?.department || 'Engineering',
                    message_snippet: targetPost.message.slice(0, 60),
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
        reports: state.reports,
        bannedUserIds: state.bannedUserIds,
        wallNotifications: state.wallNotifications,
        myPostIds: state.myPostIds,
      }),
    }
  )
);
