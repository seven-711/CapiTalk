'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, getAvatarForPseudonym } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { FreedomPost } from '../lib/types';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import {
  Plus,
  Heart,
  Search,
  X,
  Send,
  AlertTriangle,
  Clock,
  Flag,
  Trash2,
  ShieldAlert,
  Pin,
  CheckCircle,
  PlayCircle,
  Play,
  Pause,
  Music,
  RefreshCw,
  Flame,
  AlertCircle,
  MessageSquare,
  Users,
  ExternalLink,
  Mic2,
  Tv,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { ReportNoteModal } from './ReportNoteModal';
import { DeleteNoteModal } from './DeleteNoteModal';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import {
  getAdminToken,
  verifyAdminSession,
  purgeLegacyAdminKeys,
} from '../lib/auth/adminAuth';

function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

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
  { name: 'Soft Rose', hex: '#fff1f3' },
  { name: 'Gold', hex: '#ffc900' },
  { name: 'Blush Pink', hex: '#ff90e8' },
  { name: 'Mint Green', hex: '#00e599' },
  { name: 'Sky Blue', hex: '#7dd3fc' },
  { name: 'Lavender', hex: '#d8b4fe' },
  { name: 'Warm Peach', hex: '#ffedd5' },
  { name: 'Clean White', hex: '#ffffff' },
];

export const MusicWall: React.FC = () => {
  const {
    currentUser,
    freedomPosts,
    addFreedomPost,
    deleteFreedomPost,
    approveFreedomPost,
    likeFreedomPost,
    togglePinFreedomPost,
    myPostIds,
    myPseudonyms,
    setViewState,
  } = useChatStore();

  const [isAdminUser, setIsAdminUser] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getAdminToken());
  });
  const [postAsAdmin, setPostAsAdmin] = useState(false);
  const [commentAsAdmin, setCommentAsAdmin] = useState(false);

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
            setCommentAsAdmin(false);
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
          setCommentAsAdmin(false);
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
      setCommentAsAdmin(false);
    }
  }, [isAdminUser]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<FreedomPost | null>(null);
  const [selectedPostForDelete, setSelectedPostForDelete] = useState<FreedomPost | null>(null);
  const [reactorsPost, setReactorsPost] = useState<FreedomPost | null>(null);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<FreedomPost | null>(null);

  // Modal Tab & Lyrics State
  const [detailModalTab, setDetailModalTab] = useState<'player' | 'lyrics' | 'video'>('player');
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState<{
    loading: boolean;
    lyrics: string | null;
    videoId?: string | null;
    error?: string | null;
  }>({ loading: false, lyrics: null });

  const fetchLyrics = async (post: FreedomPost) => {
    setLyricsData({ loading: true, lyrics: null, error: null });
    try {
      const vid = extractYoutubeId(post.song_link);
      const url = vid
        ? `/api/music/lyrics?id=${vid}&title=${encodeURIComponent(post.song_title || '')}&artist=${encodeURIComponent(post.song_artist || '')}`
        : `/api/music/lyrics?title=${encodeURIComponent(post.song_title || '')}&artist=${encodeURIComponent(post.song_artist || '')}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.lyrics) {
        setLyricsData({
          loading: false,
          lyrics: data.lyrics,
          videoId: data.videoId || vid,
        });
      } else {
        setLyricsData({
          loading: false,
          lyrics: null,
          videoId: data.videoId || vid,
          error: data.message || 'No official lyrics available for this track on YouTube Music.',
        });
      }
    } catch (e: any) {
      setLyricsData({
        loading: false,
        lyrics: null,
        error: 'Unable to load lyrics right now. Please try again.',
      });
    }
  };

  useEffect(() => {
    if (selectedPostForDetail) {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch (e) {}
        setPlayingPostId(null);
      }
      setDetailModalTab('player');
      setCopiedLyrics(false);
      fetchLyrics(selectedPostForDetail);
    }
  }, [selectedPostForDetail?.id]);

  // Global Audio Playback State for CD Discs
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [audioLoadingPostId, setAudioLoadingPostId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlaySong = async (e: React.MouseEvent, post: FreedomPost) => {
    e.stopPropagation();

    // If already playing this song -> pause
    if (playingPostId === post.id) {
      if (activeAudioRef.current) {
        if (activeAudioRef.current.paused) {
          const p = activeAudioRef.current.play();
          if (p !== undefined) {
            p.catch((err) => {
              if (err.name !== 'AbortError') {
                console.warn('Audio play notice:', err);
              }
            });
          }
        } else {
          try {
            activeAudioRef.current.pause();
          } catch (e) {}
          setPlayingPostId(null);
        }
      }
      return;
    }

    // If another song is playing, pause it first
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
      } catch (e) {}
      activeAudioRef.current = null;
    }

    setPlayingPostId(null);

    let previewUrl = post.song_preview_url;

    // Fetch on the fly if missing preview_url
    if (!previewUrl && post.song_title && post.song_artist) {
      try {
        setAudioLoadingPostId(post.id);
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(post.song_artist + ' ' + post.song_title)}&entity=song&limit=1`, {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0 && data.results[0].previewUrl) {
            previewUrl = data.results[0].previewUrl;
            post.song_preview_url = previewUrl;
          }
        }
      } catch (err) {
        // Ignore iTunes preview fetch error
      } finally {
        setAudioLoadingPostId(null);
      }
    }

    if (!previewUrl || !previewUrl.trim()) {
      setSelectedPostForDetail(post);
      return;
    }

    try {
      const audio = new Audio(previewUrl);
      activeAudioRef.current = audio;
      setPlayingPostId(post.id);

      audio.onended = () => {
        setPlayingPostId(null);
      };

      audio.onerror = () => {
        setPlayingPostId(null);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn('Audio playback notice:', err);
          }
          setPlayingPostId(null);
        });
      }
    } catch (err) {
      setPlayingPostId(null);
    }
  };

  // Comments state for Music Wall
  const [selectedPostForComments, setSelectedPostForComments] = useState<FreedomPost | null>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>({});
  const [newCommentText, setNewCommentText] = useState('');
  // commentAlias is derived directly from currentUser — no manual input needed
  const [isFetchingComments, setIsFetchingComments] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      if (supabase && isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('freedom_comments').select('post_id');
          if (data) {
            const counts: Record<string, number> = {};
            data.forEach((row: { post_id: string }) => {
              counts[row.post_id] = (counts[row.post_id] || 0) + 1;
            });
            setCommentsCountMap(counts);
          }
        } catch (e) {}
      }
    };
    fetchCounts();
  }, [freedomPosts.length]);

  const openCommentsModal = async (post: FreedomPost) => {
    setSelectedPostForComments(post);
    setIsFetchingComments(true);
    setCommentsList([]);

    if (supabase && isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('freedom_comments')
          .select('*')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });

        if (data) {
          setCommentsList(data);
          setIsFetchingComments(false);
          return;
        }
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`capitalk_comments_${post.id}`);
        if (raw) setCommentsList(JSON.parse(raw));
      } catch (e) {}
    }
    setIsFetchingComments(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPostForComments) return;

    const isCommentAdmin = Boolean(isAdminUser && commentAsAdmin);
    const authorAlias = isCommentAdmin ? 'Admin' : (currentUser ? currentUser.username : 'Anon Student');
    const authorAvatar = isCommentAdmin ? '/avatars/coin-left.jpg' : (currentUser?.avatar_url || getAvatarForPseudonym(authorAlias));
    const authorDept = isCommentAdmin ? 'Admin' : (currentUser ? currentUser.department : 'General');

    const newComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      post_id: selectedPostForComments.id,
      author_alias: authorAlias,
      author_avatar: authorAvatar,
      department: authorDept,
      is_admin: isCommentAdmin,
      message: newCommentText.trim(),
      created_at: new Date().toISOString(),
    };

    const updated = [...commentsList, newComment];
    setCommentsList(updated);
    setCommentsCountMap((prev) => ({
      ...prev,
      [selectedPostForComments.id]: (prev[selectedPostForComments.id] || 0) + 1,
    }));
    setNewCommentText('');

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`capitalk_comments_${selectedPostForComments.id}`, JSON.stringify(updated));
      } catch (e) {}
    }

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('freedom_comments').insert({
          id: newComment.id,
          post_id: newComment.post_id,
          author_alias: newComment.author_alias,
          author_avatar: newComment.author_avatar,
          department: newComment.department,
          is_admin: newComment.is_admin,
          message: newComment.message,
          created_at: newComment.created_at,
        });
      } catch (e) {}
    }
  };

  // Long-press heart (mobile) → show reactors
  const heartPressTimer = useRef<NodeJS.Timeout | null>(null);
  const heartPressTriggered = useRef(false);

  const handleHeartPressStart = (post: FreedomPost) => {
    heartPressTriggered.current = false;
    heartPressTimer.current = setTimeout(() => {
      heartPressTriggered.current = true;
      setReactorsPost(post);
    }, 500);
  };

  const handleHeartPressEnd = (post: FreedomPost) => {
    if (heartPressTimer.current) clearTimeout(heartPressTimer.current);
    if (!heartPressTriggered.current) {
      likeFreedomPost(post.id);
    }
  };

  const [dedicatedTo, setDedicatedTo] = useState('');
  const [department, setDepartment] = useState<string>(currentUser ? currentUser.department : 'General');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#fff1f3');
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Anti-Bot & Rate Limit Protection State
  const COOLDOWN_SECONDS = 60;
  const DAILY_MAX_POSTS = 10;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [dailyPostCount, setDailyPostCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Song Dedication State
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [songSearchResults, setSongSearchResults] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState<any | null>(null);
  const [isSearchingSong, setIsSearchingSong] = useState(false);
  
  const [honeypot, setHoneypot] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');
  
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistentId = getOrCreatePersistentUUID();
      setDeviceId(persistentId);
    }
  }, []);

  React.useEffect(() => {
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
    }, 500);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [songSearchQuery]);

  React.useEffect(() => {
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
      } else {
        setCooldownRemaining(0);
      }

      try {
        const rawHistory = localStorage.getItem('capitalk_wall_post_history');
        if (rawHistory) {
          const timestamps: number[] = JSON.parse(rawHistory);
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const recent = timestamps.filter((ts) => ts > oneDayAgo);
          setDailyPostCount(recent.length);
        } else {
          setDailyPostCount(0);
        }
      } catch (e) {
        setDailyPostCount(0);
      }
    };

    checkLimits();
    const interval = setInterval(checkLimits, 1000);
    return () => clearInterval(interval);
  }, [isAdminUser, showCreateModal]);

  React.useEffect(() => {
    if (showCreateModal) {
      setModerationError(null);
    }
  }, [showCreateModal]);

  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('latest');

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    if (!selectedSong) {
      setModerationError('Please select a song to dedicate.');
      return;
    }

    if (!message.trim() || message.length > 300) {
      setModerationError('Message must be between 1 and 300 characters.');
      return;
    }

    const getAvailableTimeStr = (seconds: number) => {
      const unlockDate = new Date(Date.now() + seconds * 1000);
      return unlockDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getDailyResetTimeStr = () => {
      try {
        const raw = localStorage.getItem('capitalk_wall_post_history');
        if (raw) {
          const timestamps: number[] = JSON.parse(raw);
          if (timestamps.length >= DAILY_MAX_POSTS) {
            const oldest = Math.min(...timestamps);
            const resetDate = new Date(oldest + 24 * 60 * 60 * 1000);
            return resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      } catch (e) {}
      return 'tomorrow';
    };

    if (!postAsAdmin && !isAdminUser) {
      if (cooldownRemaining > 0) {
        const timeStr = getAvailableTimeStr(cooldownRemaining);
        const errMsg = `Cooldown Active: Please wait ${cooldownRemaining}s before publishing (Available at ${timeStr}).`;
        setModerationError(errMsg);
        useChatStore.setState({
          actionToast: {
            type: 'error',
            message: errMsg,
          },
        });
        return;
      }
      if (dailyPostCount >= DAILY_MAX_POSTS) {
        const resetTimeStr = getDailyResetTimeStr();
        const errMsg = `Daily Limit Reached (10/10 posts): You can post again at ${resetTimeStr}.`;
        setModerationError(errMsg);
        useChatStore.setState({
          actionToast: {
            type: 'error',
            message: errMsg,
          },
        });
        return;
      }
    }

    const modResult = analyzeContentModeration(message);
    if (modResult.contains_profanity) {
      setModerationError(`⚠️ Message blocked: Contains profane or inappropriate terms.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await addFreedomPost({
        author_alias: postAsAdmin
          ? '👑 CapiTalk Admin'
          : (currentUser ? currentUser.username : 'Anon Student'),
        department: currentUser ? currentUser.department : (department || 'General'),
        message: message.trim(),
        color: selectedColor || '#fff1f3',
        song_title: selectedSong.name,
        song_artist: selectedSong.artist,
        song_image_url: selectedSong.image_url || (selectedSong.image?.[3]?.['#text'] && !selectedSong.image[3]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? selectedSong.image[3]['#text'] : (selectedSong.image?.[2]?.['#text'] && !selectedSong.image[2]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f') ? selectedSong.image[2]['#text'] : '')),
        song_preview_url: selectedSong.preview_url || '',
        song_link: selectedSong.url || `https://www.last.fm/search?q=${encodeURIComponent(selectedSong.artist + ' ' + selectedSong.name)}`,
        dedicated_to: dedicatedTo.trim() || undefined,
        is_admin: postAsAdmin,
      }, honeypot, deviceId);

      if (success) {
        if (!postAsAdmin && !isAdminUser) {
          const now = Date.now();
          localStorage.setItem('capitalk_wall_last_post_ts', String(now));
          setCooldownRemaining(60);
          try {
            const rawHistory = localStorage.getItem('capitalk_wall_post_history');
            const history: number[] = rawHistory ? JSON.parse(rawHistory) : [];
            const oneDayAgo = now - 24 * 60 * 60 * 1000;
            const updated = [...history.filter((ts) => ts > oneDayAgo), now];
            localStorage.setItem('capitalk_wall_post_history', JSON.stringify(updated));
            setDailyPostCount(updated.length);
          } catch (e) {}
        }

        setMessage('');
        setSelectedSong(null);
        setDedicatedTo('');
        setSongSearchQuery('');
        setShowCreateModal(false);
        setModerationError(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || 'anon' : 'anon');

  const isPinnedActive = React.useCallback((post: FreedomPost) => {
    if (!post.is_pinned) return false;
    if (post.pinned_at) {
      const pinAgeMs = Date.now() - new Date(post.pinned_at).getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      return pinAgeMs <= ONE_DAY_MS;
    }
    return true;
  }, []);

  // Filter ONLY posts that have a song title
  const filteredPosts = (freedomPosts || [])
    .filter((post) => {
      if (!post.song_title) return false;
      if (post.status === 'pending') {
        return isAdminUser || post.author_id === currentUserId;
      }
      return true;
    })
    .sort((a, b) => {
      const aPinned = isPinnedActive(a);
      const bPinned = isPinnedActive(b);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      if (activeTab === 'trending') {
        const scoreA = (a.likes_count * 2) + (a.comments_count || 0);
        const scoreB = (b.likes_count * 2) + (b.comments_count || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const renderPostCard = (post: FreedomPost) => {
    const currentUserId = currentUser
      ? currentUser.id
      : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');
    const hasLiked = currentUserId ? post.liked_by_users?.includes(currentUserId) : false;
    const isPostAdmin = Boolean(post.is_admin);
    const isPinned = isPinnedActive(post);
    const isThisPlaying = playingPostId === post.id;
    const isThisLoading = audioLoadingPostId === post.id;

    // Follow the user's chosen color (matching preview in DedicateSongPage)
    const cardBgColor = post.color || (isPostAdmin ? '#701a31' : '#fff1f3');
    const isDark = isColorDark(cardBgColor);

    return (
      <div
        key={post.id}
        id={`post-${post.id}`}
        onClick={() => setSelectedPostForDetail(post)}
        style={{ backgroundColor: cardBgColor }}
        className={`p-2.5 sm:p-3 rounded-2xl transition-all flex flex-col items-center justify-between group relative cursor-pointer select-none text-center hover:shadow-lg hover:-translate-y-1 duration-300 border ${
          isDark
            ? 'border-black/20 text-white shadow-md'
            : 'border-[#d1d5dc]/80 text-neutral-900 shadow-xs'
        }`}
      >
        {/* Top Dedicated To Badge */}
        <div className="w-full flex items-center justify-center min-h-[22px] px-1 mb-1">
          {post.status === 'pending' ? (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8px] sm:text-[9px] font-extrabold rounded-full truncate">
              ⏳ Pending
            </span>
          ) : isPinned ? (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[8px] sm:text-[9px] font-extrabold rounded-full truncate">
              📌
            </span>
          ) : post.dedicated_to ? (
            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[8.5px] sm:text-[10px] font-black rounded-full truncate max-w-full flex items-center gap-1 border border-rose-200/60 shadow-2xs">
              <span className="shrink-0">For:</span>
              <span className="truncate">{post.dedicated_to}</span>
            </span>
          ) : (
            <span className={`px-2 py-0.5 text-[8px] sm:text-[9px] font-bold rounded-full truncate ${
              isDark ? 'bg-white/20 text-white' : 'bg-black/5 text-gray-600'
            }`}>
              {post.department ? post.department.replace('College of ', '') : 'Music'}
            </span>
          )}
        </div>

        {/* Vintage CD Disc Player Artwork — Click to Play Automatically */}
        <div
          onClick={(e) => handleTogglePlaySong(e, post)}
          className="relative my-auto flex items-center justify-center py-1 cursor-pointer group/cd"
          title={isThisPlaying ? "Click to Pause" : "Click to Play Song"}
        >
          <div
            className={`w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 shadow-md group-hover/cd:shadow-xl relative flex items-center justify-center transition-all duration-500 ${
              isThisPlaying ? 'animate-spin shadow-xl scale-105' : 'group-hover/cd:scale-105 group-hover/cd:rotate-45'
            }`}
            style={{ animationDuration: '3.5s', animationTimingFunction: 'linear' }}
          >
            {/* CD Concentric Grooves */}
            <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute inset-3.5 rounded-full border border-white/5 pointer-events-none" />
            <div className="absolute inset-5 rounded-full border border-white/10 pointer-events-none" />

            {/* Glossy Iridescent CD Sheen */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/15 via-transparent to-white/10 pointer-events-none" />

            {/* Center Album Art Circular Sticker */}
            <div className="w-9 h-9 xs:w-11 xs:h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden border border-neutral-700/80 shadow-inner relative flex items-center justify-center bg-white shrink-0 z-10">
              {post.song_image_url && !post.song_image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
                <img
                  src={post.song_image_url}
                  alt={post.song_title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                  <Music className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500" />
                </div>
              )}

              {/* Center CD Spindle Hole */}
              <div className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#f4f4f0] border border-neutral-800 shadow-inner z-20" />
            </div>

            {/* Hover / Playing Status Overlay */}
            <div
              className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center text-white backdrop-blur-[0.5px] z-30 transition-opacity ${
                isThisPlaying || isThisLoading ? 'opacity-100' : 'opacity-0 group-hover/cd:opacity-100'
              }`}
            >
              {isThisLoading ? (
                <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffc900] animate-spin drop-shadow" />
              ) : isThisPlaying ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/70 border border-white/40 flex items-center justify-center shadow-md">
                  <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffc900] fill-[#ffc900]" />
                </div>
              ) : (
                <PlayCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffc900] fill-black/60 drop-shadow" />
              )}
            </div>
          </div>
        </div>

        {/* Music Title and Artist */}
        <div className="w-full flex flex-col items-center mt-1">
          <h3 className={`text-[10.5px] xs:text-xs sm:text-sm font-extrabold truncate w-full tracking-tight leading-tight ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}>
            {post.song_title || 'Untitled Track'}
          </h3>
          <p className={`text-[8.5px] xs:text-[9.5px] sm:text-xs font-semibold truncate w-full mt-0.5 ${
            isDark ? 'text-white/80' : 'text-neutral-500'
          }`}>
            {post.song_artist || 'Unknown Artist'}
          </p>

          {/* Admin Approve Button */}
          {isAdminUser && post.status === 'pending' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                approveFreedomPost(post.id);
              }}
              className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold text-[8px] sm:text-[9px] shadow-xs active:scale-95 hover:bg-emerald-600 transition-all cursor-pointer"
              title="Admin: Approve & Publish"
            >
              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Approve</span>
            </button>
          )}

          {/* Bottom Indicators (Like & Comment) */}
          <div className={`mt-1 flex items-center justify-center gap-1.5 text-[8.5px] xs:text-[9.5px] sm:text-[10px] font-bold ${
            isDark ? 'text-white/80' : 'text-gray-500'
          }`}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                likeFreedomPost(post.id);
              }}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-colors cursor-pointer ${
                hasLiked
                  ? isDark
                    ? 'text-rose-300 bg-white/20 font-black'
                    : 'text-rose-600 bg-rose-50 font-black'
                  : isDark
                  ? 'hover:text-white hover:bg-white/10'
                  : 'hover:text-black hover:bg-black/5'
              }`}
              title={hasLiked ? "Unlike song dedication" : "Like song dedication"}
            >
              <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${hasLiked ? (isDark ? 'fill-rose-300 text-rose-300' : 'fill-rose-500 text-rose-500') : ''}`} />
              <span>{post.likes_count || 0}</span>
            </button>
            {(commentsCountMap[post.id] || 0) > 0 && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 ${
                isDark ? 'text-white/70' : 'text-gray-400'
              }`}>
                <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>{commentsCountMap[post.id]}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Derive the most recent approved song post for the hero
  const latestSong = (freedomPosts || [])
    .filter((p) => p.song_title && (p.status === 'approved' || !p.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f4f0] overflow-y-auto w-full custom-scrollbar">
      {/* ───────────────────── HERO SECTION ───────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f0a1a 0%, #1a0a1f 40%, #2d0f1f 70%, #701a31 100%)',
          minHeight: '380px',
        }}
      >
        {/* Decorative vinyl circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full border-[20px] border-white/5 pointer-events-none" />
        <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full border-[10px] border-white/5 pointer-events-none" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-80 h-80 rounded-full border-[30px] border-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-60 h-60 rounded-full border-[18px] border-white/[0.04] pointer-events-none" />

        {/* Floating music notes */}
        {['♪', '♫', '♩', '♬', '♭'].map((note, i) => (
          <span
            key={i}
            className="absolute select-none pointer-events-none font-black opacity-10 text-white"
            style={{
              fontSize: `${1.5 + i * 0.6}rem`,
              top: `${10 + i * 14}%`,
              left: `${5 + i * 18}%`,
              transform: `rotate(${-20 + i * 12}deg)`,
              animation: `float-note-${i} ${4 + i}s ease-in-out infinite alternate`,
            }}
          >
            {note}
          </span>
        ))}

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 py-12 sm:py-16 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          {/* Left copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#ffc900] text-[11px] font-black uppercase tracking-widest mb-5 backdrop-blur-sm">
              <Music className="w-3 h-3" />
              Anonymous song sharing
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight mb-4"
              style={{ textShadow: '0 2px 20px rgba(112,26,49,0.6)' }}
            >
              Share Songs with{' '}
              <span
                className="relative inline-block"
                style={{
                  background: 'linear-gradient(90deg, #ffc900, #ff90e8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Anyone
              </span>{' '}
              Anonymously
            </h2>

            <p className="text-white/70 text-sm sm:text-base font-medium leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Search and send your favorite tune to someone without revealing your identity.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={() => setViewState('dedicate_song')}
                className="inline-flex items-center gap-2 bg-[#ffc900] text-black font-black text-sm px-6 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all cursor-pointer"
              >
                Share a Song
              </button>
              <a
                href="#recent-songs"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('recent-songs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 bg-white/10 text-white font-black text-sm px-6 py-3 rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all backdrop-blur-sm"
              >
                Browse Songs
              </a>
            </div>
          </div>

          {/* Right: Most Recent Song card */}
          <div className="w-full lg:w-auto lg:min-w-[300px] lg:max-w-[340px]">
            <div
              className="rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              {/* Card header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc341e]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffc900]/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <span className="text-white/50 text-[11px] font-bold ml-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Most Recent Song
                </span>
              </div>

              {/* Card body */}
              {latestSong ? (
                <div className="p-4 flex gap-3 items-center">
                  {/* Album art */}
                  <div className="w-16 h-16 rounded-xl border-2 border-white/20 overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center shadow-lg">
                    {latestSong.song_image_url && !latestSong.song_image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
                      <img
                        src={latestSong.song_image_url}
                        alt={latestSong.song_title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Music className="w-7 h-7 text-white/40" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {latestSong.dedicated_to && (
                      <p className="text-[#ffc900] text-[11px] font-black uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Send className="w-3 h-3 flex-shrink-0" />
                        Sent to {latestSong.dedicated_to}:
                      </p>
                    )}
                    {latestSong.song_link ? (
                      <a
                        href={latestSong.song_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-white font-black text-sm leading-tight hover:text-[#ffc900] transition-colors truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {latestSong.song_title}
                      </a>
                    ) : (
                      <p className="text-white font-black text-sm leading-tight truncate">{latestSong.song_title}</p>
                    )}
                    <p className="text-white/60 text-xs font-semibold mt-0.5 truncate">
                      {latestSong.song_artist}
                    </p>
                    <p className="text-white/30 text-[10px] font-medium mt-1.5">
                      {new Date(latestSong.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-white/40 text-sm font-semibold">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No songs shared yet
                </div>
              )}
            </div>

            {/* Subtle glow under the card */}
            <div className="h-4 mx-6 rounded-b-2xl blur-lg opacity-30" style={{ background: '#ffc900' }} />
          </div>
        </div>
      </div>
      {/* ──────────────────────────────────────────────────────── */}

      <div id="recent-songs" className="flex-1 max-w-[1200px] w-full mx-auto px-2 sm:px-8 py-4 sm:py-8 space-y-4">
        {/* Song Cards Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4 md:gap-5">
          {filteredPosts.map((post) => renderPostCard(post))}
        </div>
        {filteredPosts.length === 0 && (
           <div className="text-center py-20">
             <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
             <h3 className="text-xl font-black text-gray-800">No dedications yet!</h3>
             <p className="text-gray-500 font-bold mt-2">Be the first to dedicate a song.</p>
           </div>
        )}
      </div>

      {/* Full Music Dedication Detail Modal */}
      {selectedPostForDetail && (() => {
          const post = freedomPosts.find((p) => p.id === selectedPostForDetail.id) || selectedPostForDetail;
          const currentUserId = currentUser
            ? currentUser.id
            : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');
          const hasLiked = currentUserId ? post.liked_by_users?.includes(currentUserId) : false;
          const isPostAdmin = Boolean(post.is_admin);
          const isPinned = isPinnedActive(post);
          const allMyAliases = Array.from(new Set([
            ...(myPseudonyms || []),
            ...(currentUser?.username ? [currentUser.username] : []),
          ])).map((p) => p.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
          const cleanPostAlias = post.author_alias?.replace(/^@/, '').trim().toLowerCase();
          const isMyPost = (myPostIds || []).includes(post.id) || (post.author_id && post.author_id === currentUserId) || (cleanPostAlias && allMyAliases.includes(cleanPostAlias));
          
          const videoId = lyricsData.videoId || extractYoutubeId(post.song_link);

          return (
            <div
              className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
              onClick={() => setSelectedPostForDetail(null)}
            >
              <div
                className="bg-white border-2 border-black rounded-3xl w-full max-w-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative my-auto max-h-[92vh] flex flex-col text-neutral-900 animate-in zoom-in-95 duration-150 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top Header Bar */}
                <div className="p-3.5 sm:p-4 border-b-2 border-black flex justify-between items-center bg-[#fff8f9] shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    {post.dedicated_to ? (
                      <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-black rounded-full border border-black/10 flex items-center gap-1.5 shadow-2xs">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span className="truncate">For: {post.dedicated_to}</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-white text-gray-800 text-xs font-extrabold rounded-full border border-black/15 shadow-2xs">
                        {post.department ? post.department.replace('College of ', '') : 'Music Wall'}
                      </span>
                    )}
                    {isPinned && (
                      <span className="px-2.5 py-0.5 bg-[#ffc900] text-black text-[10px] font-black rounded-full border border-black shadow-2xs">
                        📌 Pinned
                      </span>
                    )}
                    {post.status === 'pending' && (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-full border border-amber-300">
                        Pending Review
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPostForDetail(null)}
                    className="p-1.5 hover:bg-black/5 rounded-full text-black transition-colors cursor-pointer border border-transparent hover:border-black/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation Tabs */}
                <div className="px-3.5 sm:px-4 pt-2.5 pb-1 border-b border-black/10 bg-neutral-50 flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailModalTab('player')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      detailModalTab === 'player'
                        ? 'bg-black text-white shadow-2xs'
                        : 'bg-white text-neutral-600 hover:bg-neutral-200/60 border border-black/10'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>Dedication & Music</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalTab('lyrics');
                      if (!lyricsData.lyrics && !lyricsData.loading) {
                        fetchLyrics(post);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer relative ${
                      detailModalTab === 'lyrics'
                        ? 'bg-[#701a31] text-white shadow-2xs'
                        : 'bg-white text-neutral-600 hover:bg-neutral-200/60 border border-black/10'
                    }`}
                  >
                    <Mic2 className="w-3.5 h-3.5" />
                    <span>Live Lyrics</span>
                    {lyricsData.loading && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                  {/* ── TAB 1: DEDICATION & AUTO-PLAYING FULL MUSIC ── */}
                  {detailModalTab === 'player' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Track Card with Spinning Vinyl */}
                      <div className="flex items-center gap-3.5 p-3.5 bg-neutral-900 text-white rounded-2xl border-2 border-black shadow-md relative overflow-hidden">
                        {/* Ambient Glow */}
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[#ff90e8]/20 rounded-full blur-2xl pointer-events-none" />

                        {/* Spinning Vinyl CD */}
                        <div
                          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-900 border border-white/20 shadow-xl relative flex items-center justify-center shrink-0 animate-spin"
                          style={{ animationDuration: '6s', animationTimingFunction: 'linear' }}
                        >
                          <div className="absolute inset-1 rounded-full border border-white/10" />
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-white/40 relative flex items-center justify-center bg-black shrink-0">
                            {post.song_image_url && !post.song_image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
                              <img
                                src={post.song_image_url}
                                alt={post.song_title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Music className="w-3.5 h-3.5 text-[#ffc900]" />
                            )}
                            <div className="absolute w-2 h-2 rounded-full bg-white/80 border border-black" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 z-10">
                          <h3 className="font-black text-sm sm:text-base text-white truncate leading-snug" title={post.song_title}>
                            {post.song_title}
                          </h3>
                          <p className="text-xs text-neutral-300 font-semibold truncate mt-0.5" title={post.song_artist}>
                            {post.song_artist}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-neutral-400 font-medium">
                            <span className="truncate">by @{post.author_alias || 'Anon'}</span>
                            {post.department && (
                              <>
                                <span>•</span>
                                <span className="text-[#ff90e8] font-bold truncate">
                                  {post.department.replace('College of ', '')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dedication Message (Quote Card) */}
                      {post.message && post.message.trim() && !post.message.startsWith('🎵 ') && (
                        <div className="bg-[#fffdf7] border-2 border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <div className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <span>Dedication Message</span>
                          </div>
                          <p className="text-xs sm:text-sm text-neutral-900 font-medium leading-relaxed whitespace-pre-wrap break-words italic">
                            &ldquo;{post.message.trim()}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Full Track Auto-playing YouTube Music Player */}
                      {videoId ? (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-black">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`}
                            title={post.song_title || 'YouTube Music'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-neutral-900 text-white rounded-2xl border-2 border-black flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#ffc900] flex items-center justify-center text-black font-black animate-spin shrink-0">
                              <Music className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate">{post.song_title || 'Playing Music...'}</p>
                              <p className="text-[10px] text-neutral-400 font-semibold truncate">Connecting YouTube Music stream</p>
                            </div>
                          </div>
                          <a
                            href={post.song_link || `https://www.youtube.com/results?search_query=${encodeURIComponent((post.song_artist || '') + ' ' + (post.song_title || ''))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white text-black hover:bg-neutral-100 rounded-xl text-xs font-black shrink-0 transition-colors"
                          >
                            Open
                          </a>
                        </div>
                      )}

                      {/* Action Buttons: Lyrics & External Link */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setDetailModalTab('lyrics')}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 border-black bg-[#fff1f3] hover:bg-[#ffe4e8] text-xs font-black text-[#701a31] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                        >
                          <Mic2 className="w-3.5 h-3.5 text-[#701a31]" />
                          <span>View Lyrics</span>
                        </button>

                        <a
                          href={videoId ? `https://www.youtube.com/watch?v=${videoId}` : (post.song_link || `https://www.youtube.com/results?search_query=${encodeURIComponent((post.song_artist || '') + ' ' + (post.song_title || ''))}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border-2 border-black bg-[#ffc900] hover:bg-[#ffbe00] text-xs font-black text-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-black" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* ── TAB 2: LIVE LYRICS ── */}
                  {detailModalTab === 'lyrics' && (
                    <div className="space-y-3 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-500 truncate max-w-[180px]">
                            {post.song_title}
                          </span>
                        </div>

                        {lyricsData.lyrics && (
                          <button
                            type="button"
                            onClick={() => {
                              if (lyricsData.lyrics) {
                                navigator.clipboard.writeText(lyricsData.lyrics);
                                setCopiedLyrics(true);
                                setTimeout(() => setCopiedLyrics(false), 2000);
                              }
                            }}
                            className="px-2.5 py-1 bg-white border border-black/15 hover:border-black rounded-lg text-xs font-bold text-neutral-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          >
                            {copiedLyrics ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {lyricsData.loading ? (
                        <div className="p-8 text-center bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#701a31]/10 flex items-center justify-center text-[#701a31] mb-3 animate-bounce">
                            <Mic2 className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-extrabold text-neutral-800">Fetching lyrics...</p>
                          <p className="text-xs text-neutral-500 mt-1">Connecting to YouTube Music</p>
                        </div>
                      ) : lyricsData.lyrics ? (
                        <div className="p-4 sm:p-5 bg-gradient-to-b from-neutral-900 to-neutral-950 text-white border-2 border-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] max-h-72 overflow-y-auto custom-scrollbar">
                          <p className="text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap break-words text-neutral-200">
                            {lyricsData.lyrics}
                          </p>
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-neutral-50 border-2 border-neutral-200 rounded-2xl">
                          <Mic2 className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-neutral-700">
                            {lyricsData.error || 'No official lyrics found for this song.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => fetchLyrics(post)}
                            className="mt-3 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Clean Minimalist Footer */}
                <div className="p-3 sm:p-4 border-t-2 border-black bg-white shrink-0 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        likeFreedomPost(post.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black text-xs font-extrabold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer ${
                        hasLiked
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-white text-neutral-800 hover:bg-neutral-50'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likes_count || 0}</span>
                    </button>

                    {(post.likes_count || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setReactorsPost(post)}
                        className="w-8 h-8 rounded-full border-2 border-black text-neutral-700 hover:bg-neutral-50 flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                        title="View likes"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openCommentsModal(post)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-2 border-black bg-white text-neutral-800 hover:bg-neutral-50 transition-all text-xs font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{commentsCountMap[post.id] || 0}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPostForReport(post)}
                      className="w-8 h-8 rounded-full border border-neutral-300 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
                      title="Report"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>

                    {isAdminUser && post.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          approveFreedomPost(post.id);
                          setSelectedPostForDetail(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs"
                        title="Approve post"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {isAdminUser && (
                      <button
                        type="button"
                        onClick={() => togglePinFreedomPost(post.id)}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                          isPinned
                            ? 'bg-[#ffc900] text-black border-black'
                            : 'border-neutral-300 text-neutral-400 hover:text-black hover:border-black'
                        }`}
                        title={isPinned ? 'Unpin note' : 'Pin note'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    {(isAdminUser || isMyPost) && (
                      <button
                        type="button"
                        onClick={() => setSelectedPostForDelete(post)}
                        className="w-8 h-8 rounded-full border border-neutral-300 text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {selectedPostForReport && (
        <ReportNoteModal
          post={selectedPostForReport}
          onClose={() => setSelectedPostForReport(null)}
        />
      )}

      {selectedPostForDelete && (
        <DeleteNoteModal
          post={selectedPostForDelete}
          onConfirm={() => {
            deleteFreedomPost(selectedPostForDelete.id);
          }}
          onClose={() => setSelectedPostForDelete(null)}
        />
      )}

      {/* Comments Modal */}
      {selectedPostForComments && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setSelectedPostForComments(null)}
        >
          <div
            className="bg-white border border-[#d1d5dc] rounded-2xl p-4 sm:p-5 max-w-md w-full shadow-2xl relative flex flex-col max-h-[85vh] text-neutral-900 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900">Comments</h3>
                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[11px] font-semibold rounded-full">
                  {commentsList.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostForComments(null)}
                className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 custom-scrollbar">
              {isFetchingComments ? (
                <div className="text-center py-8 text-xs font-medium text-neutral-400">
                  Loading comments...
                </div>
              ) : commentsList.length === 0 ? (
                <div className="text-center py-8 text-xs font-medium text-neutral-400">
                  No comments yet. Be the first to leave a comment.
                </div>
              ) : (
                commentsList.map((c) => {
                  const isCmAdmin = Boolean(c.is_admin);
                  const avatarUrl = c.author_avatar || (isCmAdmin ? '/avatars/coin-left.jpg' : getAvatarForPseudonym(c.author_alias || 'Anon Student'));
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl space-y-1 transition-all ${
                        isCmAdmin
                          ? 'bg-gradient-to-br from-[#701a31]/10 via-[#fff8f9] to-[#701a31]/5 border border-[#701a31]/35 ring-1 ring-[#701a31]/20 shadow-xs'
                          : 'bg-neutral-50 border border-neutral-200/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={avatarUrl}
                              alt={c.author_alias}
                              className={`w-6 h-6 rounded-full object-cover bg-white shrink-0 ${
                                isCmAdmin ? 'border-2 border-[#701a31] shadow-xs' : 'border border-neutral-200'
                              }`}
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute('src', isCmAdmin ? '/avatars/coin-left.jpg' : getAvatarForPseudonym(c.author_alias || 'Anon Student'));
                              }}
                            />
                            {isCmAdmin && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-[7px] text-white font-bold shadow-2xs"
                                title="Official Admin"
                              >
                                ✓
                              </div>
                            )}
                          </div>
                          <span className={`font-bold text-xs truncate ${
                            isCmAdmin ? 'text-[#701a31] font-black' : 'text-neutral-900'
                          }`}>
                            @{c.author_alias}
                          </span>
                          {isCmAdmin && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded-full bg-[#701a31] text-white flex items-center gap-0.5 shadow-2xs shrink-0">
                              <span>Official</span>
                            </span>
                          )}
                        </div>
                        {!isCmAdmin && c.department && (
                          <span className="text-[10px] font-medium text-neutral-400 shrink-0">
                            {c.department?.replace('College of ', '')}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed break-words pl-8 ${
                        isCmAdmin ? 'text-[#1a050b] font-medium' : 'text-neutral-700'
                      }`}>
                        {c.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Form */}
            <div className="pt-3 border-t border-neutral-100 shrink-0">
              {isAdminUser && (
                <div className="flex items-center justify-between px-1 mb-2 pb-1.5 border-b border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setCommentAsAdmin(!commentAsAdmin)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      commentAsAdmin
                        ? 'bg-[#701a31] text-white border border-[#701a31]'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <span>{commentAsAdmin ? 'Replying as Admin (Official)' : 'Reply as Admin'}</span>
                    <span className={`w-2 h-2 rounded-full ${commentAsAdmin ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                  </button>
                  {commentAsAdmin && (
                    <span className="text-[10px] font-bold text-[#701a31] uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#701a31]" />
                      Admin Active
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={commentAsAdmin ? "Write a comment as Admin..." : "Write a comment..."}
                  className={`w-full border rounded-xl px-3.5 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all font-medium ${
                    commentAsAdmin
                      ? 'bg-[#fff8f9] border-[#701a31]/30 focus:border-[#701a31] focus:bg-white'
                      : 'bg-[#f4f4f0] border-[#d1d5dc] focus:border-black focus:bg-white'
                  }`}
                />
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer shrink-0 ${
                    commentAsAdmin ? 'bg-[#701a31] hover:bg-[#5a1527]' : 'bg-black hover:bg-neutral-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reactors List Modal */}
      {reactorsPost && (() => {
        const post = freedomPosts.find((p) => p.id === reactorsPost.id) || reactorsPost;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
            onClick={() => setReactorsPost(null)}
          >
            <div
              className="bg-white border border-[#d1d5dc] rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl relative text-neutral-900 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900">Likes</h3>
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[11px] font-semibold rounded-full border border-rose-100">
                    {post.likes_count || 0}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReactorsPost(null)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pt-3 pr-1 custom-scrollbar">
                {reactorsPost.liked_by_profiles && Object.keys(reactorsPost.liked_by_profiles).length > 0 ? (
                  Object.entries(reactorsPost.liked_by_profiles).map(([uid, prof]) => {
                    const displayName = prof.username || (currentUser && currentUser.id === uid ? currentUser.username : `Student #${uid.slice(-4)}`);
                    const displayDept = prof.department?.replace('College of ', '') || (currentUser && currentUser.id === uid ? currentUser.department.replace('College of ', '') : 'General');
                    const avatarUrl = prof.avatar_url || (currentUser && currentUser.id === uid && currentUser.avatar_url) || getAvatarForPseudonym(displayName);

                    return (
                      <div key={uid} className="p-2.5 bg-neutral-50 border border-neutral-200/70 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-8 h-8 rounded-full border border-neutral-200 object-cover bg-white shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', getAvatarForPseudonym(displayName));
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-neutral-900 truncate">@{displayName}</div>
                            <div className="text-[10px] font-medium text-neutral-400 truncate">{displayDept}</div>
                          </div>
                        </div>
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0 ml-2" />
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-xs font-medium text-neutral-400">
                    {reactorsPost.likes_count || 0} anonymous likes registered.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───────────────────── STICKY NOW PLAYING DOCK ───────────────────── */}
      {(() => {
        const activePlayingPost = playingPostId ? freedomPosts.find((p) => p.id === playingPostId) : null;
        if (!activePlayingPost) return null;

        return (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-neutral-950/95 backdrop-blur-md text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-white/20 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200">
            {/* Mini Spinning CD */}
            <div
              className="w-10 h-10 rounded-full bg-neutral-900 border border-white/30 overflow-hidden shrink-0 flex items-center justify-center animate-spin relative shadow-inner"
              style={{ animationDuration: '3s', animationTimingFunction: 'linear' }}
            >
              {activePlayingPost.song_image_url && !activePlayingPost.song_image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
                <img src={activePlayingPost.song_image_url} alt={activePlayingPost.song_title} className="w-full h-full object-cover" />
              ) : (
                <Music className="w-4 h-4 text-white" />
              )}
              <div className="absolute w-2.5 h-2.5 rounded-full bg-black border border-white/60 shadow-inner" />
            </div>

            {/* Track Info */}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black truncate">{activePlayingPost.song_title || 'Untitled Track'}</div>
              <div className="text-[10px] text-gray-400 font-semibold truncate">{activePlayingPost.song_artist || 'Unknown Artist'}</div>
              {activePlayingPost.dedicated_to && (
                <div className="text-[9px] text-rose-400 font-bold truncate">For: {activePlayingPost.dedicated_to}</div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedPostForDetail(activePlayingPost);
                  setDetailModalTab('lyrics');
                  if (!lyricsData.lyrics && !lyricsData.loading) {
                    fetchLyrics(activePlayingPost);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer border border-white/20 active:scale-95"
                title="View Live Lyrics"
              >
                <Mic2 className="w-3 h-3 text-[#ff90e8]" />
                <span>Lyrics</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleTogglePlaySong(e, activePlayingPost)}
                className="w-8 h-8 rounded-full bg-[#ffc900] text-black flex items-center justify-center active:scale-95 transition-transform cursor-pointer shadow-md"
                title="Pause / Resume"
              >
                {activeAudioRef.current && !activeAudioRef.current.paused ? (
                  <Pause className="w-3.5 h-3.5 fill-black" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeAudioRef.current) activeAudioRef.current.pause();
                  setPlayingPostId(null);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
