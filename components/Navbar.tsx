import React, { useState, useRef } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CoinMascot } from './CoinMascot';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Bell,
  Heart,
  MessageCircle,
  X,
  ArrowLeft,
  Menu,
  ExternalLink,
  UserX,
  Home,
  Search,
  Plus,
  Mail,
  User,
  Sparkles,
  UserMinus,
  MessageSquareText,
  Music,
  Sun,
  Moon,
  Megaphone,
} from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useOnlineCount } from '../lib/hooks/useOnlineCount';
import { WallNotification } from '../lib/types';
import { getAvatarForPseudonym } from '../lib/constants';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const FacebookIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      clipRule="evenodd"
    />
  </svg>
);

export const Navbar: React.FC = () => {
  const {
    currentUser,
    viewState,
    setViewState,
    freedomPosts,
    readFreedomPostIds,
    readMusicPostIds,
    markFreedomPostsAsRead,
    markMusicPostsAsRead,
    wallNotifications,
    markWallNotificationsAsRead,
    markSingleNotificationAsRead,
    clearWallNotifications,
    setTargetPostId,
    blockedUserIds,
    keptConnection,
    hasNewConnectionNotif,
    setHasNewConnectionNotif,
    pendingIncomingRequests,
    acceptPendingRequest,
    declinePendingRequest,
    keepPartner,
    removeKeptConnection,
    setActionToast,
    streakCount,
    isStreakTriggeredToday,
    setShowStreakCelebrationModal,
    showLoudspeakerModal,
    setShowLoudspeakerModal,
    activeLoudspeaker,
    themeMode,
    toggleThemeMode,
  } = useChatStore();

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeUser = mounted ? currentUser : null;
  const isDarkMode = mounted ? themeMode === 1 : false;

  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const onlineCount = useOnlineCount();

  // Calculate unread approved notes & songs based on read IDs (consistent with notifications)
  const approvedNotes = React.useMemo(() => {
    return (freedomPosts || []).filter(
      (p) => !p.song_title && (p.status === 'approved' || !p.status || p.is_admin)
    );
  }, [freedomPosts]);

  const approvedSongs = React.useMemo(() => {
    return (freedomPosts || []).filter(
      (p) => Boolean(p.song_title) && (p.status === 'approved' || !p.status || p.is_admin)
    );
  }, [freedomPosts]);

  const readFreedomSet = React.useMemo(() => new Set(readFreedomPostIds || []), [readFreedomPostIds]);
  const readMusicSet = React.useMemo(() => new Set(readMusicPostIds || []), [readMusicPostIds]);

  const unreadFreedomNotesCount = React.useMemo(() => {
    if (!mounted) return 0;
    if (viewState === 'freedom_wall' || viewState === 'add_note') return 0;
    if (readFreedomSet.size === 0 && approvedNotes.length > 0) {
      return Math.min(approvedNotes.length, 3);
    }
    return approvedNotes.filter((p) => !readFreedomSet.has(p.id)).length;
  }, [approvedNotes, readFreedomSet, viewState, mounted]);

  const unreadMusicNotesCount = React.useMemo(() => {
    if (viewState === 'music_wall' || viewState === 'dedicate_song') return 0;
    if (readMusicSet.size === 0 && approvedSongs.length > 0) {
      return Math.min(approvedSongs.length, 3);
    }
    return approvedSongs.filter((p) => !readMusicSet.has(p.id)).length;
  }, [approvedSongs, readMusicSet, viewState]);

  // Automatically mark as read when user opens Freedom Wall or Music Wall
  React.useEffect(() => {
    if (viewState === 'freedom_wall' || viewState === 'add_note') {
      markFreedomPostsAsRead();
    } else if (viewState === 'music_wall' || viewState === 'dedicate_song') {
      markMusicPostsAsRead();
    }
  }, [viewState, markFreedomPostsAsRead, markMusicPostsAsRead]);

  const displayNotifications = React.useMemo(() => {
    const seenSignatures = new Set<string>();
    const deduped: typeof wallNotifications = [];

    for (const notif of wallNotifications) {
      const actor = (notif.actor_username || notif.actor_alias || '').replace(/^@/, '').trim().toLowerCase();
      const postId = (notif.post_id || '').trim();
      const type = notif.type;
      let sigKey = `${type}_${postId}_${actor}`;

      if (type === 'comment') {
        const textSnippet = (notif.comment_text || notif.message_snippet || '').trim().slice(0, 30).toLowerCase();
        sigKey = `comment_${postId}_${actor}_${textSnippet}`;
      } else if (type === 'friend_add' || type === 'friend_remove') {
        sigKey = `${type}_${actor}`;
      } else if (type === 'dm') {
        const snippet = (notif.message_snippet || '').trim().slice(0, 30).toLowerCase();
        sigKey = `dm_${actor}_${snippet}`;
      }

      const dedupeKey = `${sigKey}_${notif.read ? 'read' : 'unread'}`;
      if (!seenSignatures.has(dedupeKey)) {
        seenSignatures.add(dedupeKey);
        deduped.push(notif);
      }
    }

    return deduped;
  }, [wallNotifications]);

  const unreadNotifs = displayNotifications.filter((n) => !n.read);
  const hasDedicatedFriendCard = displayNotifications.some((n) => n.type === 'friend_add' && !n.read);
  const unreadCount = unreadNotifs.length + (hasNewConnectionNotif && !hasDedicatedFriendCard ? 1 : 0);
  const unreadDmCount = displayNotifications.filter((n) => n.type === 'dm' && !n.read).length;
  const hasUnreadFriendMessage = hasNewConnectionNotif || unreadDmCount > 0;

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'just now';
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 60000) return 'just now';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Secret admin access: tap the logo 5 times within 2 seconds
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<NodeJS.Timeout | null>(null);
  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      setViewState('admin');
      return;
    }
    logoTapTimer.current = setTimeout(() => {
      logoTapCount.current = 0;
    }, 2000);
    if (logoTapCount.current === 1) setViewState('landing');
  };

  if (viewState === 'chat' || viewState === 'kept_connections') {
    return null;
  }

  return (
    <>
      {/* ── Top Brand Bar ─────────────────────────────────────────────────── */}
      <header className="w-full bg-[#f4f4f0]/95 dark:bg-[#0e0e11]/95 backdrop-blur-md border-b border-[#d1d5dc] dark:border-[#27272a] sticky p-2 top-0 z-40 transition-colors duration-200">
        <div className="max-w-[1200px] mx-auto px-2 sm:px-6 h-10 sm:h-14 flex items-center justify-between gap-1 sm:gap-2 relative">
          {/* Brand & Wordmark */}
          <div 
            onClick={handleLogoTap}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0"
          >
            <CoinMascot size={22} tiltAngle={-8} />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm sm:text-xl tracking-tight text-[#000000] dark:text-[#f4f4f6]">
                  CapiTalk
                </span>
              </div>
              <p className="text-[10px] text-[#242423] dark:text-neutral-400 font-medium hidden md:block">
                Connect Beyond Your Department
              </p>
            </div>
          </div>

          {/* Live Online Users / Visitors Indicator */}
          <div 
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 font-black text-[10px] sm:text-[11px] rounded-full tracking-wider uppercase shrink-0 select-none shadow-[2px_2px_0px_0px_rgba(16,185,129,0.2)] hover:shadow-[3px_3px_0px_0px_rgba(16,185,129,0.3)] transition-all"
            title={`${onlineCount} active ${onlineCount === 1 ? 'student / visitor' : 'students / visitors'} online right now`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate flex items-center gap-1">
              <span>{onlineCount}</span>
              <span className="hidden sm:inline">{onlineCount === 1 ? 'Student' : 'Students'}</span>
              <span>Online</span>
            </span>
          </div>

          {/* Desktop Streak Badge */}
          <button
            type="button"
            onClick={() => setShowStreakCelebrationModal(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#fff8e6] dark:hover:bg-neutral-800 text-black dark:text-white rounded-full transition-all cursor-pointer active:scale-95 shrink-0 select-none"
            title={`Daily Streak: ${streakCount} ${streakCount === 1 ? 'day' : 'days'}`}
          >
            <div className="w-10 h-5 flex items-center justify-center shrink-0 pointer-events-none">
              <DotLottieReact
                key={`streak-desktop-${isStreakTriggeredToday ? 'triggered' : 'untriggered'}-${streakCount}`}
                src={isStreakTriggeredToday ? '/animated-assets/triggeredStreak.lottie' : '/animated-assets/untriggeredStreak.lottie'}
                loop
                autoplay
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs font-black text-black dark:text-white">
              {streakCount}
            </span>
          </button>

          {/* Navigation Links & Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {viewState !== 'landing' && (
              <button
                type="button"
                onClick={() => setViewState('landing')}
                className="text-xs font-medium text-[#242423] dark:text-neutral-300 hover:text-black dark:hover:text-white px-2 py-1 rounded hidden md:block"
              >
                Home
              </button>
            )}

            <div className="hidden md:flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  markFreedomPostsAsRead();
                  setViewState('freedom_wall');
                }}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all relative ${
                  viewState === 'freedom_wall' || viewState === 'add_note'
                    ? 'bg-[#701a31] dark:bg-[#991b1b] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-[#18181b] text-black dark:text-white hover:bg-[#fff1f3] dark:hover:bg-[#271216] border border-gray-200 dark:border-[#27272a]'
                }`}
                title="Campus Freedom Wall"
              >
                <span> Wall</span>
                {unreadFreedomNotesCount > 0 && (
                  <span className="px-1 py-0.2 rounded-full text-[9px] font-black bg-[#e02424] text-white flex items-center justify-center border border-white shadow-2xs">
                    {unreadFreedomNotesCount > 9 ? '9+' : unreadFreedomNotesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  markMusicPostsAsRead();
                  setViewState('music_wall');
                }}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all relative ${
                  viewState === 'music_wall' || viewState === 'dedicate_song'
                    ? 'bg-[#701a31] dark:bg-[#991b1b] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-[#fff1f3] dark:bg-[#271216] text-black dark:text-white hover:bg-[#ffe3e8] dark:hover:bg-[#35181e] border border-gray-200 dark:border-[#27272a]'
                }`}
                title="Campus Music Dedications"
              >
                <span> Music </span>
                {unreadMusicNotesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#e02424] text-white flex items-center justify-center border border-white shadow-2xs">
                    {unreadMusicNotesCount > 9 ? '9+' : unreadMusicNotesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasNewConnectionNotif(false);
                  setViewState('kept_connections');
                }}
                className="text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer bg-white dark:bg-[#18181b] text-black dark:text-white hover:bg-[#fff1f3] dark:hover:bg-[#271216] border border-gray-200 dark:border-[#27272a] relative"
                title="Your Kept Connection & Messages"
              >
                <span>Contact</span>
                {hasUnreadFriendMessage && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e02424] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e02424] text-[7px] text-white font-black items-center justify-center">
                      !
                    </span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewState('blocked_users')}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                  viewState === 'blocked_users'
                    ? 'bg-[#701a31] dark:bg-[#991b1b] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-[#18181b] text-black dark:text-white hover:bg-red-50 dark:hover:bg-red-950/30 border border-gray-200 dark:border-[#27272a]'
                }`}
                title="Blocked Users"
              >
                <UserX className="w-3 h-3 text-red-600" />
                <span>Blocked</span>
                {blockedUserIds.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    viewState === 'blocked_users' ? 'bg-white text-[#701a31]' : 'bg-red-600 text-white'
                  }`}>
                    {blockedUserIds.length}
                  </span>
                )}
              </button>

              {/* Desktop Loudspeaker / PA Broadcast Button */}
              <button
                type="button"
                onClick={() => setShowLoudspeakerModal(true)}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer relative ${
                  activeLoudspeaker
                    ? 'bg-[#ffc900] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce'
                    : 'bg-white dark:bg-[#18181b] text-black dark:text-white hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-gray-200 dark:border-[#27272a]'
                }`}
                title="Campus Loudspeaker (PA Broadcast)"
              >
                <Megaphone className={`w-3.5 h-3.5 ${activeLoudspeaker ? 'text-black' : 'text-[#ffc900]'}`} />
                <span>Loudspeaker</span>
                {activeLoudspeaker && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                )}
              </button>

              {/* Desktop-Only Notification Bell Button */}
              <button
                type="button"
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className={`hidden md:inline-flex p-1.5 sm:p-2 rounded-full transition-all cursor-pointer relative ${
                  showNotifPopover ? 'bg-[#701a31] dark:bg-[#991b1b] text-white' : 'hover:bg-[#fff1f3] dark:hover:bg-neutral-800 text-black dark:text-white'
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" fill={showNotifPopover ? 'currentColor' : 'none'} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc900] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-[#e02424] text-[9px] font-black text-white items-center justify-center border border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </button>
            </div>

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={(e) => toggleThemeMode(e)}
              suppressHydrationWarning
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-black/15 dark:border-white/20 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-[#ffc900] hover:bg-[#fff1f3] dark:hover:bg-neutral-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-90 shrink-0"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffc900] animate-in spin-in-90 duration-300" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-800 dark:text-neutral-200 animate-in zoom-in-75 duration-300" />
              )}
            </button>

            {activeUser ? (
              <div className="hidden lg:flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-2 border border-[#d1d5dc] dark:border-[#27272a] bg-white dark:bg-[#18181b] rounded-full px-3 py-1 text-xs font-medium text-black dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[80px]">{activeUser.username}</span>
                  <span className="text-[#242423] dark:text-neutral-400 opacity-75 hidden xl:inline">({activeUser.department.replace('College of ', '')})</span>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setViewState('register')}
                  className="btn-gumroad-primary text-[11px] sm:text-xs px-2.5 py-1"
                >
                  <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Join</span>
                </button>
              </div>
            )}

            {/* Mobile Streak Badge (Next to Theme Toggle / Menu) */}
            <button
              type="button"
              onClick={() => setShowStreakCelebrationModal(true)}
              className="flex md:hidden items-center mr-1 hover:bg-[#fff8e6] dark:hover:bg-neutral-800 text-black dark:text-white rounded-xl transition-all active:scale-95 shrink-0 select-none cursor-pointer"
              title={`Daily Streak: ${streakCount} ${streakCount === 1 ? 'day' : 'days'}`}
            >
              <div className="w-8 h-5 flex items-center justify-center shrink-0 pointer-events-none">
                <DotLottieReact
                  key={`streak-mobile-${isStreakTriggeredToday ? 'triggered' : 'untriggered'}-${streakCount}`}
                  src={isStreakTriggeredToday ? '/animated-assets/triggeredStreak.lottie' : '/animated-assets/untriggeredStreak.lottie'}
                  loop
                  autoplay
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs mt-1 font-black text-black dark:text-white">
                {streakCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation Bar (Icon Only) ───────────────────────── */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#f4f4f0]/95 dark:bg-[#0e0e11]/95 backdrop-blur-md border-t border-[#d1d5dc] dark:border-[#27272a] px-2 sm:px-3 py-2 flex items-center justify-around md:hidden pb-[max(0.65rem,env(safe-area-inset-bottom))] transition-colors duration-200"
      >
        {/* 1. Home Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            setViewState('landing');
          }}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'landing' && !showNotifPopover
              ? 'bg-[#000000] dark:bg-white text-[#ffffff] dark:text-black'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Home"
        >
          <Home className="w-5 h-5" fill={viewState === 'landing' && !showNotifPopover ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>

        {/* 2. Search / Matchmaking Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            setViewState('queue');
          }}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'queue' && !showNotifPopover
              ? 'bg-[#000000] dark:bg-white text-[#ffffff] dark:text-black'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Search and Matchmaking"
        >
          <Search className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* 3. Freedom Wall Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            markFreedomPostsAsRead();
            setViewState('freedom_wall');
          }}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 relative ${
            (viewState === 'freedom_wall' || viewState === 'add_note') && !showNotifPopover
              ? 'bg-[#000000] dark:bg-white text-[#ffffff] dark:text-black ring-2 ring-[#000000]/20 dark:ring-white/20'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Freedom Wall"
          title="Campus Freedom Wall"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquareText className="w-5 h-5 stroke-[2.2]" />
            {unreadFreedomNotesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc900] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#e02424] border-1.5 border-white text-[8px] text-white font-black items-center justify-center shadow-xs">
                  {unreadFreedomNotesCount > 9 ? '9+' : unreadFreedomNotesCount}
                </span>
              </span>
            )}
          </div>
        </button>

        {/* 4. Music Wall Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            markMusicPostsAsRead();
            setViewState('music_wall');
          }}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 relative ${
            (viewState === 'music_wall' || viewState === 'dedicate_song') && !showNotifPopover
              ? 'bg-[#000000] dark:bg-white text-[#ffffff] dark:text-black ring-2 ring-[#000000]/20 dark:ring-white/20'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Music Wall"
          title="Campus Music Wall"
        >
          <div className="relative flex items-center justify-center">
            <Music className="w-5 h-5 stroke-[2.2]" />
            {unreadMusicNotesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc900] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#e02424] border-1.5 border-white text-[8px] text-white font-black items-center justify-center shadow-xs">
                  {unreadMusicNotesCount > 9 ? '9+' : unreadMusicNotesCount}
                </span>
              </span>
            )}
          </div>
        </button>

        {/* 5. Campus Loudspeaker Button */}
        <button
          type="button"
          onClick={() => setShowLoudspeakerModal(true)}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 relative ${
            showLoudspeakerModal
              ? 'bg-[#ffc900] text-black shadow-xs'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Campus Loudspeaker"
          title="Campus Loudspeaker (PA Broadcast)"
        >
          <div className="relative flex items-center justify-center">
            <Megaphone className={`w-5 h-5 stroke-[2.2] ${activeLoudspeaker ? 'text-[#ffc900] animate-bounce' : ''}`} />
            {activeLoudspeaker && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#e02424] border-1.5 border-white text-[8px] text-white font-black items-center justify-center shadow-xs">
                  •
                </span>
              </span>
            )}
          </div>
        </button>

        {/* 6. Real-Time Notification Bell Icon */}
        <button
          type="button"
          onClick={() => setShowNotifPopover(!showNotifPopover)}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 relative ${
            showNotifPopover
              ? 'bg-[#000000] dark:bg-white text-[#ffffff] dark:text-black'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Notifications"
        >
          <div className="relative flex items-center justify-center">
            <Bell className="w-5 h-5 stroke-[2]" fill={showNotifPopover ? 'currentColor' : 'none'} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc900] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#e02424] border-1.5 border-white text-[8px] text-white font-black items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </div>
        </button>

        {/* 5. Messages / Kept Connections Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            setHasNewConnectionNotif(false);
            setViewState('kept_connections');
          }}
          className="p-2 rounded-full transition-all cursor-pointer active:scale-95 relative text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800"
          aria-label="Kept Connections"
          title="Kept Contact & Messages"
        >
          <div className="relative flex items-center justify-center">
            <Mail className="w-5 h-5 stroke-[2]" fill="none" />
            {hasUnreadFriendMessage ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e02424] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#e02424] border-1.5 border-white text-[8px] text-white font-black items-center justify-center shadow-xs">
                  {unreadDmCount > 1 ? (unreadDmCount > 9 ? '9+' : unreadDmCount) : '!'}
                </span>
              </span>
            ) : null}
          </div>
        </button>

        {/* 6. Profile / User Account Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            setViewState('register');
          }}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'register' && !showNotifPopover
              ? 'bg-[#000000] dark:bg-white text-[#ffffff] dark:text-black'
              : 'text-[#242423] dark:text-neutral-300 hover:text-[#000000] dark:hover:text-white hover:bg-[#ffffff] dark:hover:bg-neutral-800'
          }`}
          aria-label="Profile"
        >
          {activeUser?.avatar_url ? (
            <img
              src={activeUser.avatar_url}
              alt={activeUser.username}
              className={`w-5 h-5 rounded-full object-cover border ${
                viewState === 'register' ? 'border-[#ffffff]' : 'border-[#d1d5dc] dark:border-[#27272a]'
              }`}
            />
          ) : (
            <User className="w-5 h-5 stroke-[2]" fill={viewState === 'register' ? 'currentColor' : 'none'} />
          )}
        </button>
      </nav>

      {/* ── Real-Time Notifications Modal / Popover Sheet ───────────────────── */}
      {showNotifPopover && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-start sm:justify-end p-0 sm:p-4 sm:pt-16 animate-in fade-in duration-150">
          <div
            className="w-full sm:max-w-md bg-[#f4f4f0] dark:bg-[#0e0e11] border-t-4 sm:border-4 border-black dark:border-[#27272a] rounded-t-3xl sm:rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-top-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-white dark:bg-[#18181b] border-b-2 border-black dark:border-[#27272a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#701a31] text-white flex items-center justify-center border border-black shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-black dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 bg-[#ffc900] text-black rounded-full border border-black">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-neutral-400 font-semibold">Campus wall reactions &amp; friend updates</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markWallNotificationsAsRead();
                      setHasNewConnectionNotif(false);
                    }}
                    className="text-[11px] font-black text-[#701a31] dark:text-[#ff90e8] hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifPopover(false)}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-black hover:text-white border border-black dark:border-white/20 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5 max-h-[60vh] custom-scrollbar">
              {/* Active Friend Connection Card (only shown if not already present in list) */}
              {hasNewConnectionNotif && keptConnection && !displayNotifications.some((n) => n.type === 'friend_add' && n.actor_username?.toLowerCase() === keptConnection.username.toLowerCase() && !n.read) && (
                <div
                  onClick={() => {
                    setHasNewConnectionNotif(false);
                    setShowNotifPopover(false);
                    setViewState('kept_connections');
                  }}
                  className="p-3 bg-[#fff1f3] dark:bg-[#271216] border-2 border-black dark:border-white/20 rounded-2xl cursor-pointer hover:bg-[#ffe3e8] dark:hover:bg-[#34181d] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <img
                        src={keptConnection.avatar_url || getAvatarForPseudonym(keptConnection.username)}
                        alt={keptConnection.username}
                        className="w-10 h-10 rounded-full border-2 border-black dark:border-white/20 object-cover bg-amber-50 shrink-0 shadow-xs"
                      />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#701a31] text-white flex items-center justify-center text-[9px] border border-black dark:border-white/20 shadow-2xs">
                        ✨
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-black dark:text-white">New Friend Connection</p>
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#00e599] text-black rounded-full border border-black">
                          Connected
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 dark:text-zinc-200 font-bold mt-0.5">
                        <span className="text-[#701a31] dark:text-rose-400">@{keptConnection.username}</span> added you as a friend!
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-semibold mt-1">Tap to chat in direct messages →</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wall Notifications */}
              {displayNotifications.length > 0 ? (
                displayNotifications.map((item) => {
                  const rawUsername = item.actor_username || (item.actor_alias?.startsWith('@') ? item.actor_alias.slice(1) : (item.actor_alias?.startsWith('Someone from') ? '' : item.actor_alias)) || 'Student';
                  const displayName = item.actor_username
                    ? (item.actor_username.startsWith('@') ? item.actor_username : `@${item.actor_username}`)
                    : item.actor_alias && !item.actor_alias.startsWith('Someone from')
                    ? (item.actor_alias.startsWith('@') ? item.actor_alias : `@${item.actor_alias}`)
                    : '@Student';
                  const avatarUrl = item.actor_avatar || (item.type === 'admin_remark' ? '/avatars/coin-left.jpg' : getAvatarForPseudonym(rawUsername));

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        markSingleNotificationAsRead(item.id);
                        setShowNotifPopover(false);
                        if (item.type === 'friend_add' || item.type === 'dm' || item.type === 'friend_remove') {
                          setViewState('kept_connections');
                        } else if (item.post_id?.includes('midterm')) {
                          setViewState('midterm_szn');
                        } else {
                          setTargetPostId(item.post_id);
                          setViewState('freedom_wall');
                        }
                      }}
                      className={`p-3 rounded-2xl transition-all cursor-pointer relative ${
                        item.read
                          ? 'bg-[#f4f4f6]/80 dark:bg-zinc-800/60 hover:bg-[#eaebee] dark:hover:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 opacity-80 hover:opacity-100 shadow-none'
                          : 'bg-[#fffdf5] dark:bg-[#1f1f23] hover:bg-[#fff9e6] dark:hover:bg-zinc-800 border-2 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)] text-black dark:text-white'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="relative shrink-0">
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className={`w-9 h-9 rounded-full border-2 border-black dark:border-zinc-700 object-cover bg-amber-50 shadow-xs transition-opacity ${
                              item.read ? 'opacity-70 grayscale-[25%]' : 'opacity-100'
                            }`}
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', getAvatarForPseudonym(rawUsername));
                            }}
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-[9px] border border-black dark:border-white/20 shadow-2xs">
                            {item.type === 'like' && '💖'}
                            {item.type === 'comment' && '💬'}
                            {item.type === 'friend_add' && '👥'}
                            {item.type === 'friend_request_pending' && '⏳'}
                            {item.type === 'friend_remove' && '💔'}
                            {item.type === 'dm' && '💌'}
                            {item.type === 'admin_remark' && '👑'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5 mb-0.5">
                            <p className={`text-xs truncate ${item.read ? 'font-bold text-zinc-700 dark:text-zinc-300' : 'font-black text-black dark:text-white'}`}>
                              {item.type === 'like' && `${displayName} reacted`}
                              {item.type === 'comment' && `${displayName} commented`}
                              {item.type === 'friend_add' && `${displayName} added you`}
                              {item.type === 'friend_request_pending' && `${displayName} sent a friend request`}
                              {item.type === 'friend_remove' && `${displayName} unfriended you`}
                              {item.type === 'dm' && `Message from ${displayName}`}
                              {item.type === 'admin_remark' && 'CapiTalk Admin'}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.read ? (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold text-zinc-500 dark:text-zinc-400 bg-zinc-200/90 dark:bg-zinc-700/80 px-1.5 py-0.2 rounded-md border border-zinc-300 dark:border-zinc-600">
                                  ✓ Read
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-[#701a31] bg-[#ffc900] px-1.5 py-0.2 rounded-full border border-black shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#701a31] animate-ping" />
                                  New
                                </span>
                              )}
                              <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-medium">
                                {formatRelativeTime(item.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className={`text-xs font-medium line-clamp-2 mt-0.5 ${item.read ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                            {item.comment_text || item.admin_remark || item.message_snippet}
                          </p>

                          {/* Pending Friend Request Action (Slot Full: Switch / Decline) */}
                          {item.type === 'friend_request_pending' && (
                            <div className="pt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetReq = pendingIncomingRequests.find(
                                    (r) => r.sender_username?.toLowerCase() === rawUsername.toLowerCase() || r.id === item.post_id
                                  ) || pendingIncomingRequests[0];

                                  if (targetReq) {
                                    acceptPendingRequest(targetReq.id);
                                  } else if (item.actor_username) {
                                    keepPartner({
                                      id: item.actor_username,
                                      username: item.actor_username,
                                      department: (item.actor_department as any) || 'General',
                                      avatar_url: item.actor_avatar,
                                      status: 'online',
                                    }, true);
                                  }
                                  markSingleNotificationAsRead(item.id);
                                  setActionToast({
                                    type: 'info',
                                    message: `✓ Switched and connected with @${displayName}!`,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#00e599] hover:bg-[#00c985] text-black text-[11px] font-black rounded-xl border border-black shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Unfriend current connection and switch to this friend"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{keptConnection ? `Switch to @${displayName}` : `Accept @${displayName}`}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetReq = pendingIncomingRequests.find(
                                    (r) => r.sender_username?.toLowerCase() === rawUsername.toLowerCase() || r.id === item.post_id
                                  ) || pendingIncomingRequests[0];

                                  if (targetReq) {
                                    declinePendingRequest(targetReq.id);
                                  }
                                  markSingleNotificationAsRead(item.id);
                                  setActionToast({
                                    type: 'info',
                                    message: `Declined request from @${displayName}.`,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          )}

                          {/* Unfriend Back / Find Match Action for friend_remove Notifications */}
                          {item.type === 'friend_remove' && (
                            <div className="pt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeKeptConnection();
                                  markSingleNotificationAsRead(item.id);
                                  setActionToast({
                                    type: 'info',
                                    message: `✓ Unfriended ${displayName}. Your 1 friend slot is now open!`,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[11px] font-black rounded-xl border border-rose-300 dark:border-rose-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Unfriend back and clear connection"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>Unfriend back</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNotifPopover(false);
                                  setViewState('queue');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ffc900] hover:bg-[#ffd633] text-black text-[11px] font-black rounded-xl border border-black shadow-2xs transition-all active:scale-95 cursor-pointer"
                              >
                                <span>Find someone →</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : !hasNewConnectionNotif ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 border-2 border-black dark:border-white/20 flex items-center justify-center shadow-xs">
                    <Bell className="w-6 h-6 text-gray-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-xs font-black text-black dark:text-white">No notifications yet</p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 max-w-xs font-medium">
                    When someone reacts to your confession on the Freedom Wall or adds you as a friend, updates will show up here in real time!
                  </p>
                </div>
              ) : null}
            </div>

            {/* Bottom Actions */}
            {displayNotifications.length > 0 && (
              <div className="p-3 bg-white dark:bg-[#18181b] border-t border-black/10 dark:border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={clearWallNotifications}
                  className="text-[10px] text-gray-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-bold cursor-pointer"
                >
                  Clear all notifications
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifPopover(false)}
                  className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs font-black rounded-xl cursor-pointer hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hamburger Slide-out Drawer */}
      {showMenuDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="bg-[#f4f4f0] dark:bg-[#18181b] border-l-4 border-black dark:border-white/20 w-full max-w-sm h-full p-5 sm:p-6 flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 text-black dark:text-white">
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-black dark:border-white/20 mb-5">
                <div className="flex items-center gap-2">
                  <CoinMascot size={28} tiltAngle={-6} />
                  <div>
                    <h3 className="text-xl font-extrabold text-black dark:text-white leading-tight">CapiTalk Navigation</h3>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      {onlineCount} Students Online Now
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMenuDrawer(false)}
                  className="p-1.5 rounded-full bg-white dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-2 border-black dark:border-white/20 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {activeUser && (
                <div className="mb-5 p-3.5 bg-white dark:bg-neutral-800/90 border-2 border-black dark:border-white/20 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-extrabold text-black dark:text-white truncate">@{activeUser.username}</p>
                      <p className="text-xs text-gray-600 dark:text-neutral-400 font-semibold truncate">{activeUser.department.replace('College of ', '')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViewState('register');
                      setShowMenuDrawer(false);
                    }}
                    className="text-xs font-black text-black dark:text-white underline hover:text-[#701a31] dark:hover:text-[#ff90e8] shrink-0"
                  >
                    Edit Profile
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    markFreedomPostsAsRead();
                    setViewState('freedom_wall');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black dark:border-white/20 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs cursor-pointer ${
                    viewState === 'freedom_wall' || viewState === 'add_note'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-[#fff1f3] dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>Freedom Wall</span>
                    {unreadFreedomNotesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#dc341e] text-white text-[10px] font-black">
                        {unreadFreedomNotesCount > 9 ? '9+' : unreadFreedomNotesCount} new
                      </span>
                    )}
                  </span>
                  <span className="text-xs opacity-75 font-semibold">Confessions</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    markMusicPostsAsRead();
                    setViewState('music_wall');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black dark:border-white/20 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs cursor-pointer ${
                    viewState === 'music_wall' || viewState === 'dedicate_song'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-[#ffe3e8] dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>Music Wall</span>
                    {unreadMusicNotesCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#dc341e] text-white text-[10px] font-black">
                        {unreadMusicNotesCount > 9 ? '9+' : unreadMusicNotesCount} new
                      </span>
                    )}
                  </span>
                  <span className="text-xs opacity-75 font-semibold">Dedications</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('queue');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black dark:border-white/20 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs cursor-pointer ${
                    viewState === 'queue'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    Random Anonymous Chat
                  </span>
                  <span className="text-xs opacity-75 font-semibold">Matchmaking</span>
                </button>

                {/* Campus Loudspeaker Modal Launcher */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDrawer(false);
                    setShowLoudspeakerModal(true);
                  }}
                  className="w-full p-3.5 rounded-2xl border-2 border-black dark:border-white/20 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs cursor-pointer bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-[#fffae6] dark:hover:bg-amber-950/40"
                >
                  <span className="flex items-center gap-2.5">
                    <Megaphone className="w-4 h-4 text-[#ffc900]" />
                    Campus Loudspeaker
                  </span>
                  {activeLoudspeaker ? (
                    <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      🔴 Live Now
                    </span>
                  ) : (
                    <span className="text-xs opacity-75 font-semibold">PA Broadcast</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('register');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black dark:border-white/20 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs cursor-pointer ${
                    viewState === 'register'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {currentUser ? 'Edit Profile' : 'Register Profile'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('terms');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3 rounded-2xl border border-black/20 dark:border-white/20 text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    viewState === 'terms'
                      ? 'bg-[#fff1f3] dark:bg-[#701a31]/40 text-[#701a31] dark:text-[#ff90e8] border-black dark:border-white/30 font-extrabold'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    Terms and Conditions
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('privacy');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3 rounded-2xl border border-black/20 dark:border-white/20 text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    viewState === 'privacy'
                      ? 'bg-[#fff1f3] dark:bg-[#701a31]/40 text-[#701a31] dark:text-[#ff90e8] border-black dark:border-white/30 font-extrabold'
                      : 'bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    🛡️ Privacy &amp; Data Policy
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-neutral-400 font-semibold">Disclaimer</span>
                </button>

                {/* Blocked Users Section */}
                <button
                  type="button"
                  onClick={() => {
                    setViewState('blocked_users');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3 rounded-2xl border border-black/20 dark:border-white/20 text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    viewState === 'blocked_users'
                      ? 'bg-[#701a31] text-white font-extrabold shadow-xs'
                      : 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 hover:border-black'
                  }`}
                >
                  <span className="flex items-center gap-2 font-black">
                    <UserX className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    Blocked Users
                  </span>
                  {blockedUserIds.length > 0 ? (
                    <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full border border-black shadow-2xs">
                      {blockedUserIds.length} Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 dark:text-neutral-400 font-semibold">0 Blocked</span>
                  )}
                </button>

                <a
                  href="https://www.facebook.com/share/17PF9MvuSC/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenuDrawer(false)}
                  className="w-full p-3 rounded-2xl border border-black/20 dark:border-white/20 bg-[#1877f2]/10 hover:bg-[#1877f2]/20 text-[#1877f2] font-black text-xs flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FacebookIcon className="w-4 h-4 fill-[#1877f2]" />
                    Official Facebook Page
                  </span>
                  <span className="text-[10px] bg-[#1877f2] text-white px-2 py-0.5 rounded-full font-bold">Follow ↗</span>
                </a>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black/20 dark:border-white/20 space-y-1">
              <p className="text-[10px] text-center text-gray-500 dark:text-neutral-400 font-bold">
                CapiTalk — Capitol University Student Community
              </p>
              <p className="text-[9px] text-center text-gray-400 dark:text-neutral-500">
                Independent platform • Not affiliated with Capitol University
              </p>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal />
    </>
  );
};
