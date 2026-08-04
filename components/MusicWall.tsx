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
        const errMsg = `⏳ Cooldown Active: Please wait ${cooldownRemaining}s before publishing (Available at ${timeStr}).`;
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
        const errMsg = `🚫 Daily Limit Reached (10/10 posts): You can post again at ${resetTimeStr}.`;
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
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
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
    const isPinned = !!post.is_pinned;
    const isMyPost = (myPostIds || []).includes(post.id) || (post.author_id && post.author_id === currentUserId);

    return (
      <div
        key={post.id}
        id={`post-${post.id}`}
        style={{ backgroundColor: isPostAdmin ? '#701a31' : (post.color || '#fff1f3') }}
        className={`p-3 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-black transition-all flex flex-col justify-between group relative overflow-hidden ${
          isPinned
            ? 'border-4 border-black ring-4 ring-[#ffc900] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
            : isPostAdmin
            ? 'border-4 border-[#ffc900] ring-4 ring-[#701a31]/80 shadow-[0_0_30px_rgba(112,26,49,0.85)] animate-pulse text-white'
            : 'text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              {post.status === 'pending' && (
                <span className="px-2 py-0.5 sm:px-2.5 bg-[#ffc900] text-black text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 border border-black shadow-xs flex items-center gap-1 animate-pulse" title="Awaiting Admin Review before public display">
                  ⏳ PENDING REVIEW
                </span>
              )}
              {isPinned ? (
                <span className="px-2 py-0.5 sm:px-2.5 bg-[#ffc900] text-black text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 border border-black shadow-xs flex items-center gap-1">
                  📌 PINNED
                </span>
              ) : isPostAdmin ? (
                <span className="px-2 py-0.5 sm:px-2.5 bg-[#ffc900] text-black text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 border border-black shadow-xs flex items-center gap-1">
                  👑 ADMIN
                </span>
              ) : (
                <span className="px-2 py-0.5 sm:px-2.5 bg-black text-white text-[9px] sm:text-[10px] font-extrabold rounded-full uppercase tracking-wider shrink-0">
                  {post.department.replace('College of ', '')}
                </span>
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold shrink-0 ${isPostAdmin && !isPinned ? 'text-[#ffc900]' : 'text-black/70'}`}>
              {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Dedicated To Recipient Badge */}
          {post.dedicated_to && (
            <div className="mb-2 sm:mb-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ffc900] text-black text-[10px] sm:text-xs font-black rounded-lg border-2 border-black shadow-xs max-w-full truncate">
              <span className="shrink-0">To:</span>
              <span className="truncate">{post.dedicated_to}</span>
            </div>
          )}

          <p className={`text-xs sm:text-sm font-extrabold leading-relaxed whitespace-pre-wrap break-words mb-2 sm:mb-3 ${isPostAdmin && !isPinned ? 'text-white drop-shadow-sm' : 'text-black'}`}>
            "{post.message}"
          </p>

          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3 bg-[#f4f4f0] border-2 border-black p-2 sm:p-2.5 rounded-xl sm:rounded-2xl text-black shadow-xs">
            {post.song_image_url && !post.song_image_url.includes('2a96cbd8b46e442fc41c2b86b821562f') ? (
              <img
                src={post.song_image_url}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 border-2 border-black object-cover"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Music className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">Dedicated Song</div>
              <div className="text-xs sm:text-sm font-black truncate leading-tight">{post.song_title}</div>
              <div className="text-[11px] sm:text-xs font-bold text-gray-600 truncate">{post.song_artist}</div>
            </div>
          </div>
          
          {post.song_preview_url && (
            <div className="mb-2 sm:mb-3 w-full">
              <CustomAudioPlayer src={post.song_preview_url} />
            </div>
          )}

          {post.song_link && (
             <a
              href={post.song_link}
              target="_blank"
              rel="noreferrer"
              className="mb-2 sm:mb-3 w-full block text-center py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg sm:rounded-xl border-2 border-black bg-[#dc341e] text-white font-black text-[11px] sm:text-xs hover:bg-[#b02213] active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
             >
               Play full song on Last.fm
             </a>
          )}
        </div>

        <div className={`pt-2 sm:pt-3 border-t flex items-center justify-between gap-2 ${isPostAdmin && !isPinned ? 'border-white/30' : 'border-black/20'}`}>
          <span className={`text-[11px] sm:text-xs font-extrabold italic truncate ${isPostAdmin && !isPinned ? 'text-[#ffc900]' : 'text-black/80'}`}>
            ~ {post.author_alias || 'Anon Student'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdminUser && post.status === 'pending' && (
              <button
                type="button"
                onClick={() => approveFreedomPost(post.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-black bg-emerald-500 text-white font-black text-[10px] sm:text-xs hover:bg-emerald-600 transition-all shadow-xs active:scale-95"
                title="Approve Note"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedPostForReport(post)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black bg-white text-black hover:bg-rose-50 hover:text-rose-600 transition-all shadow-xs"
              title="Report"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>

            {isAdminUser && (
              <button
                type="button"
                onClick={() => togglePinFreedomPost(post.id)}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black transition-all shadow-xs ${
                  post.is_pinned ? 'bg-[#ffc900] text-black' : 'bg-white text-black hover:bg-[#f4f4f0]'
                }`}
                title={post.is_pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}

            {(isAdminUser || isMyPost) && (
              <button
                type="button"
                onClick={() => setSelectedPostForDelete(post)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black bg-red-500 text-white hover:bg-red-600 transition-all shadow-xs"
                title={isMyPost && !isAdminUser ? "Delete your note" : "Delete"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onMouseDown={() => handleHeartPressStart(post)}
              onMouseUp={() => handleHeartPressEnd(post)}
              onMouseLeave={() => {
                if (heartPressTimer.current) clearTimeout(heartPressTimer.current);
                heartPressTriggered.current = false;
              }}
              onTouchStart={() => handleHeartPressStart(post)}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleHeartPressEnd(post);
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border-2 transition-all shadow-xs active:scale-95 ${
                hasLiked
                  ? 'bg-black text-rose-500 border-black'
                  : 'bg-white text-black border-black hover:bg-[#fff1f3] hover:text-rose-600'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="text-[10px] sm:text-xs font-black">{post.likes_count || 0}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f4f0] overflow-y-auto w-full custom-scrollbar">
      {/* Header Section */}
      <div className="bg-[#fff1f3] sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-black tracking-tight flex items-center justify-center sm:justify-start gap-2 sm:gap-3 drop-shadow-[2px_2px_0px_rgba(255,201,0,1)]">
              <span>Music Wall</span>
              <Music className="w-6 h-6 sm:w-8 sm:h-8 text-[#dc341e]" />
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-none bg-[#701a31] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black font-black py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              Dedicate a Song
            </button>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-3 sm:pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-2 sm:mt-0">
          <div className="flex items-center bg-white p-1 rounded-xl border-2 border-black shadow-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'latest' ? 'bg-black text-white shadow-sm' : 'text-gray-600 hover:text-black hover:bg-gray-200'
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => setActiveTab('trending')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'trending' ? 'bg-[#dc341e] text-white shadow-sm' : 'text-gray-600 hover:text-black hover:bg-gray-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Trending
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-[1200px] w-full mx-auto px-3 sm:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
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
                    <span>⏳ Cooldown Active ({cooldownRemaining}s remaining)</span>
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
                    <span>🚫 Daily Limit Reached (10/10 posts)</span>
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
    </div>
  );
};
