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
} from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useOnlineCount } from '../lib/hooks/useOnlineCount';
import { WallNotification } from '../lib/types';
import { getAvatarForPseudonym } from '../lib/constants';

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
    wallNotifications,
    markWallNotificationsAsRead,
    clearWallNotifications,
    setTargetPostId,
    blockedUserIds,
    keptConnection,
    hasNewConnectionNotif,
    setHasNewConnectionNotif,
  } = useChatStore();

  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const onlineCount = useOnlineCount();

  const unreadNotifs = wallNotifications.filter((n) => !n.read);
  const unreadCount = unreadNotifs.length + (hasNewConnectionNotif ? 1 : 0);

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
      <header className="w-full bg-[#f4f4f0] border-b border-[#d1d5dc] sticky p-2 top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-2 sm:px-6 h-10 sm:h-14 flex items-center justify-between gap-1 sm:gap-2 relative">
          {/* Brand & Wordmark */}
          <div 
            onClick={handleLogoTap}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0"
          >
            <CoinMascot size={22} tiltAngle={-8} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-sm sm:text-xl tracking-tight text-[#000000]">
                  CapiTalk
                </span>
              </div>
              <p className="text-[10px] text-[#242423] font-medium hidden md:block">
                Connect Beyond Your Department
              </p>
            </div>
          </div>

          {/* Live Status Badge */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-[#00e599] text-black font-extrabold text-[10px] sm:text-[11px] rounded-full border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] sm:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider shrink-0">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black animate-ping" />
            <span>{onlineCount} <span className="hidden xs:inline">Active </span>Online</span>
          </div>

          {/* Navigation Links & Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {viewState !== 'landing' && (
              <button
                type="button"
                onClick={() => setViewState('landing')}
                className="text-xs font-medium text-[#242423] hover:text-black px-2 py-1 rounded hidden md:block"
              >
                Home
              </button>
            )}

            <div className="hidden md:flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setViewState('freedom_wall')}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                  viewState === 'freedom_wall' || viewState === 'add_note'
                    ? 'bg-[#701a31] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-[#fff1f3]'
                }`}
                title="Campus Freedom Wall"
              >
                <span> Freedom Wall</span>
              </button>

              <button
                type="button"
                onClick={() => setViewState('music_wall')}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                  viewState === 'music_wall'
                    ? 'bg-[#701a31] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-[#fff1f3] text-black hover:bg-[#ffe3e8]'
                }`}
                title="Campus Music Dedications"
              >
                <span> Music Wall</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasNewConnectionNotif(false);
                  setViewState('kept_connections');
                }}
                className="text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all cursor-pointer bg-white text-black hover:bg-[#fff1f3] border border-gray-200 relative"
                title="Your Kept Connection"
              >
                <Heart className="w-3 h-3 text-[#ff90e8]" />
                <span>Kept Contact</span>
                {hasNewConnectionNotif && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc900] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffc900]"></span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewState('blocked_users')}
                className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                  viewState === 'blocked_users'
                    ? 'bg-[#701a31] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-black hover:bg-red-50 border border-gray-200'
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

              {/* Desktop-Only Notification Bell Button */}
              <button
                type="button"
                onClick={() => setShowNotifPopover(!showNotifPopover)}
                className={`hidden md:inline-flex p-1.5 sm:p-2 rounded-full border border-black/30 transition-all cursor-pointer relative ${
                  showNotifPopover ? 'bg-black text-white' : 'bg-white hover:bg-[#fff1f3] text-black'
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

            {currentUser ? (
              <div className="hidden lg:flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-2 border border-[#d1d5dc] bg-white rounded-full px-3 py-1 text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[80px]">{currentUser.username}</span>
                  <span className="text-[#242423] opacity-75 hidden xl:inline">({currentUser.department.replace('College of ', '')})</span>
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

            {/* Hamburger Navbar Menu Toggle Button (Mobile only) */}
            <button
              type="button"
              onClick={() => setShowMenuDrawer(!showMenuDrawer)}
              className={`p-1.5 sm:p-2 rounded-xl border-2 border-black transition-all flex md:hidden items-center justify-center shadow-xs active:scale-95 shrink-0 ${
                showMenuDrawer ? 'bg-black text-white' : 'bg-white hover:bg-[#ffc900] text-black'
              }`}
              title="Open App Feature Menu"
            >
              {showMenuDrawer ? <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation Bar (Icon Only) ───────────────────────── */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#f4f4f0]/95 backdrop-blur-md border-t border-[#d1d5dc] px-2 sm:px-3 py-2 flex items-center justify-around md:hidden pb-[max(0.65rem,env(safe-area-inset-bottom))]"
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
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
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
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
          }`}
          aria-label="Search and Matchmaking"
        >
          <Search className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* 3. Add Note / Post Button (Gumroad Center Action) */}
        <button
          type="button"
          onClick={() => {
            setShowNotifPopover(false);
            setViewState('add_note');
          }}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'add_note' && !showNotifPopover
              ? 'bg-[#000000] text-[#ffffff] ring-2 ring-[#000000]/20'
              : 'text-[#000000]'
          }`}
          aria-label="Add Note"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* 4. Real-Time Notification Bell Icon */}
        <button
          type="button"
          onClick={() => setShowNotifPopover(!showNotifPopover)}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 relative ${
            showNotifPopover
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
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
          className="p-2 rounded-full transition-all cursor-pointer active:scale-95 relative text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]"
          aria-label="Kept Connections"
        >
          <div className="relative flex items-center justify-center">
            <Mail className="w-5 h-5 stroke-[2]" fill="none" />
            {hasNewConnectionNotif ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc900] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#e02424] border-1.5 border-white text-[8px] text-white font-black items-center justify-center shadow-xs">
                  !
                </span>
              </span>
            ) : keptConnection ? (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff90e8] ring-1 ring-[#000000]" />
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
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
          }`}
          aria-label="Profile"
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.username}
              className={`w-5 h-5 rounded-full object-cover border ${
                viewState === 'register' ? 'border-[#ffffff]' : 'border-[#d1d5dc]'
              }`}
            />
          ) : (
            <User className="w-5 h-5 stroke-[2]" fill={viewState === 'register' ? 'currentColor' : 'none'} />
          )}
        </button>
      </nav>

      {/* ── Real-Time Notifications Modal / Popover Sheet ───────────────────── */}
      {showNotifPopover && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-start sm:justify-end p-0 sm:p-4 sm:pt-16 animate-in fade-in duration-150">
          <div
            className="w-full sm:max-w-md bg-[#f4f4f0] border-t-4 sm:border-4 border-black rounded-t-3xl sm:rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.25)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-top-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-white border-b-2 border-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#701a31] text-white flex items-center justify-center border border-black shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-black">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 bg-[#ffc900] text-black rounded-full border border-black">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 font-semibold">Campus wall reactions &amp; friend updates</p>
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
                    className="text-[11px] font-black text-[#701a31] hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifPopover(false)}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-black hover:text-white border border-black transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2.5 max-h-[60vh]">
              {/* Active Friend Connection Card */}
              {hasNewConnectionNotif && keptConnection && (
                <div
                  onClick={() => {
                    setHasNewConnectionNotif(false);
                    setShowNotifPopover(false);
                    setViewState('kept_connections');
                  }}
                  className="p-3 bg-[#fff1f3] border-2 border-black rounded-2xl cursor-pointer hover:bg-[#ffe3e8] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <img
                        src={keptConnection.avatar_url || getAvatarForPseudonym(keptConnection.username)}
                        alt={keptConnection.username}
                        className="w-10 h-10 rounded-full border-2 border-black object-cover bg-amber-50 shadow-xs"
                      />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#701a31] text-white flex items-center justify-center text-[9px] border border-black shadow-2xs">
                        ✨
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black text-black">New Friend Connection</p>
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#00e599] text-black rounded-full border border-black">
                          Connected
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 font-bold mt-0.5">
                        <span className="text-[#701a31]">@{keptConnection.username}</span> added you as a friend!
                      </p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">Tap to chat in direct messages →</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Wall Notifications */}
              {wallNotifications.length > 0 ? (
                wallNotifications.map((item) => {
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
                        markWallNotificationsAsRead();
                        setShowNotifPopover(false);
                        if (item.type === 'friend_add' || item.type === 'dm') {
                          setViewState('kept_connections');
                        } else {
                          setTargetPostId(item.post_id);
                          setViewState('freedom_wall');
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        item.read
                          ? 'bg-white hover:bg-gray-50 border-black/20'
                          : 'bg-[#fffdf5] hover:bg-[#fff9e6] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="relative shrink-0">
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-9 h-9 rounded-full border-2 border-black object-cover bg-amber-50 shadow-xs"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', getAvatarForPseudonym(rawUsername));
                            }}
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center text-[9px] border border-black shadow-2xs">
                            {item.type === 'like' && '💖'}
                            {item.type === 'comment' && '💬'}
                            {item.type === 'friend_add' && '👥'}
                            {item.type === 'dm' && '💌'}
                            {item.type === 'admin_remark' && '👑'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-black text-black truncate">
                              {item.type === 'like' && `${displayName} reacted`}
                              {item.type === 'comment' && `${displayName} commented`}
                              {item.type === 'friend_add' && `${displayName} added you`}
                              {item.type === 'dm' && `Message from ${displayName}`}
                              {item.type === 'admin_remark' && 'CapiTalk Admin'}
                            </p>
                            <span className="text-[9px] text-gray-400 font-medium shrink-0">
                              {formatRelativeTime(item.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium line-clamp-2 mt-0.5">
                            {item.comment_text || item.admin_remark || item.message_snippet}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : !hasNewConnectionNotif ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-black flex items-center justify-center shadow-xs">
                    <Bell className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-xs font-black text-black">No notifications yet</p>
                  <p className="text-[11px] text-gray-500 max-w-xs font-medium">
                    When someone reacts to your confession on the Freedom Wall or adds you as a friend, updates will show up here in real time!
                  </p>
                </div>
              ) : null}
            </div>

            {/* Bottom Actions */}
            {wallNotifications.length > 0 && (
              <div className="p-3 bg-white border-t border-black/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={clearWallNotifications}
                  className="text-[10px] text-gray-500 hover:text-red-600 font-bold cursor-pointer"
                >
                  Clear all notifications
                </button>
                <button
                  type="button"
                  onClick={() => setShowNotifPopover(false)}
                  className="px-3 py-1 bg-black text-white text-xs font-black rounded-xl cursor-pointer"
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
          <div className="bg-[#f4f4f0] border-l-4 border-black w-full max-w-sm h-full p-5 sm:p-6 flex flex-col justify-between shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-5">
                <div className="flex items-center gap-2">
                  <CoinMascot size={28} tiltAngle={-6} />
                  <div>
                    <h3 className="text-xl font-extrabold text-black leading-tight">CapiTalk Navigation</h3>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                      {onlineCount} Students Online Now
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMenuDrawer(false)}
                  className="p-1.5 rounded-full bg-white hover:bg-black hover:text-white border-2 border-black transition-all"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {currentUser && (
                <div className="mb-5 p-3.5 bg-white border-2 border-black rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-extrabold text-black truncate">@{currentUser.username}</p>
                      <p className="text-xs text-gray-600 font-semibold truncate">{currentUser.department.replace('College of ', '')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViewState('register');
                      setShowMenuDrawer(false);
                    }}
                    className="text-xs font-black text-black underline hover:text-[#701a31] shrink-0"
                  >
                    Edit Profile
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewState('freedom_wall');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs ${
                    viewState === 'freedom_wall' || viewState === 'add_note'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white text-black hover:bg-[#fff1f3]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                     Freedom Wall
                  </span>
                  <span className="text-xs opacity-75 font-semibold">Confessions</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('music_wall');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs ${
                    viewState === 'music_wall'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white text-black hover:bg-[#ffe3e8]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    Music Wall
                  </span>
                  <span className="text-xs opacity-75 font-semibold">Dedications</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('queue');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs ${
                    viewState === 'queue'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    Random Anonymous Chat
                  </span>
                  <span className="text-xs opacity-75 font-semibold">Matchmaking</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewState('register');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs ${
                    viewState === 'register'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-white text-black hover:bg-gray-100'
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
                  className={`w-full p-3 rounded-2xl border border-black/20 text-left font-bold text-xs flex items-center justify-between transition-all ${
                    viewState === 'terms'
                      ? 'bg-[#fff1f3] text-[#701a31] border-black font-extrabold'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
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
                  className={`w-full p-3 rounded-2xl border border-black/20 text-left font-bold text-xs flex items-center justify-between transition-all ${
                    viewState === 'privacy'
                      ? 'bg-[#fff1f3] text-[#701a31] border-black font-extrabold'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    🛡️ Privacy &amp; Data Policy
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold">Disclaimer</span>
                </button>

                {/* Blocked Users Section */}
                <button
                  type="button"
                  onClick={() => {
                    setViewState('blocked_users');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3 rounded-2xl border border-black/20 text-left font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                    viewState === 'blocked_users'
                      ? 'bg-[#701a31] text-white font-extrabold shadow-xs'
                      : 'bg-red-50 hover:bg-red-100 text-red-700 hover:border-black'
                  }`}
                >
                  <span className="flex items-center gap-2 font-black">
                    <UserX className="w-3.5 h-3.5 text-red-600" />
                    Blocked Users
                  </span>
                  {blockedUserIds.length > 0 ? (
                    <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full border border-black shadow-2xs">
                      {blockedUserIds.length} Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-500 font-semibold">0 Blocked</span>
                  )}
                </button>

                <a
                  href="https://www.facebook.com/share/17PF9MvuSC/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowMenuDrawer(false)}
                  className="w-full p-3 rounded-2xl border border-black/20 bg-[#1877f2]/10 hover:bg-[#1877f2]/20 text-[#1877f2] font-black text-xs flex items-center justify-between transition-all"
                >
                  <span className="flex items-center gap-2">
                    <FacebookIcon className="w-4 h-4 fill-[#1877f2]" />
                    Official Facebook Page
                  </span>
                  <span className="text-[10px] bg-[#1877f2] text-white px-2 py-0.5 rounded-full font-bold">Follow ↗</span>
                </a>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-black/20 space-y-1">
              <p className="text-[10px] text-center text-gray-500 font-bold">
                CapiTalk — Capitol University Student Community
              </p>
              <p className="text-[9px] text-center text-gray-400">
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
