import React, { useState, useRef } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CoinMascot } from './CoinMascot';
import { ShieldAlert, Users, MessageSquare, ShieldCheck, UserCheck, Bell, Heart, MessageCircle, X, ArrowLeft, Menu, MapPin } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useOnlineCount } from '../lib/hooks/useOnlineCount';
import { WallNotification } from '../lib/types';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    viewState,
    setViewState,
    wallNotifications,
    markWallNotificationsAsRead,
    clearWallNotifications,
    setTargetPostId,
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

  if (viewState === 'chat') {
    return null;
  }

  return (
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
                viewState === 'freedom_wall'
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
              onClick={() => setViewState('campus_map')}
              className={`text-[11px] sm:text-xs font-extrabold flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                viewState === 'campus_map'
                  ? 'bg-[#701a31] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-[#ffc900] text-black hover:bg-black hover:text-white'
              }`}
              title="Campus Memory Map"
            >
              <span> Silip</span>
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
                    viewState === 'freedom_wall'
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
                    setViewState('campus_map');
                    setShowMenuDrawer(false);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 border-black text-left font-black text-sm sm:text-base flex items-center justify-between transition-all shadow-xs ${
                    viewState === 'campus_map'
                      ? 'bg-[#701a31] text-white scale-[1.02]'
                      : 'bg-[#ffc900] text-black hover:bg-black hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                  Campus Memory Map
                  </span>
                  <span className="text-xs font-extrabold uppercase bg-black text-white px-2 py-0.5 rounded-full">New</span>
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
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black/20 space-y-3">
              <p className="text-[10px] text-center text-gray-500 font-bold">
                CapiTalk — Capitol University Student Network
              </p>
            </div>
          </div>
        </div>
      )}

      <FeedbackModal />
    </header>
  );
};
