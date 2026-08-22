import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { getAvatarForPseudonym } from '../lib/constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  ArrowLeft,
  Globe,
  MoreHorizontal,
  Send,
  X,
  Flame,
  MessageSquare,
  ThumbsUp,
  Heart,
  Trash2,
} from 'lucide-react';

// ─── Facebook-style SVGs ──────────────────────────────────────────────────────

const FbLikeSvg = ({ filled = false, color = '#65676b', className = 'w-4 h-4' }: { filled?: boolean; color?: string; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill={filled ? color : 'currentColor'}>
    <path d="M14.0001 3.5C14.0001 2.67157 13.3285 2 12.5001 2C11.9669 2 11.4795 2.28483 11.2096 2.74415L7.79153 8.55486C7.54589 8.97246 7.09886 9.22727 6.61391 9.22727H4.00008C2.89551 9.22727 2.00008 10.1227 2.00008 11.2273V19.2273C2.00008 20.3318 2.89551 21.2273 4.00008 21.2273H17.4305C18.8471 21.2273 20.0617 20.2188 20.3113 18.8213L21.5613 11.8213C21.8722 10.0798 20.5222 8.5 18.75 8.5H14.7501C14.3359 8.5 14.0001 8.16421 14.0001 7.75V3.5Z" />
  </svg>
);

const FbCommentSvg = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M4.5 3.75A2.25 2.25 0 002.25 6v10.5A2.25 2.25 0 004.5 18.75h2.25v3.19c0 .67.8 1.02 1.3.57l3.76-3.76h7.69A2.25 2.25 0 0021.75 16.5V6a2.25 2.25 0 00-2.25-2.25H4.5zM6 8.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 8.25zm0 3.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H6.75A.75.75 0 016 12z" clipRule="evenodd" />
  </svg>
);

// ─── Real-time Relative Time Formatter ─────────────────────────────────────────

const formatRelativeTime = (timestamp?: number | string | null, currentNow: number = Date.now()): string => {
  if (!timestamp) return 'Just now';
  const numTimestamp = typeof timestamp === 'string' ? Number(timestamp) || Date.parse(timestamp) : timestamp;
  if (!numTimestamp || isNaN(numTimestamp)) return 'Just now';

  const diffSeconds = Math.max(0, Math.floor((currentNow - numTimestamp) / 1000));
  if (diffSeconds < 45) return 'Just now';
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
};

// ─── Reaction Configuration ───────────────────────────────────────────────────

interface ReactionDef {
  key: string;
  label: string;
  emoji: string;
  textColor: string;
  cebuanoMeaning: string;
  bgBubbleColor: string;
}

const REACTIONS: ReactionDef[] = [
  {
    key: 'like',
    label: 'Like',
    emoji: '👍',
    textColor: '#1877f2',
    cebuanoMeaning: 'Bala na si Batman',
    bgBubbleColor: '#1877f2',
  },
  {
    key: 'heart',
    label: 'Love',
    emoji: '❤️',
    textColor: '#f33e5b',
    cebuanoMeaning: 'Excited Gamay',
    bgBubbleColor: '#f33e5b',
  },
  {
    key: 'care',
    label: 'Care',
    emoji: '🥰',
    textColor: '#f7b125',
    cebuanoMeaning: 'Siya Ra Gasulod Sako Huna-Huna',
    bgBubbleColor: '#f7b125',
  },
  {
    key: 'haha',
    label: 'Haha',
    emoji: '😆',
    textColor: '#f7b125',
    cebuanoMeaning: 'Dili Lang Sa',
    bgBubbleColor: '#f7b125',
  },
  {
    key: 'wow',
    label: 'Wow',
    emoji: '😮',
    textColor: '#f7b125',
    cebuanoMeaning: 'Kadali Raba, Midterm Na Dayon?',
    bgBubbleColor: '#f7b125',
  },
  {
    key: 'sad',
    label: 'Sad',
    emoji: '😢',
    textColor: '#f7b125',
    cebuanoMeaning: 'Wala Pa Ka Review',
    bgBubbleColor: '#f7b125',
  },
];

interface CommentReply {
  id: string;
  authorId?: string;
  author: string;
  department: string;
  avatarUrl?: string;
  createdAt: number;
  text: string;
  isLiked?: boolean;
  likesCount?: number;
}

interface CommentItem {
  id: string;
  authorId?: string;
  author: string;
  department: string;
  avatarUrl?: string;
  avatarColor?: string;
  createdAt: number;
  text: string;
  reactionCount?: number;
  isLiked?: boolean;
  likesCount?: number;
  replies?: CommentReply[];
}

// ─── Circular Reaction Badge Component ───────────────────────────────────────

const renderReactionBadge = (key: string) => {
  switch (key) {
    case 'like':
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#1877f2] flex items-center justify-center shadow-xs border-2 border-white shrink-0">
          <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
        </div>
      );
    case 'heart':
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#f33e5b] flex items-center justify-center shadow-xs border-2 border-white shrink-0">
          <Heart className="w-2.5 h-2.5 text-white fill-white" />
        </div>
      );
    case 'care':
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#f7b125] flex items-center justify-center text-[12px] shadow-xs border-2 border-white leading-none shrink-0 select-none">
          🥰
        </div>
      );
    case 'haha':
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#f7b125] flex items-center justify-center text-[12px] shadow-xs border-2 border-white leading-none shrink-0 select-none">
          😆
        </div>
      );
    case 'wow':
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#f7b125] flex items-center justify-center text-[12px] shadow-xs border-2 border-white leading-none shrink-0 select-none">
          😮
        </div>
      );
    case 'sad':
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#f7b125] flex items-center justify-center text-[12px] shadow-xs border-2 border-white leading-none shrink-0 select-none">
          😢
        </div>
      );
    default:
      return (
        <div key={key} className="w-5 h-5 rounded-full bg-[#1877f2] flex items-center justify-center shadow-xs border-2 border-white shrink-0">
          <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
        </div>
      );
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MidtermSzn: React.FC = () => {
  const { setViewState, currentUser } = useChatStore();

  const currentUserId = currentUser?.id || (typeof window !== 'undefined' ? getOrCreatePersistentUUID() : 'guest_anon');

  // Real-time clock updated on interval
  const [now, setNow] = useState<number>(Date.now());
  const [postCreatedAt] = useState<number>(() => {
    if (typeof window === 'undefined') return Date.now();
    try {
      const stored = localStorage.getItem('capitalk_midterm_post_created_ts');
      if (stored) return Number(stored);
      const initial = Date.now();
      localStorage.setItem('capitalk_midterm_post_created_ts', String(initial));
      return initial;
    } catch {
      return Date.now();
    }
  });

  // Ticking timer for real-time relative time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000); // Check every 10s
    return () => clearInterval(timer);
  }, []);

  // User reactions map (userId -> reactionKey) for robust real-time synchronization
  const [userReactionsMap, setUserReactionsMap] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem('capitalk_midterm_user_reactions_map');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const calculateTalliesFromMap = (map: Record<string, string>): Record<string, number> => {
    const tallies: Record<string, number> = { like: 0, heart: 0, care: 0, haha: 0, wow: 0, sad: 0 };
    Object.values(map || {}).forEach((rKey) => {
      if (rKey && tallies[rKey] !== undefined) {
        tallies[rKey]++;
      }
    });
    return tallies;
  };

  // Fresh reaction counts starting at 0
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') {
      return { like: 0, heart: 0, care: 0, haha: 0, wow: 0, sad: 0 };
    }
    try {
      const stored = localStorage.getItem('capitalk_midterm_reactions_zero');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { like: 0, heart: 0, care: 0, haha: 0, wow: 0, sad: 0 };
  });

  const [userReaction, setUserReaction] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('capitalk_midterm_user_reaction_zero') || null;
    } catch {
      return null;
    }
  });

  const [showPicker, setShowPicker] = useState(false);
  const [hoveredReactionKey, setHoveredReactionKey] = useState<string | null>(null);

  // Track owned comments for this browser/user
  const [myCommentIds, setMyCommentIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('capitalk_my_midterm_comment_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const recordMyCommentId = (id: string) => {
    setMyCommentIds(prev => {
      const next = [...prev, id];
      try { localStorage.setItem('capitalk_my_midterm_comment_ids', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Fresh comments list starting empty (0 comments), safely parsing timestamps
  const [comments, setComments] = useState<CommentItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('capitalk_midterm_comments_zero');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? Number(item.createdAt) || Date.now() : Date.now(),
          }));
        }
      }
    } catch {}
    return [];
  });

  const [commentToDelete, setCommentToDelete] = useState<{ commentId: string; replyId?: string; author: string } | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Timers & refs
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);
  const floatIdRef = useRef(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const commentLongPressTimer = useRef<NodeJS.Timeout | null>(null);
  const commentLongPressTriggered = useRef(false);
  const supabaseChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Check if comment/reply belongs to current user
  const isCommentMine = (commentId: string, authorId?: string, authorName?: string, replyId?: string) => {
    const targetId = replyId || commentId;
    return (
      myCommentIds.includes(targetId) ||
      (authorId && currentUserId && authorId === currentUserId) ||
      (authorName && currentUser?.username && authorName === currentUser.username)
    );
  };

  // Sync and Persist Reactions across devices & tabs
  const syncAndSaveReactions = (newMap: Record<string, string>) => {
    const tallies = calculateTalliesFromMap(newMap);
    setUserReactionsMap(newMap);
    setReactionCounts(tallies);

    try {
      localStorage.setItem('capitalk_midterm_user_reactions_map', JSON.stringify(newMap));
      localStorage.setItem('capitalk_midterm_reactions_zero', JSON.stringify(tallies));
    } catch {}

    broadcastChannelRef.current?.postMessage({
      type: 'midterm_sync_reactions_map',
      payload: newMap,
    });

    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'midterm_sync_reactions_map',
          payload: newMap,
        });
      } catch {}
    }
  };

  // Sync and Persist Comments across users & tabs
  const syncAndSaveComments = (newComments: CommentItem[]) => {
    setComments(newComments);
    try {
      localStorage.setItem('capitalk_midterm_comments_zero', JSON.stringify(newComments));
    } catch {}

    broadcastChannelRef.current?.postMessage({
      type: 'midterm_sync_comments',
      payload: newComments,
    });

    if (supabaseChannelRef.current) {
      try {
        supabaseChannelRef.current.send({
          type: 'broadcast',
          event: 'midterm_sync_comments',
          payload: newComments,
        });
      } catch {}
    }
  };

  // Fetch initial reactions & comments from Supabase Database
  const fetchMidtermDataFromDB = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Fetch Reactions tallies
      const { data: reactData, error: reactErr } = await supabase
        .from('midterm_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', 'midterm_szn_post_1');

      if (!reactErr && Array.isArray(reactData)) {
        const mapFromDB: Record<string, string> = {};
        reactData.forEach((row: any) => {
          if (row.user_id && row.reaction_type) {
            mapFromDB[row.user_id] = row.reaction_type;
          }
        });

        setUserReactionsMap(prev => {
          const merged = { ...prev, ...mapFromDB };
          const tallies = calculateTalliesFromMap(merged);
          setReactionCounts(tallies);

          try {
            localStorage.setItem('capitalk_midterm_user_reactions_map', JSON.stringify(merged));
            localStorage.setItem('capitalk_midterm_reactions_zero', JSON.stringify(tallies));
          } catch {}

          if (merged[currentUserId]) {
            setUserReaction(merged[currentUserId]);
            try { localStorage.setItem('capitalk_midterm_user_reaction_zero', merged[currentUserId]); } catch {}
          }
          return merged;
        });
      } else if (reactErr) {
        console.warn('Supabase reactions fetch error:', reactErr);
      }

      // 2. Fetch Comments & Replies
      const { data: commentData, error: commentErr } = await supabase
        .from('midterm_comments')
        .select('*, replies:midterm_comment_replies(*)')
        .eq('post_id', 'midterm_szn_post_1')
        .order('created_at', { ascending: false });

      if (!commentErr && Array.isArray(commentData)) {
        const mapped: CommentItem[] = commentData.map((c: any) => ({
          id: c.id,
          authorId: c.author_id,
          author: c.author,
          department: c.department,
          avatarUrl: c.avatar_url,
          avatarColor: c.avatar_color || '#701a31',
          createdAt: Number(c.created_at) || Date.now(),
          text: c.text,
          likesCount: c.likes_count || 0,
          isLiked: Array.isArray(c.liked_by_users) && c.liked_by_users.includes(currentUserId),
          replies: Array.isArray(c.replies)
            ? c.replies.map((r: any) => ({
                id: r.id,
                authorId: r.author_id,
                author: r.author,
                department: r.department,
                avatarUrl: r.avatar_url,
                createdAt: Number(r.created_at) || Date.now(),
                text: r.text,
                likesCount: r.likes_count || 0,
                isLiked: Array.isArray(r.liked_by_users) && r.liked_by_users.includes(currentUserId),
              })).sort((a: any, b: any) => a.createdAt - b.createdAt)
            : [],
        }));

        if (mapped.length > 0) {
          setComments(mapped);
          try { localStorage.setItem('capitalk_midterm_comments_zero', JSON.stringify(mapped)); } catch {}
        }
      }
    } catch (err) {
      console.warn('Could not fetch initial Midterm Szn data:', err);
    }
  }, [currentUserId]);

  // Real-Time Subscriptions (Supabase Realtime + BroadcastChannel + Periodic Polling)
  useEffect(() => {
    // 1. Initial fetch from DB
    fetchMidtermDataFromDB();

    // 2. Background polling every 2.5s to ensure live multi-device reflection
    const pollTimer = setInterval(() => {
      fetchMidtermDataFromDB();
    }, 2500);

    // 3. Local BroadcastChannel for instant cross-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('capitalk_midterm_channel');
        broadcastChannelRef.current = bc;
        bc.onmessage = (e) => {
          if (e.data?.type === 'midterm_sync_comments' && Array.isArray(e.data.payload)) {
            setComments(e.data.payload);
            try {
              localStorage.setItem('capitalk_midterm_comments_zero', JSON.stringify(e.data.payload));
            } catch {}
          } else if (e.data?.type === 'midterm_sync_reactions_map' && e.data.payload) {
            const incomingMap = e.data.payload;
            setUserReactionsMap(prev => {
              const merged = { ...prev, ...incomingMap };
              const tallies = calculateTalliesFromMap(merged);
              setReactionCounts(tallies);
              try {
                localStorage.setItem('capitalk_midterm_user_reactions_map', JSON.stringify(merged));
                localStorage.setItem('capitalk_midterm_reactions_zero', JSON.stringify(tallies));
              } catch {}
              if (merged[currentUserId]) {
                setUserReaction(merged[currentUserId]);
              }
              return merged;
            });
          }
        };
      } catch {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'capitalk_midterm_comments_zero' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setComments(parsed);
        } catch {}
      } else if (e.key === 'capitalk_midterm_reactions_zero' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setReactionCounts(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Supabase Realtime Channel
    if (isSupabaseConfigured && supabase) {
      try {
        const channel = supabase.channel('capitalk:midterm_szn', {
          config: {
            broadcast: { ack: true, self: false },
          },
        });
        supabaseChannelRef.current = channel;
        channel
          .on('broadcast', { event: 'midterm_sync_comments' }, ({ payload }: { payload: CommentItem[] }) => {
            if (Array.isArray(payload)) {
              setComments(payload);
              try {
                localStorage.setItem('capitalk_midterm_comments_zero', JSON.stringify(payload));
              } catch {}
            }
          })
          .on('broadcast', { event: 'midterm_sync_reactions_map' }, ({ payload }: any) => {
            if (payload && typeof payload === 'object') {
              setUserReactionsMap(prev => {
                const merged = { ...prev, ...payload };
                const tallies = calculateTalliesFromMap(merged);
                setReactionCounts(tallies);
                try {
                  localStorage.setItem('capitalk_midterm_user_reactions_map', JSON.stringify(merged));
                  localStorage.setItem('capitalk_midterm_reactions_zero', JSON.stringify(tallies));
                } catch {}
                if (merged[currentUserId]) {
                  setUserReaction(merged[currentUserId]);
                }
                return merged;
              });
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'midterm_reactions' }, () => {
            fetchMidtermDataFromDB();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'midterm_comments' }, () => {
            fetchMidtermDataFromDB();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'midterm_comment_replies' }, () => {
            fetchMidtermDataFromDB();
          })
          .subscribe();
      } catch {}
    }

    return () => {
      clearInterval(pollTimer);
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
      if (supabaseChannelRef.current && supabase) {
        try { supabase.removeChannel(supabaseChannelRef.current); } catch {}
        supabaseChannelRef.current = null;
      }
    };
  }, [fetchMidtermDataFromDB, currentUserId]);

  // Persist reactions
  useEffect(() => {
    try {
      localStorage.setItem('capitalk_midterm_reactions_zero', JSON.stringify(reactionCounts));
    } catch {}
  }, [reactionCounts]);

  const triggerFloat = (emoji: string) => {
    const id = floatIdRef.current++;
    const x = 20 + Math.random() * 60;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(f => f.id !== id));
    }, 1600);
  };

  // Select reaction (Live cross-device sync & Supabase DB write)
  const handleSelectReaction = async (key: string) => {
    const react = REACTIONS.find(r => r.key === key);
    setShowPicker(false);
    setHoveredReactionKey(null);

    const nextMap = { ...userReactionsMap };
    let nextReaction: string | null = null;

    if (userReaction === key) {
      // Toggle off
      delete nextMap[currentUserId];
      nextReaction = null;
      setUserReaction(null);
      try { localStorage.removeItem('capitalk_midterm_user_reaction_zero'); } catch {}
    } else {
      // Set new reaction
      nextMap[currentUserId] = key;
      nextReaction = key;
      setUserReaction(key);
      try { localStorage.setItem('capitalk_midterm_user_reaction_zero', key); } catch {}
      if (react) triggerFloat(react.emoji);
    }

    // 1. Sync & Broadcast Map Immediately
    syncAndSaveReactions(nextMap);

    // 2. Persist to Supabase Database
    if (isSupabaseConfigured && supabase) {
      try {
        if (!nextReaction) {
          await supabase
            .from('midterm_reactions')
            .delete()
            .eq('post_id', 'midterm_szn_post_1')
            .eq('user_id', currentUserId);
        } else {
          await supabase
            .from('midterm_reactions')
            .upsert({
              post_id: 'midterm_szn_post_1',
              user_id: currentUserId,
              user_name: currentUser?.username || 'CU Student',
              reaction_type: nextReaction,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'post_id,user_id' });
        }
      } catch (err) {
        console.warn('Could not persist reaction to Supabase:', err);
      }
    }
  };

  // Direct click on Like button
  const handleLikeButtonClick = () => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    if (userReaction) {
      handleSelectReaction(userReaction);
    } else {
      handleSelectReaction('like');
    }
  };

  // Desktop Hover Handlers
  const handleMouseEnterLike = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 280);
  };

  const handleMouseLeaveLike = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setShowPicker(false);
      setHoveredReactionKey(null);
    }, 350);
  };

  // Mobile / Touch Long-Press Handlers
  const handleTouchStartLike = () => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setShowPicker(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(30); } catch {}
      }
    }, 380);
  };

  const handleTouchEndLike = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isLongPressActiveRef.current) {
      e.preventDefault();
    }
  };

  const handleTouchCancelLike = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  // Touch Long-Press Handlers for Comments (Mobile)
  const handleCommentTouchStart = (c: CommentItem, replyId?: string) => {
    commentLongPressTriggered.current = false;
    if (commentLongPressTimer.current) clearTimeout(commentLongPressTimer.current);
    commentLongPressTimer.current = setTimeout(() => {
      commentLongPressTriggered.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(35); } catch {}
      }
      const isMine = isCommentMine(c.id, c.authorId, c.author, replyId);
      if (isMine) {
        const author = replyId ? (c.replies?.find(r => r.id === replyId)?.author || c.author) : c.author;
        setCommentToDelete({ commentId: c.id, replyId, author });
      }
    }, 420);
  };

  const handleCommentTouchEnd = () => {
    if (commentLongPressTimer.current) {
      clearTimeout(commentLongPressTimer.current);
    }
  };

  // Add Comment
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const authorAlias = currentUser?.username || 'CU Student';
    const authorAvatar = currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg');
    const commentId = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    const newComment: CommentItem = {
      id: commentId,
      authorId: currentUser?.id || 'anon_' + Date.now(),
      author: authorAlias,
      department: currentUser?.department || 'CAS',
      avatarUrl: authorAvatar,
      avatarColor: '#701a31',
      createdAt: Date.now(),
      text: commentInput.trim(),
      reactionCount: 0,
      isLiked: false,
      likesCount: 0,
      replies: [],
    };

    recordMyCommentId(commentId);
    const updated = [newComment, ...comments];
    syncAndSaveComments(updated);
    setCommentInput('');

    if (isSupabaseConfigured && supabase) {
      supabase.from('midterm_comments').insert({
        id: newComment.id,
        post_id: 'midterm_szn_post_1',
        author_id: newComment.authorId,
        author: newComment.author,
        department: newComment.department,
        avatar_url: newComment.avatarUrl,
        avatar_color: newComment.avatarColor,
        text: newComment.text,
        likes_count: 0,
        liked_by_users: [],
        created_at: newComment.createdAt,
      }).then(() => {}, () => {});
    }
  };

  // Toggle like on comment
  const handleToggleCommentLike = (commentId: string) => {
    let nextLikesCount = 0;
    let nextLikedBy: string[] = [];

    const updated = comments.map(c => {
      if (c.id === commentId) {
        const isLiked = !c.isLiked;
        nextLikesCount = isLiked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 1) - 1);
        nextLikedBy = isLiked ? [currentUserId] : [];
        return { ...c, isLiked, likesCount: nextLikesCount };
      }
      return c;
    });
    syncAndSaveComments(updated);

    if (isSupabaseConfigured && supabase) {
      supabase.from('midterm_comments').update({
        likes_count: nextLikesCount,
        liked_by_users: nextLikedBy,
      }).eq('id', commentId).then(() => {}, () => {});
    }
  };

  // Toggle like on reply
  const handleToggleReplyLike = (commentId: string, replyId: string) => {
    let nextLikesCount = 0;
    let nextLikedBy: string[] = [];

    const updated = comments.map(c => {
      if (c.id === commentId && c.replies) {
        const updatedReplies = c.replies.map(r => {
          if (r.id === replyId) {
            const isLiked = !r.isLiked;
            nextLikesCount = isLiked ? (r.likesCount || 0) + 1 : Math.max(0, (r.likesCount || 1) - 1);
            nextLikedBy = isLiked ? [currentUserId] : [];
            return { ...r, isLiked, likesCount: nextLikesCount };
          }
          return r;
        });
        return { ...c, replies: updatedReplies };
      }
      return c;
    });
    syncAndSaveComments(updated);

    if (isSupabaseConfigured && supabase) {
      supabase.from('midterm_comment_replies').update({
        likes_count: nextLikesCount,
        liked_by_users: nextLikedBy,
      }).eq('id', replyId).then(() => {}, () => {});
    }
  };

  // Start reply to a comment
  const handleStartReply = (commentId: string) => {
    setActiveReplyCommentId(commentId);
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 60);
  };

  // Submit reply
  const handleSubmitReply = (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyInput.trim()) return;

    const authorAlias = currentUser?.username || 'CU Student';
    const authorAvatar = currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg');
    const replyId = 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    const newReply: CommentReply = {
      id: replyId,
      authorId: currentUser?.id || 'anon_' + Date.now(),
      author: authorAlias,
      department: currentUser?.department || 'CAS',
      avatarUrl: authorAvatar,
      createdAt: Date.now(),
      text: replyInput.trim(),
      isLiked: false,
      likesCount: 0,
    };

    recordMyCommentId(replyId);
    const updated = comments.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply],
        };
      }
      return c;
    });

    syncAndSaveComments(updated);
    setReplyInput('');
    setActiveReplyCommentId(null);

    if (isSupabaseConfigured && supabase) {
      supabase.from('midterm_comment_replies').insert({
        id: newReply.id,
        comment_id: commentId,
        author_id: newReply.authorId,
        author: newReply.author,
        department: newReply.department,
        avatar_url: newReply.avatarUrl,
        text: newReply.text,
        likes_count: 0,
        liked_by_users: [],
        created_at: newReply.createdAt,
      }).then(() => {}, () => {});
    }
  };

  // Delete Comment / Reply Confirmed
  const handleDeleteCommentConfirmed = () => {
    if (!commentToDelete) return;
    const { commentId, replyId } = commentToDelete;

    let updated: CommentItem[];
    if (replyId) {
      updated = comments.map(c => {
        if (c.id === commentId && c.replies) {
          return {
            ...c,
            replies: c.replies.filter(r => r.id !== replyId),
          };
        }
        return c;
      });
      if (isSupabaseConfigured && supabase) {
        supabase.from('midterm_comment_replies').delete().eq('id', replyId).then(() => {}, () => {});
      }
    } else {
      updated = comments.filter(c => c.id !== commentId);
      if (isSupabaseConfigured && supabase) {
        supabase.from('midterm_comments').delete().eq('id', commentId).then(() => {}, () => {});
      }
    }

    syncAndSaveComments(updated);
    setCommentToDelete(null);
  };

  const totalReactionCount = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const totalCommentsCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
  const activeReactionDef = userReaction ? REACTIONS.find(r => r.key === userReaction) : null;

  // Top active reactions for summary bar
  const topReactions = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k]) => REACTIONS.find(r => r.key === k)!)
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#050505] flex flex-col font-sans pb-16 sm:pb-6">
      {/* ── Main Feed Column ───────────────────────────────────────────────── */}
      <main className="flex-1 py-3 sm:py-5 px-0 sm:px-3 max-w-[620px] mx-auto w-full pb-20 sm:pb-8">

        {/* ── Facebook Post Card ───────────────────────────────────────────── */}
        <article className="bg-white sm:rounded-xl shadow-xs border-y sm:border border-[#e4e6eb] overflow-visible relative">

          {/* Post Header */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Profile avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#701a31] to-[#4d0d1f] flex items-center justify-center text-white font-extrabold text-sm shadow-xs border border-white">
                  CT
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-[9px] text-white">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[14.5px] text-[#050505] hover:underline cursor-pointer">
                    CapiTalk
                  </span>
                  <span className="text-xs text-[#65676b] font-normal">· Official</span>
                </div>
                <div className="flex items-center gap-1 text-[12px] text-[#65676b]">
                  <span className="font-medium text-[#65676b]">{formatRelativeTime(postCreatedAt, now)}</span>
                  <span>·</span>
                  <Globe className="w-3 h-3 text-[#65676b]" />
                  <span>Public</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#65676b]">
              <button
                onClick={() => setShowBreakdownModal(true)}
                className="p-1.5 hover:bg-[#f2f2f2] rounded-full transition-colors text-xs font-semibold flex items-center gap-1 text-[#701a31]"
              >
                <Flame className="w-3.5 h-3.5 text-[#c41e3a]" />
                <span className="hidden xs:inline">Vibe Check</span>
              </button>
            </div>
          </div>

          {/* Post Text / Caption */}
          <div className="px-3.5 pb-2.5 text-[14.5px] text-[#050505] leading-relaxed">
            <p className="font-normal">
              Midterm napod! dawbe ready naka? HAHAHAHAHA
            </p>
            <div className="w-full flex justify-start items-center py-1 overflow-hidden">
              <DotLottieReact
                src="/animated-assets/pubmat_element_cat.lottie"
                loop
                autoplay
                className="w-14 h-14 sm:w-22 sm:h-22 object-contain"
              />
            </div>
          </div>

          {/* Pub Material Image (Clean, Edge-to-Edge) */}
          <div className="relative w-full bg-[#1b3d1b] overflow-hidden select-none">
            <img
              src="/images/capitalk_banner.webp"
              alt="Midterm na! Ready naka? What do you feel?"
              className="w-full h-auto object-contain max-h-[640px] mx-auto block"
              draggable={false}
            />

            {/* Floating emojis on react */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {floatingEmojis.map(fe => (
                <span
                  key={fe.id}
                  className="absolute text-4xl animate-bounce"
                  style={{
                    left: `${fe.x}%`,
                    bottom: '10%',
                    animation: 'floatUpFb 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                  }}
                >
                  {fe.emoji}
                </span>
              ))}
            </div>
          </div>

          {/* Post Metrics Bar (Reactions count on left, comments count on right) */}
          <div className="px-3.5 py-2.5 flex items-center justify-between text-[13px] text-[#65676b] border-b border-[#e4e6eb]">
            {/* Left: Stacked Reaction Icons */}
            <button
              onClick={() => setShowBreakdownModal(true)}
              className="flex items-center gap-1.5 hover:underline cursor-pointer text-left"
            >
              {topReactions.length > 0 ? (
                <div className="flex -space-x-1.5 items-center">
                  {topReactions.slice(0, 3).map((r, index) => (
                    <div key={r.key} style={{ zIndex: 30 - index }}>
                      {renderReactionBadge(r.key)}
                    </div>
                  ))}
                </div>
              ) : (
                renderReactionBadge('like')
              )}
              <span className="font-medium text-[#65676b] text-[13px]">
                {totalReactionCount > 0 ? totalReactionCount.toLocaleString() : 'Be the first to react'}
              </span>
            </button>

            {/* Right: Comments Count */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => commentInputRef.current?.focus()}
                className="hover:underline cursor-pointer font-medium"
              >
                {totalCommentsCount} {totalCommentsCount === 1 ? 'comment' : 'comments'}
              </button>
            </div>
          </div>

          {/* ── Facebook Action Buttons Bar (Like / Comment) ────────────────── */}
          <div className="px-2 py-1 flex items-center justify-between border-b border-[#e4e6eb] relative">

            {/* ── Floating Reactions Dock (Facebook Style) ─────────────────── */}
            {showPicker && (
              <div
                onMouseEnter={() => {
                  if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                  setShowPicker(true);
                }}
                onMouseLeave={handleMouseLeaveLike}
                className="absolute -top-13 left-2 z-50 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 bg-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-[#e4e6eb] animate-in fade-in zoom-in-95 duration-150"
              >
                {REACTIONS.map(reaction => {
                  const isHovered = hoveredReactionKey === reaction.key;
                  return (
                    <div key={reaction.key} className="relative flex flex-col items-center">
                      {/* Tooltip on individual reaction hover */}
                      {isHovered && (
                        <div className="absolute -top-9 whitespace-nowrap px-2.5 py-1 bg-[#1c1e21] text-white text-[11px] font-semibold rounded-full pointer-events-none shadow-md z-50 animate-in fade-in duration-100 flex items-center gap-1">
                          <span>{reaction.label}</span>
                          <span className="text-[#a0aec0]">·</span>
                          <span className="text-[#f7b125] font-normal">{reaction.cebuanoMeaning}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectReaction(reaction.key);
                        }}
                        onMouseEnter={() => setHoveredReactionKey(reaction.key)}
                        onMouseLeave={() => setHoveredReactionKey(null)}
                        className="p-1 focus:outline-none transition-transform duration-150 hover:scale-135 active:scale-110 -translate-y-0.5 hover:-translate-y-1.5"
                        title={`${reaction.label} (${reaction.cebuanoMeaning})`}
                      >
                        <span className="text-2xl sm:text-[28px] leading-none select-none drop-shadow-xs">
                          {reaction.emoji}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Like Button ──────────────────────────────────────────────── */}
            <div
              className="flex-1 relative"
              onMouseEnter={handleMouseEnterLike}
              onMouseLeave={handleMouseLeaveLike}
            >
              <button
                type="button"
                onClick={handleLikeButtonClick}
                onTouchStart={handleTouchStartLike}
                onTouchEnd={handleTouchEndLike}
                onTouchCancel={handleTouchCancelLike}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-md hover:bg-[#f2f2f2] active:bg-[#e4e6eb] transition-colors select-none font-semibold text-[13.5px] cursor-pointer"
                style={{
                  color: activeReactionDef ? activeReactionDef.textColor : '#65676b',
                }}
              >
                {activeReactionDef ? (
                  activeReactionDef.key === 'like' ? (
                    <ThumbsUp className="w-4.5 h-4.5 text-[#1877f2] fill-[#1877f2]" />
                  ) : (
                    <span className="text-lg leading-none animate-in zoom-in-75 duration-150">
                      {activeReactionDef.emoji}
                    </span>
                  )
                ) : (
                  <ThumbsUp className="w-4.5 h-4.5 text-[#65676b]" />
                )}
                <span>
                  {activeReactionDef ? activeReactionDef.label : 'Like'}
                </span>
              </button>
            </div>

            {/* ── Comment Button ───────────────────────────────────────────── */}
            <button
              type="button"
              onClick={() => commentInputRef.current?.focus()}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-md hover:bg-[#f2f2f2] active:bg-[#e4e6eb] transition-colors text-[#65676b] font-semibold text-[13.5px] cursor-pointer"
            >
              <FbCommentSvg className="w-4.5 h-4.5 text-[#65676b]" />
              <span>Comment</span>
            </button>
          </div>

          {/* ── Facebook Comments Section ──────────────────────────────────── */}
          <div className="p-3.5 space-y-3 bg-[#fafbfc]">

            {/* New Comment Input */}
            <form onSubmit={handlePostComment} className="flex items-center gap-2.5">
              <img
                src={currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg')}
                alt={currentUser?.username || 'You'}
                className="w-8 h-8 rounded-full object-cover border border-black/15 shrink-0 bg-amber-50 shadow-2xs"
              />
              <div className="flex-1 relative flex items-center">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a comment about midterms..."
                  className="w-full bg-[#f0f2f5] hover:bg-[#ebedf0] focus:bg-white text-[13.5px] text-[#050505] placeholder-[#65676b] px-3.5 py-2 pr-9 rounded-full border border-transparent focus:border-[#1877f2] focus:outline-none transition-all"
                />
                {commentInput.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2.5 p-1 text-[#1877f2] hover:text-[#166fe5] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Comments List */}
            {comments.length > 0 ? (
              <div className="space-y-3 pt-1">
                {comments.map((c) => {
                  const isMine = isCommentMine(c.id, c.authorId, c.author);

                  return (
                    <div key={c.id} className="space-y-2">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={c.avatarUrl || (c.author ? getAvatarForPseudonym(c.author) : '/avatars/coin-left.jpg')}
                          alt={c.author}
                          className="w-8 h-8 rounded-full object-cover border border-black/15 shrink-0 mt-0.5 bg-amber-50 shadow-2xs"
                        />

                        <div className="flex-1 min-w-0">
                          {/* Comment Bubble (Long-press on mobile / hover on desktop) */}
                          <div
                            onTouchStart={() => handleCommentTouchStart(c)}
                            onTouchEnd={handleCommentTouchEnd}
                            onTouchCancel={handleCommentTouchEnd}
                            className="group relative inline-block bg-[#f0f2f5] hover:bg-[#ebedf0] transition-colors rounded-2xl px-3.5 py-2 text-[13.5px] max-w-full select-text active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-bold text-[#050505] text-[13px]">
                                {c.author}
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-[#e4e6eb] text-[#65676b] rounded-md">
                                {c.department}
                              </span>
                            </div>
                            <p className="text-[#050505] leading-snug break-words">
                              {c.text}
                            </p>

                            {/* Desktop Hover Quick Delete Button */}
                            {isMine && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentToDelete({ commentId: c.id, author: c.author });
                                }}
                                className="hidden sm:flex opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-[#e4e6eb] items-center justify-center shadow-xs transition-all cursor-pointer z-10"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}

                            {/* Likes Count Pill on Comment */}
                            {(c.likesCount || 0) > 0 && (
                              <div className="absolute -bottom-2 right-2 bg-white px-1.5 py-0.5 rounded-full shadow-xs border border-[#e4e6eb] flex items-center gap-1 text-[11px] font-semibold text-[#65676b] select-none">
                                <div className="w-3.5 h-3.5 rounded-full bg-[#1877f2] flex items-center justify-center">
                                  <ThumbsUp className="w-2 h-2 text-white fill-white" />
                                </div>
                                <span>{c.likesCount}</span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Like, Reply, Delete, Timestamp */}
                          <div className="flex items-center gap-3 px-3 mt-1 text-[11.5px] text-[#65676b] font-semibold">
                            <button
                              type="button"
                              onClick={() => handleToggleCommentLike(c.id)}
                              className={`cursor-pointer transition-colors ${
                                c.isLiked ? 'text-[#1877f2] font-bold hover:underline' : 'hover:underline'
                              }`}
                            >
                              Like
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartReply(c.id)}
                              className="hover:underline cursor-pointer"
                            >
                              Reply
                            </button>
                            {isMine && (
                              <button
                                type="button"
                                onClick={() => setCommentToDelete({ commentId: c.id, author: c.author })}
                                className="text-gray-400 hover:text-rose-600 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                            <span className="font-normal">{formatRelativeTime(c.createdAt, now)}</span>
                          </div>

                          {/* Inline Reply Input Form */}
                          {activeReplyCommentId === c.id && (
                            <form
                              onSubmit={(e) => handleSubmitReply(e, c.id)}
                              className="flex items-center gap-2 mt-2 ml-1"
                            >
                              <img
                                src={currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg')}
                                alt={currentUser?.username || 'You'}
                                className="w-6 h-6 rounded-full object-cover border border-black/15 shrink-0 bg-amber-50"
                              />
                              <div className="flex-1 relative flex items-center">
                                <input
                                  ref={replyInputRef}
                                  type="text"
                                  value={replyInput}
                                  onChange={(e) => setReplyInput(e.target.value)}
                                  placeholder={`Reply to ${c.author}...`}
                                  className="w-full bg-[#f0f2f5] hover:bg-[#ebedf0] focus:bg-white text-[12.5px] text-[#050505] placeholder-[#65676b] px-3 py-1.5 pr-8 rounded-full border border-transparent focus:border-[#1877f2] focus:outline-none transition-all"
                                  autoFocus
                                />
                                {replyInput.trim() && (
                                  <button
                                    type="submit"
                                    className="absolute right-2 p-1 text-[#1877f2] hover:text-[#166fe5] transition-colors cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReplyCommentId(null);
                                  setReplyInput('');
                                }}
                                className="text-[11px] text-[#65676b] hover:text-black px-1.5 py-1 rounded hover:bg-[#e4e6eb] transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </form>
                          )}

                          {/* Nested Replies List */}
                          {c.replies && c.replies.length > 0 && (
                            <div className="pl-3 sm:pl-4 space-y-2 mt-2 border-l-2 border-[#e4e6eb] ml-2">
                              {c.replies.map((reply) => {
                                const isReplyMine = isCommentMine(c.id, reply.authorId, reply.author, reply.id);

                                return (
                                  <div key={reply.id} className="flex items-start gap-2">
                                    <img
                                      src={reply.avatarUrl || (reply.author ? getAvatarForPseudonym(reply.author) : '/avatars/coin-left.jpg')}
                                      alt={reply.author}
                                      className="w-6 h-6 rounded-full object-cover border border-black/15 shrink-0 mt-0.5 bg-amber-50"
                                    />
                                    <div className="flex-1 min-w-0">
                                      {/* Reply Bubble */}
                                      <div
                                        onTouchStart={() => handleCommentTouchStart(c, reply.id)}
                                        onTouchEnd={handleCommentTouchEnd}
                                        onTouchCancel={handleCommentTouchEnd}
                                        className="group relative inline-block bg-[#f0f2f5] hover:bg-[#ebedf0] transition-colors rounded-2xl px-3 py-1.5 text-[12.5px] max-w-full select-text active:scale-[0.99]"
                                      >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className="font-bold text-[#050505] text-[12px]">
                                            {reply.author}
                                          </span>
                                          <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-[#e4e6eb] text-[#65676b] rounded-md">
                                            {reply.department}
                                          </span>
                                        </div>
                                        <p className="text-[#050505] leading-snug break-words">
                                          {reply.text}
                                        </p>

                                        {/* Desktop Hover Quick Delete Button */}
                                        {isReplyMine && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCommentToDelete({ commentId: c.id, replyId: reply.id, author: reply.author });
                                            }}
                                            className="hidden sm:flex opacity-0 group-hover:opacity-100 absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-600 border border-[#e4e6eb] items-center justify-center shadow-xs transition-all cursor-pointer z-10"
                                            title="Delete reply"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        )}

                                        {/* Likes Count Pill on Reply */}
                                        {(reply.likesCount || 0) > 0 && (
                                          <div className="absolute -bottom-2 right-1.5 bg-white px-1.5 py-0.5 rounded-full shadow-xs border border-[#e4e6eb] flex items-center gap-0.5 text-[10px] font-semibold text-[#65676b] select-none">
                                            <div className="w-3 h-3 rounded-full bg-[#1877f2] flex items-center justify-center">
                                              <ThumbsUp className="w-1.5 h-1.5 text-white fill-white" />
                                            </div>
                                            <span>{reply.likesCount}</span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2.5 px-2 mt-0.5 text-[11px] text-[#65676b] font-semibold">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleReplyLike(c.id, reply.id)}
                                          className={`cursor-pointer transition-colors ${
                                            reply.isLiked ? 'text-[#1877f2] font-bold hover:underline' : 'hover:underline'
                                          }`}
                                        >
                                          Like
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleStartReply(c.id)}
                                          className="hover:underline cursor-pointer"
                                        >
                                          Reply
                                        </button>
                                        {isReplyMine && (
                                          <button
                                            type="button"
                                            onClick={() => setCommentToDelete({ commentId: c.id, replyId: reply.id, author: reply.author })}
                                            className="text-gray-400 hover:text-rose-600 hover:underline cursor-pointer"
                                          >
                                            Delete
                                          </button>
                                        )}
                                        <span className="font-normal">{formatRelativeTime(reply.createdAt, now)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-[#65676b]">
                <MessageSquare className="w-5 h-5 mx-auto mb-1 text-gray-400 opacity-60" />
                <span>No comments yet. Be the first to share your midterm thoughts!</span>
              </div>
            )}

          </div>
        </article>

        {/* ── Quick Chat Launcher Card (Facebook Page Style) ───────────────── */}
        <div className="mt-3 bg-white sm:rounded-xl p-3.5 border-y sm:border border-[#e4e6eb] shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#701a31] text-white flex items-center justify-center text-sm font-bold shrink-0">
              💬
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#050505] truncate">
                Need study buddies or want to vent out?
              </p>
              <p className="text-[11.5px] text-[#65676b] truncate">
                Connect anonymously with students from other CU departments
              </p>
            </div>
          </div>

          <button
            onClick={() => setViewState(currentUser ? 'queue' : 'register')}
            className="px-3.5 py-1.5 bg-[#701a31] hover:bg-[#4d0d1f] text-white text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            Start Chat
          </button>
        </div>

      </main>

      {/* ── Facebook Reaction Breakdown Modal ──────────────────────────────── */}
      {showBreakdownModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowBreakdownModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-[#e4e6eb] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#e4e6eb] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#050505]">Campus Sentiment Breakdown</h3>
                <p className="text-[11px] text-[#65676b]">{totalReactionCount} total student responses</p>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="p-1 text-[#65676b] hover:bg-[#f2f2f2] rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
              {REACTIONS.map((r) => {
                const count = reactionCounts[r.key] || 0;
                const pct = totalReactionCount > 0 ? Math.round((count / totalReactionCount) * 100) : 0;
                const isSelected = userReaction === r.key;
                return (
                  <div
                    key={r.key}
                    onClick={() => {
                      handleSelectReaction(r.key);
                      setShowBreakdownModal(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#ebedf0]' : 'hover:bg-[#f2f2f2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{r.emoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[#050505]">{r.label}</span>
                          {isSelected && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#1877f2] text-white rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#65676b] truncate">{r.cebuanoMeaning}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-[#050505]">{count}</span>
                      <span className="text-[11px] text-[#65676b] ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#f0f2f5] border-t border-[#e4e6eb] text-center">
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="text-xs font-semibold text-[#1877f2] hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Comment Confirmation Modal ───────────────────────────────── */}
      {commentToDelete && (
        <div
          className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setCommentToDelete(null)}
        >
          <div
            className="bg-white border-2 border-black rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl animate-in zoom-in-95 duration-150 text-left text-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border-2 border-black text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-black">
                Delete {commentToDelete.replyId ? 'reply' : 'comment'}?
              </h3>
              <p className="text-xs text-gray-600 font-medium">
                Are you sure you want to delete this {commentToDelete.replyId ? 'reply' : 'comment'}? This will remove it for everyone in real time.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-black font-black text-xs rounded-xl border border-black/30 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCommentConfirmed}
                className="flex-1 py-2 bg-[#dc341e] hover:bg-red-700 text-white font-black text-xs rounded-xl border border-black shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile View Footer Bar (Redirect to Campus Wall) ────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-md border-t border-[#e4e6eb] px-4 py-2.5 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#701a31] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs border border-white">
            CW
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-black truncate">Campus Wall</p>
            <p className="text-[10px] text-gray-500 font-medium truncate">Read student confessions</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setViewState('freedom_wall')}
          className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-black text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#ffc900]" />
          <span>Go to Wall</span>
        </button>
      </div>

      {/* ── Keyframes for floating Facebook reaction animations ─────────────── */}
      <style>{`
        @keyframes floatUpFb {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 1;
          }
          60% {
            transform: translateY(-90px) scale(1.2);
            opacity: 0.9;
          }
          100% {
            transform: translateY(-170px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
