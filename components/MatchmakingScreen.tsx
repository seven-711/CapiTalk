'use client';

import React, { useEffect, useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { MATCHMAKING_TIPS, CU_DEPARTMENTS } from '../lib/constants';
import { QueueFilter } from '../lib/types';
import { CoinMascot } from './CoinMascot';
import { Filter, XCircle, Sparkles, HelpCircle, ChevronDown } from 'lucide-react';

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
    showQueueTimeoutModal,
    setShowQueueTimeoutModal,
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
    <div className="w-full max-w-xl mx-auto py-2 sm:py-6 px-2.5 sm:px-4 box-border overflow-hidden">
      <div className="gumroad-feature-card p-3.5 sm:p-6 text-center relative rounded-2xl w-full max-w-full box-border overflow-hidden">
        {/* User Card Summary */}
        {currentUser && (
          <div className="flex w-full items-center gap-2 sm:gap-3 bg-white border border-[#d1d5dc] px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-full mb-3 sm:mb-5 shadow-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.username}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f4f4f0] border-2 border-black shrink-0 object-cover"
              />

              <div className="min-w-0 text-left">
                <span className="font-extrabold text-xs text-black block truncate leading-tight">
                  {currentUser.username}
                </span>

                <span className="text-[10px] sm:text-[11px] font-semibold text-[#701a31] block truncate leading-tight">
                  {currentUser.department.replace('College of ', '')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewState('register')}
              className="ml-auto text-[10px] sm:text-xs font-bold text-black bg-[#f4f4f0] hover:bg-black hover:text-white border border-[#d1d5dc] hover:border-black px-2.5 py-0.5 sm:py-1 rounded-full transition-all shrink-0"
            >
              Edit
            </button>
          </div>
        )}

        {/* Clean & Compact Preference Dropdown */}
        <div className="mb-3.5 sm:mb-5 text-left w-full max-w-md mx-auto min-w-0">
          <label className="block text-[11px] sm:text-xs font-bold text-[#242423] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#701a31] shrink-0" />
            <span>I want to meet someone from...</span>
          </label>
          <div className="relative w-full max-w-full min-w-0">
            <select
              disabled={isSearching}
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
              className="w-full max-w-full min-w-0 bg-white border-2 border-black rounded-xl pl-3 pr-8 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold text-black focus:outline-none focus:ring-2 focus:ring-[#701a31] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all truncate text-ellipsis"
            >
              <optgroup label="General Preferences">
                <option value="anyone">🌍 Anyone (Any Department)</option>
                <option value="same">🎓 Same Department</option>
                <option value="different">🔀 Different Department</option>
              </optgroup>

              <optgroup label="Specific College Departments">
                <option value="College of Computer Studies">💻 Computer Studies</option>
                <option value="College of Engineering">⚙️ Engineering</option>
                <option value="College of Nursing">🩺 Nursing</option>
                <option value="College of Medical Technology">🔬 Medical Technology</option>
                <option value="College of Business Administration">📊 Business Administration</option>
                <option value="College of Education">📚 Education</option>
                <option value="College of Criminology">🛡️ Criminology</option>
                <option value="College of Arts and Sciences">🎭 Arts & Sciences</option>
                <option value="College of Maritime Education">⚓ Maritime Education</option>
                <option value="Senior High School">🎓 Senior High School</option>
              </optgroup>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-black">
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Animated Search Core */}
        {isSearching ? (
          <div className="py-2.5 sm:py-4 flex flex-col items-center justify-center">
            <div className="relative mb-3 sm:mb-4">
              {/* Outer Pulse Rings */}
              <div className="absolute inset-0 rounded-full bg-[#701a31]/30 animate-ping" />
              <div className="absolute -inset-2 rounded-full bg-[#c41e3a]/20 animate-pulse" />

              <div className="relative p-2.5 sm:p-3 bg-white border-2 border-black rounded-full">
                <CoinMascot size={52} tiltAngle={12} />
              </div>
            </div>

            <h3 className="text-sm sm:text-lg font-black text-black tracking-tight flex items-center justify-center gap-1.5 px-2">
              {queueFilter === 'anyone' ? (
                <span>Looking for any CU student...</span>
              ) : queueFilter === 'same' ? (
                <span>
                  Looking for a{' '}
                  <span className="text-[#701a31]">
                    {currentUser?.department.replace('College of ', '')}
                  </span>{' '}
                  student...
                </span>
              ) : queueFilter === 'different' ? (
                <span>
                  Looking outside{' '}
                  <span className="text-[#701a31]">
                    {currentUser?.department.replace('College of ', '')}
                  </span>
                  ...
                </span>
              ) : (
                <span>
                  Looking for a{' '}
                  <span className="text-[#701a31]">
                    {queueFilter.replace('College of ', '')}
                  </span>{' '}
                  student...
                </span>
              )}
            </h3>

            <p className="text-[11px] sm:text-xs font-semibold text-gray-600 mt-1 sm:mt-1.5">
              Time elapsed:{' '}
              <span className="font-mono font-black text-black px-1.5 py-0.5 bg-white border border-black/20 rounded">
                {formatSeconds(searchingTimeSeconds)}
              </span>
            </p>

            <div className="mt-3.5 sm:mt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={cancelSearch}
                className="btn-gumroad-ghost text-[11px] sm:text-xs px-3.5 py-1.5 text-red-600 border-red-300 hover:border-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Search</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-2 sm:py-4 flex flex-col items-center justify-center">
            <div className="mb-2.5 sm:mb-4">
              <CoinMascot size={56} tiltAngle={-6} />
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
              Ready to Connect?
            </h3>
            <p className="text-[11px] sm:text-xs text-[#242423] mt-1 max-w-sm mx-auto leading-normal">
              Click below to enter the live matchmaking queue and start a real-time conversation.
            </p>

            <div className="mt-3.5 sm:mt-5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={startSearch}
                className="btn-gumroad-secondary text-xs sm:text-sm px-5 py-4.5 sm:py-3 w-full sm:w-auto bg-[#701a31] hover:bg-[#4d0d1f] text-white border-2 border-black font-extrabold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-full"
              >
                <span>Start Searching Now</span>
              </button>
              <button
                type="button"
                onClick={() => setViewState('freedom_wall')}
                className="btn-gumroad-secondary text-xs sm:text-sm px-4 py-4.5 sm:py-3 w-full sm:w-auto bg-[#c41e3a] hover:bg-[#a1162d] text-white border-2 border-black font-extrabold flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] transition-all rounded-full"
              >
                <span>Freedom Wall</span>
              </button>
            </div>
          </div>
        )}

        {/* Tip Carousel Banner */}
        <div className="mt-3.5 sm:mt-5 p-2.5 sm:p-3 bg-[#f4f4f0] border border-[#d1d5dc] rounded-xl text-[10.5px] sm:text-xs text-[#242423] flex items-center justify-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-black shrink-0" />
          <span className="font-medium">{MATCHMAKING_TIPS[tipIndex]}</span>
        </div>
      </div>

      {/* 35s Queue Timeout Modal */}
      {showQueueTimeoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black p-4 sm:p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#ffc900] border-2 border-black flex items-center justify-center mx-auto mb-3 text-xl shadow-xs">
              ⏱️
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-black tracking-tight mb-1.5">
              No Active Students Found
            </h3>
            <p className="text-[11px] sm:text-xs font-medium text-[#242423] mb-4 leading-relaxed">
              You've been in the queue for 35 seconds. No active student match was found right now. Would you like to rejoin the queue or return to the main dashboard?
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowQueueTimeoutModal(false);
                  startSearch();
                }}
                className="btn-gumroad-primary w-full py-2 sm:py-2.5 text-xs justify-center"
              >
                <span>Rejoin Queue</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQueueTimeoutModal(false);
                  setViewState('queue');
                }}
                className="btn-gumroad-ghost w-full py-2 sm:py-2.5 text-xs justify-center"
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
