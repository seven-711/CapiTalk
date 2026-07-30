'use client';

import React from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CoinMascot } from './CoinMascot';
import { ShieldAlert, Users, MessageSquare, ShieldCheck, UserCheck } from 'lucide-react';
import { useOnlineCount } from '../lib/hooks/useOnlineCount';

export const Navbar: React.FC = () => {
  const { currentUser, viewState, setViewState } = useChatStore();
  const onlineCount = useOnlineCount();

  return (
    <header className="w-full bg-[#f4f4f0] border-b border-[#d1d5dc] sticky top-0 z-40">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-8 h-12 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand & Wordmark */}
        <div 
          onClick={() => setViewState('landing')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <CoinMascot size={30} tiltAngle={-8} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-xl tracking-tight text-[#000000] group-hover:underline">
                CapiTalk
              </span>
              <span className="bg-[#ffc900] text-[#000000] text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black uppercase tracking-wider">
                CU ONLY
              </span>
            </div>
            <p className="text-[10px] text-[#242423] font-medium hidden md:block">
              Connect Beyond Your Department
            </p>
          </div>
        </div>

        {/* Live Status Badge — desktop only */}
        <div className="hidden lg:flex items-center gap-1.5 stat-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold whitespace-nowrap">
            {onlineCount > 0 ? `${onlineCount} Online` : 'Connecting...'}
          </span>
        </div>

        {/* Navigation Links & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {viewState !== 'landing' && (
            <button
              type="button"
              onClick={() => setViewState('landing')}
              className="text-xs sm:text-sm font-medium text-[#242423] hover:text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded hidden sm:block"
            >
              Home
            </button>
          )}

          {currentUser ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setViewState('queue')}
                className={`text-xs font-medium flex items-center gap-1 sm:gap-1.5 ${
                  viewState === 'queue' || viewState === 'chat'
                    ? 'nav-pill-active'
                    : 'btn-gumroad-ghost px-2 sm:px-3 py-1 sm:py-1.5 text-xs'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 border border-[#d1d5dc] bg-white rounded-full px-3 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[80px]">{currentUser.username}</span>
                <span className="text-[#242423] opacity-75 hidden md:inline">({currentUser.department.replace('College of ', '')})</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setViewState('register')}
              className="btn-gumroad-primary text-xs px-3 py-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Join CapiTalk</span>
              <span className="sm:hidden">Join</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewState('admin')}
            className={`p-1.5 sm:p-2 rounded border transition-colors ${
              viewState === 'admin'
                ? 'bg-black text-white border-black'
                : 'bg-white text-[#242423] border-[#d1d5dc] hover:border-black'
            }`}
            title="Admin Dashboard"
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
