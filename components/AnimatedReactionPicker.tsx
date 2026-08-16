'use client';

import React from 'react';

export interface ReactionDefinition {
  key: string;
  label: string;
  emoji: string;
}

export const REACTION_KEYS: ReactionDefinition[] = [
  { key: 'like',  label: 'Like',  emoji: '👍' },
  { key: 'love',  label: 'Love',  emoji: '❤️' },
  { key: 'laugh', label: 'Haha',  emoji: '😆' },
  { key: 'wow',   label: 'Wow',   emoji: '😮' },
  { key: 'sad',   label: 'Sad',   emoji: '😢' },
  { key: 'angry', label: 'Angry', emoji: '😡' },
];

interface ReactionPickerProps {
  onSelectReaction: (key: string) => void;
  onClose?: () => void;
}

export const AnimatedReactionPicker: React.FC<ReactionPickerProps> = ({ onSelectReaction, onClose }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (onClose) onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="inline-flex items-center bg-white border-2 border-black rounded-full shadow-2xl select-none relative z-50 filter-none"
      style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.9)', padding: '5px 8px', gap: '6px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_KEYS.map((item) => (
        <button
          key={item.key}
          type="button"
          title={item.label}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectReaction(item.key);
            if (onClose) onClose();
          }}
          className="focus:outline-none hover:scale-125 active:scale-90 transition-transform p-1 rounded-full hover:bg-black/5"
        >
          <span className="text-xl sm:text-2xl leading-none select-none">{item.emoji}</span>
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
