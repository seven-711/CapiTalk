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
  { key: 'laugh', label: 'Haha',  emoji: '😂' },
  { key: 'sad',   label: 'Sad',   emoji: '😢' },
  { key: 'angry', label: 'Angry', emoji: '😡' },
];

interface ReactionPickerProps {
  onSelectReaction: (key: string) => void;
  onClose?: () => void;
}

const ReactionItemButton: React.FC<{
  item: ReactionDefinition;
  onSelect: () => void;
  index: number;
}> = ({ item, onSelect, index }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      className="flex flex-col items-center gap-1 group focus:outline-none"
      title={item.label}
      style={{
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* Label tooltip above emoji */}
      <span
        className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-black text-white opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none whitespace-nowrap"
        style={{
          transform: hovered ? 'translateY(0px)' : 'translateY(4px)',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
          opacity: hovered ? 1 : 0,
        }}
      >
        {item.label}
      </span>

      {/* Emoji */}
      <span
        className="select-none leading-none block transition-all duration-150"
        style={{
          fontSize: hovered ? '2.6rem' : '2rem',
          transform: hovered ? 'translateY(-6px)' : 'translateY(0px)',
          filter: hovered ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))' : 'none',
          transition: 'font-size 0.15s cubic-bezier(0.34,1.56,0.64,1), transform 0.15s cubic-bezier(0.34,1.56,0.64,1), filter 0.15s ease',
        }}
      >
        {item.emoji}
      </span>
    </button>
  );
};

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
      className="flex items-end gap-0.5 px-3 py-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-2xl border border-white/60 rounded-[28px] shadow-2xl select-none"
      style={{
        boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_KEYS.map((item, i) => (
        <ReactionItemButton
          key={item.key}
          item={item}
          index={i}
          onSelect={() => {
            onSelectReaction(item.key);
            if (onClose) onClose();
          }}
        />
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
