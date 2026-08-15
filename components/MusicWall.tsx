'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS } from '../lib/constants';
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
  Music,
  RefreshCw,
  Flame,
  AlertCircle,
  MessageSquare,
  Users,
} from 'lucide-react';
import { ReportNoteModal } from './ReportNoteModal';
import { DeleteNoteModal } from './DeleteNoteModal';
import { CustomAudioPlayer } from './CustomAudioPlayer';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';

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
  } = useChatStore();

  const isAdminUser = typeof window !== 'undefined' && localStorage.getItem('capitalk_admin_auth_v1') === 'true';
  const [postAsAdmin, setPostAsAdmin] = useState(isAdminUser);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<FreedomPost | null>(null);
  const [selectedPostForDelete, setSelectedPostForDelete] = useState<FreedomPost | null>(null);
  const [reactorsPost, setReactorsPost] = useState<FreedomPost | null>(null);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<FreedomPost | null>(null);

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

    const newComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      post_id: selectedPostForComments.id,
      author_alias: currentUser ? currentUser.username : 'Anon Student',
      department: currentUser ? currentUser.department : 'General',
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
          department: newComment.department,
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
    const isPostAdmin = post.is_admin || post.author_alias?.toLowerCase().includes('admin');
    const isPinned = isPinnedActive(post);

    return (
      <div
        key={post.id}
        id={`post-${post.id}`}
        onClick={() => setSelectedPostForDetail(post)}
        style={{ backgroundColor: isPostAdmin ? '#701a31' : (post.color || '#fff1f3') }}
        className={`p-2 sm:p-3.5 border-2 rounded-[0.5rem] sm:border-3 transition-all flex flex-col items-center justify-between group relative cursor-pointer select-none aspect-[3/4.4] sm:aspect-[3/4.1] text-center overflow-hidden ${
          isPinned
            ? 'border-3 sm:border-4 border-black ring-3 ring-[#ffc900] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
            : isPostAdmin
            ? 'border-3 sm:border-4 border-[#ffc900] ring-3 ring-[#701a31]/80 shadow-[0_0_15px_rgba(112,26,49,0.7)] text-white'
            : 'border-black text-black shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
        }`}
      >
        {/* Top Badges */}
        <div className="w-full flex items-center justify-center gap-1 min-h-[20px] sm:min-h-[24px] px-1 pt-0.5">
          {post.status === 'pending' ? (
            <span className="px-1.5 py-0.5 bg-[#ffc900] text-black text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black rounded-full uppercase border border-black shadow-2xs truncate">
              PENDING
            </span>
          ) : isPinned ? (
            <span className="px-1.5 py-0.5 bg-[#ffc900] text-black text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black rounded-full uppercase border border-black shadow-2xs truncate">
              PINNED
            </span>
          ) : post.dedicated_to ? (
            <span className="px-1.5 py-0.5 text-black text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black rounded-full shadow-2xs truncate max-w-full">
              To: {post.dedicated_to}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 bg-black/10 text-black text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] font-black rounded-full uppercase truncate">
              {post.department.replace('College of ', '')}
            </span>
          )}
        </div>

        {/* Center Oval/Circular Artwork Cover */}
        <div className="relative my-auto flex items-center justify-center">
          <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-22 sm:h-22 rounded-full border-2 sm:border-3 border-black overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 relative flex items-center justify-center">
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
              <div className="w-full h-full flex items-center justify-center bg-[#fff1f3]">
                <Music className="w-6 h-6 sm:w-8 sm:h-8 text-black/70" />
              </div>
            )}
            {/* Play Overlay on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
              <PlayCircle className="w-6 h-6 sm:w-8 sm:h-8 text-[#ffc900] fill-black" />
            </div>
          </div>
        </div>

        {/* Music Title and Artist */}
        <div className="w-full flex flex-col items-center mt-1">
          <h3 className={`text-[10.5px] xs:text-xs sm:text-sm font-black truncate w-full tracking-tight leading-tight ${isPostAdmin && !isPinned ? 'text-white' : 'text-black'}`}>
            {post.song_title || 'Untitled Track'}
          </h3>
          <p className={`text-[8.5px] xs:text-[9.5px] sm:text-xs font-bold truncate w-full mt-0.5 ${isPostAdmin && !isPinned ? 'text-[#ffc900]' : 'text-black/70'}`}>
            {post.song_artist || 'Unknown Artist'}
          </p>

          {/* Admin Approve Button — shown on card when pending */}
          {isAdminUser && post.status === 'pending' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                approveFreedomPost(post.id);
              }}
              className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-black bg-emerald-500 text-white font-black text-[7.5px] xs:text-[8.5px] sm:text-[9.5px] shadow-xs active:scale-95 hover:bg-emerald-600 transition-all"
              title="Admin: Approve & Publish to Music Wall"
            >
              <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Approve</span>
            </button>
          )}

          {/* Bottom Indicators */}
          <div className="mt-1.5 flex items-center justify-center gap-1 text-[8px] xs:text-[9px] sm:text-[10px] font-black">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                likeFreedomPost(post.id);
              }}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-black shadow-2xs transition-all active:scale-95 ${
                hasLiked ? 'bg-rose-100 text-rose-600 font-extrabold' : 'bg-white/80 text-black hover:bg-white'
              }`}
              title={hasLiked ? "Unlike song dedication" : "Like song dedication"}
            >
              <Heart className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${hasLiked ? 'fill-rose-500 text-rose-500' : 'text-black'}`} />
              <span>{post.likes_count || 0}</span>
            </button>
            {(commentsCountMap[post.id] || 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/80 border border-black shadow-2xs text-black">
                <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" />
                {commentsCountMap[post.id]}
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
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-[#ffc900] text-black font-black text-sm px-6 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
              >
                <Send className="w-4 h-4" />
                Share Your First Song
              </button>
              <a
                href="#recent-songs"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('recent-songs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 bg-white/10 text-white font-black text-sm px-6 py-3 rounded-xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all backdrop-blur-sm"
              >
                <Music className="w-4 h-4" />
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

      <div id="recent-songs" className="flex-1 max-w-[1200px] w-full mx-auto px-2 sm:px-8 py-4 sm:py-10">
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border-4 border-black rounded-3xl w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative my-auto max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b-2 border-black flex justify-between items-center bg-[#fff1f3] rounded-t-2xl shrink-0">
              <h2 className="text-lg sm:text-xl font-black text-black flex items-center gap-2">
                <Music className="w-5 h-5 text-[#dc341e]" />
                Dedicate a Song
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-black/10 rounded-full transition-colors active:scale-95 text-black"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
              {moderationError && (
                <div className="mb-4 p-3.5 sm:p-4 bg-rose-100 border-2 border-black rounded-xl text-black font-extrabold text-xs sm:text-sm flex items-start gap-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug break-words">
                    {moderationError}
                  </div>
                </div>
              )}

              <form id="create-post-form" onSubmit={handlePostSubmit} className="space-y-4 sm:space-y-6">
                {!isAdminUser && (
                  <div className="hidden">
                    <label htmlFor="music-honeypot">Leave empty</label>
                    <input
                      type="text"
                      id="music-honeypot"
                      name="music-honeypot"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </div>
                )}

                {isAdminUser && (
                  <div className="p-3 sm:p-4 bg-[#fff1f3] border-2 border-[#701a31] rounded-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-[#701a31]" />
                      <span className="text-xs font-black text-black">Post as Admin?</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={postAsAdmin}
                        onChange={(e) => setPostAsAdmin(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#701a31] border-2 border-black"></div>
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-black text-black">Posting As</label>
                    <div className="w-full bg-[#f4f4f0] text-black text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-black font-extrabold flex items-center justify-between shadow-xs">
                      <span className="truncate">{currentUser ? currentUser.username : 'Anon Student'}</span>
                      <span className="text-[9px] font-black text-[#701a31] bg-white border border-black px-1.5 py-0.5 rounded uppercase shrink-0">
                        Registered Name
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-black text-black flex items-center justify-between">
                      <span>Dedicate To</span>
                      <span className="text-[10px] text-gray-500 font-normal">Optional</span>
                    </label>
                    <input
                      type="text"
                      value={dedicatedTo}
                      onChange={(e) => setDedicatedTo(e.target.value)}
                      placeholder="Enter their name here..."
                      maxLength={40}
                      className="w-full bg-[#f4f4f0] text-black text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#ffc900] transition-shadow shadow-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                   <label className="text-xs sm:text-sm font-black text-black">Search for a Song</label>
                   
                   {!selectedSong ? (
                      <div className="relative">
                        <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                        <input
                          type="text"
                          value={songSearchQuery}
                          onChange={(e) => setSongSearchQuery(e.target.value)}
                          placeholder="Type a song title or artist..."
                          className="w-full bg-[#f4f4f0] text-black text-xs sm:text-sm pl-9 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#ffc900] transition-shadow shadow-xs font-bold"
                        />
                        {isSearchingSong && (
                          <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffc900] animate-spin" />
                          </div>
                        )}
                        
                        {songSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-2 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-48 overflow-y-auto">
                            {songSearchResults.map((track, i) => (
                              <div
                                key={i}
                                onClick={() => {
                                  setSelectedSong(track);
                                  setSongSearchResults([]);
                                  setSongSearchQuery('');
                                }}
                                className="flex items-center gap-3 p-3 hover:bg-[#f4f4f0] cursor-pointer border-b border-gray-200 last:border-0"
                              >
                                {(track.image_url || (track.image?.[1]?.['#text'] && !track.image[1]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f'))) ? (
                                  <img src={track.image_url || track.image[1]['#text']} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded border border-black/10 object-cover" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center border border-black/10">🎵</div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-black truncate text-black">{track.name}</div>
                                  <div className="text-xs font-bold text-gray-500 truncate">{track.artist}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                   ) : (
                      <div className="flex items-center gap-3 p-3 sm:p-4 bg-white border-2 border-black rounded-xl shadow-sm relative">
                        {(selectedSong.image_url || (selectedSong.image?.[2]?.['#text'] && !selectedSong.image[2]['#text'].includes('2a96cbd8b46e442fc41c2b86b821562f'))) ? (
                          <img src={selectedSong.image_url || selectedSong.image[2]['#text']} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg border-2 border-black object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[#f4f4f0] border-2 border-black flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-black truncate text-black">{selectedSong.name}</div>
                          <div className="text-xs font-bold text-gray-600 truncate">{selectedSong.artist}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSong(null)}
                          className="p-2 hover:bg-rose-100 text-rose-600 rounded-full transition-colors active:scale-95 border border-transparent hover:border-rose-200"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                   )}
                </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-black text-black">Dedication Message (Optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Why are you dedicating this song? (Max 300 characters)"
                    maxLength={300}
                    rows={3}
                    className="w-full bg-[#f4f4f0] text-black text-xs sm:text-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#ffc900] transition-shadow resize-none shadow-xs font-bold"
                  />
                  <div className="text-right text-[10px] sm:text-xs font-bold text-gray-500">
                    {message.length}/300
                  </div>
                </div>

                {/* Souvenir Card Color Selector */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-black text-black block">
                    Souvenir Note Color 🎨
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto p-2 bg-[#f4f4f0] border-2 border-black rounded-xl custom-scrollbar">
                    {MUSIC_POST_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setSelectedColor(col.hex)}
                        style={{ backgroundColor: col.hex }}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-black shrink-0 transition-all ${
                          selectedColor === col.hex
                            ? 'ring-4 ring-black scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

              </form>
            </div>

            <div className="p-4 sm:p-5 border-t-2 border-black bg-[#f4f4f0] rounded-b-2xl shrink-0 flex flex-col gap-2.5">
              {!isAdminUser && cooldownRemaining > 0 && (
                <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-xl text-black shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                    <Clock className="w-4 h-4 shrink-0 animate-spin text-amber-700" />
                    <span>Cooldown Active ({cooldownRemaining}s remaining)</span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-900 mt-1">
                    You can post your next song dedication at <strong>{new Date(Date.now() + cooldownRemaining * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>.
                  </p>
                </div>
              )}

              {!isAdminUser && cooldownRemaining === 0 && dailyPostCount >= DAILY_MAX_POSTS && (
                <div className="p-3 bg-rose-50 border-2 border-rose-400 rounded-xl text-black shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-black text-rose-900">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                    <span>Daily Limit Reached (10/10 posts)</span>
                  </div>
                  <p className="text-[11px] font-bold text-rose-900 mt-1">
                    You have published 10 notes today. You can post again at <strong>{(() => {
                      try {
                        const raw = localStorage.getItem('capitalk_wall_post_history');
                        if (raw) {
                          const ts: number[] = JSON.parse(raw);
                          if (ts.length >= DAILY_MAX_POSTS) {
                            return new Date(Math.min(...ts) + 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          }
                        }
                      } catch (e) {}
                      return 'tomorrow';
                    })()}</strong>.
                  </p>
                </div>
              )}

              <button
                type="submit"
                form="create-post-form"
                disabled={!selectedSong || isSubmitting || (!isAdminUser && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS))}
                className="w-full bg-[#ffc900] hover:bg-[#ffdb4d] disabled:opacity-50 disabled:hover:bg-[#ffc900] disabled:cursor-not-allowed text-black font-black py-3 sm:py-3.5 px-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span>
                  {isSubmitting
                    ? 'Publishing...'
                    : cooldownRemaining > 0 && !isAdminUser
                    ? `Wait ${cooldownRemaining}s...`
                    : dailyPostCount >= DAILY_MAX_POSTS && !isAdminUser
                    ? 'Daily Limit Reached'
                    : 'Post Dedication'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Full Music Dedication Detail Modal */}
      {selectedPostForDetail && (() => {
        const post = freedomPosts.find((p) => p.id === selectedPostForDetail.id) || selectedPostForDetail;
        const currentUserId = currentUser
          ? currentUser.id
          : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');
        const hasLiked = currentUserId ? post.liked_by_users?.includes(currentUserId) : false;
        const isPostAdmin = post.is_admin || post.author_alias?.toLowerCase().includes('admin');
        const isPinned = isPinnedActive(post);
        const isMyPost = (myPostIds || []).includes(post.id) || (post.author_id && post.author_id === currentUserId);

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
            <div
              style={{ backgroundColor: isPostAdmin ? '#701a31' : (post.color || '#fff1f3') }}
              className="border-3 sm:border-4 border-black rounded-3xl w-full max-w-md shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative my-auto max-h-[92vh] flex flex-col text-black animate-in zoom-in-95 duration-200 overflow-hidden"
            >
              {/* Header Bar */}
              <div className="p-3.5 sm:p-4 border-b-3 border-black flex justify-between items-center bg-white/90 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2.5 py-1 bg-[#701a31] text-white text-[10px] sm:text-xs font-black rounded-full uppercase border border-black shadow-xs">
                    Music Dedication
                  </span>
                  {isPinned && (
                    <span className="px-2 py-0.5 bg-[#ffc900] text-black text-[10px] font-black rounded-full border border-black">
                      📌 Pinned
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPostForDetail(null)}
                  className="p-1.5 bg-white hover:bg-black hover:text-white border-2 border-black rounded-full transition-all text-black shadow-xs active:scale-95 shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-3.5">
                {/* Side-by-Side: Music Cover (Left) + Dedication Note (Right) */}
                <div className="flex flex-row items-stretch gap-3 sm:gap-4">
                  {/* Left Column: Music Cover Artwork & Song Details */}
                  <div className="w-28 sm:w-36 shrink-0 flex flex-col items-center justify-center text-center p-2 sm:p-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0 mb-1.5 relative">
                      {post.song_image_url && !post.song_image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
                        <img
                          src={post.song_image_url}
                          alt={post.song_title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#fff1f3]">
                          <Music className="w-8 h-8 text-black/70" />
                        </div>
                      )}
                    </div>

                    <h2 className={`text-xs sm:text-sm font-black tracking-tight leading-tight px-1 truncate w-full ${isPostAdmin && !isPinned ? 'text-white' : 'text-black'}`} title={post.song_title}>
                      {post.song_title}
                    </h2>
                    <p className={`text-[10px] sm:text-xs font-bold truncate w-full mt-0.5 ${isPostAdmin && !isPinned ? 'text-[#ffc900]' : 'text-black/70'}`} title={post.song_artist}>
                      {post.song_artist}
                    </p>
                  </div>

                  {/* Right Column: Dedication Note Message */}
                  <div className="bg-white/95 border-2 border-black p-3 sm:p-3.5 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex-1 min-w-0 flex flex-col justify-between">
                    <div className="overflow-y-auto max-h-[140px] sm:max-h-[160px] custom-scrollbar pr-1">
                      <p className="text-xs sm:text-sm font-extrabold leading-relaxed text-black whitespace-pre-wrap break-words">
                        "{post.message}"
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t-2 border-black/10 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-bold text-gray-700 shrink-0">
                      <span className="font-extrabold italic text-black min-w-0 flex-1">
                        ~ {post.author_alias || 'Anon Student'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audio Preview Player */}
                {post.song_preview_url && (
                  <div className="w-full">
                    <CustomAudioPlayer src={post.song_preview_url} />
                  </div>
                )}

                {/* Play full song on Last.fm link */}
                {post.song_link && (
                  <a
                    href={post.song_link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full block text-center py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl border-2 border-black bg-[#dc341e] text-white font-black text-xs hover:bg-[#b02213] active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    Play full song on Last.fm ↗
                  </a>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-3 sm:p-4 border-t-3 border-black bg-white/90 shrink-0 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      likeFreedomPost(post.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-all shadow-xs active:scale-95 ${
                      hasLiked
                        ? 'bg-black text-rose-500 border-black'
                        : 'bg-white text-black border-black hover:bg-[#fff1f3] hover:text-rose-600'
                    }`}
                    title={hasLiked ? "Unlike song dedication" : "Like song dedication"}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span className="text-xs font-black">{post.likes_count || 0}</span>
                  </button>

                  {(post.likes_count || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setReactorsPost(post)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-white text-black hover:bg-[#ffc900] transition-all shadow-xs"
                      title="See who liked this song dedication"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openCommentsModal(post)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-black bg-white text-black hover:bg-[#fff1f3] transition-all shadow-xs active:scale-95 text-xs font-black"
                    title="View Comments"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{commentsCountMap[post.id] || 0}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPostForReport(post)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-white text-black hover:bg-rose-50 hover:text-rose-600 transition-all shadow-xs"
                    title="Report"
                  >
                    <Flag className="w-4 h-4" />
                  </button>

                  {isAdminUser && post.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        approveFreedomPost(post.id);
                        setSelectedPostForDetail(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 transition-all shadow-xs active:scale-95"
                      title="Admin: Approve & Publish to Music Wall"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  )}

                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={() => togglePinFreedomPost(post.id)}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-black transition-all shadow-xs ${
                        post.is_pinned ? 'bg-[#ffc900] text-black' : 'bg-white text-black hover:bg-[#f4f4f0]'
                      }`}
                      title={post.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  )}

                  {(isAdminUser || isMyPost) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPostForDetail(null);
                        setSelectedPostForDelete(post);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-red-500 text-white hover:bg-red-600 transition-all shadow-xs"
                      title={isMyPost && !isAdminUser ? "Delete your note" : "Delete"}
                    >
                      <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border-2 sm:border-4 border-black rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[85vh]">
            <button
              type="button"
              onClick={() => setSelectedPostForComments(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f4f4f0] hover:bg-black hover:text-white border-2 border-black transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-black shrink-0 pr-8">
              <span className="p-2 bg-[#ffc900] border-2 border-black rounded-xl text-black">
                <MessageSquare className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-black truncate max-w-[280px]">
                  Comments
                </h3>
                <p className="text-xs text-[#242423] font-medium">
                  {commentsList.length} student comments
                </p>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 scrollbar-thin">
              {isFetchingComments ? (
                <div className="text-center py-8 text-xs font-bold text-gray-500">
                  Loading comments...
                </div>
              ) : commentsList.length === 0 ? (
                <div className="text-center py-8 text-xs font-extrabold text-gray-500">
                  No comments yet. Be the first student to leave a comment!
                </div>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="p-3 bg-[#f4f4f0] border-2 border-black rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-black text-xs text-black">{c.author_alias}</span>
                      <span className="text-[10px] font-bold text-gray-500">
                        {c.department?.replace('College of ', '')}
                      </span>
                    </div>
                    <p className="text-xs text-black font-medium leading-relaxed">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t-2 border-black shrink-0 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="gumroad-input text-xs font-medium flex-1"
                />
                <button
                  type="submit"
                  className="btn-gumroad-primary text-xs px-3 py-2 flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reactors List Modal */}
      {reactorsPost && (() => {
        const post = freedomPosts.find((p) => p.id === reactorsPost.id) || reactorsPost;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white border-2 sm:border-4 border-black rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl relative">
              <button
                type="button"
                onClick={() => setReactorsPost(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-[#f4f4f0] hover:bg-black hover:text-white border-2 border-black transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-black">
                <span className="p-2 bg-rose-500 text-white border-2 border-black rounded-xl">
                  <Heart className="w-5 h-5 fill-white" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-black">
                    People who liked
                  </h3>
                  <p className="text-xs text-gray-600 font-bold">
                    {post.likes_count || 0} reactions
                  </p>
                </div>
              </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {reactorsPost.liked_by_profiles && Object.keys(reactorsPost.liked_by_profiles).length > 0 ? (
                Object.entries(reactorsPost.liked_by_profiles).map(([uid, prof]) => (
                  <div key={uid} className="p-2.5 bg-[#f4f4f0] border-2 border-black rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#ffc900] border border-black flex items-center justify-center font-black text-xs">
                        {prof.username.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="text-xs font-black text-black">{prof.username}</div>
                        <div className="text-[10px] font-semibold text-gray-600">{prof.department.replace('College of ', '')}</div>
                      </div>
                    </div>
                    <span className="text-xs text-rose-500">❤️</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs font-bold text-gray-500">
                  {reactorsPost.likes_count || 0} anonymous reactions registered.
                </div>
              )}
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
