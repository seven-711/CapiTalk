'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { playLoudspeakerChime } from '../lib/utils/audioChime';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Megaphone, Music, Volume2, Flame, Heart, Sparkles, X } from 'lucide-react';

const seenSplashBroadcastIds = new Set<string>();

export const LoudspeakerLiveBanner: React.FC<{ inChatRoomOnly?: boolean }> = ({ inChatRoomOnly = false }) => {
  const {
    activeLoudspeaker,
    loudspeakerBookings,
    systemAnnouncement,
    reactToLoudspeaker,
    loudspeakerReactionBursts,
    setShowLoudspeakerModal,
  } = useChatStore();

  const [showSplashAnimation, setShowSplashAnimation] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [clockTick, setClockTick] = useState<number>(0);

  // Active 1-second ticker to re-evaluate real-time airtime and countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate whether there is a broadcast currently on air
  const currentBroadcast = useMemo(() => {
    const now = Date.now();

    // 1. Direct activeLoudspeaker from store
    if (activeLoudspeaker) {
      const schedTime = new Date(activeLoudspeaker.scheduled_at).getTime();
      const durMs = (activeLoudspeaker.duration_seconds || 30) * 1000;
      if ((schedTime + durMs) > now && activeLoudspeaker.status !== 'cancelled' && activeLoudspeaker.status !== 'completed') {
        return activeLoudspeaker;
      }
    }

    // 2. Direct timetable evaluation from loudspeakerBookings
    const dueBooking = (loudspeakerBookings || []).find((b) => {
      if (b.status === 'cancelled' || b.status === 'completed' || b.id === 'ls_sample_1') return false;
      const schedTime = new Date(b.scheduled_at).getTime();
      const durMs = (b.duration_seconds || 30) * 1000;
      return (schedTime - 1000) <= now && (schedTime + durMs) > now;
    });

    if (dueBooking) {
      return { ...dueBooking, status: 'live' as const };
    }

    // 3. System Announcement
    if (systemAnnouncement) {
      const schedTime = new Date(systemAnnouncement.timestamp).getTime();
      const durMs = 30 * 1000;
      if ((schedTime + durMs) > now) {
        return {
          id: systemAnnouncement.id,
          user_id: 'admin_sys',
          author_alias: 'CapiTalk Admin',
          department: 'Campus Administration',
          message: systemAnnouncement.message,
          theme_color: '#701a31',
          scheduled_at: systemAnnouncement.timestamp,
          duration_seconds: 30,
          status: 'live' as const,
          reaction_counts: { fire: 15, heart: 28, clap: 12, horn: 7 },
          created_at: systemAnnouncement.timestamp,
        };
      }
    }

    return null;
  }, [activeLoudspeaker, loudspeakerBookings, systemAnnouncement, clockTick]);

  // Compute live remaining duration in seconds
  const secondsRemaining = useMemo(() => {
    if (!currentBroadcast) return 0;
    const schedTime = new Date(currentBroadcast.scheduled_at).getTime();
    const durMs = (currentBroadcast.duration_seconds || 30) * 1000;
    const rem = Math.max(0, Math.ceil((schedTime + durMs - Date.now()) / 1000));
    return rem;
  }, [currentBroadcast, clockTick]);

  // Synchronize store and trigger splash animation on newly started broadcast
  useEffect(() => {
    if (!currentBroadcast) return;

    // Sync activeLoudspeaker into Zustand store if not already set
    if (!activeLoudspeaker || activeLoudspeaker.id !== currentBroadcast.id) {
      useChatStore.setState({ activeLoudspeaker: currentBroadcast });
    }

    const schedTime = new Date(currentBroadcast.scheduled_at).getTime();
    const elapsedMs = Date.now() - schedTime;

    // Trigger splash only for brand-new live broadcasts (< 4s elapsed)
    if (!seenSplashBroadcastIds.has(currentBroadcast.id) && elapsedMs >= -1500 && elapsedMs < 4000) {
      seenSplashBroadcastIds.add(currentBroadcast.id);
      try { playLoudspeakerChime(); } catch (e) {}
      setShowSplashAnimation(true);
      setIsFadingOut(false);

      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 3000);

      const splashTimer = setTimeout(() => {
        setShowSplashAnimation(false);
        setIsFadingOut(false);
      }, 3400);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(splashTimer);
      };
    } else {
      seenSplashBroadcastIds.add(currentBroadcast.id);
    }
  }, [currentBroadcast?.id]);

  const isDismissed = Boolean(currentBroadcast && dismissedId === currentBroadcast.id);
  const isLive = Boolean(currentBroadcast && !isDismissed && secondsRemaining > 0);

  // Default in-chatroom loudspeaker prompt banner below partner name
  if (!isLive) {
    if (!inChatRoomOnly) return null;

    return (
      <div className="w-full px-3 sm:px-5 py-2.5 bg-zinc-900/90 dark:bg-zinc-900/95 border-b border-zinc-800 text-white flex items-center justify-between gap-3 transition-all shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                Megaphone
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
                Visible to everyone in chat
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
              Book a short announcement for the chat room.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLoudspeakerModal(true)}
          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          Book
        </button>
      </div>
    );
  }

  const themeHex = currentBroadcast?.theme_color || '#701a31';

  return (
    <>
      {/* ── 1. Splash Megaphone Entrance Indicator (blurred backdrop for 3s emphasis, then fades out smoothly) ── */}
      {showSplashAnimation && (
        <div
          className={`fixed inset-0 z-50 bg-black/10 flex flex-col items-center justify-center pointer-events-none transition-all ${
            isFadingOut
              ? 'opacity-0 scale-95 fade-out zoom-in-95 scale-0 animate-out'
              : 'opacity-100 scale-100 animate-in fade-in'
          }`}
        >
          <div className="relative flex flex-col items-center justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 relative z-10">
              <DotLottieReact
                src="/animated-assets/megaphone.lottie"
                loop={false}
                autoplay={true}
                mode="bounce"
                speed={1.0}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Top Live Loudspeaker Banner (in active chatrooms & platform) ─────── */}
      <div className="w-full relative z-30 animate-in slide-in-from-top duration-300">
        <div
          style={{ backgroundColor: themeHex }}
          className="w-full px-3 sm:px-5 py-2.5 sm:py-3 text-white border-b border-black/30 shadow-[0_4px_12px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 transition-colors duration-300"
        >
          {/* Left: Indicator, Department Tag, Message, Song */}
          <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-full border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
                  Live
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold opacity-90 truncate">
                  {currentBroadcast?.department} • @{currentBroadcast?.author_alias}
                </span>
                {currentBroadcast?.song_title && (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-white/20 px-2 py-0.5 rounded-md border border-white/10">
                    <Music className="w-2.5 h-2.5" />
                    {currentBroadcast.song_title} {currentBroadcast.song_artist ? `• ${currentBroadcast.song_artist}` : ''}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 drop-shadow-xs">
                "{currentBroadcast?.message}"
              </p>
            </div>
          </div>

          {/* Right: Live Reactions, Timer, and Dismiss */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Reaction Buttons */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/20 shadow-2xs">
              <button
                type="button"
                onClick={() => reactToLoudspeaker('fire')}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="Send Fire Reaction"
              >
                <span>🔥</span>
                <span>{currentBroadcast?.reaction_counts?.fire || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => reactToLoudspeaker('heart')}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="Send Heart Reaction"
              >
                <span>❤️</span>
                <span>{currentBroadcast?.reaction_counts?.heart || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => reactToLoudspeaker('clap')}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="Send Clap Reaction"
              >
                <span>👏</span>
                <span>{currentBroadcast?.reaction_counts?.clap || 0}</span>
              </button>

              <button
                type="button"
                onClick={() => reactToLoudspeaker('horn')}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 active:scale-90 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                title="Send Megaphone Reaction"
              >
                <span>📢</span>
                <span>{currentBroadcast?.reaction_counts?.horn || 0}</span>
              </button>
            </div>

            {/* Countdown Badge */}
            <div className="px-2.5 py-1 bg-black/40 rounded-xl border border-white/20 text-[11px] font-bold tracking-wider flex items-center gap-1 shadow-2xs font-mono">
              <span>00:{secondsRemaining.toString().padStart(2, '0')}</span>
            </div>

            {/* Close / Dismiss */}
            <button
              type="button"
              onClick={() => {
                if (currentBroadcast) setDismissedId(currentBroadcast.id);
              }}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/50 text-white/80 hover:text-white transition-all cursor-pointer"
              aria-label="Dismiss banner"
              title="Dismiss for this broadcast"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Floating Reaction Bursts (live floating bubbles across screen) ── */}
      {loudspeakerReactionBursts && loudspeakerReactionBursts.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {loudspeakerReactionBursts.slice(-10).map((burst, idx) => {
            const emojis: Record<string, string> = {
              fire: '🔥',
              heart: '❤️',
              clap: '👏',
              horn: '📢',
            };
            const emojiChar = emojis[burst.emoji] || '🔥';
            const randomLeft = 20 + ((burst.timestamp + idx * 17) % 60);

            return (
              <div
                key={burst.id}
                style={{ left: `${randomLeft}%` }}
                className="absolute bottom-20 text-2xl sm:text-3xl animate-in fade-in slide-in-from-bottom-12 duration-1000 -translate-y-24 opacity-0 transition-opacity"
              >
                <div className="p-2 rounded-full bg-white/90 dark:bg-zinc-800/90 border-2 border-black dark:border-white/20 shadow-md transform -rotate-6 scale-110">
                  {emojiChar}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
