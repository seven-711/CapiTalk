'use client';

import { UserProfile, QueueFilter } from '../types';
import { BOT_PARTNERS } from '../constants';
import { roomManager } from './roomManager';
import { supabase, isSupabaseConfigured } from '../supabase/client';

export interface MatchPayload {
  roomId: string;
  userOne: UserProfile;
  userTwo: UserProfile;
}

type MatchFoundCallback = (match: MatchPayload) => void;

const STORAGE_QUEUE_KEY = 'capitalk_shared_queue_v4';
const STORAGE_MATCH_KEY = 'capitalk_shared_matches_v4';

export function getWsUrl(): string | null {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${host}:4000`;
    }
    // Return null in production (e.g. Vercel) if no external WS server URL is configured
    return null;
  }
  return null;
}

class MatchmakingEngine {
  private ws: WebSocket | null = null;
  private currentUser: UserProfile | null = null;
  private currentFilter: QueueFilter = 'anyone';
  private matchCallbacks: Set<MatchFoundCallback> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private botFallbackTimer: NodeJS.Timeout | null = null;
  private supabaseChannel: any = null;
  private isSearching = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => this.handleStorageEvent(e));
    }
  }

  public connect(onReady?: () => void) {
    const wsUrl = getWsUrl();

    // If no WebSocket URL available (e.g. Vercel without custom WS server), use Supabase or fallback
    if (!wsUrl) {
      if (onReady) onReady();
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
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

    try {
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
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.ws = null;

        if (this.isSearching && this.currentUser) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connect(() => {
              if (this.currentUser && this.isSearching) {
                this.sendJoin();
              }
            });
          }, 2000);
        }
      };

      ws.onerror = () => {
        this.ws = null;
      };
    } catch (e) {
      console.warn('[WS] Transport unavailable, using Realtime/Fallback mode');
      this.ws = null;
      if (onReady) onReady();
    }
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
        this.notifyMatchFound(match);
        break;
      }

      case 'BOT_MATCH_FOUND': {
        this.isSearching = false;
        const { user, filter } = data;
        this.triggerLocalBotMatch(user, filter);
        break;
      }

      case 'ANNOUNCEMENT_BROADCAST': {
        const { announcement } = data;
        if (announcement) {
          try {
            const { useChatStore } = require('../store/useChatStore');
            const { roomManager } = require('./roomManager');
            const store = useChatStore.getState();
            const annMsgId = 'msg_ann_' + announcement.id;
            let updatedMessages = store.messages;
            if (store.activeRoom) {
              const annMsg = {
                id: annMsgId,
                room_id: store.activeRoom.id,
                sender_id: 'system_announcement',
                sender_username: '📢 Campus Announcement',
                message: announcement.message,
                created_at: new Date().toISOString(),
              };
              if (!updatedMessages.some((m: any) => m.id === annMsgId)) {
                updatedMessages = [...updatedMessages, annMsg];
              }
              try {
                roomManager.persistMessage(annMsg);
              } catch (e) {}
            }
            useChatStore.setState({
              systemAnnouncement: announcement,
              messages: updatedMessages,
              actionToast: { type: 'announcement', message: announcement.message },
            });
            if (typeof window !== 'undefined') {
              localStorage.setItem('capitalk_shared_announcement_v5', JSON.stringify(announcement));
            }
          } catch (e) {}
        }
        break;
      }

      case 'REPORT_BROADCAST': {
        const { report } = data;
        if (report) {
          try {
            const { useChatStore } = require('../store/useChatStore');
            const store = useChatStore.getState();
            if (!store.reports.some((r: any) => r.id === report.id)) {
              const updated = [report, ...store.reports];
              useChatStore.setState({ reports: updated });
              if (typeof window !== 'undefined') {
                localStorage.setItem('capitalk_shared_reports_v5', JSON.stringify(updated));
              }
            }
          } catch (e) {}
        }
        break;
      }

      case 'PONG':
        break;

      default: {
        roomManager.handleIncomingWsData(data);
        break;
      }
    }
  }

  public joinQueue(user: UserProfile, filter: QueueFilter) {
    this.currentUser = user;
    this.currentFilter = filter;
    this.isSearching = true;

    // 1. If WebSocket is available
    if (getWsUrl()) {
      this.connect(() => {
        this.sendJoin();
      });
    }

    // 2. If Supabase is configured, use Supabase Realtime Presence
    if (isSupabaseConfigured && supabase) {
      this.initSupabaseQueue(user, filter);
    }

    // 3. Fallback: Shared localStorage mesh & local scanner
    this.syncToLocalStorage(user, filter);
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      if (this.isSearching) {
        this.scanLocalStorageQueue(user, filter);
      }
    }, 1000);

    // 4. Clear any previous bot fallback timer
    if (this.botFallbackTimer) clearTimeout(this.botFallbackTimer);
  }

  private initSupabaseQueue(user: UserProfile, filter: QueueFilter) {
    if (!supabase) return;
    try {
      this.supabaseChannel = supabase.channel('capitalk:lobby', {
        config: { presence: { key: user.id } },
      });

      this.supabaseChannel
        .on('presence', { event: 'sync' }, () => {
          if (!this.isSearching) return;
          const presenceState = this.supabaseChannel.presenceState();
          this.processSupabasePresence(user, filter, presenceState);
        })
        .on('broadcast', { event: 'match_created' }, (payload: { payload: MatchPayload }) => {
          if (
            payload.payload.userOne.id === user.id ||
            payload.payload.userTwo.id === user.id
          ) {
            this.notifyMatchFound(payload.payload);
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await this.supabaseChannel.track({
              user,
              filter,
              joinedAt: Date.now(),
            });
          }
        });
    } catch (e) {
      console.warn('[Supabase Queue Error]', e);
    }
  }

  private processSupabasePresence(currentUser: UserProfile, myFilter: QueueFilter, presenceState: Record<string, any[]>) {
    const candidates: { user: UserProfile; filter: QueueFilter }[] = [];
    Object.values(presenceState).forEach((presences) => {
      presences.forEach((p) => {
        if (p.user && p.user.id !== currentUser.id) {
          candidates.push({ user: p.user, filter: p.filter });
        }
      });
    });

    const partner = candidates.find((c) => this.filterMatches(myFilter, c.filter, currentUser, c.user));
    if (partner) {
      const matchPayload: MatchPayload = {
        roomId: 'room_' + Math.random().toString(36).substring(2, 9),
        userOne: currentUser,
        userTwo: partner.user,
      };
      if (this.supabaseChannel) {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'match_created',
          payload: matchPayload,
        });
      }
      this.notifyMatchFound(matchPayload);
    }
  }

  private filterMatches(myFilter: QueueFilter, partnerFilter: QueueFilter, myUser: UserProfile, partnerUser: UserProfile): boolean {
    try {
      const { blockedUserIds, bannedUserIds } = require('../store/useChatStore').useChatStore.getState();
      if (blockedUserIds?.includes(partnerUser.id) || bannedUserIds?.includes(partnerUser.id)) {
        return false;
      }
    } catch (e) {}

    let myMatch = false;
    if (myFilter === 'anyone') myMatch = true;
    else if (myFilter === 'same' && partnerUser.department === myUser.department) myMatch = true;
    else if (myFilter === 'different' && partnerUser.department !== myUser.department) myMatch = true;

    let partnerMatch = false;
    if (partnerFilter === 'anyone') partnerMatch = true;
    else if (partnerFilter === 'same' && myUser.department === partnerUser.department) partnerMatch = true;
    else if (partnerFilter === 'different' && myUser.department !== partnerUser.department) partnerMatch = true;

    return myMatch && partnerMatch;
  }

  private scanLocalStorageQueue(user: UserProfile, filter: QueueFilter) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      const queueItems: any[] = raw ? JSON.parse(raw) : [];
      const partner = queueItems.find(
        (q) => q.user.id !== user.id && Date.now() - q.joinedAt < 120000 && this.filterMatches(filter, q.filter, user, q.user)
      );

      if (partner) {
        const matchPayload: MatchPayload = {
          roomId: 'room_' + Math.random().toString(36).substring(2, 9),
          userOne: user,
          userTwo: partner.user,
        };
        localStorage.setItem(STORAGE_MATCH_KEY, JSON.stringify({ ...matchPayload, t: Date.now() }));
        this.notifyMatchFound(matchPayload);
      }
    } catch (e) {
      // ignore
    }
  }

  private handleStorageEvent(e: StorageEvent) {
    if (e.key === STORAGE_MATCH_KEY && e.newValue && this.currentUser) {
      try {
        const matchPayload: MatchPayload = JSON.parse(e.newValue);
        if (
          matchPayload.userOne.id === this.currentUser.id ||
          matchPayload.userTwo.id === this.currentUser.id
        ) {
          this.notifyMatchFound(matchPayload);
        }
      } catch (err) {
        // ignore
      }
    }
  }

  private notifyMatchFound(match: MatchPayload) {
    this.isSearching = false;
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.botFallbackTimer) clearTimeout(this.botFallbackTimer);

    this.removeFromLocalStorage(match.userOne.id);
    this.removeFromLocalStorage(match.userTwo.id);

    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.untrack();
        this.supabaseChannel.unsubscribe();
      } catch (e) {}
      this.supabaseChannel = null;
    }

    this.matchCallbacks.forEach((cb) => cb(match));
  }

  public triggerLocalBotMatch(user: UserProfile, filter: QueueFilter) {
    let candidates = BOT_PARTNERS;
    try {
      const { blockedUserIds, bannedUserIds } = require('../store/useChatStore').useChatStore.getState();
      const filtered = BOT_PARTNERS.filter((b) => !blockedUserIds?.includes(b.id) && !bannedUserIds?.includes(b.id));
      if (filtered.length > 0) candidates = filtered;
    } catch (e) {}

    if (filter === 'same') {
      const same = candidates.filter((b) => b.department === user.department);
      if (same.length > 0) candidates = same;
    } else if (filter === 'different') {
      const diff = candidates.filter((b) => b.department !== user.department);
      if (diff.length > 0) candidates = diff;
    }
    const partner = candidates[Math.floor(Math.random() * candidates.length)];
    const match: MatchPayload = {
      roomId: 'bot_' + Math.random().toString(36).substring(2, 9),
      userOne: user,
      userTwo: partner,
    };
    this.notifyMatchFound(match);
  }

  public leaveQueue(userId: string) {
    this.isSearching = false;
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.botFallbackTimer) clearTimeout(this.botFallbackTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.removeFromLocalStorage(userId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'QUEUE_LEAVE', userId }));
    }

    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.untrack();
        this.supabaseChannel.unsubscribe();
      } catch (e) {}
      this.supabaseChannel = null;
    }
  }

  public triggerManualBotMatch(user: UserProfile, filter: QueueFilter) {
    this.isSearching = false;
    this.triggerLocalBotMatch(user, filter);
  }

  public onMatchFound(callback: MatchFoundCallback) {
    this.matchCallbacks.add(callback);
    return () => this.matchCallbacks.delete(callback);
  }

  private syncToLocalStorage(user: UserProfile, filter: QueueFilter) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      const existing: any[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((q) => q.user.id !== user.id && Date.now() - q.joinedAt < 120000);
      filtered.push({ user, filter, joinedAt: Date.now() });
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {}
  }

  private removeFromLocalStorage(userId: string) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY);
      const existing: any[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((q) => q.user.id !== userId);
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {}
  }

  public getWebSocket(): WebSocket | null {
    return this.ws;
  }

  public getWaitingCount(): number {
    return 1;
  }
}

export const matchmakingEngine = new MatchmakingEngine();
