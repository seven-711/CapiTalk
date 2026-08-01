'use client';

import React, { useState } from 'react';
import { useGlobalBroadcast } from '../lib/hooks/useGlobalBroadcast';
import { Megaphone, ExternalLink, Clock, X, Sparkles } from 'lucide-react';

export const GlobalBroadcastBanner: React.FC = () => {
  const { activeBroadcast, remainingTimeText, trackClick } = useGlobalBroadcast();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!activeBroadcast || isMinimized) return null;

  const handleVisit = (e: React.MouseEvent) => {
    trackClick(activeBroadcast.id);
    if (activeBroadcast.action_url) {
      window.open(activeBroadcast.action_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full bg-[#ffc900] text-black border-b-2 border-black sticky top-0 z-40 shadow-md animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Left Side: Badge, Title & Description */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-black text-[#ffc900] border-2 border-black flex items-center justify-center shrink-0 shadow-xs">
            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap leading-none">
              <span className="px-2 py-0.5 bg-black text-white text-[10px] sm:text-xs font-extrabold rounded-full uppercase tracking-wider">
                📢 Sponsored Broadcast
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-black/70 flex items-center gap-1">
                by @{activeBroadcast.owner_name}
              </span>
            </div>

            <h3 className="font-extrabold text-xs sm:text-sm text-black tracking-tight truncate mt-1">
              {activeBroadcast.title}
            </h3>
            <p className="text-[11px] sm:text-xs font-medium text-black/90 truncate leading-snug">
              {activeBroadcast.description}
            </p>
          </div>
        </div>

        {/* Right Side: Countdown Timer, Action Button & Dismiss */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center">
          {remainingTimeText && (
            <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 bg-white/80 border border-black rounded-full text-[10px] sm:text-xs font-extrabold text-black shadow-2xs">
              <Clock className="w-3 h-3 text-black/70 animate-spin" />
              <span>{remainingTimeText}</span>
            </div>
          )}

          {activeBroadcast.action_url && (
            <button
              type="button"
              onClick={handleVisit}
              className="btn-gumroad-primary text-xs px-3.5 py-1.5 bg-black text-white hover:bg-gray-800 border-black font-extrabold flex items-center gap-1.5 shadow-xs"
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3 text-[#ffc900]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-black/10 rounded-full transition-colors text-black"
            title="Minimize Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
