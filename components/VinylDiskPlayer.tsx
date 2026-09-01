'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Music, Loader2, ExternalLink } from 'lucide-react';

interface VinylDiskPlayerProps {
  songTitle: string;
  songArtist?: string;
  songImageUrl?: string;
  songPreviewUrl?: string;
  songLink?: string;
  songStartTime?: number;
  songDuration?: number;
  songLyrics?: string;
  isDark?: boolean;
  variant?: 'card' | 'modal' | 'compose';
  className?: string;
  onRemove?: () => void;
  isPlayingProp?: boolean;
  onTogglePlay?: () => void;
}

export const VinylDiskPlayer: React.FC<VinylDiskPlayerProps> = ({
  songTitle,
  songArtist = 'Unknown Artist',
  songImageUrl,
  songPreviewUrl,
  songLink,
  songStartTime = 0,
  songDuration = 30,
  isDark = false,
  variant = 'card',
  className = '',
  onRemove,
  isPlayingProp,
  onTogglePlay,
}) => {
  const [internalPlaying, setInternalPlaying] = useState(false);
  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : internalPlaying;

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | undefined>(songPreviewUrl);
  const [audioProgress, setAudioProgress] = useState(0);
  const [imgError, setImgError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCurrentPreviewUrl(songPreviewUrl);
  }, [songPreviewUrl]);

  useEffect(() => {
    setImgError(false);
  }, [songImageUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (onTogglePlay) {
      onTogglePlay();
      return;
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setInternalPlaying(false);
      return;
    }

    // Pause all other playing audio elements on the page
    document.querySelectorAll('audio').forEach((el) => {
      if (el !== audioRef.current && !el.paused) {
        el.pause();
      }
    });

    let previewUrlToUse = currentPreviewUrl;

    if (!previewUrlToUse && songTitle) {
      try {
        setIsLoadingAudio(true);
        const queryTerm = songArtist ? `${songArtist} ${songTitle}` : songTitle;
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&entity=song&limit=1`,
          { signal: AbortSignal.timeout(3500) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
            previewUrlToUse = data.results[0].previewUrl;
            setCurrentPreviewUrl(previewUrlToUse);
          }
        }
      } catch (err) {
        console.warn('Audio preview search failed:', err);
      } finally {
        setIsLoadingAudio(false);
      }
    }

    if (!previewUrlToUse) {
      if (songLink) {
        window.open(songLink, '_blank', 'noopener,noreferrer');
      } else {
        window.open(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(`${songArtist} ${songTitle}`)}`,
          '_blank',
          'noopener,noreferrer'
        );
      }
      return;
    }

    try {
      const startTime = Math.max(0, Number(songStartTime) || 0);
      const targetDuration = Math.max(5, Number(songDuration) || 30);

      if (!audioRef.current || audioRef.current.src !== previewUrlToUse) {
        const audio = new Audio(previewUrlToUse);
        audioRef.current = audio;

        audio.onended = () => {
          setInternalPlaying(false);
          setAudioProgress(0);
        };

        audio.onerror = () => {
          setInternalPlaying(false);
          setIsLoadingAudio(false);
        };

        audio.ontimeupdate = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            const endLimit = Math.min(startTime + targetDuration, audio.duration);
            if (audio.currentTime >= endLimit || audio.currentTime < startTime - 0.5) {
              audio.currentTime = startTime;
            }
            const currentProgress = Math.max(
              0,
              Math.min(100, ((audio.currentTime - startTime) / targetDuration) * 100)
            );
            setAudioProgress(currentProgress);
          }
        };
      }

      audioRef.current.currentTime = startTime;

      setIsLoadingAudio(true);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setInternalPlaying(true);
            setIsLoadingAudio(false);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('Audio play notice:', err);
            }
            setInternalPlaying(false);
            setIsLoadingAudio(false);
          });
      }
    } catch (err) {
      setInternalPlaying(false);
      setIsLoadingAudio(false);
    }
  };

  const externalHref =
    songLink ||
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`${songArtist} ${songTitle}`)}`;

  // ── Compose Mode (Compact preview in note creation) ──────────────────────────
  if (variant === 'compose') {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleTogglePlay(e);
        }}
        className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-md cursor-pointer select-none group bg-neutral-900/95 hover:bg-neutral-800/95 border-neutral-700/80 text-white backdrop-blur-xs ${
          isPlaying ? 'ring-2 ring-amber-400 border-amber-400/50' : ''
        } ${className}`}
        title={isPlaying ? 'Click to pause' : 'Click to play'}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Spinning Vinyl CD Disc */}
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 shadow-lg relative flex items-center justify-center transition-transform ${
                isPlaying ? 'animate-spin' : 'group-hover:scale-105'
              }`}
              style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}
            >
              <div className="absolute inset-1 rounded-full border border-white/15 pointer-events-none" />
              <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none" />
              <div className="w-5.5 h-5.5 rounded-full overflow-hidden border border-neutral-700 shadow-inner relative flex items-center justify-center bg-neutral-200 shrink-0 z-10">
                {songImageUrl && !imgError ? (
                  <img
                    src={songImageUrl}
                    alt={songTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-3 h-3 text-neutral-600" />
                )}
                <div className="absolute w-1.5 h-1.5 rounded-full bg-neutral-950 border border-neutral-700 z-20" />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {isPlaying && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Playing
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-extrabold truncate leading-tight text-white">
              {songTitle}
            </p>
            <p className="text-[11px] font-medium truncate text-neutral-300">
              {songArtist}
            </p>
          </div>
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-full hover:bg-white/15 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
            title="Remove attached song"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // ── Modal / Detail View ───────────────────────────────────────────────────────
  if (variant === 'modal') {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleTogglePlay(e);
        }}
        className={`w-full p-3.5 sm:p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer group select-none bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 border-neutral-700/80 text-white shadow-md backdrop-blur-xs ${
          isPlaying ? 'ring-2 ring-amber-400 border-amber-400/50' : ''
        } ${className}`}
        title={isPlaying ? 'Click to pause' : 'Click to play'}
      >
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Big Spinning Vinyl CD Disc */}
          <div className="relative shrink-0">
            <div
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 shadow-xl relative flex items-center justify-center transition-transform ${
                isPlaying ? 'animate-spin' : 'group-hover:scale-105'
              }`}
              style={{ animationDuration: '4.5s', animationTimingFunction: 'linear' }}
            >
              <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-white/10 pointer-events-none" />

              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-neutral-700/80 shadow-inner relative flex items-center justify-center bg-white shrink-0 z-10">
                {songImageUrl && !imgError ? (
                  <img
                    src={songImageUrl}
                    alt={songTitle}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                    <Music className="w-4 h-4 text-neutral-600" />
                  </div>
                )}
                <div className="absolute w-2 h-2 rounded-full bg-[#f4f4f0] border border-neutral-800 z-20 shadow-inner" />
              </div>
            </div>
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
            <div className="flex items-center gap-2 mb-1">
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms] h-full" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms] h-2/3" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms] h-4/5" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:450ms] h-1/2" />
                </div>
              )}
            </div>

            <h4 className="font-black text-sm sm:text-base truncate leading-snug text-white" title={songTitle}>
              {songTitle}
            </h4>
            <p className="text-xs font-semibold text-neutral-300 truncate mt-0.5">
              {songArtist}
            </p>

            {/* Audio Progress Bar when playing */}
            {isPlaying && (
              <div className="w-full mt-2">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Default Card Mode (Embedded on Note Card in Campus Wall feed) ─────────────
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        handleTogglePlay(e);
      }}
      className={`mx-3.5 sm:mx-4 my-2.5 p-3 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden group select-none shadow-md bg-neutral-900/95 hover:bg-neutral-800/95 border-neutral-700/80 text-white backdrop-blur-xs ${
        isPlaying ? 'ring-2 ring-amber-400 border-amber-400/50' : ''
      } ${className}`}
      title={isPlaying ? 'Click to pause' : 'Click to play'}
    >
      {/* Spinning Vinyl CD Disc + Track Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 shadow-md relative flex items-center justify-center transition-transform ${
              isPlaying ? 'animate-spin' : 'group-hover:scale-105'
            }`}
            style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}
          >
            <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-2.5 rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-white/10 pointer-events-none" />

            <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full overflow-hidden border border-neutral-700/80 shadow-inner relative flex items-center justify-center bg-white shrink-0 z-10">
              {songImageUrl && !imgError ? (
                <img
                  src={songImageUrl}
                  alt={songTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                  <Music className="w-3.5 h-3.5 text-neutral-500" />
                </div>
              )}
              <div className="absolute w-1.5 h-1.5 rounded-full bg-[#f4f4f0] border border-neutral-800 z-20 shadow-inner" />
            </div>
          </div>
        </div>

        {/* Track Title and Artist */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms] h-full" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms] h-2/3" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms] h-4/5" />
              </div>
            )}
            {isLoadingAudio && (
              <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
            )}
          </div>

          <h4 className="text-xs sm:text-[13px] font-extrabold truncate leading-tight text-white" title={songTitle}>
            {songTitle}
          </h4>
          <p className="text-[10.5px] sm:text-[11px] font-semibold text-neutral-300 truncate mt-0.5">
            {songArtist}
          </p>
        </div>

        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors shrink-0"
          title="Open track on YouTube / Music"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Progress Bar when playing */}
      {isPlaying && (
        <div className="w-full mt-2 pt-1 border-t border-white/10">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${audioProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
