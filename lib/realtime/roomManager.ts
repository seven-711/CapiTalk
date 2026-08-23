'use client';

import { ChatMessage, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export type MessageCallback = (message: ChatMessage) => void;
export type TypingCallback = (isTyping: boolean) => void;
export type SkipCallback = (reason?: string) => void;
export type ThemeCallback = (theme: string) => void;
export type StatusCallback = (status: 'online' | 'idle' | 'offline') => void;

const MSG_STORAGE_PREFIX = 'capitalk_msgs_v4_';
const SIGNAL_STORAGE_PREFIX = 'capitalk_signal_v4_';

class RoomManager {
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private currentPartnerId: string | null = null;
  private knownMsgIds: Set<string> = new Set();
  private lastRawMessages: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private supabaseChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private unloadListener: (() => void) | null = null;

  private messageCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private skipCallbacks: Set<SkipCallback> = new Set();
  private themeCallbacks: Set<ThemeCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private gameCallbacks: Set<(data: any) => void> = new Set();
  private friendAddCallbacks: Set<(partnerProfile: UserProfile) => void> = new Set();

  private getSocket(): WebSocket | null {
    try {
      const { matchmakingEngine } = require('./matchmakingEngine');
      return matchmakingEngine.getWebSocket();
    } catch (e) {
      return null;
    }
  }

  public onThemeChange(cb: ThemeCallback) {
    this.themeCallbacks.add(cb);
    return () => { this.themeCallbacks.delete(cb); };
  }

  public onStatusChange(cb: StatusCallback) {
    this.statusCallbacks.add(cb);
    return () => { this.statusCallbacks.delete(cb); };
  }

  public onGameSignal(cb: (data: any) => void) {
    this.gameCallbacks.add(cb);
    return () => { this.gameCallbacks.delete(cb); };
  }

  public onFriendAdd(cb: (partnerProfile: UserProfile) => void) {
    this.friendAddCallbacks.add(cb);
    return () => { this.friendAddCallbacks.delete(cb); };
  }

  public joinRoom(
    roomId: string,
    user: UserProfile,
    onMessage: MessageCallback,
    onTyping: TypingCallback,
    onSkip: SkipCallback,
    _existingWs?: WebSocket | null
  ) {
    this.leaveRoom();

    this.currentRoomId = roomId;
    this.currentUserId = user.id;

    this.messageCallbacks.add(onMessage);
    this.typingCallbacks.add(onTyping);
    this.skipCallbacks.add(onSkip);

    // 1. Load initial persisted messages from localStorage
    this.loadPersistedMessages();

    // 2. Poll storage every 5s as a fallback safety net.
    this.syncInterval = setInterval(() => this.loadPersistedMessages(), 5000);

    // 3. Storage event listener for instant cross-tab/browser sync
    if (typeof window !== 'undefined') {
      this.storageListener = (e: StorageEvent) => {
        if (e.key === MSG_STORAGE_PREFIX + roomId) {
          this.loadPersistedMessages();
        } else if (e.key === SIGNAL_STORAGE_PREFIX + roomId && e.newValue) {
          try {
            const signal = JSON.parse(e.newValue);
            if (signal.senderId !== user.id) {
              if (signal.type === 'TYPING') {
                this.typingCallbacks.forEach((cb) => cb(signal.isTyping));
              } else if (signal.type === 'SKIP') {
                this.skipCallbacks.forEach((cb) => cb(signal.reason));
              } else if (signal.type === 'THEME') {
                this.themeCallbacks.forEach((cb) => cb(signal.theme || (signal.isDarkMode ? 'black' : 'maroon')));
              } else if (signal.type === 'STATUS') {
                this.statusCallbacks.forEach((cb) => cb(signal.status));
              } else if (signal.type === 'GAME') {
                this.gameCallbacks.forEach((cb) => cb(signal.gameData));
              } else if (signal.type === 'FRIEND_ADD') {
                this.friendAddCallbacks.forEach((cb) => cb(signal.partnerProfile || signal.sender));
              }
            }
          } catch (err) {}
        }
      };
      window.addEventListener('storage', this.storageListener);

      this.unloadListener = () => {
        // Synchronously notify room that this participant went offline / disconnected
        this.sendStatusSignal('offline');
        this.sendSkipSignal('disconnected');
      };
      window.addEventListener('beforeunload', this.unloadListener);
      window.addEventListener('pagehide', this.unloadListener);
    }

    // 4. Connect to Supabase Realtime channel if configured
    if (isSupabaseConfigured && supabase) {
      try {
        this.supabaseChannel = supabase.channel(`capitalk:room:${roomId}`);
        this.supabaseChannel
          .on('broadcast', { event: 'chat_message' }, ({ payload }: { payload: ChatMessage }) => {
            if (payload && payload.sender_id !== user.id) {
              this.persistMessage(payload);
              this.dispatchMessage(payload);
            }
          })
          .on('broadcast', { event: 'typing' }, ({ payload }: { payload: { senderId: string; isTyping: boolean } }) => {
            if (payload && payload.senderId !== user.id) {
              this.typingCallbacks.forEach((cb) => cb(payload.isTyping));
            }
          })
          .on('broadcast', { event: 'skip' }, ({ payload }: { payload: { senderId: string; reason?: string } }) => {
            if (payload && payload.senderId !== user.id) {
              this.skipCallbacks.forEach((cb) => cb(payload.reason));
            }
          })
          .on('broadcast', { event: 'theme' }, ({ payload }: { payload: { senderId: string; theme?: string; isDarkMode?: boolean } }) => {
            if (payload && payload.senderId !== user.id) {
              this.themeCallbacks.forEach((cb) => cb(payload.theme || (payload.isDarkMode ? 'black' : 'maroon')));
            }
          })
          .on('broadcast', { event: 'status' }, ({ payload }: { payload: { senderId: string; status: 'online' | 'idle' | 'offline' } }) => {
            if (payload && payload.senderId !== user.id) {
              this.statusCallbacks.forEach((cb) => cb(payload.status));
            }
          })
          .on('broadcast', { event: 'game' }, ({ payload }: { payload: { senderId: string; gameData: any } }) => {
            if (payload && payload.senderId !== user.id) {
              this.gameCallbacks.forEach((cb) => cb(payload.gameData));
            }
          })
          .on('broadcast', { event: 'friend_add' }, ({ payload }: { payload: { senderId: string; partnerProfile?: any; sender?: any } }) => {
            if (payload && payload.senderId !== user.id) {
              this.friendAddCallbacks.forEach((cb) => cb(payload.partnerProfile || payload.sender));
            }
          })
          .subscribe();
      } catch (e) {
        console.warn('[RoomManager] Supabase Realtime channel error', e);
      }
    }

    // 5. Query Supabase Database for existing room messages across sessions
    if (isSupabaseConfigured && supabase) {
      try {
        supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            if (error) return;
            if (data && data.length > 0) {
              data.forEach((row: any) => {
                const msg: ChatMessage = {
                  id: row.id,
                  room_id: row.room_id,
                  sender_id: row.sender_id,
                  sender_username: row.sender_username,
                  message: row.message,
                  image_url: row.image_url,
                  created_at: row.created_at,
                };
                this.persistMessage(msg);
                this.dispatchMessage(msg);
              });
            }
          }, () => {});
      } catch (e) {}
    }

    // 6. Connect to WebSocket server if available
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        userId: user.id,
        partnerId: this.currentPartnerId,
      }));
    }
  }

  public handleIncomingWsData(data: any) {
    switch (data.type) {
      case 'CHAT_MESSAGE': {
        const msg: ChatMessage = data.message;
        if (msg && msg.sender_id !== this.currentUserId) {
          this.persistMessage(msg);
          this.dispatchMessage(msg);
        }
        break;
      }
      case 'TYPING': {
        this.typingCallbacks.forEach((cb) => cb(data.isTyping));
        break;
      }
      case 'SKIP': {
        this.skipCallbacks.forEach((cb) => cb(data.reason));
        break;
      }
      case 'THEME': {
        this.themeCallbacks.forEach((cb) => cb(data.theme || (data.isDarkMode ? 'black' : 'maroon')));
        break;
      }
      case 'STATUS': {
        this.statusCallbacks.forEach((cb) => cb(data.status));
        break;
      }
      case 'GAME': {
        this.gameCallbacks.forEach((cb) => cb(data.gameData));
        break;
      }
      case 'PARTNER_LEFT': {
        this.skipCallbacks.forEach((cb) => cb(data.reason || 'disconnected'));
        break;
      }
      case 'GLOBAL_DM_MESSAGE': {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const bc = new BroadcastChannel('capitalk_global_realtime');
            bc.postMessage(data);
            setTimeout(() => bc.close(), 500);
          } catch {}
        }
        break;
      }
    }
  }

  public sendGameSignal(gameData: any) {
    if (!this.currentRoomId) return;

    const signal = { type: 'GAME', gameData, senderId: this.currentUserId, t: Date.now() + Math.random() };

    // Broadcast 1: LocalStorage signal
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNAL_STORAGE_PREFIX + this.currentRoomId, JSON.stringify(signal));
    }

    // Broadcast 2: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'GAME',
        roomId: this.currentRoomId,
        gameData,
      }));
    }

    // Broadcast 3: Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'game',
          payload: { senderId: this.currentUserId, gameData },
        });
      } catch (e) {}
    }
  }

  public sendThemeSignal(theme: string | boolean) {
    if (!this.currentRoomId) return;

    const themeVal = typeof theme === 'boolean' ? (theme ? 'black' : 'maroon') : theme;
    const signal = { type: 'THEME', theme: themeVal, senderId: this.currentUserId, t: Date.now() };

    // Broadcast 1: LocalStorage signal
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNAL_STORAGE_PREFIX + this.currentRoomId, JSON.stringify(signal));
    }

    // Broadcast 2: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'THEME',
        roomId: this.currentRoomId,
        theme,
      }));
    }

    // Broadcast 3: Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'theme',
          payload: { senderId: this.currentUserId, theme },
        });
      } catch (e) {}
    }
  }

  public sendStatusSignal(status: 'online' | 'idle' | 'offline') {
    if (!this.currentRoomId) return;

    const signal = { type: 'STATUS', status, senderId: this.currentUserId, t: Date.now() + Math.random() };

    // Broadcast 1: LocalStorage signal
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNAL_STORAGE_PREFIX + this.currentRoomId, JSON.stringify(signal));
    }

    // Broadcast 2: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'STATUS',
        roomId: this.currentRoomId,
        status,
      }));
    }

    // Broadcast 3: Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'status',
          payload: { senderId: this.currentUserId, status },
        });
      } catch (e) {}
    }
  }

  public sendFriendAddSignal(partnerProfile: UserProfile) {
    if (!this.currentRoomId) return;

    const signal = { type: 'FRIEND_ADD', partnerProfile, senderId: this.currentUserId, t: Date.now() };

    // Broadcast 1: LocalStorage signal
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNAL_STORAGE_PREFIX + this.currentRoomId, JSON.stringify(signal));
    }

    // Broadcast 2: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'FRIEND_ADD',
        roomId: this.currentRoomId,
        partnerProfile,
      }));
    }

    // Broadcast 3: Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'friend_add',
          payload: { senderId: this.currentUserId, partnerProfile },
        });
      } catch (e) {}
    }
  }

  public sendMessage(msg: ChatMessage) {
    if (!this.currentRoomId) return;

    this.persistMessage(msg);
    this.knownMsgIds.add(msg.id);

    // Broadcast 1: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        roomId: this.currentRoomId,
        message: msg,
      }));
    }

    // Broadcast 2: Supabase Realtime (for Netlify/Vercel production)
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'chat_message',
          payload: msg,
        });
      } catch (e) {}
    }
  }

  public sendTypingSignal(isTyping: boolean) {
    if (!this.currentRoomId) return;

    const signal = { type: 'TYPING', isTyping, senderId: this.currentUserId, t: Date.now() };

    // Broadcast 1: LocalStorage signal
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNAL_STORAGE_PREFIX + this.currentRoomId, JSON.stringify(signal));
    }

    // Broadcast 2: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'TYPING',
        roomId: this.currentRoomId,
        isTyping,
      }));
    }

    // Broadcast 3: Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { senderId: this.currentUserId, isTyping },
        });
      } catch (e) {}
    }
  }

  public sendSkipSignal(reason?: string) {
    if (!this.currentRoomId) return;

    const signal = { type: 'SKIP', reason, senderId: this.currentUserId, t: Date.now() };

    // Broadcast 1: LocalStorage signal
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNAL_STORAGE_PREFIX + this.currentRoomId, JSON.stringify(signal));
    }

    // Broadcast 2: WebSocket server
    const ws = this.getSocket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'SKIP',
        roomId: this.currentRoomId,
        reason,
      }));
    }

    // Broadcast 3: Supabase Realtime
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'skip',
          payload: { senderId: this.currentUserId, reason },
        });
      } catch (e) {}
    }
  }

  public injectSystemMessage(msg: ChatMessage) {
    if (typeof window === 'undefined') return;
    const roomId = msg.room_id || this.currentRoomId;
    if (!roomId) return;

    try {
      const key = MSG_STORAGE_PREFIX + roomId;
      const raw = localStorage.getItem(key);
      const msgs: ChatMessage[] = raw ? JSON.parse(raw) : [];
      if (!msgs.some((m) => m.id === msg.id)) {
        msgs.push(msg);
        const trimmed = msgs.slice(-200);
        localStorage.setItem(key, JSON.stringify(trimmed));
      }
    } catch (e) {}

    this.dispatchMessage(msg);
  }

  public persistMessage(msg: ChatMessage) {
    if (typeof window === 'undefined') return;
    const roomId = msg.room_id || this.currentRoomId;
    if (!roomId) return;

    // Reaction updates should be dispatched without persisting as empty text messages
    if (msg.reaction_update) {
      this.dispatchMessage(msg);
      return;
    }

    try {
      const key = MSG_STORAGE_PREFIX + roomId;
      const raw = localStorage.getItem(key);
      const msgs: ChatMessage[] = raw ? JSON.parse(raw) : [];
      if (!msgs.some((m) => m.id === msg.id)) {
        msgs.push(msg);
        const trimmed = msgs.slice(-200);
        localStorage.setItem(key, JSON.stringify(trimmed));
      }
    } catch (e) {}

    this.dispatchMessage(msg);

    // Persist asynchronously to Supabase PostgreSQL database
    if (isSupabaseConfigured && supabase) {
      try {
        supabase
          .from('messages')
          .upsert(
            {
              id: msg.id,
              room_id: roomId,
              sender_id: msg.sender_id,
              sender_username: msg.sender_username,
              message: msg.message || '',
              image_url: msg.image_url || null,
              created_at: msg.created_at,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          )
          .then(({ error }) => {
            if (error && error.code !== '23505' && !error.message.includes('duplicate key')) {
              console.warn('[DB Messages Insert Notice]', error.message);
            }
          }, () => {});
      } catch (e) {}
    }
  }

  private loadPersistedMessages() {
    if (typeof window === 'undefined' || !this.currentRoomId) return;
    try {
      const key = MSG_STORAGE_PREFIX + this.currentRoomId;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      // Skip parse + iteration entirely if storage hasn't changed since last check.
      // This is the common case and avoids O(n) work on every poll tick.
      if (raw === this.lastRawMessages) return;
      this.lastRawMessages = raw;
      const msgs: ChatMessage[] = JSON.parse(raw);
      msgs.forEach((msg) => this.dispatchMessage(msg));
    } catch (e) {}
  }

  private dispatchMessage(msg: ChatMessage) {
    if (this.knownMsgIds.has(msg.id)) return;
    this.knownMsgIds.add(msg.id);
    this.messageCallbacks.forEach((cb) => cb(msg));
  }

  public setPartnerId(partnerId: string) {
    this.currentPartnerId = partnerId;
  }

  public leaveRoom() {
    if (typeof window !== 'undefined' && this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    if (typeof window !== 'undefined' && this.unloadListener) {
      window.removeEventListener('beforeunload', this.unloadListener);
      window.removeEventListener('pagehide', this.unloadListener);
      this.unloadListener = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.supabaseChannel) {
      const channelToClean = this.supabaseChannel;
      this.supabaseChannel = null;
      setTimeout(() => {
        try {
          channelToClean.unsubscribe();
        } catch (e) {}
      }, 1000);
    }

    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.skipCallbacks.clear();
    this.themeCallbacks.clear();
    this.statusCallbacks.clear();
    this.knownMsgIds.clear();
    this.lastRawMessages = null;
    this.currentRoomId = null;
    this.currentUserId = null;
    this.currentPartnerId = null;
  }
}

export const roomManager = new RoomManager();
