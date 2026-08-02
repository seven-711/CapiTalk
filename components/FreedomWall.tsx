'use client';

import React, { useState } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { FreedomComment, FreedomPost } from '../lib/types';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import {
  MessageSquare,
  Plus,
  Heart,
  Search,
  X,
  Send,
  AlertTriangle,
  ArrowLeft,
  Flame,
  Clock,
  MessageCircle,
  Flag,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Archive,
  Calendar,
  Layers,
  Unlock,
  Pin,
} from 'lucide-react';
import { ReportNoteModal } from './ReportNoteModal';
import { DeleteNoteModal } from './DeleteNoteModal';

const POST_COLORS = [
  { name: 'Maroon', hex: '#701a31' },
  { name: 'Crimson', hex: '#c41e3a' },
  { name: 'Gold', hex: '#ffc900' },
  { name: 'Pink', hex: '#ff90e8' },
  { name: 'Mint', hex: '#00e599' },
  { name: 'Sky', hex: '#7dd3fc' },
];

export const FreedomWall: React.FC = () => {
  const {
    currentUser,
    freedomPosts,
    addFreedomPost,
    deleteFreedomPost,
    likeFreedomPost,
    togglePinFreedomPost,
    addWallNotification,
    setViewState,
    startSearch,
    targetPostId,
    setTargetPostId,
  } = useChatStore();

  // Scroll to targeted post card from notifications
  React.useEffect(() => {
    if (!targetPostId) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-[#701a31]', 'scale-105');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-[#701a31]', 'scale-105');
          setTargetPostId(null);
        }, 3000);
      } else {
        setTargetPostId(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [targetPostId, setTargetPostId]);

  // Admin Privilege Detection
  const isAdminUser = typeof window !== 'undefined' && localStorage.getItem('capitalk_admin_auth_v1') === 'true';
  const [postAsAdmin, setPostAsAdmin] = useState(isAdminUser);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostForReport, setSelectedPostForReport] = useState<FreedomPost | null>(null);
  const [selectedPostForDelete, setSelectedPostForDelete] = useState<FreedomPost | null>(null);

  // Encapsulated Archives State
  const [encapsulatePastDays, setEncapsulatePastDays] = useState(true);
  const [selectedCapsuleDate, setSelectedCapsuleDate] = useState<string | null>(null);
  const [selectedCapsulePosts, setSelectedCapsulePosts] = useState<FreedomPost[]>([]);
  const [alias, setAlias] = useState(currentUser ? currentUser.username : 'Anon Student');
  const [department, setDepartment] = useState<string>(currentUser ? currentUser.department : 'General');
  const [message, setMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffc900');
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Anti-Bot & Rate Limit Protection State
  const COOLDOWN_SECONDS = 60;
  const DAILY_MAX_POSTS = 10;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [dailyPostCount, setDailyPostCount] = useState<number>(0);
  const [captchaNum1, setCaptchaNum1] = useState(3);
  const [captchaNum2, setCaptchaNum2] = useState(5);
  const [captchaInput, setCaptchaInput] = useState('');

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 8) + 1;
    const n2 = Math.floor(Math.random() * 8) + 1;
    setCaptchaNum1(n1);
    setCaptchaNum2(n2);
    setCaptchaInput('');
  };

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
      generateCaptcha();
      setModerationError(null);
    }
  }, [showCreateModal]);

  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('latest');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Comments Feature State
  const [selectedPostForComments, setSelectedPostForComments] = useState<FreedomPost | null>(null);
  const [commentsList, setCommentsList] = useState<FreedomComment[]>([]);
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAlias, setCommentAlias] = useState(currentUser ? currentUser.username : 'Anon Student');
  const [isFetchingComments, setIsFetchingComments] = useState(false);

  React.useEffect(() => {
    const fetchCounts = async () => {
      if (supabase && isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('freedom_comments').select('post_id');
          if (data) {
            const counts: Record<string, number> = {};
            data.forEach((row: any) => {
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
          setCommentsList(data as FreedomComment[]);
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

    const newComment: FreedomComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      post_id: selectedPostForComments.id,
      author_alias: commentAlias.trim() || (currentUser ? currentUser.username : 'Anon Student'),
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

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('capitalk_global_realtime');
        bc.postMessage({
          type: 'FREEDOM_WALL_COMMENT',
          postId: selectedPostForComments.id,
          actorAlias: newComment.author_alias,
          actorDept: newComment.department,
          messageSnippet: selectedPostForComments.message.slice(0, 60),
          commentText: newComment.message.slice(0, 60),
          commenterId: currentUser ? currentUser.id : 'guest',
        });
      } catch (e) {}
    }

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

        const targetUserId = selectedPostForComments.author_id || selectedPostForComments.id;
        const userChannel = supabase.channel(`user:${targetUserId}:notifications`);
        userChannel.send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            target_user_id: targetUserId,
            post_id: selectedPostForComments.id,
            type: 'comment',
            actor_alias: newComment.author_alias,
            actor_department: newComment.department,
            message_snippet: selectedPostForComments.message.slice(0, 60),
            comment_text: newComment.message.slice(0, 60),
          },
        }).then(() => {}, () => {});

        supabase.from('notifications').insert({
          id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          target_user_id: targetUserId,
          post_id: selectedPostForComments.id,
          type: 'comment',
          actor_alias: newComment.author_alias,
          actor_department: newComment.department,
          message_snippet: selectedPostForComments.message.slice(0, 60),
          comment_text: newComment.message.slice(0, 60),
          read: false,
        }).then(() => {}, () => {});
      } catch (e) {}
    }
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    if (!message.trim()) {
      setModerationError('Please enter your message before posting.');
      return;
    }

    if (!postAsAdmin && !isAdminUser) {
      // 1. Check Cooldown
      if (cooldownRemaining > 0) {
        setModerationError(`⏳ Rate Limit Active: Please wait ${cooldownRemaining}s before publishing your next note to prevent bot spam.`);
        return;
      }

      // 2. Check Daily Limit Cap
      if (dailyPostCount >= DAILY_MAX_POSTS) {
        setModerationError(`🚫 Daily Cap Exceeded: You have reached the maximum limit of ${DAILY_MAX_POSTS} Freedom Wall notes per day.`);
        return;
      }

      // 3. Check Anti-Bot Math Challenge
      if (parseInt(captchaInput.trim(), 10) !== captchaNum1 + captchaNum2) {
        setModerationError(`🤖 Human Verification Failed: ${captchaNum1} + ${captchaNum2} is not ${captchaInput || 'blank'}. Please enter the correct sum!`);
        generateCaptcha();
        return;
      }

      // 4. Check Duplicate Spam
      const isDuplicate = (freedomPosts || [])
        .slice(0, 20)
        .some((p) => p.message.trim().toLowerCase() === message.trim().toLowerCase());

      if (isDuplicate) {
        setModerationError('⚠️ Spam Blocked: An identical note was recently published to the Freedom Wall. Please share a unique thought!');
        return;
      }
    }

    // Run profanity moderation check
    const modResult = analyzeContentModeration(message);
    if (modResult.contains_profanity) {
      setModerationError(`⚠️ Message blocked: Contains profane or inappropriate terms (${modResult.matched_terms.join(', ')}). Please keep the Freedom Wall friendly!`);
      return;
    }

    const success = addFreedomPost({
      author_alias: postAsAdmin
        ? (alias.includes('Admin') ? alias.trim() : '👑 CapiTalk Admin')
        : (currentUser ? currentUser.username : (alias.trim() || 'Anon Student')),
      department: currentUser ? currentUser.department : (department || 'General'),
      message: message.trim(),
      color: postAsAdmin ? '#701a31' : selectedColor,
      is_admin: postAsAdmin,
    });

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

      setMessage('');
      setShowCreateModal(false);
      setModerationError(null);
    }
  };

  // Filter & Sort Posts
  const filteredPosts = (freedomPosts || [])
    .filter((post) => {
      const matchDept = departmentFilter === 'all' || post.department === departmentFilter;
      const matchQuery =
        !searchQuery.trim() ||
        post.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author_alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchQuery;
    })
    .sort((a, b) => {
      if (activeTab === 'trending') return b.likes_count - a.likes_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const isToday = (dateString: string) => {
    const postDate = new Date(dateString);
    const today = new Date();
    return (
      postDate.getFullYear() === today.getFullYear() &&
      postDate.getMonth() === today.getMonth() &&
      postDate.getDate() === today.getDate()
    );
  };

  const todayPosts = React.useMemo(() => {
    const todayOnly = filteredPosts.filter((post) => isToday(post.created_at));
    return [...todayOnly].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });
  }, [filteredPosts]);

  const pastPosts = React.useMemo(() => {
    return filteredPosts.filter((post) => !isToday(post.created_at));
  }, [filteredPosts]);

  const pastGroupedByDate = React.useMemo(() => {
    const groups: { [dateStr: string]: FreedomPost[] } = {};
    pastPosts.forEach((post) => {
      const dateStr = new Date(post.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(post);
    });
    return groups;
  }, [pastPosts]);

  const renderPostCard = (post: FreedomPost) => {
    const hasLiked = currentUser ? post.liked_by_users?.includes(currentUser.id) : false;
    const isPostAdmin = post.is_admin || post.author_alias?.toLowerCase().includes('admin');
    const isPinned = !!post.is_pinned;

    return (
      <div
        key={post.id}
        id={`post-${post.id}`}
        style={{ backgroundColor: post.color || (isPostAdmin ? '#701a31' : '#ffc900') }}
        className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-black transition-all flex flex-col justify-between group relative overflow-hidden ${
          isPinned
            ? 'border-4 border-black ring-4 ring-[#ffc900] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
            : isPostAdmin
            ? 'border-4 border-[#ffc900] ring-4 ring-[#701a31]/80 shadow-[0_0_30px_rgba(112,26,49,0.85)] animate-pulse text-white'
            : 'text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              {isPinned ? (
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#ffc900] text-black text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 border border-black shadow-xs flex items-center gap-1">
                  📌 PINNED NOTE
                </span>
              ) : isPostAdmin ? (
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#ffc900] text-black text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider shrink-0 border border-black shadow-xs flex items-center gap-1">
                  👑 ADMIN NOTE
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

          <p className={`text-xs sm:text-sm font-extrabold leading-relaxed whitespace-pre-wrap break-words mb-2.5 sm:mb-4 ${isPostAdmin && !isPinned ? 'text-white drop-shadow-sm' : 'text-black'}`}>
            "{post.message}"
          </p>
        </div>

        <div className={`pt-2 sm:pt-3 border-t flex items-center justify-between gap-2 ${isPostAdmin && !isPinned ? 'border-white/30' : 'border-black/20'}`}>
          <span className={`text-[11px] sm:text-xs font-extrabold italic truncate ${isPostAdmin && !isPinned ? 'text-[#ffc900]' : 'text-black/80'}`}>
            ~ {post.author_alias || 'Anon Student'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedPostForReport(post)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black bg-white text-black hover:bg-rose-50 hover:text-rose-600 transition-all shadow-xs"
              title="Report this note to admin"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>

            {isAdminUser && (
              <>
                <button
                  type="button"
                  onClick={() => togglePinFreedomPost(post.id)}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black transition-all shadow-xs ${
                    isPinned
                      ? 'bg-[#ffc900] text-black border-black shadow-md scale-105'
                      : 'bg-white text-black hover:bg-amber-100'
                  }`}
                  title={isPinned ? "Admin: Unpin Note" : "Admin: Pin Note to top"}
                >
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-black' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPostForDelete(post)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black bg-red-500 text-white hover:bg-red-600 transition-all shadow-xs"
                  title="Admin: Delete Note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => openCommentsModal(post)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-black bg-white text-xs font-extrabold text-black hover:bg-black hover:text-white transition-all shadow-xs"
              title="View & Post Comments"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{commentsCountMap[post.id] || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => likeFreedomPost(post.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 text-xs font-extrabold transition-all shadow-sm ${
                hasLiked
                  ? 'bg-rose-500 text-white border-black shadow-md scale-105'
                  : 'bg-white border-black text-black hover:bg-black hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-white text-white animate-pulse' : ''}`} />
              <span>{post.likes_count}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2.5 sm:py-8 px-2 sm:px-6 animate-in fade-in duration-200">
      {/* Top Banner Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-8 bg-white border-2 border-black p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setViewState('queue')}
            className="p-1.5 sm:p-2 bg-[#f4f4f0] hover:bg-black hover:text-white border border-black rounded-full transition-all shrink-0"
            title="Back to Matchmaking"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 sm:px-4 sm:py-2 bg-[#701a31] border-2 border-black text-white text-[11px] sm:text-xs font-extrabold rounded-full uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                Campus Wall
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-gumroad-primary text-xs sm:text-sm px-3.5 py-2 sm:px-5 sm:py-3 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Share thoughts...</span>
          </button>
          <button
            type="button"
            onClick={startSearch}
            className="btn-gumroad-ghost text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-3 flex-1 sm:flex-initial flex items-center justify-center gap-1"
          >
            <span>Start Chat</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-3.5 sm:mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 sm:gap-3 bg-[#f4f4f0] p-2 sm:p-3 border-2 border-black rounded-xl sm:rounded-2xl">
        {/* Tab Selection */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('latest')}
            className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all whitespace-nowrap border ${
              activeTab === 'latest'
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white text-black border-[#d1d5dc] hover:border-black'
            }`}
          >
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Latest</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trending')}
            className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all whitespace-nowrap border ${
              activeTab === 'trending'
                ? 'bg-black text-white border-black shadow-sm'
                : 'bg-white text-black border-[#d1d5dc] hover:border-black'
            }`}
          >
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span>Trending</span>
          </button>
          <button
            type="button"
            onClick={() => setEncapsulatePastDays(!encapsulatePastDays)}
            className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition-all whitespace-nowrap border ${
              encapsulatePastDays
                ? 'bg-[#701a31] text-white border-black shadow-sm'
                : 'bg-white text-black border-[#d1d5dc] hover:border-black'
            }`}
            title="Encapsulate notes from past days into daily archive capsules"
          >
            <Archive className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ffc900]" />
            <span>{encapsulatePastDays ? 'Encapsulated 📦' : 'Unfolded 🔓'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 flex-1 max-w-full md:max-w-md">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-8 pr-2.5 py-1.5 text-[11px] sm:text-xs bg-white border border-black rounded-lg sm:rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Department Filter Dropdown */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-[11px] sm:text-xs bg-white border border-black rounded-lg sm:rounded-xl px-2 py-1.5 font-bold focus:outline-none focus:ring-2 focus:ring-black w-full sm:w-auto shrink-0"
          >
            <option value="all">All Departments</option>
            {CU_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept.replace('College of ', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Freedom Wall Content */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-10 sm:py-16 bg-white border-2 border-black rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#ffc900] border-2 border-black flex items-center justify-center mx-auto mb-3 text-xl sm:text-2xl">
            📜
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-black">No Freedom Wall Posts Found</h3>
          <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
            {searchQuery || departmentFilter !== 'all'
              ? 'No posts match your active search filter. Try clearing filters!'
              : 'Be the very first CU student to post an anonymous confession or thought on the wall!'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 btn-gumroad-primary text-xs px-5 py-2.5"
          >
            <span>Write First Post</span>
          </button>
        </div>
      ) : encapsulatePastDays && !searchQuery.trim() ? (
        <div className="space-y-6 sm:space-y-10">
          {/* Today's Live Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5 sm:mb-4 pb-1.5 sm:pb-2 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#ffc900] border-2 border-black rounded-full text-[10px] sm:text-xs font-black text-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 animate-bounce" />
                  Today's Live Notes ({todayPosts.length})
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-black">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {todayPosts.length === 0 ? (
              <div className="p-5 sm:p-8 text-center bg-white border-2 border-black rounded-2xl sm:rounded-3xl shadow-sm text-xs font-bold text-gray-600">
                ✨ No notes published yet today! Be the first student to share a thought on the wall today.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {todayPosts.map((post) => renderPostCard(post))}
              </div>
            )}
          </div>

          {/* Past Days Encapsulated Archives Section */}
          {Object.keys(pastGroupedByDate).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5 sm:mb-4 pb-1.5 sm:pb-2 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-[#701a31] border-2 border-black text-white text-[10px] sm:text-xs font-black rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                    <Archive className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ffc900]" />
                    Encapsulated Past Archives ({Object.keys(pastGroupedByDate).length} Capsules)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEncapsulatePastDays(false)}
                  className="text-[11px] sm:text-xs font-extrabold text-black hover:text-[#701a31] transition-colors"
                >
                  Unfold Days 🔓
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {Object.entries(pastGroupedByDate).map(([dateStr, posts]) => {
                  const sampleAliases = Array.from(new Set(posts.map((p) => p.author_alias || 'Anon Student'))).slice(0, 3).join(', ');
                  const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setSelectedCapsuleDate(dateStr);
                        setSelectedCapsulePosts(posts);
                      }}
                      className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 border-black bg-white hover:bg-[#f4f4f0] transition-all flex flex-col justify-between cursor-pointer group shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                          <span className="px-2 py-0.5 bg-[#701a31] text-white text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 border border-black shadow-xs">
                            <Archive className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#ffc900]" />
                            Daily Capsule
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-600">
                            {dateStr}
                          </span>
                        </div>

                        <h4 className="text-base sm:text-lg font-black text-black mb-1">
                          {dateStr} Archive 📦
                        </h4>
                        <p className="text-[11px] sm:text-xs text-gray-600 font-semibold mb-2.5 sm:mb-4 line-clamp-2">
                          Includes confessions by <span className="text-black font-extrabold">{sampleAliases}</span> and others.
                        </p>
                      </div>

                      <div className="pt-2 sm:pt-3 border-t border-black/15 flex items-center justify-between text-xs font-bold text-black">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 bg-[#ffc900] border border-black rounded-full text-[10px] sm:text-[11px] font-black text-black shadow-xs">
                            📜 {posts.length} Notes
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-bold text-gray-600">
                            ❤️ {totalLikes}
                          </span>
                        </div>
                        <span className="text-[11px] sm:text-xs font-black text-[#701a31] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Unfold Capsule 🔓
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredPosts.map((post) => renderPostCard(post))}
        </div>
      )}

      {/* Floating Mobile Action Button */}
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 bg-[#ff90e8] border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-black"
        title="Post Anonymous Message"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Comments Modal */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#f4f4f0] border-2 border-black rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#701a31]" />
                <h3 className="text-lg font-extrabold text-black">Campus Wall Comments</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostForComments(null)}
                className="p-1 hover:bg-black/10 rounded-full text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Post Preview */}
            <div
              style={{ backgroundColor: selectedPostForComments.color || '#ffc900' }}
              className="p-4 rounded-2xl border-2 border-black text-black mb-4 shadow-sm shrink-0"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="px-2 py-0.5 bg-black text-white text-[10px] font-extrabold rounded-full uppercase">
                  {selectedPostForComments.department.replace('College of ', '')}
                </span>
                <span className="text-[10px] font-bold text-black/70">
                  {new Date(selectedPostForComments.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-black whitespace-pre-wrap">
                "{selectedPostForComments.message}"
              </p>
              <span className="text-[11px] font-bold text-black/80 italic block mt-2">
                ~ {selectedPostForComments.author_alias}
              </span>
            </div>

            {/* Comments List Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 mb-4 pr-1 min-h-[120px]">
              {isFetchingComments ? (
                <div className="text-center py-8 text-xs font-bold text-gray-500">
                  Loading comments...
                </div>
              ) : commentsList.length === 0 ? (
                <div className="text-center py-8 bg-white border border-dashed border-black/30 rounded-2xl text-xs font-bold text-gray-500">
                  💬 No comments yet on this note. Be the first student to comment!
                </div>
              ) : (
                commentsList.map((cm) => (
                  <div key={cm.id} className="p-3 bg-white border border-black rounded-2xl text-black shadow-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-extrabold text-[#701a31]">
                        @{cm.author_alias}
                      </span>
                      <span className="text-[10px] font-bold text-black/60">
                        {new Date(cm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-black whitespace-pre-wrap leading-relaxed">
                      {cm.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t-2 border-black flex gap-2 shrink-0">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write your anonymous comment..."
                className="gumroad-input text-xs flex-1 py-2"
                required
              />
              <button
                type="submit"
                className="btn-gumroad-primary text-xs px-4 py-2 flex items-center gap-1 shrink-0 bg-[#701a31] hover:bg-[#4d0d1f]"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Anonymous Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border-2 sm:border-4 border-black p-4 sm:p-6 rounded-2xl max-w-lg w-full text-left shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[95vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setModerationError(null);
              }}
              className="absolute top-3 right-3 p-1 hover:bg-black/10 rounded-full transition-colors text-black"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.5 bg-[#ffc900] border border-black text-black text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                Anonymous Post
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
              Post to Freedom Wall ✏️
            </h3>
            <p className="text-[11px] text-[#242423] mt-0.5 mb-3">
              Share your thoughts safely and anonymously with fellow students.
            </p>

            {moderationError && (
              <div className="mb-3 p-2.5 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{moderationError}</span>
              </div>
            )}

            {isAdminUser && (
              <div className="mb-3 p-2.5 sm:p-3 bg-[#701a31] border-2 border-black rounded-xl text-white shadow-md flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#ffc900] animate-bounce shrink-0" />
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider block text-[#ffc900]">
                      👑 Admin Privilege Mode
                    </span>
                    <span className="text-[10px] font-bold text-white/90 block">
                      Post note with glowing aura & official Admin badge
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={postAsAdmin}
                    onChange={(e) => {
                      setPostAsAdmin(e.target.checked);
                      if (e.target.checked) {
                        setAlias('👑 CapiTalk Admin');
                        setSelectedColor('#701a31');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ffc900]"></div>
                </label>
              </div>
            )}

            <form onSubmit={handlePostSubmit} className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 bg-[#f4f4f0] border-2 border-black rounded-xl text-black">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#ffc900] border border-black flex items-center justify-center font-black text-xs text-black shrink-0">
                    {(currentUser?.username || alias || 'A').charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <span className="text-xs font-black text-black block">
                      {currentUser ? currentUser.username : alias || 'Anon Student'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-600 block">
                      {currentUser ? currentUser.department.replace('College of ', '') : 'General Student'}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-extrabold bg-black text-white px-2 py-0.5 rounded-full uppercase shrink-0">
                  Profile Identity
                </span>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-[#242423] uppercase mb-0.5">
                  Card Theme Color
                </label>
                <div className="flex items-center gap-2">
                  {POST_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        selectedColor === c.hex
                          ? 'border-black scale-115 shadow-xs'
                          : 'border-black/40 hover:scale-105'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[10px] sm:text-xs font-bold text-[#242423] uppercase">
                    Your Anonymous Message
                  </label>
                  <span className="text-[10px] font-bold text-gray-500">
                    {message.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={300}
                  placeholder="Type your confession, thought, shoutout, or campus vibe here..."
                  className="w-full p-2.5 text-xs border-2 border-black rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-black bg-white text-black"
                />
              </div>

              {/* Anti-Bot Verification Challenge */}
              {!postAsAdmin && (
                <div className="p-2.5 bg-amber-50 border-2 border-black rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] sm:text-xs font-extrabold text-black uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      🤖 Anti-Bot Verification
                    </label>
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400">
                      {dailyPostCount}/{DAILY_MAX_POSTS} Notes Today
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-700 font-medium">
                    Solve this quick math puzzle to verify you are a student:
                  </p>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="px-2.5 py-1 bg-white border-2 border-black rounded-lg font-black text-xs sm:text-sm text-black shadow-xs flex items-center gap-1">
                      <span>{captchaNum1}</span>
                      <span>+</span>
                      <span>{captchaNum2}</span>
                      <span>=</span>
                    </div>

                    <input
                      type="number"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Answer?"
                      className="w-20 px-2 py-1 text-xs border-2 border-black rounded-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-black bg-white"
                      required={!postAsAdmin}
                    />

                    <button
                      type="button"
                      onClick={generateCaptcha}
                      className="p-1 hover:bg-black/10 rounded-lg text-black transition-colors"
                      title="New Math Puzzle"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Cooldown Warning Notice */}
              {cooldownRemaining > 0 && !postAsAdmin && (
                <div className="p-2.5 bg-amber-100 border-2 border-amber-500 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-spin" />
                  <span>
                    ⏳ Cooldown active: Please wait <span className="text-black font-black underline">{cooldownRemaining}s</span> before posting.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-gumroad-ghost text-xs px-3.5 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS)}
                  className={`btn-gumroad-primary text-xs px-5 py-2 flex items-center gap-1.5 ${
                    !postAsAdmin && (cooldownRemaining > 0 || dailyPostCount >= DAILY_MAX_POSTS)
                      ? 'opacity-50 cursor-not-allowed bg-gray-400 border-gray-600'
                      : ''
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {cooldownRemaining > 0 && !postAsAdmin
                      ? `Wait ${cooldownRemaining}s...`
                      : dailyPostCount >= DAILY_MAX_POSTS && !postAsAdmin
                      ? 'Daily Limit Reached'
                      : 'Post Note'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Note Modal */}
      {selectedPostForReport && (
        <ReportNoteModal
          post={selectedPostForReport}
          onClose={() => setSelectedPostForReport(null)}
        />
      )}

      {/* Delete Note Confirmation Modal */}
      {selectedPostForDelete && (
        <DeleteNoteModal
          post={selectedPostForDelete}
          onConfirm={() => {
            deleteFreedomPost(selectedPostForDelete.id);
            setSelectedCapsulePosts((prev) => prev.filter((p) => p.id !== selectedPostForDelete.id));
          }}
          onClose={() => setSelectedPostForDelete(null)}
        />
      )}

      {/* Encapsulated Capsule Viewer Modal */}
      {selectedCapsuleDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black rounded-[32px] max-w-4xl w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => {
                setSelectedCapsuleDate(null);
                setSelectedCapsulePosts([]);
              }}
              className="absolute top-5 right-5 p-1.5 hover:bg-black/10 rounded-full text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-black">
              <div className="p-3 bg-[#701a31] border-2 border-black rounded-2xl text-white shadow-xs">
                <Archive className="w-6 h-6 text-[#ffc900]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-[#ffc900] border border-black text-black text-[10px] font-black rounded-full uppercase">
                    Encapsulated Archive
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                    {selectedCapsulePosts.length} Notes Total
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-black">
                  {selectedCapsuleDate} Daily Capsule 📦
                </h3>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCapsulePosts.map((post) => renderPostCard(post))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-black/15 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedCapsuleDate(null);
                  setSelectedCapsulePosts([]);
                }}
                className="btn-gumroad-ghost text-xs px-5 py-2"
              >
                Close Capsule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
