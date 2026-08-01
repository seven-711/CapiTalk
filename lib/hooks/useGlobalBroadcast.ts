'use client';

import { useEffect, useState } from 'react';
import { useBroadcastStore } from '../store/useBroadcastStore';

export function useGlobalBroadcast() {
  const {
    activeBroadcast,
    pendingBroadcasts,
    expiredBroadcasts,
    initBroadcasts,
    createBroadcast,
    trackImpression,
    trackClick,
    cancelBroadcast,
    skipActiveBroadcast,
    activatePendingBroadcast,
  } = useBroadcastStore();

  const [remainingTimeText, setRemainingTimeText] = useState<string>('');

  useEffect(() => {
    initBroadcasts();
  }, [initBroadcasts]);

  // Live countdown timer calculation for active broadcast
  useEffect(() => {
    if (!activeBroadcast) {
      setRemainingTimeText('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(activeBroadcast.ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemainingTimeText('00m 00s remaining');
        useBroadcastStore.getState().checkQueueExpiration();
      } else {
        const totalSecs = Math.floor(diff / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setRemainingTimeText(`${mins}m ${secs.toString().padStart(2, '0')}s remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBroadcast]);

  // Track impression once per active broadcast render
  useEffect(() => {
    if (activeBroadcast) {
      trackImpression(activeBroadcast.id);
    }
  }, [activeBroadcast?.id, trackImpression]);

  return {
    activeBroadcast,
    pendingBroadcasts,
    expiredBroadcasts,
    remainingTimeText,
    createBroadcast,
    trackClick,
    cancelBroadcast,
    skipActiveBroadcast,
    activatePendingBroadcast,
  };
}
