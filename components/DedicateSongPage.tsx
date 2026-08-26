'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { getAvatarForPseudonym } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import {
  ArrowLeft,
  X,
  Music,
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Heart,
  Send,
  Sparkles,
  Check,
  Globe,
  Clock,
  ShieldAlert,
  Disc,
} from 'lucide-react';

const isColorDark = (hexColor?: string | null): boolean => {
  if (!hexColor) return false;
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return false;
  const fullHex = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
};

const MUSIC_POST_COLORS = [
  { name: 'Warm Cream', hex: '#fff1f3' },
  { name: 'Gold', hex: '#ffc900' },
  { name: 'Pink', hex: '#ff90e8' },
  { name: 'Mint', hex: '#00e599' },
  { name: 'Sky', hex: '#7dd3fc' },
  { name: 'Maroon', hex: '#701a31' },
  { name: 'Crimson', hex: '#c41e3a' },
];

import {
  getAdminToken,
  verifyAdminSession,
  purgeLegacyAdminKeys,
} from '../lib/auth/adminAuth';

export const DedicateSongPage: React.FC = () => {
  const {
    currentUser,
    addFreedomPost,
    setViewState,
    goBack,
    setTargetPostId,
  } = useChatStore();

  const [isAdminUser, setIsAdminUser] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getAdminToken());
  });
  const [postAsAdmin, setPostAsAdmin] = useState(false);

  useEffect(() => {
    purgeLegacyAdminKeys();
    let isMounted = true;

    const checkAdmin = async () => {
      const token = getAdminToken();
      if (token) {
        const isValid = await verifyAdminSession();
        if (isMounted) {
          setIsAdminUser(isValid);
          if (isValid) {
            const { currentUser: cur } = useChatStore.getState();
            if (cur && !cur.is_admin) {
              useChatStore.setState({ currentUser: { ...cur, is_admin: true } });
            }
          } else {
            setPostAsAdmin(false);
            const { currentUser: cur } = useChatStore.getState();
            if (cur?.is_admin) {
              useChatStore.setState({ currentUser: { ...cur, is_admin: false } });
            }
          }
        }
      } else {
        if (isMounted) {
          setIsAdminUser(false);
          setPostAsAdmin(false);
          const { currentUser: cur } = useChatStore.getState();
          if (cur?.is_admin) {
            useChatStore.setState({ currentUser: { ...cur, is_admin: false } });
          }
        }
      }
    };

    checkAdmin();
    window.addEventListener('storage', checkAdmin);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', checkAdmin);
    };
  }, []);

  useEffect(() => {
    if (!isAdminUser) {
      setPostAsAdmin(false);
    }
  }, [isAdminUser]);

  // Form State
  const [dedicatedTo, setDedicatedTo] = useState('');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#fff1f3');
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [songRequiredError, setSongRequiredError] = useState(false);
  const [dedicatedToRequiredError, setDedicatedToRequiredError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Song Search State
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songSearchResults, setSongSearchResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [isSearchingSong, setIsSearchingSong] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const songInputRef = useRef<HTMLInputElement | null>(null);
  const dedicatedToInputRef = useRef<HTMLInputElement | null>(null);

  // Rate limit / cooldown state
  const COOLDOWN_SECONDS = 60;
  const DAILY_MAX_POSTS = 10;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [dailyPostCount, setDailyPostCount] = useState<number>(0);
  const [honeypot, setHoneypot] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistentId = getOrCreatePersistentUUID();
      setDeviceId(persistentId);
    }
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkLimits = () => {
      if (isAdminUser) {
        setCooldownRemaining(0);
        return;
      }
      const lastTs = localStorage.getItem('capitalk_wall_last_post_ts');
      if (lastTs) {
        const elapsed = (Date.now() - parseInt(lastTs, 10)) / 1000;
        if (elapsed < COOLDOWN_SECONDS) {
          setCooldownRemaining(Math.ceil(COOLDOWN_SECONDS - elapsed));
        } else {
          setCooldownRemaining(0);
        }
      }

      try {
        const rawHistory = localStorage.getItem('capitalk_wall_post_history');
        if (rawHistory) {
          const timestamps: number[] = JSON.parse(rawHistory);
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const validHistory = timestamps.filter((ts) => ts > oneDayAgo);
          setDailyPostCount(validHistory.length);
        }
      } catch (e) {}
    };

    checkLimits();
    const interval = setInterval(checkLimits, 1000);
    return () => clearInterval(interval);
  }, [isAdminUser]);

  // Debounced live song search
  useEffect(() => {
    if (!songSearchQuery.trim()) {
      setSongSearchResults([]);
      return;
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingSong(true);
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(songSearchQuery)}`);
        const data = await res.json();
        if (data.results?.trackmatches?.track) {
          setSongSearchResults(data.results.trackmatches.track);
        } else {
          setSongSearchResults([]);
        }
      } catch (e) {
        setSongSearchResults([]);
      } finally {
        setIsSearchingSong(false);
      }
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [songSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);
    setSongRequiredError(false);
    setDedicatedToRequiredError(false);

    if (!selectedSong) {
      setSongRequiredError(true);
      songInputRef.current?.focus();
      return;
    }

    if (!dedicatedTo.trim()) {
      setDedicatedToRequiredError(true);
      dedicatedToInputRef.current?.focus();
      return;
    }

    if (message.trim().length > 300) {
      setModerationError('Dedication message cannot exceed 300 characters.');
      return;
    }

    if (!postAsAdmin && !isAdminUser) {
      if (cooldownRemaining > 0) {
        setModerationError(`Please wait ${cooldownRemaining}s before sharing another dedication.`);
        return;
      }
      if (dailyPostCount >= DAILY_MAX_POSTS) {
        setModerationError(`Daily limit of ${DAILY_MAX_POSTS} dedications reached.`);
        return;
      }
    }

    if (message.trim()) {
      const modResult = analyzeContentModeration(message);
      if (modResult.contains_profanity) {
        setModerationError(`Message contains inappropriate language (${modResult.matched_terms.join(', ')}).`);
        return;
      }
    }

    if (dedicatedTo.trim()) {
      const nameCheck = analyzeContentModeration(dedicatedTo);
      if (nameCheck.contains_profanity) {
        setModerationError(`Dedication recipient name contains inappropriate language.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const authorAlias = postAsAdmin
        ? 'Admin'
        : (currentUser ? currentUser.username : 'Anon Student');

      const authorDepartment = postAsAdmin
        ? 'Admin'
        : (currentUser ? currentUser.department : 'General');

      const authorAvatar = postAsAdmin
        ? '/avatars/coin-left.jpg'
        : (currentUser?.avatar_url || getAvatarForPseudonym(authorAlias));

      const newPostId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const songImage = selectedSong.image_url ||
        (selectedSong.image?.[3]?.['#text'] && !selectedSong.image[3]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? selectedSong.image[3]['#text'] :
        (selectedSong.image?.[2]?.['#text'] && !selectedSong.image[2]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? selectedSong.image[2]['#text'] : ''));

      const success = await addFreedomPost({
        id: newPostId,
        author_alias: authorAlias,
        department: authorDepartment,
        author_avatar: authorAvatar,
        author_bio: currentUser?.bio || '',
        message: message.trim(),
        color: postAsAdmin ? '#701a31' : selectedColor,
        is_admin: postAsAdmin,
        song_title: selectedSong.name,
        song_artist: selectedSong.artist,
        song_image_url: songImage,
        song_preview_url: selectedSong.preview_url || '',
        song_link: selectedSong.url || `https://www.last.fm/search?q=${encodeURIComponent(selectedSong.artist + ' ' + selectedSong.name)}`,
        dedicated_to: dedicatedTo.trim() || undefined,
      }, honeypot, deviceId);

      if (success) {
        if (!postAsAdmin && !isAdminUser) {
          const now = Date.now();
          localStorage.setItem('capitalk_wall_last_post_ts', String(now));
          try {
            const rawHistory = localStorage.getItem('capitalk_wall_post_history');
            const history: number[] = rawHistory ? JSON.parse(rawHistory) : [];
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            const updated = [...history.filter((ts) => ts > oneDayAgo), now];
            localStorage.setItem('capitalk_wall_post_history', JSON.stringify(updated));
          } catch (e) {}
        }

        setTargetPostId(newPostId);
        setViewState('music_wall');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAuthorAlias = postAsAdmin
    ? 'Admin'
    : (currentUser ? currentUser.username : 'Anon Student');

  const currentAuthorDept = postAsAdmin
    ? 'Admin'
    : (currentUser ? currentUser.department : 'General');

  const previewAvatar = postAsAdmin
    ? '/avatars/coin-left.jpg'
    : (currentUser?.avatar_url || getAvatarForPseudonym(currentAuthorAlias));

  const cardBgColor = postAsAdmin ? '#701a31' : selectedColor;
  const isDark = isColorDark(cardBgColor);

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans pb-16">
      {/* ── Main Composer Container ──────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Error Alert */}
        {moderationError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2 animate-in fade-in duration-150 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{moderationError}</span>
            <button type="button" onClick={() => setModerationError(null)} className="p-0.5 hover:bg-rose-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Composer Card with Modern Hairline Styling */}
        <div className="space-y-4 shadow-xs">
          {/* Author Badge Info */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={previewAvatar}
                alt={currentAuthorAlias}
                className="w-9 h-9 rounded-full border border-[#d1d5dc] object-cover bg-amber-50 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm text-black truncate">
                    {currentAuthorAlias}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#fff1f3] text-[#701a31] rounded-md border border-[#701a31]/20 shrink-0">
                    {currentAuthorDept.replace('College of ', '')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-medium">Posting to Campus Music Wall</p>
              </div>
            </div>

            {/* Admin Switcher */}
            {isAdminUser && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#701a31]">
                <input
                  type="checkbox"
                  checked={postAsAdmin}
                  onChange={(e) => {
                    setPostAsAdmin(e.target.checked);
                    if (e.target.checked) setSelectedColor('#701a31');
                  }}
                  className="rounded text-[#701a31] focus:ring-[#701a31]"
                />
                <span>Admin Post</span>
              </label>
            )}
          </div>

          {/* 1. Song Search & Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-black flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>Search Song to Dedicate <span className="text-rose-500">*</span></span>
              </span>
              {songRequiredError && !selectedSong && (
                <span className="text-[11px] text-red-600 font-bold">Required</span>
              )}
              {selectedSong && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSong(null);
                    setSongSearchQuery('');
                    setSongRequiredError(false);
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Change song
                </button>
              )}
            </label>

            {!selectedSong ? (
              <div className="relative">
                <div className={`flex items-center rounded-xl px-3 py-2.5 transition-all shadow-2xs ${
                  songRequiredError
                    ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/40'
                    : 'bg-[#f4f4f0] border border-[#d1d5dc] focus-within:border-black focus-within:bg-white'
                }`}>
                  <Search className={`w-4 h-4 mr-2 shrink-0 ${songRequiredError ? 'text-red-500' : 'text-gray-400'}`} />
                  <input
                    ref={songInputRef}
                    type="text"
                    value={songSearchQuery}
                    onChange={(e) => {
                      setSongSearchQuery(e.target.value);
                      if (songRequiredError) setSongRequiredError(false);
                    }}
                    placeholder={songRequiredError ? 'Please search and select a song here...' : 'Type track name or artist (e.g., Sining, Birds of a Feather)...'}
                    className="w-full text-xs sm:text-sm text-black placeholder-gray-400 bg-transparent border-0 focus:outline-none font-medium"
                    autoFocus={songRequiredError}
                  />
                  {isSearchingSong && (
                    <RefreshCw className="w-4 h-4 text-gray-400 animate-spin shrink-0 ml-2" />
                  )}
                  {songSearchQuery && !isSearchingSong && (
                    <button
                      type="button"
                      onClick={() => setSongSearchQuery('')}
                      className="p-0.5 text-gray-400 hover:text-black rounded shrink-0 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {songRequiredError && (
                  <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center gap-1.5 animate-in fade-in duration-150">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                    Please search and select a song before submitting.
                  </p>
                )}

                {/* Autocomplete Dropdown List */}
                {songSearchResults.length > 0 && (
                  <div className="absolute z-30 w-full mt-1.5 bg-white border border-black/20 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-150">
                    {songSearchResults.map((track, i) => {
                      const img = track.image_url || (track.image?.[1]?.['#text'] && !track.image[1]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? track.image[1]['#text'] : null);
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setSelectedSong(track);
                            setSongSearchResults([]);
                            setSongSearchQuery('');
                            setSongRequiredError(false);
                          }}
                          className="flex items-center gap-3 p-2.5 hover:bg-[#fff1f3] cursor-pointer transition-colors"
                        >
                          {img ? (
                            <img src={img} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-lg border border-black/10 object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center border border-black/10 shrink-0 text-xs">
                              🎵
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-extrabold truncate text-black">{track.name}</div>
                            <div className="text-[11px] font-semibold text-gray-500 truncate">{track.artist}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-black text-white rounded-full shrink-0">
                            Select
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Song Card Display */
              <div className="p-3 bg-[#fdfdfd] border border-black/15 rounded-xl flex items-center gap-3 shadow-2xs relative">
                {(() => {
                  const songImg = selectedSong.image_url ||
                    (selectedSong.image?.[2]?.['#text'] && !selectedSong.image[2]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? selectedSong.image[2]['#text'] : null);
                  return songImg ? (
                    <img
                      src={songImg}
                      alt={selectedSong.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl border border-black/10 object-cover shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Music className="w-5 h-5 text-[#ffc900]" />
                    </div>
                  );
                })()}

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-black truncate text-black mt-0.5">{selectedSong.name}</h4>
                  <p className="text-[11px] font-bold text-gray-500 truncate">{selectedSong.artist}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSong(null)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                  title="Remove selected song"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 2. Dedicated To (Required) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-black flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>Dedicated To <span className="text-rose-500">*</span></span>
              </span>
              {dedicatedToRequiredError && !dedicatedTo.trim() && (
                <span className="text-[11px] text-red-600 font-bold">Required</span>
              )}
            </label>
            <input
              ref={dedicatedToInputRef}
              type="text"
              value={dedicatedTo}
              onChange={(e) => {
                setDedicatedTo(e.target.value);
                if (dedicatedToRequiredError) setDedicatedToRequiredError(false);
              }}
              placeholder="e.g. Someone from Nursing, Crush, Bestie, or a Name..."
              maxLength={40}
              className={`w-full text-xs sm:text-sm text-black px-3 py-2.5 rounded-xl transition-all font-medium shadow-2xs ${
                dedicatedToRequiredError && !dedicatedTo.trim()
                  ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/40 placeholder-red-400 focus:outline-none'
                  : 'bg-[#f4f4f0] border border-[#d1d5dc] focus:border-black focus:bg-white focus:outline-none'
              }`}
            />
            {dedicatedToRequiredError && !dedicatedTo.trim() && (
              <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                Please specify who you are dedicating this song to.
              </p>
            )}
            {/* Quick Helper Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {['Secret Crush', 'Everyone in CU', 'My Best Friend', 'Future Self'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setDedicatedTo(chip);
                    if (dedicatedToRequiredError) setDedicatedToRequiredError(false);
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 hover:bg-[#fff1f3] hover:text-[#701a31] text-gray-600 rounded-full border border-gray-200 transition-colors cursor-pointer"
                >
                  +{chip}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Dedication Note / Message (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-black flex items-center justify-between">
              <span>Dedication Note</span>
              <span className="text-[11px] text-gray-400 font-medium">{message.length}/300</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              placeholder="Why are you dedicating this song? Add a short note, lyrics, or confession..."
              className="w-full p-2.5 text-xs sm:text-sm text-black placeholder-gray-400 bg-[#f4f4f0] border border-[#d1d5dc] rounded-xl focus:border-black focus:bg-white focus:outline-none resize-none leading-relaxed transition-all shadow-2xs font-medium"
            />
          </div>

          {/* 4. Souvenir Note Color & Action Controls */}
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            {/* Color Palette */}
            {!postAsAdmin && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-gray-500">Color:</span>
                {MUSIC_POST_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border border-black/15 transition-all flex items-center justify-center cursor-pointer ${
                      selectedColor === c.hex
                        ? 'ring-2 ring-black scale-110 shadow-xs'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    title={c.name}
                  >
                    {selectedColor === c.hex && (
                      <Check className={`w-3 h-3 ${c.hex === '#701a31' || c.hex === '#c41e3a' ? 'text-white' : 'text-black'}`} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => goBack()}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-500 hover:text-black transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedSong || (!postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS))}
                className="px-5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-black text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : cooldownRemaining > 0 && !postAsAdmin ? (
                  <span>Wait {cooldownRemaining}s</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Live Music Card Preview ────────────────────────────────────────── */}
        <div className="space-y-2 mt-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
              <span>Preview</span>
            </span>
          </div>

          {/* Music Wall Simulated Card */}
          <div className="flex justify-center">
            <div
              style={{ backgroundColor: cardBgColor }}
              className={`w-full max-w-[280px] sm:max-w-[320px] p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-between relative shadow-md ${
                isDark ? 'border-black/20 text-white' : 'border-[#d1d5dc] text-neutral-900'
              }`}
            >
              {/* Top Dedicated To Badge */}
              <div className="w-full flex items-center justify-center min-h-[22px] px-1 mb-2">
                {dedicatedTo.trim() ? (
                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full truncate max-w-full flex items-center gap-1 border border-rose-200">
                    <span className="truncate">For: {dedicatedTo.trim()}</span>
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full truncate ${
                    isDark ? 'bg-white/20 text-white' : 'bg-black/5 text-gray-600'
                  }`}>
                    {currentAuthorDept.replace('College of ', '')}
                  </span>
                )}
              </div>

              {/* Simulated Spinning Vinyl CD Disc */}
              <div className="relative my-2 flex items-center justify-center py-1">
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 shadow-xl relative flex items-center justify-center animate-spin"
                  style={{ animationDuration: '6s', animationTimingFunction: 'linear' }}
                >
                  {/* CD Concentric Grooves */}
                  <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />
                  <div className="absolute inset-3.5 rounded-full border border-white/5 pointer-events-none" />
                  <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />

                  {/* Glossy Iridescent CD Sheen */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-white/10 pointer-events-none" />

                  {/* Center Album Art Circular Sticker */}
                  <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden border border-neutral-700/80 shadow-inner relative flex items-center justify-center bg-white shrink-0 z-10">
                    {selectedSong ? (
                      (() => {
                        const img = selectedSong.image_url ||
                          (selectedSong.image?.[2]?.['#text'] && !selectedSong.image[2]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? selectedSong.image[2]['#text'] : null);
                        return img ? (
                          <img
                            src={img}
                            alt={selectedSong.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                            <Music className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" />
                          </div>
                        );
                      })()
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                        <Music className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                      </div>
                    )}
                    {/* Center CD Spindle Hole */}
                    <div className="absolute w-3 h-3 rounded-full bg-[#f4f4f0] border border-neutral-800 shadow-inner z-20" />
                  </div>
                </div>
              </div>

              {/* Song Title and Artist */}
              <div className="w-full flex flex-col items-center text-center mt-2 px-2">
                <h3 className="text-xs sm:text-sm font-extrabold truncate w-full tracking-tight leading-tight">
                  {selectedSong?.name || 'Pick a song to preview'}
                </h3>
                <p className={`text-[10px] sm:text-xs font-semibold truncate w-full mt-0.5 ${
                  isDark ? 'text-white/80' : 'text-neutral-500'
                }`}>
                  {selectedSong?.artist || 'Artist Name'}
                </p>

                {/* Optional Message snippet */}
                {message.trim() && (
                  <p className={`text-[11px] mt-2 px-2 py-1 rounded-lg line-clamp-2 italic w-full text-center leading-snug ${
                    isDark ? 'bg-white/15 text-white' : 'bg-black/5 text-gray-700'
                  }`}>
                    &ldquo;{message.trim()}&rdquo;
                  </p>
                )}

                {/* Simulated Footer */}
                <div className={`mt-2.5 pt-2 border-t w-full flex items-center justify-between text-[10px] font-bold ${
                  isDark ? 'border-white/15 text-white/70' : 'border-black/10 text-gray-500'
                }`}>
                  <span className="truncate">by @{currentAuthorAlias}</span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>0</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
