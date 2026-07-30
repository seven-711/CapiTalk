'use client';

import { useEffect, useState } from 'react';
import { getWsUrl } from '../realtime/matchmakingEngine';

/**
 * Lightweight hook that opens a dedicated WS connection solely to receive
 * ONLINE_COUNT broadcasts from the server. Reconnects automatically.
 */
export function useOnlineCount(): number {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    function connect() {
      const url = getWsUrl();
      ws = new WebSocket(url);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ONLINE_COUNT') {
            setCount(data.count);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return count;
}
