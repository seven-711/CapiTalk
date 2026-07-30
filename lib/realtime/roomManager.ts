'use client';

import { ChatMessage, UserProfile } from '../types';

export type MessageCallback = (message: ChatMessage) => void;
export type TypingCallback = (isTyping: boolean) => void;
export type SkipCallback = () => void;

const WS_URL = 'ws://localhost:4000';
const MSG_STORAGE_PREFIX = 'capitalk_msgs_v3_';

class RoomManager {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private currentUserId: string | null = null;
  private currentPartnerId: string | null = null;
  private knownMsgIds: Set<string> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  private messageCallbacks: Set<MessageCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private skipCallbacks: Set<SkipCallback> = new Set();

  /**
   * Join an existing chat room. Re-uses the WebSocket already established by
   * matchmakingEngine when possible, otherwise creates a new connection.
   */
  public joinRoom(
    roomId: string,
    user: UserProfile,
    onMessage: MessageCallback,
    onTyping: TypingCallback,
    onSkip: SkipCallback,
    existingWs?: WebSocket | null
  ) {
    this.leaveRoom();

    this.currentRoomId = roomId;
    this.currentUserId = user.id;

    this.messageCallbacks.add(onMessage);
    this.typingCallbacks.add(onTyping);
    this.skipCallbacks.add(onSkip);

    // Load persisted messages from localStorage
    this.loadPersistedMessages();

    // Start 500ms sync interval so fresh localStorage writes are always picked up
    this.syncInterval = setInterval(() => this.loadPersistedMessages(), 500);

    // Reuse the matchmaking WS if it's the same connection and still open
    if (existingWs && existingWs.readyState === WebSocket.OPEN) {
      this.ws = existingWs;
      this.setupWsHandlers();

      // Tell the server we are now in a room
      this.ws.send(JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        userId: user.id,
        partnerId: this.currentPartnerId,
      }));
    } else {
      // Open a dedicated connection for the chat room
      this.openChatWs(roomId, user);
    }
  }

  private openChatWs(roomId: string, user: UserProfile) {
    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'ROOM_JOIN',
        roomId,
        userId: user.id,
        partnerId: this.currentPartnerId,
      }));

      // Heartbeat
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'PING' }));
      }, 20000);
    };

    this.setupWsHandlers();
  }

  private setupWsHandlers() {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWsMessage(data);
      } catch (e) {
        console.error('[RoomWS] Failed to parse message', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('[RoomWS] Connection closed');
    };
  }

  private handleWsMessage(data: any) {
    switch (data.type) {
      case 'CHAT_MESSAGE': {
        const msg: ChatMessage = data.message;
        if (msg && msg.sender_id !== this.currentUserId) {
          // Persist incoming message
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
        this.skipCallbacks.forEach((cb) => cb());
        break;
      }
      case 'PARTNER_LEFT': {
        this.skipCallbacks.forEach((cb) => cb());
        break;
      }
      case 'PONG':
        break;
    }
  }

  public sendMessage(msg: ChatMessage) {
    if (!this.currentRoomId) return;

    // Persist own message to localStorage
    this.persistMessage(msg);
    this.knownMsgIds.add(msg.id);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        roomId: this.currentRoomId,
        message: msg,
      }));
    }
  }

  public sendTypingSignal(isTyping: boolean) {
    if (!this.currentRoomId || !this.ws) return;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'TYPING',
        roomId: this.currentRoomId,
        isTyping,
      }));
    }
  }

  public sendSkipSignal() {
    if (!this.currentRoomId || !this.ws) return;
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'SKIP',
        roomId: this.currentRoomId,
      }));
    }
  }

  private persistMessage(msg: ChatMessage) {
    if (typeof window === 'undefined' || !this.currentRoomId) return;
    try {
      const key = MSG_STORAGE_PREFIX + this.currentRoomId;
      const raw = localStorage.getItem(key);
      const msgs: ChatMessage[] = raw ? JSON.parse(raw) : [];
      if (!msgs.some((m) => m.id === msg.id)) {
        msgs.push(msg);
        // Keep only last 200 messages
        const trimmed = msgs.slice(-200);
        localStorage.setItem(key, JSON.stringify(trimmed));
      }
    } catch (e) {
      console.error('[RoomManager] Error persisting message', e);
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
    } catch (e) {
      console.error('[RoomManager] Error loading persisted messages', e);
    }
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
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      // Don't close — it may be reused by matchmakingEngine
      this.ws.onmessage = null;
      this.ws = null;
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
