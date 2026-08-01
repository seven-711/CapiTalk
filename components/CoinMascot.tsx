'use client';

import React from 'react';

interface CoinMascotProps {
  size?: number;
  className?: string;
  tiltAngle?: number;
  symbol?: string;
}

export const CoinMascot: React.FC<CoinMascotProps> = ({
  size = 56,
  className = '',
  tiltAngle = 12,
  symbol = 'C',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size * 0.85}px`,
        transform: `rotate(${tiltAngle}deg)`,
      }}
    >
      <div
        className="w-full h-full rounded-full bg-[#701a31] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-105"
        style={{
          borderRadius: '50% / 45%',
        }}
      >
        <span
          className="font-extrabold text-white tracking-tighter"
          style={{ fontSize: `${size * 0.45}px` }}
        >
          {symbol}
        </span>
      </div>
    </div>
  );
};
