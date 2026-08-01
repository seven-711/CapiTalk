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
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold transition-all border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 ${
        isMe
          ? 'bg-[#701a31] text-white'
          : 'bg-white text-black hover:bg-[#fff1f3]'
      }`}
    >
      <span className="text-sm sm:text-base leading-none select-none">{item.emoji}</span>
      <span className="text-xs font-extrabold leading-none">{count}</span>
    </button>
  );
};
