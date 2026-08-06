'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, ChatRoom, ChatMessage, QueueFilter, UserReport, FreedomPost, UserFeedback, WallNotification, CampusMapPin } from '../types';
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

export const DEMO_MAP_PINS: CampusMapPin[] = [];


interface ChatStoreState {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  
  viewState: 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'campus_map';
  setViewState: (view: 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'campus_map') => void;

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
  mapPins: CampusMapPin[];
  addMapPin: (pinData: { spot_name: string; message: string; lat: number; lng: number; color?: string; author_alias?: string; department?: string }) => void;
  deleteMapPin: (pinId: string) => void;
  approveMapPin: (pinId: string) => void;
  likeMapPin: (pinId: string) => void;
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

  initSession: () => void;
  registerUser: (username: string, department: DepartmentType, avatarUrl?: string, bio?: string) => void;
  startSearch: () => void;
  cancelSearch: () => void;
  sendMessage: (text?: string, imageUrl?: string, replyTo?: ChatMessage['reply_to']) => void;
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

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      // existing state fields ...
      // ... (no change to previous lines up to here)
      // Clear all demo data (freedom posts, map pins, localStorage)
      clearAllDemoData: () => {
        // Reset state arrays
        set({ freedomPosts: [], mapPins: [] });
        // Remove from localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('capitalk_freedom_wall_v1');
            localStorage.removeItem('capitalk_map_pins_v1');
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
      setViewState: (view: 'ceased' | 'landing' | 'register' | 'queue' | 'chat' | 'admin' | 'freedom_wall' | 'music_wall' | 'campus_map') => {
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
      mapPins: [],

      actionToast: null,
      systemAnnouncement: null,
      showQueueTimeoutModal: false,
      setShowQueueTimeoutModal: (show: boolean) => set({ showQueueTimeoutModal: show }),
      feedbackList: [],
      showFeedbackModal: false,
      setShowFeedbackModal: (show: boolean) => set({ showFeedbackModal: show }),

      initSession: () => {
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

            const rawFreedom = localStorage.getItem('capitalk_freedom_wall_v1');
            const loadedFreedom: FreedomPost[] = rawFreedom ? JSON.parse(rawFreedom) : DEMO_FREEDOM_POSTS;

            const rawMapPins = localStorage.getItem('capitalk_map_pins_v1');
            const loadedMapPins: CampusMapPin[] = rawMapPins ? JSON.parse(rawMapPins) : DEMO_MAP_PINS;

            set({ reports: mergedReports, bannedUserIds: mergedBans, systemAnnouncement: loadedAnnouncement, freedomPosts: loadedFreedom, mapPins: loadedMapPins });
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(mergedReports));
            localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(mergedBans));
            if (!rawFreedom) {
              localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(DEMO_FREEDOM_POSTS));
            }
            if (!rawMapPins) {
              localStorage.setItem('capitalk_map_pins_v1', JSON.stringify(DEMO_MAP_PINS));
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
                          status: dbStatus,
                          created_at: row.created_at,
                          song_title: row.song_title,
                          song_artist: row.song_artist,
                          song_image_url: row.song_image_url,
                          song_preview_url: row.song_preview_url,
                          song_link: row.song_link,
                          dedicated_to: row.dedicated_to,
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
                  .select('user_id, device_id')
                  .then(({ data, error }) => {
                    if (data && data.length > 0 && !error) {
                      const dbBans = data.flatMap((b: any) => [b.user_id, b.device_id]).filter(Boolean);
                      const currentBans = get().bannedUserIds;
                      const mergedBans = [...new Set([...currentBans, ...dbBans])];
                      set({ bannedUserIds: mergedBans });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(mergedBans));
                      }
                    }
                  }, () => {});
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

            // 7-Second Background AJAX Auto-Sync Loop (Refreshes Freedom Wall, announcements, and messages without reloading page)
            setInterval(() => {
              try {
                // 1. Sync Freedom Wall Posts from Supabase / LocalStorage
                if (supabase && isSupabaseConfigured) {
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

                        const loadedFromDb: FreedomPost[] = data.map((row: any) => {
                          const localPost = localMap.get(row.id);
                          const dbLikedBy: string[] = Array.isArray(row.liked_by_users) ? row.liked_by_users : [];
                          const localLikedBy: string[] = localPost?.liked_by_users || [];
                          const useLikedBy = localLikedBy.length !== dbLikedBy.length ? localLikedBy : dbLikedBy;
                          
                          const rawColor = row.color || '#ffc900';
                          const parts = rawColor.split('||');
                          const dbColor = parts[0];
                          const dbStatus = parts[1] || row.status || 'approved';
                          let dbProfiles = typeof row.liked_by_profiles === 'object' && row.liked_by_profiles !== null ? row.liked_by_profiles : {};
                          try { if (parts[2]) dbProfiles = JSON.parse(parts[2]); } catch (e) {}

                          const mergedProfiles = {
                            ...(localPost?.liked_by_profiles || {}),
                            ...dbProfiles,
                          };
                          return {
                            id: row.id,
                            author_id: row.author_id,
                            author_alias: row.author_alias || 'Anon Student',
                            department: row.department || 'General',
                            message: row.message,
                            color: dbColor,
                            likes_count: useLikedBy.length,
                            liked_by_users: useLikedBy,
                            liked_by_profiles: mergedProfiles,
                            is_admin: !!row.is_admin,
                            is_pinned: !!row.is_pinned,
                            status: dbStatus,
                            created_at: row.created_at,
                            song_title: row.song_title,
                            song_artist: row.song_artist,
                            song_image_url: row.song_image_url,
                            song_preview_url: row.song_preview_url,
                            song_link: row.song_link,
                            dedicated_to: row.dedicated_to,
                          };
                        });
                        
                        const finalPosts = [...localOnlyPosts, ...loadedFromDb].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        if (JSON.stringify(finalPosts) !== JSON.stringify(store.freedomPosts)) {
                          set({ freedomPosts: finalPosts });
                          localStorage.setItem('capitalk_freedom_wall_v1', JSON.stringify(finalPosts));
                        }
                      }
                    }, () => {});
                } else {
                  const rawFreedom = localStorage.getItem('capitalk_freedom_wall_v1');
                  if (rawFreedom) {
                    const parsed: FreedomPost[] = JSON.parse(rawFreedom);
                    const store = get();
                    if (JSON.stringify(parsed) !== JSON.stringify(store.freedomPosts)) {
                      set({ freedomPosts: parsed });
                    }
                  }
                }

                // 2. Sync Reports, Bans & Feedback from Supabase Database
                if (supabase && isSupabaseConfigured) {
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
                        localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(dbReports));
                      }
                    }, () => {});

                  supabase
                    .from('banned_users')
                    .select('user_id')
                    .then(({ data }) => {
                      if (data) {
                        const dbBans = data.map((b: any) => b.user_id);
                        set({ bannedUserIds: dbBans });
                        localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(dbBans));
                      }
                    }, () => {});

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
                        localStorage.setItem('capitalk_feedback_v1', JSON.stringify(dbFeedback));
                      }
                    }, () => {});
                } else {
                  const rawReports = localStorage.getItem('capitalk_shared_reports_v5');
                  const rawBans = localStorage.getItem('capitalk_shared_bans_v5');
                  if (rawReports) {
                    const parsedReports = JSON.parse(rawReports);
                    if (JSON.stringify(parsedReports) !== JSON.stringify(get().reports)) {
                      set({ reports: parsedReports });
                    }
                  }
                  if (rawBans) {
                    const parsedBans = JSON.parse(rawBans);
                    if (JSON.stringify(parsedBans) !== JSON.stringify(get().bannedUserIds)) {
                      set({ bannedUserIds: parsedBans });
                    }
                  }
                }
              } catch (e) {}
            }, 5000);
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
        const trimmedUsername = username.trim();
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

          const partner = match.userOne.id === currentUser.id ? match.userTwo : match.userOne;

          const newRoom: ChatRoom = {
            id: match.roomId,
            user_one: currentUser,
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

      sendMessage: (text?: string, imageUrl?: string, replyTo?: ChatMessage['reply_to']) => {
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

        // If matched with a Bot partner, simulate realistic bot typing & response
        const partner = activeRoom.user_two.id === currentUser.id ? activeRoom.user_one : activeRoom.user_two;
        if (partner.id.startsWith('bot_')) {
          setTimeout(() => {
            set({ partnerTyping: true });
          }, 600);

          setTimeout(() => {
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
              partnerTyping: false,
            }));
          }, 2200);
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
        const { bannedUserIds } = get();
        const updatedBans = bannedUserIds.includes(userId)
          ? bannedUserIds.filter((id) => id !== userId)
          : [...bannedUserIds, userId];

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(updatedBans));
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            if (bannedUserIds.includes(userId)) {
              supabase.from('banned_users').delete().eq('user_id', userId).then(() => {}, () => {});
            } else {
              supabase.from('banned_users').upsert({ user_id: userId }).then(() => {}, () => {});
            }
          } catch (e) {}
        }

        set({
          bannedUserIds: updatedBans,
          actionToast: {
            type: bannedUserIds.includes(userId) ? 'announcement' : 'ban',
            message: bannedUserIds.includes(userId) ? 'User unbanned successfully.' : 'User added to ban list.',
          },
        });
      },

      addFreedomPost: async (postData, honeypot, deviceId) => {
        const { freedomPosts, currentUser } = get();
        const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');
        const newPost: FreedomPost = {
          id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          author_id: currentUserId,
          author_alias: postData.author_alias || 'Anon Student',
          department: postData.department || 'General',
          message: postData.message,
          color: postData.color || '#ffc900',
          song_title: postData.song_title,
          song_artist: postData.song_artist,
          song_image_url: postData.song_image_url,
          song_preview_url: postData.song_preview_url,
          song_link: postData.song_link,
          dedicated_to: postData.dedicated_to,
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
              const encodedColor = `${targetPost.color}||${targetPost.status}||${JSON.stringify(targetPost.liked_by_profiles || {})}`;
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

      addMapPin: (pinData) => {
        const { currentUser, mapPins } = get();
        const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');
        const isAdmin = (typeof window !== 'undefined' && localStorage.getItem('capitalk_admin_auth_v1') === 'true') || currentUser?.username?.toLowerCase().includes('admin');
        const initialStatus: 'pending' | 'approved' = isAdmin ? 'approved' : 'pending';

        const newPin: CampusMapPin = {
          id: 'pin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          author_id: currentUserId,
          author_alias: pinData.author_alias || (currentUser ? currentUser.username : 'Anon Student'),
          department: pinData.department || (currentUser ? currentUser.department : 'College of Engineering'),
          spot_name: pinData.spot_name.trim(),
          message: pinData.message.trim(),
          lat: pinData.lat,
          lng: pinData.lng,
          color: pinData.color || '#ffc900',
          likes_count: 0,
          liked_by_users: [],
          status: initialStatus,
          created_at: new Date().toISOString(),
        };

        const updated = [newPin, ...mapPins];

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_map_pins_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'MAP_PINS_UPDATE', pins: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase
              .from('campus_map_pins')
              .insert({
                id: newPin.id,
                author_id: newPin.author_id,
                author_alias: newPin.author_alias,
                department: newPin.department,
                spot_name: newPin.spot_name,
                message: newPin.message,
                lat: newPin.lat,
                lng: newPin.lng,
                color: newPin.color,
                likes_count: 0,
                liked_by_users: [],
                status: initialStatus,
              })
              .then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          mapPins: updated,
          actionToast: {
            type: 'announcement',
            message: isAdmin
              ? `📍 Pinpoint added at ${newPin.spot_name}!`
              : `⏳ Pinpoint submitted! Pending admin approval before appearing live.`,
          },
        });
      },

      approveMapPin: (pinId) => {
        const { mapPins } = get();
        const updated = mapPins.map((p) =>
          p.id === pinId ? { ...p, status: 'approved' as const } : p
        );

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_map_pins_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'MAP_PINS_UPDATE', pins: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase.from('campus_map_pins').update({ status: 'approved' }).eq('id', pinId).then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          mapPins: updated,
          actionToast: {
            type: 'announcement',
            message: '🟢 Campus map pinpoint approved & published live!',
          },
        });
      },

      deleteMapPin: (pinId) => {
        const { mapPins } = get();
        const updated = mapPins.filter((p) => p.id !== pinId);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_map_pins_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'MAP_PINS_UPDATE', pins: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            supabase.from('campus_map_pins').delete().eq('id', pinId).then(() => {}, () => {});
          } catch (e) {}
        }

        set({
          mapPins: updated,
          actionToast: {
            type: 'announcement',
            message: '🗑️ Campus map pin removed.',
          },
        });
      },

      likeMapPin: (pinId) => {
        const { currentUser, mapPins } = get();
        const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');

        const updated = mapPins.map((pin) => {
          if (pin.id !== pinId) return pin;
          const likedUsers = pin.liked_by_users || [];
          const hasLiked = likedUsers.includes(currentUserId);
          const newLiked = hasLiked
            ? likedUsers.filter((id) => id !== currentUserId)
            : [...likedUsers, currentUserId];

          const profiles = { ...(pin.liked_by_profiles || {}) };
          if (hasLiked) {
            delete profiles[currentUserId];
          } else {
            profiles[currentUserId] = {
              username: currentUser?.username || 'Anon Student',
              department: currentUser?.department || 'College of Engineering',
            };
          }

          return {
            ...pin,
            likes_count: Math.max(0, newLiked.length),
            liked_by_users: newLiked,
            liked_by_profiles: profiles,
          };
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_map_pins_v1', JSON.stringify(updated));
          } catch (e) {}
        }

        if (broadcastChannel) {
          try {
            broadcastChannel.postMessage({ type: 'MAP_PINS_UPDATE', pins: updated });
          } catch (e) {}
        }

        if (supabase && isSupabaseConfigured) {
          try {
            const target = updated.find((p) => p.id === pinId);
            if (target) {
              supabase
                .from('campus_map_pins')
                .update({
                  likes_count: target.likes_count,
                  liked_by_users: target.liked_by_users,
                  liked_by_profiles: target.liked_by_profiles || {},
                })
                .eq('id', pinId)
                .then(() => {}, () => {});
            }
          } catch (e) {}
        }

        set({ mapPins: updated });
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

        // 3. Send over Supabase Realtime Channel & save to Supabase Database for production deployments
        try {
          const { useBroadcastStore } = require('./useBroadcastStore');
          useBroadcastStore.getState().createBroadcast({
            owner_id: 'admin',
            owner_name: 'Campus Administrator',
            title: '📢 Campus Announcement',
            description: message.trim(),
            duration_minutes: 60,
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
        messages: state.messages,
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
