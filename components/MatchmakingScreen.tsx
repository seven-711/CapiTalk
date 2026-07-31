'use client';

import React, { useEffect, useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { MATCHMAKING_TIPS } from '../lib/constants';
import { QueueFilter } from '../lib/types';
import { CoinMascot } from './CoinMascot';
import { Search, Filter, XCircle, Sparkles, Users, HelpCircle } from 'lucide-react';

export const MatchmakingScreen: React.FC = () => {
  const {
    currentUser,
    isSearching,
    searchingTimeSeconds,
    queueFilter,
    setQueueFilter,
    startSearch,
    cancelSearch,
    setViewState,
  } = useChatStore();

  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % MATCHMAKING_TIPS.length);
    }, 4500);
    return () => clearInterval(tipInterval);
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-3 sm:py-8 px-3 sm:px-4">
      <div className="gumroad-feature-card p-4 sm:p-8 text-center relative">
        {/* User Card Summary — Gumroad Stat Badge Style */}
        {currentUser && (
          <div className="inline-flex max-w-full items-center justify-between sm:justify-start gap-2.5 sm:gap-3.5 bg-white border border-[#d1d5dc] px-3.5 sm:px-4 py-2 rounded-2xl sm:rounded-full mb-6 sm:mb-8 shadow-sm text-left">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.username}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#f4f4f0] border border-black shrink-0 object-cover"
              />
              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-xs sm:text-sm text-black block truncate tracking-tight">
                  {currentUser.username}
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-[#242423] block truncate">
                  {currentUser.department.replace('College of ', '')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewState('register')}
              className="text-[11px] font-semibold text-black bg-[#f4f4f0] hover:bg-black hover:text-white border border-[#d1d5dc] hover:border-black px-2.5 py-1 rounded-full transition-all shrink-0 ml-1"
            >
              Edit Profile
            </button>
          </div>
        )}

        {/* Filter Selection Tabs */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-[#242423] uppercase tracking-wider mb-3 flex items-center justify-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Match Preference Filter
          </label>
          <div className="inline-flex p-1 bg-[#f4f4f0] border border-[#d1d5dc] rounded-md gap-1">
            {(['anyone', 'different', 'same'] as QueueFilter[]).map((filter) => (
              <button
                key={filter}
                disabled={isSearching}
                onClick={() => setQueueFilter(filter)}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded transition-all capitalize ${
                  queueFilter === filter
                    ? 'bg-black text-white shadow-sm'
                    : 'text-[#242423] hover:text-black hover:bg-white/60'
                }`}
              >
                {filter === 'anyone' && 'Anyone'}
                {filter === 'different' && 'Different Department'}
                {filter === 'same' && 'Same Department'}
              </button>
            ))}
          </div>
        </div>

        {/* Animated Search Core */}
        {isSearching ? (
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="relative mb-6">
              {/* Outer Pulse Rings */}
              <div className="absolute inset-0 rounded-full bg-[#ff90e8]/30 animate-ping" />
              <div className="absolute -inset-4 rounded-full bg-[#ffc900]/20 animate-pulse" />
              
              <div className="relative p-4 bg-white border-2 border-black rounded-full">
                <CoinMascot size={72} tiltAngle={12} />
              </div>
            </div>

            <h3 className="text-2xl font-extrabold text-black tracking-tight flex items-center justify-center gap-2">
              <span>Looking for a CU student...</span>
            </h3>

            <p className="text-sm font-medium text-[#242423] mt-2">
              Time elapsed: <span className="font-mono font-bold text-black">{formatSeconds(searchingTimeSeconds)}</span>
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={cancelSearch}
                className="btn-gumroad-ghost text-xs px-4 py-2 text-red-600 border-red-200 hover:border-red-600"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Search</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center">
            <div className="mb-6">
              <CoinMascot size={80} tiltAngle={-6} />
            </div>

            <h3 className="text-2xl font-extrabold text-black tracking-tight">
              Ready to Connect?
            </h3>
            <p className="text-sm text-[#242423] mt-2 max-w-md mx-auto">
              Click below to enter the live matchmaking queue and start a real-time, random conversation with a student.
            </p>

            <button
              onClick={startSearch}
              className="mt-6 btn-gumroad-primary text-base px-8 py-4 w-full sm:w-auto"
            >
              <span>Start Searching Now</span>
            </button>
          </div>
        )}

        {/* Tip Carousel Banner */}
        <div className="mt-8 p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-md text-xs text-[#242423] flex items-center justify-center gap-2">
          <HelpCircle className="w-4 h-4 text-black shrink-0" />
          <span className="font-medium">{MATCHMAKING_TIPS[tipIndex]}</span>
        </div>
      </div>
    </div>
  );
};
