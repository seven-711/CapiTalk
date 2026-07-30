'use client';

import { UserProfile, QueueFilter } from '../types';
import { BOT_PARTNERS } from '../constants';
import { roomManager } from './roomManager';

export interface MatchPayload {
  roomId: string;
  userOne: UserProfile;
  userTwo: UserProfile;
}

type MatchFoundCallback = (match: MatchPayload) => void;

export function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${protocol}//${host}:4000`;
    }
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:4000';
}

class MatchmakingEngine {
  private ws: WebSocket | null = null;
  private currentUser: UserProfile | null = null;
  private currentFilter: QueueFilter = 'anyone';
  private matchCallbacks: Set<MatchFoundCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isSearching = false;
  private pingInterval: NodeJS.Timeout | null = null;

  public connect(onReady?: () => void) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // Ensure onmessage handler is ALWAYS attached
      this.attachMessageHandler(this.ws);
      if (this.ws.readyState === WebSocket.OPEN) {
        if (onReady) onReady();
      } else {
        const prev = this.ws.onopen;
        this.ws.onopen = (e) => {
          if (prev) (prev as any)(e);
          if (onReady) onReady();
        };
      }
      return;
    }

    const wsUrl = getWsUrl();
    console.log('[WS] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    this.ws = ws;
    this.attachMessageHandler(ws);

    ws.onopen = () => {
      console.log('[WS] Connected to CapiTalk server');
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 20000);
      if (onReady) onReady();
    };

    ws.onclose = () => {
      console.warn('[WS] Disconnected');
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.ws = null;

      if (this.isSearching && this.currentUser) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          console.log('[WS] Reconnecting search...');
          this.connect(() => {
            if (this.currentUser && this.isSearching) {
              this.sendJoin();
            }
          });
        }, 2000);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Connection error:', err);
    };
  }

  private attachMessageHandler(ws: WebSocket) {
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (e) {
        console.error('[WS] Failed to parse message', e);
      }
    };
  }

  private sendJoin() {
    if (this.ws?.readyState === WebSocket.OPEN && this.currentUser) {
      this.ws.send(JSON.stringify({
        type: 'QUEUE_JOIN',
        user: this.currentUser,
        filter: this.currentFilter,
      }));
    }
  }

  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'MATCH_FOUND': {
        this.isSearching = false;
        const match: MatchPayload = {
          roomId: data.roomId,
          userOne: data.userOne,
          userTwo: data.userTwo,
        };
        console.log('[Matchmaker] Match found:', match.roomId);
        this.matchCallbacks.forEach((cb) => cb(match));
        break;
      }

      case 'BOT_MATCH_FOUND': {
        this.isSearching = false;
        const { user, filter } = data;
        this.triggerLocalBotMatch(user, filter);
        break;
      }

      case 'QUEUE_ACK': {
        console.log(`[Queue] Joined queue. Users waiting: ${data.queueSize}`);
        break;
      }

      case 'PONG':
        break;

      default: {
        // Pass room events (CHAT_MESSAGE, TYPING, SKIP, PARTNER_LEFT) to roomManager
        roomManager.handleIncomingWsData(data);
        break;
      }
    }
  }

  private triggerLocalBotMatch(user: UserProfile, filter: QueueFilter) {
    let candidates = BOT_PARTNERS;
    if (filter === 'same') {
      const same = BOT_PARTNERS.filter((b) => b.department === user.department);
      if (same.length > 0) candidates = same;
    } else if (filter === 'different') {
      const diff = BOT_PARTNERS.filter((b) => b.department !== user.department);
      if (diff.length > 0) candidates = diff;
    }
    const partner = candidates[Math.floor(Math.random() * candidates.length)];
    const match: MatchPayload = {
      roomId: 'bot_' + Math.random().toString(36).substring(2, 9),
      userOne: user,
      userTwo: partner,
    };
    this.matchCallbacks.forEach((cb) => cb(match));
  }

  public joinQueue(user: UserProfile, filter: QueueFilter) {
    this.currentUser = user;
    this.currentFilter = filter;
    this.isSearching = true;

    this.connect(() => {
      this.sendJoin();
    });
  }

  public leaveQueue(userId: string) {
    this.isSearching = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'QUEUE_LEAVE', userId }));
    }
  }

  public triggerManualBotMatch(user: UserProfile, filter: QueueFilter) {
    this.isSearching = false;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'BOT_MATCH_REQUEST', user, filter }));
    } else {
      this.triggerLocalBotMatch(user, filter);
    }
  }

  public onMatchFound(callback: MatchFoundCallback) {
    this.matchCallbacks.add(callback);
    return () => this.matchCallbacks.delete(callback);
  }

  public getWebSocket(): WebSocket | null {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    return this.ws;
  }

  public getWaitingCount(): number {
    return 0;
  }
}

export const matchmakingEngine = new MatchmakingEngine();
