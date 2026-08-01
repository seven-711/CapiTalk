'use client';

import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export interface ReactionDefinition {
  key: string;
  label: string;
  emoji: string;
  file: string;
}

export const REACTION_KEYS: ReactionDefinition[] = [
  { key: 'like', label: 'Like', emoji: '👍', file: '/animated-reacts/like.lottie' },
  { key: 'love', label: 'Love', emoji: '❤️', file: '/animated-reacts/love.lottie' },
  { key: 'laugh', label: 'Haha', emoji: '😂', file: '/animated-reacts/laugh.lottie' },
  { key: 'cool', label: 'Cool', emoji: '😎', file: '/animated-reacts/cool.lottie' },
  { key: 'sad', label: 'Sad', emoji: '😢', file: '/animated-reacts/sad.lottie' },
  { key: 'angry', label: 'Angry', emoji: '😡', file: '/animated-reacts/angry.lottie' },
];

interface ReactionPickerProps {
  onSelectReaction: (key: string) => void;
  onClose?: () => void;
}

export const AnimatedReactionPicker: React.FC<ReactionPickerProps> = ({ onSelectReaction, onClose }) => {
  return (
    <div
      className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-md border-0.5 border-black rounded-full shadow-xl animate-in zoom-in-95 fade-in duration-150 z-40 shrink-0 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_KEYS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectReaction(item.key);
            if (onClose) onClose();
          }}
          className="p-1 hover:scale-125 transition-transform duration-150 rounded-full hover:bg-black/5 flex items-center justify-center focus:outline-none"
          title={item.label}
        >
          <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center overflow-hidden ${item.key === 'like' ? 'scale-135' : ''}`}>
            <DotLottieReact
              src={item.file}
              loop
              autoplay
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                transform: item.key === 'like' ? 'scale(1.35)' : 'none',
              }}
            />
          </div>
        </button>
      ))}
    </div>
  );
};

export const AnimatedReactionBadge: React.FC<{
  reactionKey: string;
  count: number;
  isMe: boolean;
  onClick: () => void;
}> = ({ reactionKey, count, isMe, onClick }) => {
  const item = REACTION_KEYS.find((r) => r.key === reactionKey) || REACTION_KEYS[0];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs sm:text-sm font-extrabold transition-all shadow-sm hover:scale-110 active:scale-95 ${
        isMe
          ? 'bg-[#ff90e8]/30 border-black text-black shadow-md'
          : 'bg-white border-black text-black hover:bg-[#f4f4f0]'
      }`}
    >
      <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0">
        <DotLottieReact
          src={item.file}
          loop
          autoplay
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            transform: reactionKey === 'like' ? 'scale(1.35)' : 'none',
          }}
        />
      </div>
      <span className="text-xs sm:text-sm font-extrabold leading-none">{count}</span>
    </button>
  );
};
