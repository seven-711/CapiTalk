'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, ChatRoom, ChatMessage, QueueFilter, UserReport } from '../types';
import { BOT_PARTNERS, BOT_RESPONSES, DepartmentType } from '../constants';
import { matchmakingEngine } from '../realtime/matchmakingEngine';
import { roomManager } from '../realtime/roomManager';

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
  
  blockedUserIds: string[];
  reports: UserReport[];
  bannedUserIds: string[];

  initSession: () => void;
  registerUser: (username: string, department: DepartmentType, avatarUrl?: string, bio?: string) => void;
  startSearch: () => void;
  cancelSearch: () => void;
  sendMessage: (text?: string, imageUrl?: string, replyTo?: ChatMessage['reply_to']) => void;
  sendTypingSignal: (isTyping: boolean) => void;
  nextMatch: () => void;
  leaveRoom: () => void;
  reportPartner: (reason: string, description: string) => void;
  blockPartner: () => void;
  triggerBotMatch: () => void;

  resolveReport: (reportId: string, action: 'dismiss' | 'ban') => void;
  toggleBanUser: (userId: string) => void;
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

      blockedUserIds: [],
      reports: [],
      bannedUserIds: [],

      initSession: () => {
        const { activeRoom, currentUser, isSearching } = get();
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
            () => {
              set((state) => {
                if (state.partnerLeft) return state;
                const leaveMsg: ChatMessage = {
                  id: 'msg_leave_' + Date.now(),
                  room_id: activeRoom.id,
                  sender_id: 'system',
                  sender_username: 'CapiTalk System',
                  message: 'Your partner has left the conversation.',
                  created_at: new Date().toISOString(),
                };
                return { messages: [...state.messages, leaveMsg], partnerLeft: true };
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
        const { currentUser, queueFilter } = get();
        if (!currentUser) {
          set({ viewState: 'register' });
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
          });

          roomManager.setPartnerId(partner.id);
          roomManager.joinRoom(
            match.roomId,
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
            () => {
              set((state) => {
                if (state.partnerLeft) return state;
                const leaveMsg: ChatMessage = {
                  id: 'msg_leave_' + Date.now(),
                  room_id: match.roomId,
                  sender_id: 'system',
                  sender_username: 'CapiTalk System',
                  message: 'Your partner has left the conversation.',
                  created_at: new Date().toISOString(),
                };
                return { messages: [...state.messages, leaveMsg], partnerLeft: true };
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
        const { activeRoom, currentUser, messages } = get();
        if (!activeRoom || !currentUser) return;

        const newMsg: ChatMessage = {
          id: 'msg_' + Math.random().toString(36).substring(2, 9),
          room_id: activeRoom.id,
          sender_id: currentUser.id,
          sender_username: currentUser.username,
          message: text,
          image_url: imageUrl,
          reply_to: replyTo,
          created_at: new Date().toISOString(),
        };

        set({ messages: [...messages, newMsg] });

        roomManager.sendMessage(newMsg);
      },

      sendTypingSignal: (isTyping: boolean) => {
        roomManager.sendTypingSignal(isTyping);
      },

      nextMatch: () => {
        const { activeRoom } = get();
        if (activeRoom) {
          roomManager.sendSkipSignal();
          roomManager.leaveRoom();
        }
        set({ partnerLeft: false });
        get().startSearch();
      },

      leaveRoom: () => {
        const { currentUser } = get();
        if (currentUser) matchmakingEngine.leaveQueue(currentUser.id);
        roomManager.leaveRoom();
        set({ activeRoom: null, messages: [], viewState: 'queue', partnerLeft: false });
      },

      reportPartner: (reason: string, description: string) => {
        const { activeRoom, currentUser, reports } = get();
        if (!activeRoom || !currentUser) return;

        const newReport: UserReport = {
          id: 'rep_' + Math.random().toString(36).substring(2, 9),
          reporter_id: currentUser.id,
          reporter_username: currentUser.username,
          reported_user_id: activeRoom.user_two.id,
          reported_username: activeRoom.user_two.username,
          reason,
          description,
          status: 'pending',
          created_at: new Date().toISOString(),
        };

        set({ reports: [newReport, ...reports] });
        get().nextMatch();
      },

      blockPartner: () => {
        const { activeRoom, blockedUserIds } = get();
        if (!activeRoom) return;

        set({ blockedUserIds: [...blockedUserIds, activeRoom.user_two.id] });
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

        set({ reports: updatedReports, bannedUserIds: updatedBans });
      },

      toggleBanUser: (userId: string) => {
        const { bannedUserIds } = get();
        if (bannedUserIds.includes(userId)) {
          set({ bannedUserIds: bannedUserIds.filter((id) => id !== userId) });
        } else {
          set({ bannedUserIds: [...bannedUserIds, userId] });
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
      }),
    }
  )
);
