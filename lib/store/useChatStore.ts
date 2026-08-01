'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, ChatRoom, ChatMessage, QueueFilter, UserReport } from '../types';
import { BOT_PARTNERS, BOT_RESPONSES, DepartmentType } from '../constants';
import { matchmakingEngine } from '../realtime/matchmakingEngine';
import { roomManager } from '../realtime/roomManager';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { checkProfanity } from '../utils/profanityFilter';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('capitalk_global_realtime');
  } catch (e) {}
}

interface ChatStoreState {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  
  viewState: 'landing' | 'register' | 'queue' | 'chat' | 'admin';
  setViewState: (view: 'landing' | 'register' | 'queue' | 'chat' | 'admin') => void;

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

  actionToast: { type: 'block' | 'report' | 'announcement' | 'ban' | 'error'; message: string } | null;
  systemAnnouncement: { id: string; message: string; timestamp: string } | null;
  showQueueTimeoutModal: boolean;
  setShowQueueTimeoutModal: (show: boolean) => void;

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
  blockPartner: () => void;
  triggerBotMatch: () => void;

  resolveReport: (reportId: string, action: 'dismiss' | 'ban') => void;
  toggleBanUser: (userId: string) => void;

  clearToast: () => void;
  broadcastAnnouncement: (message: string) => void;
  dismissAnnouncement: () => void;
}

let searchTimer: NodeJS.Timeout | null = null;
let unsubscribeMatch: (() => void) | null = null;

export const useChatStore = create<ChatStoreState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      setCurrentUser: (user: UserProfile | null) => set({ currentUser: user }),

      viewState: 'landing',
      setViewState: (view: 'landing' | 'register' | 'queue' | 'chat' | 'admin') => set({ viewState: view }),

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

      actionToast: null,
      systemAnnouncement: null,
      showQueueTimeoutModal: false,
      setShowQueueTimeoutModal: (show: boolean) => set({ showQueueTimeoutModal: show }),

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

            set({ reports: mergedReports, bannedUserIds: mergedBans, systemAnnouncement: loadedAnnouncement });
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(mergedReports));
            localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(mergedBans));

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
                  set({ systemAnnouncement: updated });
                } catch (err) {}
              }
            });

            // HTML5 BroadcastChannel multi-tab real-time listener
            if (broadcastChannel) {
              broadcastChannel.onmessage = (event) => {
                if (event.data?.type === 'ANNOUNCEMENT_BROADCAST') {
                  const announcement = event.data.announcement;
                  set({ systemAnnouncement: announcement });
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
                      set({ systemAnnouncement: announcement });
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('capitalk_shared_announcement_v5', JSON.stringify(announcement));
                      }
                    }
                  })
                  .subscribe();
              } catch (e) {}
            }

            // Brave / Privacy Shields Fallback Polling (1.5s interval for browsers blocking sockets/events)
            setInterval(() => {
              try {
                const rawAnn = localStorage.getItem('capitalk_shared_announcement_v5');
                const latestAnn = rawAnn ? JSON.parse(rawAnn) : null;
                const currentStore = get();

                const annChanged = JSON.stringify(latestAnn) !== JSON.stringify(currentStore.systemAnnouncement);
                if (annChanged) {
                  set({ systemAnnouncement: latestAnn });
                }
              } catch (e) {}
            }, 1500);
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
        const newUser: UserProfile = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          username: username.trim(),
          department,
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          bio: bio?.trim() || '',
          status: 'online',
          created_at: new Date().toISOString(),
        };
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

        set({
          blockedUserIds: [...new Set([...blockedUserIds, partner.id])],
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

      resolveReport: (reportId: string, action: 'dismiss' | 'ban') => {
        const { reports, bannedUserIds } = get();
        const targetReport = reports.find((r) => r.id === reportId);

        const updatedReports = reports.map((r) =>
          r.id === reportId ? { ...r, status: action === 'ban' ? ('reviewed' as const) : ('dismissed' as const) } : r
        );

        let updatedBans = bannedUserIds;
        if (action === 'ban' && targetReport) {
          updatedBans = [...new Set([...bannedUserIds, targetReport.reported_user_id])];
        }

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updatedReports));
            localStorage.setItem('capitalk_shared_bans_v5', JSON.stringify(updatedBans));
          } catch (e) {}
        }

        set({
          reports: updatedReports,
          bannedUserIds: updatedBans,
          actionToast: {
            type: action === 'ban' ? 'ban' : 'announcement',
            message: action === 'ban' ? '🚫 Student user banned from CapiTalk.' : 'Report dismissed.',
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

        set({
          bannedUserIds: updatedBans,
          actionToast: {
            type: bannedUserIds.includes(userId) ? 'announcement' : 'ban',
            message: bannedUserIds.includes(userId) ? 'User unbanned successfully.' : 'User added to ban list.',
          },
        });
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

        // 3. Send over Supabase Realtime Channel for production deployments (Vercel / Netlify / Cross-Origin)
        if (supabase && isSupabaseConfigured) {
          try {
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

        set({
          systemAnnouncement: announcementObj,
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
      }),
    }
  )
);
