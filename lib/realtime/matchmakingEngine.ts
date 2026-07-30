'use client';

import { UserProfile, QueueFilter } from '../types';
import { BOT_PARTNERS } from '../constants';

export interface MatchPayload {
  roomId: string;
  userOne: UserProfile;
  userTwo: UserProfile;
}

type MatchFoundCallback = (match: MatchPayload) => void;
type BotMatchRequestCallback = (user: UserProfile, filter: QueueFilter) => void;

const WS_URL = 'ws://localhost:4000';

class MatchmakingEngine {
  private ws: WebSocket | null = null;
  private currentUser: UserProfile | null = null;
  private currentFilter: QueueFilter = 'anyone';
  private matchCallbacks: Set<MatchFoundCallback> = new Set();
  private botMatchCallbacks: Set<BotMatchRequestCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isSearching = false;
  private pingInterval: NodeJS.Timeout | null = null;

  private connect(onReady: () => void) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        onReady();
      } else {
        const prev = this.ws.onopen;
        this.ws.onopen = (e) => {
          if (prev) (prev as any)(e);
          onReady();
        };
      }
      return;
    }

    const ws = new WebSocket(WS_URL);
    this.ws = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to CapiTalk server');
      // Start ping heartbeat
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 20000);
      onReady();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (e) {
        console.error('[WS] Failed to parse message', e);
      }
    };

    ws.onclose = () => {
      console.warn('[WS] Disconnected');
      if (this.pingInterval) clearInterval(this.pingInterval);
      this.ws = null;

      // Auto-reconnect if still searching
      if (this.isSearching && this.currentUser) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          console.log('[WS] Reconnecting...');
          this.connect(() => {
            if (this.currentUser && this.isSearching) {
              this.sendJoin();
            }
          });
        }, 2000);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Connection error. Is the server running on port 4000?', err);
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
        this.matchCallbacks.forEach((cb) => cb(match));
        break;
      }

      case 'BOT_MATCH_FOUND': {
        // Server confirmed bot match request — generate match client-side
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

      default:
        break;
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
      // No server connection — do it locally
      this.triggerLocalBotMatch(user, filter);
    }
  }

  public onMatchFound(callback: MatchFoundCallback) {
    this.matchCallbacks.add(callback);
    return () => this.matchCallbacks.delete(callback);
  }

  public getWebSocket(): WebSocket | null {
    return this.ws;
  }

  public getWaitingCount(): number {
    // Server-side count — maintained via QUEUE_ACK updates
    return 0;
  }
}

export const matchmakingEngine = new MatchmakingEngine();
