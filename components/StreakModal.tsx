'use client';

import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { X, Flame, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  isOpen,
  onClose,
  streakCount,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsExiting(false);
    } else {
      setIsMounted(false);
      setIsExiting(false);
    }
  }, [isOpen]);

  const handleExit = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      setIsMounted(false);
      setIsExiting(false);
      onClose();
    }, 450);
  };

  if (!isOpen && !isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-white h-[100dvh] max-h-[100dvh] w-screen flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-10 select-none overflow-hidden transition-all duration-[450ms] ease-in-out ${
        isExiting
          ? 'scale-0 opacity-0 translate-y-[-45%] translate-x-[40%] rounded-[3rem] pointer-events-none'
          : 'scale-100 opacity-100 translate-y-0 translate-x-0 rounded-none'
      }`}
      style={{
        transformOrigin: 'top right',
      }}
      onClick={handleExit}
    >
      {/* ── Screen-Filling Flame Transition Layer (Occupies 100% Width & Height) ── */}
      <div className="absolute inset-0 w-full h-full min-h-[100dvh] pointer-events-none flex items-center justify-center overflow-hidden">
        <DotLottieReact
          src="/animated-assets/flamefire.lottie"
          loop={false}
          autoplay={true}
          layout={{
            fit: 'cover',
            align: [0.5, 0.5],
          }}
          className="w-full h-full min-w-[100vw] min-h-[100dvh] object-cover scale-110 sm:scale-100"
          style={{
            width: '100vw',
            height: '100dvh',
          }}
        />
      </div>

      {/* Main Center Content: Giant Streak Counter & Typography */}
      <div
        className="w-full max-w-md flex flex-col items-center justify-center text-center my-auto py-4 space-y-3 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 rounded-3xl space-y-3 animate-in fade-in duration-500">
          {/* Triggered Streak Animation with Fade-In */}
          <div className="w-44 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center animate-in fade-in zoom-in-75 duration-2000 pointer-events-none">
            <DotLottieReact
              src="/animated-assets/triggeredStreak.lottie"
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-baseline justify-center gap-3">
            <span className="text-6xl sm:text-7xl font-black text-black tracking-tight drop-shadow-xs">
              {streakCount}
            </span>
            <span className="text-3xl sm:text-4xl font-black text-[#701a31] tracking-tight">
              {streakCount === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
            {streakCount === 1 ? 'Streak Ignited!' : 'You’re on Fire!'}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-700 font-bold max-w-xs sm:max-w-sm mx-auto leading-relaxed">
            {streakCount === 1
              ? "You've opened CapiTalk today. Keep visiting every day to build your streak!"
              : `You've checked into CapiTalk ${streakCount} consecutive days. Keep the momentum going!`}
          </p>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div
        className="w-full max-w-sm shrink-0 pt-4 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleExit}
          className="w-full py-3.5 sm:py-4 bg-[#ffc900] hover:bg-[#ffd633] text-black font-black text-sm sm:text-base rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Keep It Burning!</span>
        </button>
      </div>
    </div>
  );
};
