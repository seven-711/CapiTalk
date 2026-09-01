'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, getAvatarForPseudonym } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { FreedomPollOption } from '../lib/types';
import { processUploadedImage } from '../lib/utils/imagePipeline';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Film,
  Search,
  Check,
  RefreshCw,
  AlertCircle,
  BarChart2,
  Sparkles,
  Globe,
  Heart,
  MoreHorizontal,
  Music,
  Play,
  Pause,
  Volume2,
} from 'lucide-react';
import { VinylDiskPlayer } from './VinylDiskPlayer';
import { TRENDING_CAMPUS_TRACKS } from '../lib/musicPresets';

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

const FbCommentSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 3.75A2.25 2.25 0 002.25 6v10.5A2.25 2.25 0 004.5 18.75h2.25v3.19c0 .67.8 1.02 1.3.57l3.76-3.76h7.69A2.25 2.25 0 0021.75 16.5V6a2.25 2.25 0 00-2.25-2.25H4.5zM6 8.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 8.25zm0 3.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H6.75A.75.75 0 016 12z" clipRule="evenodd" />
  </svg>
);

interface CampusGifItem {
  title: string;
  url: string;
}

interface CampusGifCategory {
  id: string;
  name: string;
  gifs?: CampusGifItem[];
}

const CAMPUS_GIF_COLLECTIONS: CampusGifCategory[] = [
  { id: 'all', name: 'All' },
  {
    id: 'reactions',
    name: 'Reactions',
    gifs: [
      { title: 'Excited', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
      { title: 'Victory', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
      { title: 'High Five', url: 'https://media.giphy.com/media/l0amJzVHIAfl7jMDos/giphy.gif' },
      { title: 'Hype', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
    ],
  },
  {
    id: 'study',
    name: 'Study',
    gifs: [
      { title: 'Studying Late', url: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif' },
      { title: 'Need Coffee', url: 'https://media.giphy.com/media/hPTZgtzfRIB5Nfb5rL/giphy.gif' },
      { title: 'Typing Fast', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
      { title: 'Overwhelmed', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
    ],
  },
  {
    id: 'mood',
    name: 'Mood',
    gifs: [
      { title: 'Confused', url: 'https://media.giphy.com/media/3o7TKTDnUxE0g2BTSE/giphy.gif' },
      { title: 'Facepalm', url: 'https://media.giphy.com/media/14aUO0Mf651jeU/giphy.gif' },
      { title: 'Sipping Tea', url: 'https://media.giphy.com/media/3o85xGocUH8RY0WoKs/giphy.gif' },
      { title: 'Fine', url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif' },
    ],
  },
];

const POST_COLORS = [
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

export const PostNotePage: React.FC = () => {
  const {
    currentUser,
    freedomPosts,
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

  const [alias, setAlias] = useState(currentUser ? currentUser.username : 'Anon Student');
  const [department, setDepartment] = useState<string>(currentUser ? currentUser.department : 'General');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffc900');
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [messageRequiredError, setMessageRequiredError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNoteSentSuccess, setIsNoteSentSuccess] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Poll Feature State
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Attached Media State
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: 'image' | 'gif'; name?: string } | null>(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showGifModal, setShowGifModal] = useState(false);
  const [gifCategory, setGifCategory] = useState('all');
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Attached Song State
  const [attachedSong, setAttachedSong] = useState<any | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [songSearchTerm, setSongSearchTerm] = useState('');
  const [songSearchResults, setSongSearchResults] = useState<any[]>([]);
  const [isSearchingSong, setIsSearchingSong] = useState(false);
  const songSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Live Song Search
  useEffect(() => {
    if (!songSearchTerm.trim()) {
      setSongSearchResults([]);
      setIsSearchingSong(false);
      return;
    }

    setIsSearchingSong(true);
    if (songSearchTimeoutRef.current) clearTimeout(songSearchTimeoutRef.current);

    songSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(songSearchTerm.trim())}`);
        const data = await res.json();
        if (Array.isArray(data.tracks)) {
          setSongSearchResults(data.tracks);
        } else if (Array.isArray(data.results?.trackmatches?.track)) {
          setSongSearchResults(data.results.trackmatches.track);
        } else {
          setSongSearchResults([]);
        }
      } catch (err) {
        console.warn('Song search fetch error:', err);
        setSongSearchResults([]);
      } finally {
        setIsSearchingSong(false);
      }
    }, 280);

    return () => {
      if (songSearchTimeoutRef.current) clearTimeout(songSearchTimeoutRef.current);
    };
  }, [songSearchTerm]);

  const handleSelectSong = async (track: any) => {
    let previewUrl = track.preview_url;
    const trackTitle = track.name || track.title || '';
    const trackArtist = track.artist || '';

    setAttachedSong({
      name: trackTitle,
      title: trackTitle,
      artist: trackArtist,
      image_url: track.image_url || track.image?.[1]?.['#text'] || '/avatars/coin-left.jpg',
      preview_url: previewUrl,
      url: track.url || track.song_link,
      song_link: track.song_link || track.url,
      song_start_time: 0,
      song_duration: 30,
    });
    setShowSongModal(false);
    setSongSearchTerm('');

    // If previewUrl is not preset, resolve in background
    if (!previewUrl && trackTitle) {
      try {
        const queryTerm = `${trackArtist} ${trackTitle}`.trim();
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(queryTerm)}&entity=song&limit=1`,
          { signal: AbortSignal.timeout(3500) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
            setAttachedSong((prev: any) => {
              if (prev && (prev.title === trackTitle || prev.name === trackTitle)) {
                return { ...prev, preview_url: data.results[0].previewUrl };
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // Silently catch
      }
    }
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  // Rate limit / cooldown
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

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    setIsProcessingMedia(true);

    try {
      if (file.type === 'image/gif') {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('GIF exceeds 5MB limit.');
        }
        const formData = new FormData();
        formData.append('file', file, file.name);

        const uploadReq = await fetch('/api/freedom-wall/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadReq.ok) {
          const uploadJson = await uploadReq.json();
          if (uploadJson.success && uploadJson.url) {
            setAttachedMedia({ url: uploadJson.url, type: 'gif', name: file.name });
            setIsProcessingMedia(false);
            return;
          }
        }
        throw new Error('Failed to upload GIF. Please try again.');
      } else if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        const processed = await processUploadedImage(file, 900, 240, 0.75);
        const blobRes = await fetch(processed.fullDataUrl);
        const blob = await blobRes.blob();
        const formData = new FormData();
        formData.append('file', blob, processed.fileName);

        const uploadReq = await fetch('/api/freedom-wall/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadReq.ok) {
          const uploadJson = await uploadReq.json();
          if (uploadJson.success && uploadJson.url) {
            setAttachedMedia({ url: uploadJson.url, type: 'image', name: processed.fileName });
            setIsProcessingMedia(false);
            return;
          }
        }
        throw new Error('Failed to upload image. Please check your connection.');
      } else {
        throw new Error('Please upload JPG, PNG, WEBP, or GIF.');
      }
    } catch (err: any) {
      setMediaError(err?.message || 'Error processing image.');
      setIsProcessingMedia(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectPresetGif = (gifUrl: string) => {
    setAttachedMedia({ url: gifUrl, type: 'gif' });
    setShowGifModal(false);
    setMediaError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);
    setMessageRequiredError(false);

    if (!message.trim()) {
      setMessageRequiredError(true);
      messageInputRef.current?.focus();
      return;
    }

    if (message.length > 300) {
      setModerationError('Message cannot exceed 300 characters.');
      return;
    }

    if (!postAsAdmin && !isAdminUser) {
      if (cooldownRemaining > 0) {
        setModerationError(`Please wait ${cooldownRemaining}s before sharing again.`);
        return;
      }
      if (dailyPostCount >= DAILY_MAX_POSTS) {
        setModerationError(`Daily limit of ${DAILY_MAX_POSTS} notes reached.`);
        return;
      }
      const isDuplicate = (freedomPosts || [])
        .slice(0, 20)
        .some((p) => p.message.trim().toLowerCase() === message.trim().toLowerCase());
      if (isDuplicate) {
        setModerationError('An identical note was recently shared.');
        return;
      }
    }

    const modResult = analyzeContentModeration(message);
    if (modResult.contains_profanity) {
      setModerationError(`Message contains inappropriate language (${modResult.matched_terms.join(', ')}).`);
      return;
    }

    let finalPollQuestion: string | undefined = undefined;
    let pollOptionsList: FreedomPollOption[] | undefined = undefined;

    if (showPollForm) {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        setModerationError('Please provide at least 2 options for the poll.');
        return;
      }

      for (const opt of validOptions) {
        const check = analyzeContentModeration(opt);
        if (check.contains_profanity) {
          setModerationError(`Poll option contains inappropriate term ("${check.matched_terms.join(', ')}").`);
          return;
        }
      }

      finalPollQuestion = pollQuestion.trim() || message.trim();
      pollOptionsList = validOptions.map((optText, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text: optText,
        votes_count: 0,
        voted_users: [],
      }));
    }

    setIsSubmitting(true);
    try {
      const authorAlias = postAsAdmin
        ? 'Admin'
        : (currentUser ? currentUser.username : (alias.trim() || 'Anon Student'));

      const authorDepartment = postAsAdmin
        ? ''
        : (currentUser ? currentUser.department : (department || 'General'));

      const authorAvatar = postAsAdmin
        ? '/avatars/coin-left.jpg'
        : (currentUser?.avatar_url || getAvatarForPseudonym(authorAlias));

      const newPostId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

      const success = await addFreedomPost({
        id: newPostId,
        author_alias: authorAlias,
        department: authorDepartment,
        author_avatar: authorAvatar,
        author_bio: currentUser?.bio || '',
        message: message.trim(),
        color: postAsAdmin ? '#701a31' : selectedColor,
        is_admin: postAsAdmin,
        image_url: attachedMedia?.url,
        image_type: attachedMedia?.type,
        poll_question: finalPollQuestion,
        poll_options: pollOptionsList,
        song_title: attachedSong ? (attachedSong.name || attachedSong.title) : undefined,
        song_artist: attachedSong?.artist || undefined,
        song_image_url: attachedSong?.image_url || undefined,
        song_preview_url: attachedSong?.preview_url || undefined,
        song_link: attachedSong ? (attachedSong.song_link || attachedSong.url) : undefined,
        song_start_time: attachedSong?.song_start_time !== undefined ? attachedSong.song_start_time : 0,
        song_duration: attachedSong?.song_duration !== undefined ? attachedSong.song_duration : 30,
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
        setIsNoteSentSuccess(true);
        setTimeout(() => {
          setViewState('freedom_wall');
        }, 2200);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAuthorAlias = postAsAdmin
    ? 'Admin'
    : (currentUser ? currentUser.username : (alias.trim() || 'Anon Student'));

  const currentAuthorDept = postAsAdmin
    ? 'Admin'
    : (currentUser ? currentUser.department : (department || 'General'));

  const previewAvatar = postAsAdmin
    ? '/avatars/coin-left.jpg'
    : (currentUser?.avatar_url || getAvatarForPseudonym(currentAuthorAlias));

  return (
    <div className="min-h-screen bg-[#f4f4f0] dark:bg-[#0e0e11] text-black dark:text-[#f4f4f6] font-sans pb-16 transition-colors duration-200">
      {/* ── Main Composer Container ──────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-6">
        {/* Error Alert */}
        {moderationError && (
          <div className="mx-3 sm:mx-0 my-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{moderationError}</span>
            <button type="button" onClick={() => setModerationError(null)} className="p-0.5 hover:bg-rose-100 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Composer Card with Modern Hairline Styling */}
        <div className="bg-white dark:bg-[#18181b] border-y sm:border border-[#d1d5dc] dark:border-zinc-800 sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
          {/* Author Badge Info */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={previewAvatar}
                alt={currentAuthorAlias}
                className="w-9 h-9 rounded-full border border-[#d1d5dc] dark:border-zinc-700 object-cover bg-amber-50 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm text-black dark:text-white truncate">
                    {currentAuthorAlias}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#fff1f3] dark:bg-[#271216] text-[#701a31] dark:text-rose-400 rounded-md border border-[#701a31]/20 dark:border-rose-900/40 shrink-0">
                    {currentAuthorDept.replace('College of ', '')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium">Posting to Campus Wall</p>
              </div>
            </div>

            {/* Admin Switcher */}
            {isAdminUser && (
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#701a31] dark:text-rose-400">
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

          {/* Text Area */}
          <div className="space-y-1">
            <div className={`transition-all rounded-xl ${
              messageRequiredError
                ? 'border-2 border-red-500 ring-2 ring-red-500/20 bg-red-50/40 dark:bg-red-950/20 p-2.5'
                : 'p-1'
            }`}>
              <textarea
                ref={messageInputRef}
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (messageRequiredError) setMessageRequiredError(false);
                }}
                maxLength={300}
                placeholder={messageRequiredError ? "Please enter your message before publishing..." : "What's on your mind? Share confession, midterm notes, or campus vibe..."}
                className="w-full text-sm sm:text-base text-black dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none leading-relaxed"
                autoFocus
              />
            </div>
            {messageRequiredError && (
              <p className="text-xs font-bold text-red-600 dark:text-red-400 px-1 flex items-center gap-1.5 animate-in fade-in duration-150">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                Please write your note before publishing.
              </p>
            )}
            <div className="flex justify-end text-[11px] font-medium text-gray-400 dark:text-zinc-500">
              <span>{message.length}/300</span>
            </div>
          </div>

          {/* Attached Song Vinyl Disk Player */}
          {attachedSong && (
            <div className="mb-2.5">
              <VinylDiskPlayer
                songTitle={attachedSong.name || attachedSong.title}
                songArtist={attachedSong.artist}
                songImageUrl={attachedSong.image_url}
                songPreviewUrl={attachedSong.preview_url}
                songLink={attachedSong.song_link || attachedSong.url}
                songStartTime={attachedSong.song_start_time}
                songDuration={attachedSong.song_duration || 30}
                variant="compose"
                isDark={true}
                onRemove={() => setAttachedSong(null)}
              />
            </div>
          )}

          {/* Attached Media Preview */}
          {attachedMedia && (
            <div className="relative rounded-xl overflow-hidden border border-[#d1d5dc] dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 max-w-md">
              <img
                src={attachedMedia.url}
                alt="Media Preview"
                className="w-full max-h-60 object-contain bg-black/5 dark:bg-black/40"
              />
              <button
                type="button"
                onClick={() => setAttachedMedia(null)}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer shadow-md"
                title="Remove media"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Campus Poll Creator Form */}
          {showPollForm && (
            <div className="p-3 sm:p-4 bg-[#fbfbfa] dark:bg-zinc-900 border border-[#d1d5dc] dark:border-zinc-700 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-[#701a31] dark:text-rose-400" />
                  <span>Campus Poll</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowPollForm(false);
                    setPollQuestion('');
                    setPollOptions(['', '']);
                  }}
                  className="text-xs text-gray-400 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold cursor-pointer"
                >
                  Remove
                </button>
              </div>

              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Poll question / topic (optional)"
                maxLength={100}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-zinc-800 border border-[#d1d5dc] dark:border-zinc-700 rounded-lg font-medium text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              />

              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      maxLength={60}
                      className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-zinc-800 border border-[#d1d5dc] dark:border-zinc-700 rounded-lg font-medium text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollOption(idx)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddPollOption}
                  className="text-xs font-bold text-[#701a31] dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option ({pollOptions.length}/4)</span>
                </button>
              )}
            </div>
          )}

          {/* Color & Toolbar Actions + Bottom Buttons */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            {/* Color Palette & Media Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {!postAsAdmin && (
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-400">Color:</span>
                  {POST_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full border border-black/10 transition-all flex items-center justify-center cursor-pointer ${
                        selectedColor === c.hex
                          ? 'ring-2 ring-black dark:ring-white scale-110 shadow-xs'
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

              {/* Media & Poll Action Buttons */}
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleMediaFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingMedia}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="Attach Image"
                >
                  {isProcessingMedia ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-black dark:text-white" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGifModal(true)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="Attach GIF"
                >
                  <Film className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowSongModal(true)}
                  className={`p-2 rounded-full transition-all cursor-pointer relative ${
                    attachedSong
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
                  }`}
                  title={attachedSong ? 'Change Attached Song' : 'Attach Song'}
                >
                  <Music className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowPollForm(!showPollForm)}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    showPollForm
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-black dark:hover:text-white'
                  }`}
                  title={showPollForm ? 'Remove Poll' : 'Add Poll'}
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Action Controls (Cancel & Share Note) */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => goBack()}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (!postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS)) || !message.trim()}
                className="px-5 py-2 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-black dark:disabled:hover:bg-white text-white dark:text-black font-black text-xs sm:text-sm transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : cooldownRemaining > 0 && !postAsAdmin ? (
                  <span>Wait {cooldownRemaining}s</span>
                ) : (
                  <span>Share</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Live Note Preview Card ────────────────────────────────────────── */}
        <div className="space-y-2 mt-5 px-3 sm:px-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>Preview</span>
            </span>
          </div>

          {/* Note Card Simulation matching FreedomWall */}
          {(() => {
            const cardBgColor = postAsAdmin ? '#701a31' : selectedColor;
            const isDark = isColorDark(cardBgColor);

            return (
              <article
                style={{ backgroundColor: cardBgColor }}
                className={`sm:rounded-xl shadow-xs border-y sm:border overflow-visible relative transition-all duration-200 ${
                  isDark
                    ? 'border-black/20 text-white shadow-md'
                    : 'border-[#e4e6eb] text-[#050505]'
                }`}
              >
                {/* Post Header */}
                <div className="p-3.5 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Profile Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={previewAvatar}
                        alt={currentAuthorAlias}
                        className={`w-10 h-10 rounded-full border object-cover ${
                          isDark ? 'border-white/40 bg-white/10' : 'border-[#e4e6eb] bg-[#f0f2f5]'
                        }`}
                      />
                      {postAsAdmin && (
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-[9px] text-white font-bold"
                          title="Official Admin"
                        >
                          ✓
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold text-[14.5px] truncate max-w-[170px] sm:max-w-[240px] text-left leading-tight ${
                            isDark ? 'text-white' : 'text-[#050505]'
                          }`}
                        >
                          {currentAuthorAlias}
                        </span>

                        {/* Status Pills */}
                        {postAsAdmin ? (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 border ${
                              isDark ? 'bg-white/20 text-white border-white/30' : 'bg-[#701a31]/10 text-[#701a31] border-[#701a31]/30'
                            }`}
                          >
                            Official
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 border ${
                              isDark ? 'bg-white/20 text-white border-white/30' : 'bg-black/5 text-[#050505] border-black/10'
                            }`}
                          >
                            You
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex items-center gap-1 text-[12px] leading-tight mt-0.5 ${
                          isDark ? 'text-white/80' : 'text-[#65676b]'
                        }`}
                      >
                        {!postAsAdmin && currentAuthorDept && (
                          <>
                            <span className="font-normal truncate max-w-[130px] sm:max-w-[180px]">
                              {currentAuthorDept.replace('College of ', '')}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span>Just now</span>
                        <span>·</span>
                        <Globe className={`w-3 h-3 shrink-0 ${isDark ? 'text-white/80' : 'text-[#65676b]'}`} />
                      </div>
                    </div>
                  </div>

                  {/* 3-Dots More Options Menu */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled
                      className={`p-1.5 rounded-full ${
                        isDark ? 'text-white/80' : 'text-[#65676b]'
                      }`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Post Message Body */}
                <div
                  className={`px-3.5 sm:px-4 pb-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                    isDark ? 'text-white' : 'text-[#050505]'
                  }`}
                >
                  {message.trim() || (
                    <span className="opacity-60 italic">Your note confession or vibe will appear here...</span>
                  )}
                </div>

                {/* Attached Song Vinyl Disk Preview */}
                {attachedSong && (
                  <VinylDiskPlayer
                    songTitle={attachedSong.name || attachedSong.title}
                    songArtist={attachedSong.artist}
                    songImageUrl={attachedSong.image_url}
                    songPreviewUrl={attachedSong.preview_url}
                    songLink={attachedSong.song_link || attachedSong.url}
                    songStartTime={attachedSong.song_start_time}
                    songDuration={attachedSong.song_duration || 30}
                    variant="card"
                    isDark={true}
                  />
                )}

                {/* Attached Image / Animated GIF Media */}
                {attachedMedia && (
                  <div
                    className={`relative w-full bg-[#1c1e21] overflow-hidden select-none border-y ${
                      isDark ? 'border-white/20' : 'border-[#e4e6eb]'
                    }`}
                  >
                    <img
                      src={attachedMedia.url}
                      alt="Attachment Preview"
                      className="w-full h-auto object-contain max-h-[540px] mx-auto block"
                    />
                    {attachedMedia.type === 'gif' && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-md uppercase tracking-wider pointer-events-none backdrop-blur-xs">
                        GIF
                      </span>
                    )}
                  </div>
                )}

                {/* Campus Poll Preview */}
                {showPollForm && (
                  <div
                    className={`mx-3.5 sm:mx-4 my-2.5 p-3 rounded-xl border ${
                      isDark
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-[#f0f2f5]/60 border-[#e4e6eb] text-[#050505]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate ${
                          isDark ? 'text-white/90' : 'text-[#65676b]'
                        }`}
                      >
                        <BarChart2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-white' : 'text-[#1877f2]'}`} />
                        <span className="truncate">{pollQuestion.trim() || 'Campus Poll'}</span>
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                          isDark ? 'bg-white/20 text-white border-white/30' : 'bg-white text-[#65676b] border-[#e4e6eb]'
                        }`}
                      >
                        Tap option to vote
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {pollOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          className={`w-full text-left p-2 rounded-lg border text-xs font-semibold truncate ${
                            isDark
                              ? 'bg-white/15 border-white/20 text-white'
                              : 'bg-white border-[#e4e6eb] text-[#050505]'
                          }`}
                        >
                          {opt.trim() || `Option ${idx + 1}`}
                        </div>
                      ))}
                    </div>
                    <p className={`text-[10px] text-center mt-1.5 italic ${isDark ? 'text-white/80' : 'text-[#65676b]'}`}>
                      Vote to reveal results
                    </p>
                  </div>
                )}

                {/* Post Metrics Bar */}
                <div
                  className={`px-3.5 py-2 flex items-center justify-between text-[13px] border-t ${
                    isDark ? 'border-white/15 text-white/80' : 'border-black/10 text-[#65676b]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium text-[13px] ${isDark ? 'text-white/90' : 'text-[#65676b]'}`}>
                      Be the first to react
                    </span>
                  </div>

                  <span className={`font-medium text-[13px] ${isDark ? 'text-white/90' : 'text-[#65676b]'}`}>
                    0 comments
                  </span>
                </div>

                {/* Action Buttons Bar */}
                <div
                  className={`px-2 py-1 flex items-center justify-between border-t ${
                    isDark ? 'border-white/15' : 'border-black/10'
                  }`}
                >
                  <div
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[13.5px] font-bold ${
                      isDark ? 'text-white/80' : 'text-[#65676b]'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>Like</span>
                  </div>

                  <div
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[13.5px] font-bold ${
                      isDark ? 'text-white/80' : 'text-[#65676b]'
                    }`}
                  >
                    <FbCommentSvg className="w-4 h-4" />
                    <span>Comment</span>
                  </div>
                </div>
              </article>
            );
          })()}
        </div>
      </main>

      {/* Song Selection Modal */}
      {showSongModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] border border-[#d1d5dc] dark:border-zinc-800 p-4 rounded-2xl max-w-md w-full text-left shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-sm text-black dark:text-white">
                <span>Select Soundtrack</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSongModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="pt-2 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={songSearchTerm}
                  onChange={(e) => setSongSearchTerm(e.target.value)}
                  placeholder="Search track title or artist..."
                  className="w-full pl-8 pr-8 py-2 text-xs border border-[#d1d5dc] dark:border-zinc-700 rounded-xl bg-[#f4f4f0] dark:bg-zinc-800 text-black dark:text-white font-medium focus:outline-none focus:border-black dark:focus:border-white"
                  autoFocus
                />
                {songSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setSongSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Track Results List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[240px] custom-scrollbar">
              {isSearchingSong ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400 dark:text-zinc-500">
                  <p className="text-xs font-medium">Searching...</p>
                </div>
              ) : songSearchResults.length > 0 ? (
                <div className="space-y-1">
                  {songSearchResults.map((track: any, idx: number) => {
                    const trackTitle = track.name || track.title;
                    const trackArtist = track.artist || 'Unknown Artist';
                    const trackCover = track.image_url || track.image?.[1]?.['#text'] || '/avatars/coin-left.jpg';

                    return (
                      <div
                        key={`${track.id || trackTitle}-${idx}`}
                        onClick={() => handleSelectSong(track)}
                        className="p-2 rounded-xl hover:bg-[#f4f4f0] dark:hover:bg-zinc-800/80 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={trackCover}
                            alt={trackTitle}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover bg-neutral-200 border border-black/10 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/avatars/coin-left.jpg');
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-black dark:text-white truncate">
                              {trackTitle}
                            </p>
                            <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 truncate">
                              {trackArtist}
                            </p>
                          </div>
                        </div>

                        <div className="px-3 py-1 rounded-lg bg-amber-400 text-black font-black text-[11px] group-hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-1 shadow-2xs">
                          <Plus className="w-3 h-3" />
                          <span>Attach</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : songSearchTerm.trim() ? (
                <div className="py-10 text-center text-xs text-gray-500 dark:text-zinc-400 font-medium">
                  No songs found for &quot;{songSearchTerm}&quot;
                </div>
              ) : (
                <div className="space-y-3 py-1">
                  <div className="space-y-1">
                    {TRENDING_CAMPUS_TRACKS.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handleSelectSong(track)}
                        className="p-2 rounded-xl hover:bg-[#f4f4f0] dark:hover:bg-zinc-800/80 border border-transparent hover:border-amber-300/60 dark:hover:border-amber-400/20 transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={track.image_url}
                            alt={track.title}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover bg-neutral-200 border border-black/10 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/avatars/coin-left.jpg');
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-extrabold text-black dark:text-white truncate">
                              {track.title}
                            </p>
                            <p className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 truncate">
                              {track.artist}
                            </p>
                          </div>
                        </div>

                        <div className="px-3 py-1 rounded-lg bg-amber-400 text-black font-black text-[11px] group-hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-1 shadow-2xs">
                          <span>Attach</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GIFs Modal */}
      {showGifModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] border border-[#d1d5dc] dark:border-zinc-800 p-4 rounded-2xl max-w-md w-full text-left shadow-2xl relative max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <span className="text-sm font-bold text-black dark:text-white">Select a GIF</span>
              <button
                type="button"
                onClick={() => setShowGifModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-2 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gifSearchTerm}
                  onChange={(e) => setGifSearchTerm(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-[#d1d5dc] dark:border-zinc-700 rounded-lg bg-[#f4f4f0] dark:bg-zinc-800 text-black dark:text-white font-medium focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-2 shrink-0 scrollbar-none">
              {CAMPUS_GIF_COLLECTIONS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGifCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                    gifCategory === cat.id
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-black dark:text-white border-[#d1d5dc] dark:border-zinc-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-[180px]">
              {(() => {
                const allGifs: CampusGifItem[] = CAMPUS_GIF_COLLECTIONS.flatMap((c) => (c.gifs ? c.gifs : []));
                const activeCategoryGifs: CampusGifItem[] = gifCategory === 'all'
                  ? allGifs
                  : (CAMPUS_GIF_COLLECTIONS.find((c) => c.id === gifCategory)?.gifs || []);

                const filteredGifs: CampusGifItem[] = gifSearchTerm.trim()
                  ? allGifs.filter((g) => g.title.toLowerCase().includes(gifSearchTerm.toLowerCase()))
                  : activeCategoryGifs;

                if (filteredGifs.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-gray-500 dark:text-zinc-400 font-medium">
                      No GIFs found
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {filteredGifs.map((gif: CampusGifItem, idx: number) => (
                      <button
                        key={`${gif.url}-${idx}`}
                        type="button"
                        onClick={() => handleSelectPresetGif(gif.url)}
                        className="relative rounded-xl border border-[#d1d5dc] dark:border-zinc-700 overflow-hidden bg-black/5 dark:bg-zinc-900 hover:border-black dark:hover:border-white transition-all text-left cursor-pointer"
                      >
                        <img
                          src={gif.url}
                          alt={gif.title}
                          className="w-full h-28 object-cover"
                          loading="lazy"
                        />
                        <div className="p-1 bg-white dark:bg-zinc-800 border-t border-[#d1d5dc] dark:border-zinc-700 text-[10px] font-bold text-black dark:text-white truncate">
                          {gif.title}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sent Celebration Overlay */}
      {isNoteSentSuccess && (
        <div className="fixed inset-0 z-[120] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="max-w-xs w-full flex flex-col items-center text-center">
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
              <DotLottieReact
                src="/animated-assets/sent.lottie"
                loop={false}
                autoplay={true}
                className="w-full h-full"
              />
            </div>

            <h3 className="text-lg font-extrabold text-black mt-2">
              Note Shared
            </h3>

            <p className="text-xs text-gray-500 mt-1">
              {postAsAdmin
                ? 'Published live to Freedom Wall'
                : 'Submitted for review'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
