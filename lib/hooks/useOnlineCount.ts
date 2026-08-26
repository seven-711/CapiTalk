'use client';

import { useEffect, useState } from 'react';
import { getWsUrl } from '../realtime/matchmakingEngine';
import { supabase, isSupabaseConfigured } from '../supabase/client';

/**
 * Hook that provides live online student count across WebSockets, Supabase Realtime Presence,
 * and multi-tab BroadcastChannel mesh.
 */
export function useOnlineCount(): number {
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    const url = getWsUrl();
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;
    let channel: any = null;
    let bc: BroadcastChannel | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const tabId = 'tab_' + Math.random().toString(36).substring(2, 9);
    const activeTabs = new Map<string, number>();
    activeTabs.set(tabId, Date.now());

    // BroadcastChannel mesh for multi-tab synchronization
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('capitalk_lobby_presence');
        bc.onmessage = (e) => {
          if (e.data?.type === 'HEARTBEAT') {
            activeTabs.set(e.data.tabId, Date.now());
            pruneTabs();
          } else if (e.data?.type === 'LEAVE') {
            activeTabs.delete(e.data.tabId);
            pruneTabs();
          }
        };

        const sendHeartbeat = () => {
          if (unmounted) return;
          try {
            bc?.postMessage({ type: 'HEARTBEAT', tabId, time: Date.now() });
          } catch (e) {}
        };

        const pruneTabs = () => {
          const now = Date.now();
          for (const [id, ts] of activeTabs.entries()) {
            if (now - ts > 6000) {
              activeTabs.delete(id);
            }
          }
          if (!url && (!isSupabaseConfigured || !supabase)) {
            setCount(Math.max(1, activeTabs.size));
          }
        };

        sendHeartbeat();
        heartbeatTimer = setInterval(() => {
          sendHeartbeat();
          pruneTabs();
        }, 2500);
      } catch (e) {}
    }

    // 1. If custom/local WebSocket URL is available
    if (url) {
      function connectWs() {
        try {
          ws = new WebSocket(url!);
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'ONLINE_COUNT') {
                setCount(Math.max(1, data.count));
              }
            } catch (e) {}
          };
          ws.onclose = () => {
            if (!unmounted) reconnectTimer = setTimeout(connectWs, 3000);
          };
          ws.onerror = () => ws?.close();
        } catch (e) {
          // ignore
        }
      }
      connectWs();
    } 
    // 2. If Supabase Realtime is configured
    else if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase.channel('capitalk:lobby_presence');
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const total = Object.keys(state).length;
            setCount(Math.max(1, total));
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({ onlineAt: Date.now() });
            }
          });
      } catch (e) {
        setCount(Math.max(1, activeTabs.size));
      }
    } 
    // 3. Local mesh fallback count
    else {
      try {
        const raw = localStorage.getItem('capitalk_shared_queue_v4');
        const queue: any[] = raw ? JSON.parse(raw) : [];
        setCount(Math.max(activeTabs.size, queue.length, 1));
      } catch (e) {
        setCount(Math.max(1, activeTabs.size));
      }
    }

    return () => {
      unmounted = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      if (channel) {
        try {
          channel.untrack();
          channel.unsubscribe();
        } catch (e) {}
      }
      if (bc) {
        try {
          bc.postMessage({ type: 'LEAVE', tabId });
          bc.close();
        } catch (e) {}
      }
    };
  }, []);

  return count;
}
