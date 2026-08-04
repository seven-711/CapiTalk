'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, X, ArrowRight, Sparkles } from 'lucide-react';

interface SilipFeatureBannerProps {
  isOpen: boolean;
  onClose: () => void;
  onExplore: () => void;
}

const FEATURES = [
  {
    icon: '📍',
    color: '#ffc900',
    title: 'Drop a Memory Pin',
    desc: "Tap anywhere on the map and leave a note about what that place means to you — a mall, your favorite spot, or the library corridor.",
  },
  {
    icon: '💬',
    color: '#ff90e8',
    title: 'Read Others\' Stories',
    desc: 'Click any pin on the map to read the memory behind it. Comment, react, and feel the place come alive through shared stories.',
  },
  {
    icon: '❤️',
    color: '#00e599',
    title: 'React & Connect',
    desc: 'Like notes that hit close to home. See who else resonated with a memory — all anonymously.',
  },
  {
    icon: '🔒',
    color: '#701a31',
    title: 'Admin-Moderated',
    desc: 'Every pin goes through admin review before it appears live — keeping Silip a safe, respectful space for everyone.',
  },
];

export const SilipFeatureBanner: React.FC<SilipFeatureBannerProps> = ({
  isOpen,
  onClose,
  onExplore,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 60);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg my-auto transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
        }`}
      >
        <div className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">

          {/* Hero Header */}
          <div className="relative bg-[#701a31] border-b-4 border-black px-6 pt-8 pb-6 overflow-hidden">
            {/* Decorative dot grid */}
            <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none">
              <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                {Array.from({ length: 8 }).map((_, row) =>
                  Array.from({ length: 8 }).map((_, col) => (
                    <circle key={`${row}-${col}`} cx={col * 20 + 10} cy={row * 20 + 10} r="3" fill="white" />
                  ))
                )}
              </svg>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white hover:text-black text-white rounded-full border-2 border-white/50 transition-all active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* NEW badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ffc900] text-black text-[10px] font-black rounded-full uppercase tracking-widest mb-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              NEW ON CAPITALK
            </div>

            {/* Title row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-[#ffc900] border-[3px] border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] shrink-0">
                <MapPin className="w-7 h-7 text-black stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                  Silip
                </h2>
                <p className="text-[#ffc900] font-black text-xs sm:text-sm mt-0.5 tracking-wide">
                  A Memory Map
                </p>
              </div>
            </div>

            <p className="text-white/90 text-xs sm:text-sm font-bold leading-relaxed">
              Every place holds a story.{' '}
              <span className="text-[#ffc900]">Silip</span> lets you pin your memories directly on
              the map — so others can find them, feel them, and add their own.
            </p>
          </div>

          {/* Features */}
          <div className="p-5 space-y-3 bg-[#f4f4f0]">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-0.5"
              >
                <div
                  className="w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shrink-0 text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  style={{ backgroundColor: f.color }}
                >
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-black">{f.title}</h4>
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-600 mt-0.5 leading-snug">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 bg-[#f4f4f0] flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="w-full sm:flex-1 py-3 px-5 bg-[#701a31] hover:bg-[#4d0d1f] text-white font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center gap-2"
            >
              Explore Silip Map
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-3 px-5 bg-white hover:bg-black hover:text-white text-black font-bold text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
