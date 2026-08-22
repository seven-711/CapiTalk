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
  } = useChatStore();

  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const onlineCount = useOnlineCount();

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
                onClick={() => setViewState('kept_connections')}
                className="text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all cursor-pointer bg-white text-black hover:bg-[#fff1f3] border border-gray-200"
                title="Your Kept Connection"
              >
                <span>Kept Contact</span>
                {keptConnection && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e599] inline-block" />
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

      {/* ── Mobile Bottom Navigation Bar (Conforming to DESIGN.md Gumroad Style) ── */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#f4f4f0]/95 backdrop-blur-md border-t border-[#d1d5dc] px-3 py-2 flex items-center justify-around md:hidden pb-[max(0.65rem,env(safe-area-inset-bottom))]"
      >
        {/* 1. Home Button */}
        <button
          type="button"
          onClick={() => setViewState('landing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'landing'
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
          }`}
          aria-label="Home"
        >
          <Home className="w-4.5 h-4.5" fill={viewState === 'landing' ? 'currentColor' : 'none'} strokeWidth={2} />
          {viewState === 'landing' && <span className="text-xs font-bold tracking-tight">Home</span>}
        </button>

        {/* 2. Search / Matchmaking Button */}
        <button
          type="button"
          onClick={() => setViewState('queue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'queue'
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
          }`}
          aria-label="Search and Matchmaking"
        >
          <Search className="w-4.5 h-4.5 stroke-[2.5]" />
          {viewState === 'queue' && <span className="text-xs font-bold tracking-tight">Search</span>}
        </button>

        {/* 3. Add Note / Post Button (Gumroad Center Action) */}
        <button
          type="button"
          onClick={() => setViewState('add_note')}
          className={`p-2 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'add_note'
              ? 'bg-[#000000] text-[#ffffff] ring-2 ring-[#000000]/20'
              : 'bg-[#ffffff] text-[#000000] border border-[#d1d5dc] hover:border-[#000000]'
          }`}
          aria-label="Add Note"
        >
          <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
        </button>

        {/* 4. Messages / Kept Connections Button */}
        <button
          type="button"
          onClick={() => setViewState('kept_connections')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 text-[#242423] hover:text-[#000000] hover:bg-[#ffffff] relative"
          aria-label="Kept Connections"
        >
          <div className="relative flex items-center justify-center">
            <Mail className="w-4.5 h-4.5 stroke-[2]" fill="none" />
            {keptConnection && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ff90e8] ring-1 ring-[#000000]" />
            )}
          </div>
        </button>

        {/* 5. Profile / User Account Button */}
        <button
          type="button"
          onClick={() => setViewState('register')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer active:scale-95 ${
            viewState === 'register'
              ? 'bg-[#000000] text-[#ffffff]'
              : 'text-[#242423] hover:text-[#000000] hover:bg-[#ffffff]'
          }`}
          aria-label="Profile"
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.username}
              className={`w-4.5 h-4.5 rounded-full object-cover border ${
                viewState === 'register' ? 'border-[#ffffff]' : 'border-[#d1d5dc]'
              }`}
            />
          ) : (
            <User className="w-4.5 h-4.5 stroke-[2]" fill={viewState === 'register' ? 'currentColor' : 'none'} />
          )}
          {viewState === 'register' && <span className="text-xs font-bold tracking-tight">Profile</span>}
        </button>
      </nav>

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
                    📜 Terms of Conduct (TOC)
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold">Rules</span>
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
