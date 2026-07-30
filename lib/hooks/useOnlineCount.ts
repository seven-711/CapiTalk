'use client';

import { useEffect, useState } from 'react';
import { getWsUrl } from '../realtime/matchmakingEngine';
import { supabase, isSupabaseConfigured } from '../supabase/client';

/**
 * Hook that provides live online student count across WebSockets, Supabase Realtime, or Local Mesh
 */
export function useOnlineCount(): number {
  const [count, setCount] = useState<number>(1);

  useEffect(() => {
    const url = getWsUrl();
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;
    let channel: any = null;

    // 1. If custom/local WebSocket URL is available
    if (url) {
      function connectWs() {
        try {
          ws = new WebSocket(url!);
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'ONLINE_COUNT') {
                setCount(data.count);
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
            setCount(total > 0 ? total : 1);
          })
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({ onlineAt: Date.now() });
            }
          });
      } catch (e) {
        setCount(1);
      }
    } 
    // 3. Local mesh fallback count
    else {
      try {
        const raw = localStorage.getItem('capitalk_shared_queue_v4');
        const queue: any[] = raw ? JSON.parse(raw) : [];
        setCount(Math.max(1, queue.length));
      } catch (e) {
        setCount(1);
      }
    }

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) ws.close();
      if (channel) {
        try {
          channel.untrack();
          channel.unsubscribe();
        } catch (e) {}
      }
    };
  }, []);

  return count;
}
