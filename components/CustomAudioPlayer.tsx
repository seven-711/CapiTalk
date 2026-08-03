'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';

interface CustomAudioPlayerProps {
  src: string;
  className?: string;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src, className = '' }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasEnded(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setHasEnded(false);
      // Pause any other playing audio elements on the page
      document.querySelectorAll('audio').forEach((otherAudio) => {
        if (otherAudio !== audio && !otherAudio.paused) {
          otherAudio.pause();
        }
      });
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (hasEnded) {
        audio.currentTime = 0;
      }
      audio.play().catch((err) => console.error('Audio playback error:', err));
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress || !duration) return;

    const rect = progress.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-white border-2 border-black rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${className}`}>
      {/* Hidden Native Audio Element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Play/Pause Button - Gumroad Solid Black CTA */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-md sm:rounded-lg bg-black text-white hover:bg-black/85 border-2 border-black flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs"
          title={isPlaying ? 'Pause Preview' : 'Play Preview'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
          ) : hasEnded ? (
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          ) : (
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white ml-0.5" />
          )}
        </button>

        {/* Player Body & Scrubber */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1.5 mb-1">
            {/* Animated Equalizer Bars when Playing */}
            <div className="flex items-center gap-0.5 sm:gap-1 h-2.5 shrink-0">
              <span className={`w-0.5 sm:w-1 rounded-full bg-[#ff90e8] border border-black ${isPlaying ? 'animate-bounce' : 'h-1'}`} style={{ animationDuration: '0.4s' }} />
              <span className={`w-0.5 sm:w-1 rounded-full bg-[#ffc900] border border-black ${isPlaying ? 'animate-bounce' : 'h-2'}`} style={{ animationDuration: '0.6s', animationDelay: '0.15s' }} />
              <span className={`w-0.5 sm:w-1 rounded-full bg-[#dc341e] border border-black ${isPlaying ? 'animate-bounce' : 'h-1.5'}`} style={{ animationDuration: '0.5s', animationDelay: '0.3s' }} />
              <span className={`w-0.5 sm:w-1 rounded-full bg-black border border-black ${isPlaying ? 'animate-bounce' : 'h-1'}`} style={{ animationDuration: '0.7s', animationDelay: '0.2s' }} />
            </div>

            {/* Time Indicator */}
            <span className="text-[9px] sm:text-xs font-mono font-black text-[#242423] tracking-tight shrink-0">
              {formatTime(currentTime)} / {formatTime(duration || 30)}
            </span>
          </div>

          {/* Interactive Progress Bar */}
          <div
            ref={progressRef}
            onClick={handleSeek}
            className="w-full h-2.5 sm:h-3 bg-[#f4f4f0] border-2 border-black rounded-md cursor-pointer relative overflow-hidden group shadow-inner"
            title="Click to seek"
          >
            {/* Progress Fill */}
            <div
              className="h-full bg-[#ffc900] border-r-2 border-black transition-all duration-75 relative"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Highlight Marker */}
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-white opacity-80" />
            </div>
          </div>
        </div>

        {/* Mute Toggle */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-[#f4f4f0] hover:bg-white text-black border-2 border-black shrink-0 active:scale-95 transition-all shadow-xs"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-600" />
          ) : (
            <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
