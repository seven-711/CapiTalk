'use client';

import { ChatMessage, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export type MessageCallback = (message: ChatMessage) => void;
export type TypingCallback = (isTyping: boolean) => void;
export type SkipCallback = (reason?: string) => void;

const MSG_STORAGE_PREFIX = 'capitalk_msgs_v4_';
const SIGNAL_STORAGE_PREFIX = 'capitalk_signal_v4_';

class RoomManager {
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private currentPartnerId: string | null = null;
  private knownMsgIds: Set<string> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private supabaseChannel: any = null;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  private messageCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private skipCallbacks: Set<SkipCallback> = new Set();

  private getSocket(): WebSocket | null {
    try {
      const { matchmakingEngine } = require('./matchmakingEngine');
      return matchmakingEngine.getWebSocket();
    } catch (e) {
      return null;
    }
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

    // 2. Poll storage every 500ms for fallback tab/browser sync
    this.syncInterval = setInterval(() => this.loadPersistedMessages(), 500);

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
              }
            }
          } catch (err) {}
        }
      };
      window.addEventListener('storage', this.storageListener);
    }

    // 4. Connect to Supabase Realtime channel if configured (Netlify/Vercel production)
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
          .then(({ data }) => {
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
      case 'PARTNER_LEFT': {
        this.skipCallbacks.forEach((cb) => cb(data.reason || 'disconnected'));
        break;
      }
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

  public persistMessage(msg: ChatMessage) {
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

    // Persist asynchronously to Supabase PostgreSQL database
    if (isSupabaseConfigured && supabase) {
      try {
        supabase
          .from('messages')
          .insert({
            id: msg.id,
            room_id: roomId,
            sender_id: msg.sender_id,
            sender_username: msg.sender_username,
            message: msg.message || '',
            image_url: msg.image_url || null,
            created_at: msg.created_at,
          })
          .then(() => {}, () => {});
      } catch (e) {}
    }
  }

  private loadPersistedMessages() {
    if (typeof window === 'undefined' || !this.currentRoomId) return;
    try {
      const key = MSG_STORAGE_PREFIX + this.currentRoomId;
      const raw = localStorage.getItem(key);
      if (!raw) return;
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

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.unsubscribe();
      } catch (e) {}
      this.supabaseChannel = null;
    }

    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.skipCallbacks.clear();
    this.knownMsgIds.clear();
    this.currentRoomId = null;
    this.currentUserId = null;
    this.currentPartnerId = null;
  }
}

export const roomManager = new RoomManager();
