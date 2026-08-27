import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { CU_DEPARTMENTS, getAvatarForPseudonym } from '../lib/constants';
import { analyzeContentModeration } from '../lib/utils/profanityFilter';
import { FreedomComment, FreedomPost, FreedomPollOption } from '../lib/types';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import {
  getAdminToken,
  verifyAdminSession,
  purgeLegacyAdminKeys,
} from '../lib/auth/adminAuth';
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
  Pin,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart2,
  RefreshCw,
  CornerUpLeft,
  Dices,
  Sparkles,
  Reply,
  Shuffle,
  SlidersHorizontal,
  Check,
  Globe,
  MoreHorizontal,
  ThumbsUp,
  Image as ImageIcon,
  Film,
  UploadCloud,
  Eye,
  Link as LinkIcon,
} from 'lucide-react';
import { ReportNoteModal } from './ReportNoteModal';
import { DeleteNoteModal } from './DeleteNoteModal';
import { getOrCreatePersistentUUID } from '../lib/utils/uuid';
import { processUploadedImage } from '../lib/utils/imagePipeline';

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

const FbLiveVideoIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM10 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
  </svg>
);

const FbPhotoIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 14H6l3.5-4.5 2.5 3.01L15.5 11l3.5 4.5zM8.5 9.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
);

const FbGifIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 12.5H9.5v-5H11v5zm-3.5-2H6.5v-1H8v-1H6.5v-1H8V8H5.5v8H8v-2.5zm9 2H15V9.5h3.5V11H16.5v1h1.5v1.5h-1.5v1h2v1z" />
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

// ─── Color Luminance & Contrast Helper ─────────────────────────────────────────

const isColorDark = (hexColor?: string): boolean => {
  if (!hexColor) return false;
  const c = hexColor.trim().toLowerCase();
  if (c === '#701a31' || c === '#c41e3a' || c === '#4d0d1f' || c === '#000000' || c === '#18181b' || c === '#1f2937') return true;
  if (c === '#ffffff' || c === '#ffc900' || c === '#ff90e8' || c === '#00e599' || c === '#7dd3fc') return false;
  const hex = c.replace('#', '');
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.55;
  }
  return false;
};

// ─── Stacked Reaction Badges ──────────────────────────────────────────────────

const renderStackedReactionBadges = (hasLiked: boolean, likesCount: number) => {
  if (likesCount <= 0) {
    return (
      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-white shadow-2xs">
        <Heart className="w-2.5 h-2.5 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex -space-x-1.5 items-center shrink-0">
      <div className="w-5 h-5 rounded-full bg-[#f33e5b] flex items-center justify-center border-2 border-white shadow-2xs z-20">
        <Heart className="w-2.5 h-2.5 text-white fill-white" />
      </div>
    </div>
  );
};

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
  {
    id: 'all',
    name: 'Trending',
  },
  {
    id: 'hype',
    name: 'Hype & Energy',
    gifs: [
      { title: 'Let’s Go Hype', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
      { title: 'Victory Dance', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
      { title: 'Campus Excitement', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
      { title: 'High Five Energy', url: 'https://media.giphy.com/media/l0amJzVHIAfl7jMDos/giphy.gif' },
    ],
  },
  {
    id: 'study',
    name: 'Study & Exams',
    gifs: [
      { title: 'Cramming All Night', url: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif' },
      { title: 'Coffee Fuel Needed', url: 'https://media.giphy.com/media/hPTZgtzfRIB5Nfb5rL/giphy.gif' },
      { title: 'Typing Super Fast', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
      { title: 'Brain Overheat', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
    ],
  },
  {
    id: 'relatable',
    name: 'Mood & Memes',
    gifs: [
      { title: 'Wait What', url: 'https://media.giphy.com/media/3o7TKTDnUxE0g2BTSE/giphy.gif' },
      { title: 'Facepalm Reaction', url: 'https://media.giphy.com/media/14aUO0Mf651jeU/giphy.gif' },
      { title: 'Sipping Tea', url: 'https://media.giphy.com/media/3o85xGocUH8RY0WoKs/giphy.gif' },
      { title: 'Everything is Fine', url: 'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif' },
    ],
  },
  {
    id: 'love',
    name: 'Campus Crush',
    gifs: [
      { title: 'Heart Eyes', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
      { title: 'Blushing Smile', url: 'https://media.giphy.com/media/OpfkuToK5gSHK/giphy.gif' },
      { title: 'Shining Love', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif' },
      { title: 'Smooth Finger Guns', url: 'https://media.giphy.com/media/6t4gwsSh4BQfm/giphy.gif' },
    ],
  },
];

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
    approveFreedomPost,
    likeFreedomPost,
    voteFreedomPoll,
    togglePinFreedomPost,
    myPostIds,
    myPseudonyms,
    addWallNotification,
    setViewState,
    goBack,
    startSearch,
    targetPostId,
    setTargetPostId,
  } = useChatStore();

  // Admin Privilege Detection (Reactive & Cryptographically Verified)
  const [isAdminUser, setIsAdminUser] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(getAdminToken());
  });

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

  const [postAsAdmin, setPostAsAdmin] = useState(false);
  const [commentAsAdmin, setCommentAsAdmin] = useState(false);

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
  const [viewingProfile, setViewingProfile] = useState<{
    username: string;
    department: string;
    avatar_url?: string;
    bio?: string;
    is_admin?: boolean;
    author_id?: string;
  } | null>(null);

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

  // Pagination & Active Pinning State
  const NOTES_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Anti-Bot & Rate Limit Protection State
  const COOLDOWN_SECONDS = 60;
  const DAILY_MAX_POSTS = 10;
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [dailyPostCount, setDailyPostCount] = useState<number>(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [honeypot, setHoneypot] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [openActionMenuPostId, setOpenActionMenuPostId] = useState<string | null>(null);

  // Real-time ticking clock for relative timestamps (e.g. 2m ago, 3h ago)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Generate or retrieve persistent device ID
    if (typeof window !== 'undefined') {
      const persistentId = getOrCreatePersistentUUID();
      setDeviceId(persistentId);
    }
  }, []);


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
  }, [isAdminUser]);

  const [activeTab, setActiveTab] = useState<'trending' | 'latest' | 'my_notes' | 'pending'>('latest');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Comments Feature State
  const [selectedPostForComments, setSelectedPostForComments] = useState<FreedomPost | null>(null);
  const [commentsList, setCommentsList] = useState<FreedomComment[]>([]);
  const [commentsCountMap, setCommentsCountMap] = useState<Record<string, number>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAlias, setCommentAlias] = useState(currentUser ? currentUser.username : 'Anonymous Student');
  const [isFetchingComments, setIsFetchingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; alias: string } | null>(null);
  const [expandedReplyCommentIds, setExpandedReplyCommentIds] = useState<Record<string, boolean>>({});
  const [selectedCommentForReactors, setSelectedCommentForReactors] = useState<FreedomComment | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync registered user's username if updated
  React.useEffect(() => {
    if (currentUser?.username) {
      setCommentAlias(currentUser.username);
    }
  }, [currentUser?.username]);

  const toggleExpandReplies = (commentId: string) => {
    setExpandedReplyCommentIds((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleStartReply = (comment: FreedomComment) => {
    setReplyingTo({ id: comment.id, alias: comment.author_alias });
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const toggleLikeComment = async (comment: FreedomComment) => {
    const currentUid = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');
    const currentUsername = currentUser?.username || 'You';
    const currentDept = currentUser?.department || 'CU Student';
    const currentAvatar = currentUser?.avatar_url || getAvatarForPseudonym(currentUsername);

    const likedUsers = comment.liked_by_users || [];
    const hasLiked = likedUsers.includes(currentUid);
    const updatedUsers = hasLiked
      ? likedUsers.filter((id) => id !== currentUid)
      : [...likedUsers, currentUid];
    const updatedCount = Math.max(0, (comment.likes_count || 0) + (hasLiked ? -1 : 1));

    const currentProfiles = comment.liked_by_profiles || {};
    const updatedProfiles = { ...currentProfiles };
    if (hasLiked) {
      delete updatedProfiles[currentUid];
    } else {
      updatedProfiles[currentUid] = {
        username: currentUsername,
        department: currentDept,
        avatar_url: currentAvatar,
        reacted_at: Date.now(),
      };
    }

    const updatedComment: FreedomComment = {
      ...comment,
      likes_count: updatedCount,
      liked_by_users: updatedUsers,
      liked_by_profiles: updatedProfiles,
    };

    setCommentsList((prevList) => {
      const nextList = prevList.map((c) => (c.id === comment.id ? updatedComment : c));
      if (selectedPostForComments && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`capitalk_comments_${selectedPostForComments.id}`, JSON.stringify(nextList));
        } catch (e) {}
      }
      return nextList;
    });

    // Update open reactors modal if active
    setSelectedCommentForReactors((prev) => (prev && prev.id === comment.id ? updatedComment : prev));

    // Broadcast locally for instant multi-tab reflection
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('capitalk_global_realtime');
        bc.postMessage({
          type: 'FREEDOM_COMMENT_LIKE',
          commentId: comment.id,
          postId: comment.post_id,
          likesCount: updatedCount,
          likedByUsers: updatedUsers,
          likedByProfiles: updatedProfiles,
        });
      } catch (e) {}
    }

    // Persist to Supabase Database & Broadcast across devices
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase
          .from('freedom_comments')
          .update({ likes_count: updatedCount, liked_by_users: updatedUsers })
          .eq('id', comment.id);

        const wallChan = supabase.channel('capitalk_global_wall_events');
        wallChan.send({
          type: 'broadcast',
          event: 'FREEDOM_COMMENT_LIKE',
          payload: {
            commentId: comment.id,
            postId: comment.post_id,
            likesCount: updatedCount,
            likedByUsers: updatedUsers,
            likedByProfiles: updatedProfiles,
          },
        }).then(() => {}, () => {});
      } catch (e) {
        console.warn('Could not persist comment like to Supabase:', e);
      }
    }
  };

  React.useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};

      if (supabase && isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('freedom_comments').select('post_id');
          if (data) {
            data.forEach((row: any) => {
              counts[row.post_id] = (counts[row.post_id] || 0) + 1;
            });
          }
        } catch (e) {}
      }

      // Merge local storage comment counts
      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('capitalk_comments_')) {
              const postId = key.replace('capitalk_comments_', '');
              const raw = localStorage.getItem(key);
              if (raw) {
                const list: any[] = JSON.parse(raw);
                counts[postId] = Math.max(counts[postId] || 0, list.length);
              }
            }
          }
        } catch (e) {}
      }

      setCommentsCountMap(counts);
    };
    fetchCounts();
  }, [freedomPosts.length]);

  const openCommentsModal = async (post: FreedomPost) => {
    setSelectedPostForComments(post);
    setIsFetchingComments(true);
    setCommentsList([]);
    setReplyingTo(null);
    setExpandedReplyCommentIds({});

    let localComments: FreedomComment[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`capitalk_comments_${post.id}`);
        if (raw) localComments = JSON.parse(raw);
      } catch (e) {}
    }

    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('freedom_comments')
          .select('*')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });

        if (data && !error) {
          const dbIds = new Set(data.map((c: any) => c.id));
          const localOnly = localComments.filter((c) => !dbIds.has(c.id));
          const merged = [...(data as FreedomComment[]), ...localOnly].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          setCommentsList(merged);
          setIsFetchingComments(false);
          return;
        }
      } catch (e) {}
    }

    setCommentsList(localComments);
    setIsFetchingComments(false);
  };

  // Real-time synchronization for comments & comment likes across devices
  React.useEffect(() => {
    if (!selectedPostForComments) return;
    const postId = selectedPostForComments.id;

    const refreshComments = async () => {
      if (supabase && isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('freedom_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

          if (data && !error) {
            setCommentsList((prev) => {
              const dbMap = new Map(data.map((c: any) => [c.id, c]));
              const updated = prev.map((localC) => (dbMap.has(localC.id) ? (dbMap.get(localC.id) as FreedomComment) : localC));
              data.forEach((dbC: any) => {
                if (!prev.some((p) => p.id === dbC.id)) {
                  updated.push(dbC as FreedomComment);
                }
              });
              return updated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          }
        } catch (e) {}
      }
    };

    // Polling interval every 2.5s for live multi-device reflection
    const pollTimer = setInterval(refreshComments, 2500);

    // Supabase Realtime channel
    let channel: any = null;
    if (supabase && isSupabaseConfigured) {
      try {
        channel = supabase
          .channel(`freedom_comments_${postId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'freedom_comments', filter: `post_id=eq.${postId}` },
            () => {
              refreshComments();
            }
          )
          .subscribe();
      } catch (e) {}
    }

    // BroadcastChannel listener for instant cross-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('capitalk_global_realtime');
        bc.onmessage = (e) => {
          if (e.data?.type === 'FREEDOM_COMMENT_LIKE' && e.data.postId === postId) {
            setCommentsList((prev) =>
              prev.map((c) =>
                c.id === e.data.commentId
                  ? { ...c, likes_count: e.data.likesCount, liked_by_users: e.data.likedByUsers }
                  : c
              )
            );
          }
        };
      } catch (e) {}
    }

    return () => {
      clearInterval(pollTimer);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
    };
  }, [selectedPostForComments]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPostForComments) return;

    const isCommentAdmin = Boolean(isAdminUser && commentAsAdmin);

    const authorAliasVal = isCommentAdmin
      ? 'Admin'
      : (commentAlias.trim() || (currentUser ? currentUser.username : 'Anon Student'));
    const authorDeptVal = isCommentAdmin
      ? 'Admin'
      : (currentUser ? currentUser.department : 'General');
    const authorAvatarVal = isCommentAdmin
      ? '/avatars/coin-left.jpg'
      : (currentUser?.avatar_url || getAvatarForPseudonym(authorAliasVal));
    const authorBioVal = isCommentAdmin
      ? 'Official CapiTalk Campus Administrator'
      : (currentUser?.bio || '');

    const newComment: FreedomComment = {
      id: 'cm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      post_id: selectedPostForComments.id,
      author_id: currentUser?.id,
      author_alias: authorAliasVal,
      department: authorDeptVal,
      author_avatar: authorAvatarVal,
      author_bio: authorBioVal,
      is_admin: isCommentAdmin,
      message: replyingTo ? `@${replyingTo.alias} ${newCommentText.trim()}` : newCommentText.trim(),
      reply_to_comment_id: replyingTo?.id,
      reply_to_alias: replyingTo?.alias,
      created_at: new Date().toISOString(),
    };

    if (replyingTo?.id) {
      setExpandedReplyCommentIds((prev) => ({
        ...prev,
        [replyingTo.id]: true,
      }));
    }

    const updated = [...commentsList, newComment];
    setCommentsList(updated);
    setCommentsCountMap((prev) => ({
      ...prev,
      [selectedPostForComments.id]: (prev[selectedPostForComments.id] || 0) + 1,
    }));
    setNewCommentText('');
    setReplyingTo(null);

    const actorUsername = isCommentAdmin ? 'Admin' : (currentUser?.username || (newComment.author_alias?.startsWith('@') ? newComment.author_alias.slice(1) : newComment.author_alias));
    const actorAvatar = isCommentAdmin ? '/avatars/coin-left.jpg' : (currentUser?.avatar_url || newComment.author_avatar || getAvatarForPseudonym(actorUsername));

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('capitalk_global_realtime');
        bc.postMessage({
          type: 'FREEDOM_WALL_COMMENT',
          postId: selectedPostForComments.id,
          actorAlias: newComment.author_alias,
          actorUsername,
          actorAvatar,
          actorDept: newComment.department,
          messageSnippet: selectedPostForComments.message.slice(0, 60),
          commentText: newComment.message.slice(0, 60),
          commenterId: currentUser ? currentUser.id : 'guest',
          is_admin: isCommentAdmin,
          targetAuthorId: selectedPostForComments.author_id,
          targetAuthorAlias: selectedPostForComments.author_alias,
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
        const insertPayload: any = {
          id: newComment.id,
          post_id: newComment.post_id,
          author_alias: newComment.author_alias,
          department: newComment.department,
          message: newComment.message,
          reply_to_comment_id: newComment.reply_to_comment_id,
          reply_to_alias: newComment.reply_to_alias,
          created_at: newComment.created_at,
        };
        if (newComment.author_id) insertPayload.author_id = newComment.author_id;
        if (newComment.author_avatar) insertPayload.author_avatar = newComment.author_avatar;
        if (newComment.author_bio) insertPayload.author_bio = newComment.author_bio;
        if (newComment.is_admin) insertPayload.is_admin = newComment.is_admin;

        let { error: commentError } = await supabase.from('freedom_comments').insert(insertPayload);
        if (commentError && (commentError.message?.includes('author_id') || commentError.message?.includes('author_avatar') || commentError.message?.includes('author_bio') || commentError.message?.includes('is_admin'))) {
          delete insertPayload.author_id;
          delete insertPayload.author_avatar;
          delete insertPayload.author_bio;
          delete insertPayload.is_admin;
          await supabase.from('freedom_comments').insert(insertPayload);
        }

        const targetUserId = selectedPostForComments.author_id || selectedPostForComments.id;
        
        // 1. Send to user-specific channel
        const userChannel = supabase.channel(`user:${targetUserId}:notifications`);
        userChannel.send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            target_user_id: targetUserId,
            post_id: selectedPostForComments.id,
            type: 'comment',
            actor_alias: newComment.author_alias,
            actor_username: actorUsername,
            actor_avatar: actorAvatar,
            actor_department: newComment.department,
            message_snippet: selectedPostForComments.message.slice(0, 60),
            comment_text: newComment.message.slice(0, 60),
          },
        }).then(() => {}, () => {});

        // 2. Broadcast to global wall events channel (guarantees delivery regardless of pagination/device/channel key)
        const wallChan = supabase.channel('capitalk_global_wall_events');
        wallChan.send({
          type: 'broadcast',
          event: 'FREEDOM_WALL_COMMENT',
          payload: {
            postId: selectedPostForComments.id,
            actorAlias: newComment.author_alias,
            actorUsername,
            actorAvatar,
            actorDept: newComment.department,
            messageSnippet: selectedPostForComments.message.slice(0, 60),
            commentText: newComment.message.slice(0, 60),
            commenterId: currentUser ? currentUser.id : 'guest',
            targetAuthorId: selectedPostForComments.author_id,
            targetAuthorAlias: selectedPostForComments.author_alias,
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

  // Check if a pinned note is still active (within 24 hours of being pinned)
  const isPinnedActive = React.useCallback((post: FreedomPost) => {
    if (!post.is_pinned) return false;
    if (post.pinned_at) {
      const pinAgeMs = Date.now() - new Date(post.pinned_at).getTime();
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      return pinAgeMs <= ONE_DAY_MS;
    }
    return true;
  }, []);

  // Filter & Sort Posts
  const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');

  const allMyAliases = React.useMemo(() => {
    return Array.from(new Set([
      ...(myPseudonyms || []),
      ...(currentUser?.username ? [currentUser.username] : []),
    ])).map((p) => p.replace(/^@/, '').trim().toLowerCase()).filter(Boolean);
  }, [myPseudonyms, currentUser?.username]);

  const checkIsMyPost = React.useCallback((post: FreedomPost) => {
    if ((myPostIds || []).includes(post.id)) return true;
    if (post.author_id && currentUserId && post.author_id === currentUserId) return true;
    const cleanAlias = post.author_alias?.replace(/^@/, '').trim().toLowerCase();
    if (cleanAlias && allMyAliases.includes(cleanAlias)) return true;
    return false;
  }, [myPostIds, currentUserId, allMyAliases]);

  const myPostsCount = React.useMemo(() => {
    return (freedomPosts || []).filter((p) => {
      if (p.song_title) return false;
      return checkIsMyPost(p);
    }).length;
  }, [freedomPosts, checkIsMyPost]);

  const pendingNotesCount = React.useMemo(() => {
    return (freedomPosts || []).filter((p) => !p.song_title && p.status === 'pending').length;
  }, [freedomPosts]);

  const filteredPosts = (freedomPosts || [])
    .filter((post) => {
      // Filter out song dedications (they belong on the Music Wall)
      if (post.song_title) return false;

      const isMyPost = checkIsMyPost(post);

      // Pending Notes tab filter
      if (activeTab === 'pending') {
        if (post.status !== 'pending') return false;
      } else {
        // In other tabs: pending notes are only visible to their author or admins
        if (post.status === 'pending' && !isMyPost && !isAdminUser) {
          return false;
        }
      }

      // My Notes tab filter
      if (activeTab === 'my_notes' && !isMyPost) return false;

      const matchDept = departmentFilter === 'all' || post.department === departmentFilter;
      const matchQuery =
        !searchQuery.trim() ||
        post.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author_alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchQuery;
    })
    .sort((a, b) => {
      // Pinned notes that are active (created within 1 day) ALWAYS stay at the top
      const aPinned = isPinnedActive(a);
      const bPinned = isPinnedActive(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (activeTab === 'trending') return b.likes_count - a.likes_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Reset to page 1 whenever active filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, departmentFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / NOTES_PER_PAGE));

  const visiblePageNumbers = React.useMemo(() => {
    const maxPage = Math.max(3, totalPages);
    let start = Math.max(1, currentPage - 1);
    let end = start + 2;

    if (end > maxPage) {
      end = maxPage;
      start = Math.max(1, end - 2);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const paginatedPosts = React.useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * NOTES_PER_PAGE;
    return filteredPosts.slice(start, start + NOTES_PER_PAGE);
  }, [filteredPosts, currentPage, totalPages]);

  // Enhanced targetPostId Redirection: finds notes inside pagination, resets filters, navigates to page & scrolls into view with high-visibility highlight
  React.useEffect(() => {
    if (!targetPostId || !freedomPosts || freedomPosts.length === 0) return;

    // 1. Find the target note in the overall freedomPosts pool
    const targetPost = freedomPosts.find((p) => p.id === targetPostId);
    if (!targetPost) return;

    // 2. Clear any search query or active filter that would exclude the target note
    if (departmentFilter !== 'all' && targetPost.department !== departmentFilter) {
      setDepartmentFilter('all');
    }
    if (searchQuery.trim()) {
      setSearchQuery('');
    }
    if (activeTab === 'my_notes') {
      const isMine = (myPostIds || []).includes(targetPost.id) || targetPost.author_id === currentUserId;
      if (!isMine) {
        setActiveTab('latest');
      }
    }

    // 3. Compute which pagination page contains this note
    const allPostsMatchingOrder = (freedomPosts || [])
      .filter((p) => !p.song_title)
      .sort((a, b) => {
        const aPinned = isPinnedActive(a);
        const bPinned = isPinnedActive(b);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        if (activeTab === 'trending') return b.likes_count - a.likes_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    const noteIndex = allPostsMatchingOrder.findIndex((p) => p.id === targetPostId);
    if (noteIndex !== -1) {
      const calculatedPage = Math.floor(noteIndex / NOTES_PER_PAGE) + 1;
      if (currentPage !== calculatedPage) {
        setCurrentPage(calculatedPage);
      }
    }

    // 4. Scroll smoothly to the target card and display high-visibility glow
    let pollCount = 0;
    const maxPolls = 20;
    const scrollInterval = setInterval(() => {
      pollCount++;
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        clearInterval(scrollInterval);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-[#701a31]', 'shadow-[0_0_35px_rgba(112,26,49,0.8)]', 'scale-[1.03]', 'transition-all', 'duration-500');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-[#701a31]', 'shadow-[0_0_35px_rgba(112,26,49,0.8)]', 'scale-[1.03]');
          setTargetPostId(null);
        }, 4000);
      } else if (pollCount >= maxPolls) {
        clearInterval(scrollInterval);
        setTargetPostId(null);
      }
    }, 120);

    return () => clearInterval(scrollInterval);
  }, [targetPostId, freedomPosts, NOTES_PER_PAGE, departmentFilter, searchQuery, activeTab, myPostIds, currentUserId, isPinnedActive, currentPage, setTargetPostId]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const el = document.getElementById('posts-feed-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderPostCard = (post: FreedomPost) => {
    const hasLiked = currentUserId ? post.liked_by_users?.includes(currentUserId) : false;
    const isPostAdmin = Boolean(post.is_admin);
    const isPinned = isPinnedActive(post);
    const isMyPost = checkIsMyPost(post);
    const commentsCount = commentsCountMap[post.id] || 0;
    const isActionMenuOpen = openActionMenuPostId === post.id;

    // Retain user's chosen note color (e.g. #ffc900, #701a31, #ff90e8, #00e599, #7dd3fc, etc.)
    const cardBgColor = post.color || (isPostAdmin ? '#701a31' : '#ffffff');
    const isDark = isColorDark(cardBgColor);

    return (
      <article
        key={post.id}
        id={`post-${post.id}`}
        style={{ backgroundColor: cardBgColor }}
        className={`sm:rounded-xl shadow-xs border-y sm:border overflow-visible relative transition-all duration-200 ${
          isDark
            ? 'border-black/20 text-white shadow-md'
            : 'border-[#e4e6eb] text-[#050505]'
        } ${isPinned ? 'ring-2 ring-amber-400/90' : ''}`}
      >
        {/* Pending Note Banner with 1-Click Approve Button for Admin */}
        {post.status === 'pending' && (
          <div className="bg-amber-500/20 border-b border-amber-500/30 px-3.5 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-700" />
              <span>Pending Review</span>
            </div>
            {isAdminUser && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  approveFreedomPost(post.id);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-full shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Approve note to make it visible to all students"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approve Note</span>
              </button>
            )}
          </div>
        )}

        {/* Post Header */}
        <div className="p-3.5 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Profile Avatar */}
            <button
              type="button"
              onClick={() => setViewingProfile({
                username: post.author_alias || 'Anon Student',
                department: post.department || 'General',
                avatar_url: post.author_avatar || getAvatarForPseudonym(post.author_alias || 'Anon'),
                bio: post.author_bio,
                is_admin: isPostAdmin,
                author_id: post.author_id,
              })}
              className="relative shrink-0 cursor-pointer group/avatar"
              title="View student profile"
            >
              <img
                src={post.author_avatar || getAvatarForPseudonym(post.author_alias || 'Anon')}
                alt={post.author_alias}
                className={`w-10 h-10 rounded-full border object-cover group-hover/avatar:scale-105 transition-transform ${
                  isDark ? 'border-white/40 bg-white/10' : 'border-[#e4e6eb] bg-[#f0f2f5]'
                }`}
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('src', getAvatarForPseudonym(post.author_alias || 'Anon'));
                }}
              />
              {isPostAdmin && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-[9px] text-white font-bold" title="Official Admin">
                  ✓
                </div>
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setViewingProfile({
                    username: post.author_alias || 'Anon Student',
                    department: post.department || 'General',
                    avatar_url: post.author_avatar || getAvatarForPseudonym(post.author_alias || 'Anon'),
                    bio: post.author_bio,
                    is_admin: isPostAdmin,
                    author_id: post.author_id,
                  })}
                  className={`font-bold text-[14.5px] hover:underline cursor-pointer truncate max-w-[170px] sm:max-w-[240px] text-left leading-tight ${
                    isDark ? 'text-white' : 'text-[#050505]'
                  }`}
                >
                  {post.author_alias || 'Anon Student'}
                </button>

                {isPinned && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1 border ${
                    isDark ? 'bg-white/20 text-white border-white/30' : 'bg-[#ffc900]/30 text-amber-950 border-amber-300'
                  }`}>
                    <Pin className="w-2.5 h-2.5 fill-current" />
                    Pinned
                  </span>
                )}
                {isPostAdmin && !isPinned && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 border ${
                    isDark ? 'bg-white/20 text-white border-white/30' : 'bg-[#701a31]/10 text-[#701a31] border-[#701a31]/30'
                  }`}>
                    Official
                  </span>
                )}
                {isMyPost && !isPinned && !isPostAdmin && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 border ${
                    isDark ? 'bg-white/20 text-white border-white/30' : 'bg-black/5 text-[#050505] border-black/10'
                  }`}>
                    You
                  </span>
                )}
              </div>

              <div className={`flex items-center gap-1 text-[12px] leading-tight mt-0.5 ${
                isDark ? 'text-white/80' : 'text-[#65676b]'
              }`}>
                {!isPostAdmin && post.department && (
                  <>
                    <span className="font-normal truncate max-w-[130px] sm:max-w-[180px]">
                      {post.department.replace('College of ', '')}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span>{formatRelativeTime(post.created_at, now)}</span>
                <span>·</span>
                <Globe className={`w-3 h-3 shrink-0 ${isDark ? 'text-white/80' : 'text-[#65676b]'}`} />
              </div>
            </div>
          </div>

          {/* Header Right Actions: Instant Approve Button + 3-Dots More Options Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenActionMenuPostId(isActionMenuOpen ? null : post.id)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  isDark
                    ? 'text-white/80 hover:text-white hover:bg-white/15'
                    : 'text-[#65676b] hover:text-[#050505] hover:bg-black/5'
                }`}
                title="Post options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isActionMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpenActionMenuPostId(null)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#e4e6eb] rounded-xl shadow-lg z-50 py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 overflow-hidden text-[#050505]">
                    {isAdminUser && post.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuPostId(null);
                          approveFreedomPost(post.id);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#f0f2f5] text-emerald-600 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Note</span>
                      </button>
                    )}

                    {isAdminUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuPostId(null);
                          togglePinFreedomPost(post.id);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#f0f2f5] text-[#050505] flex items-center gap-2 cursor-pointer"
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{isPinned ? 'Unpin from Top' : 'Pin to Top'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setOpenActionMenuPostId(null);
                        setSelectedPostForReport(post);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] flex items-center gap-2 cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report Note</span>
                    </button>

                    {(isAdminUser || isMyPost) && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionMenuPostId(null);
                          setSelectedPostForDelete(post);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer border-t border-gray-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Note</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Post Message Body */}
        <div className={`px-3.5 sm:px-4 pb-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
          isDark ? 'text-white' : 'text-[#050505]'
        }`}>
          {post.message}
        </div>

        {/* Dedicated Song Embed if present */}
        {post.song_title && (
          <div className={`mx-3.5 sm:mx-4 mb-3 p-2.5 rounded-xl flex items-center gap-2.5 border ${
            isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-[#f0f2f5] border-[#e4e6eb] text-[#050505]'
          }`}>
            {post.song_image_url && (
              <img
                src={post.song_image_url}
                alt="Song Cover"
                className="w-9 h-9 rounded-lg object-cover border border-[#e4e6eb]"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-[12.5px] font-bold truncate ${isDark ? 'text-white' : 'text-[#050505]'}`}>
                {post.song_title}
              </p>
              <p className={`text-[11px] truncate ${isDark ? 'text-white/80' : 'text-[#65676b]'}`}>
                {post.song_artist || 'Unknown Artist'}
              </p>
            </div>
          </div>
        )}

        {/* Attached Image / Animated GIF Media */}
        {post.image_url && (
          <div className={`relative w-full bg-[#1c1e21] overflow-hidden select-none border-y ${
            isDark ? 'border-white/20' : 'border-[#e4e6eb]'
          }`}>
            <img
              src={post.image_url}
              alt="Campus Note Attachment"
              className="w-full h-auto object-contain max-h-[540px] mx-auto block cursor-pointer transition-transform duration-200 hover:opacity-95"
              onClick={() => setZoomedImage(post.image_url || null)}
              loading="lazy"
              draggable={false}
            />
            {post.image_type === 'gif' && (
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded-md uppercase tracking-wider pointer-events-none backdrop-blur-xs">
                GIF
              </span>
            )}
          </div>
        )}

        {/* Campus Poll Widget */}
        {post.poll_options && post.poll_options.length > 0 && (() => {
          const currentUserId = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'guest_anon');
          const totalVotes = post.poll_options.reduce((sum, opt) => sum + (opt.votes_count || 0), 0);
          const userVotedOption = post.poll_options.find((opt) => opt.voted_users?.includes(currentUserId));
          const hasUserVoted = !!userVotedOption;

          return (
            <div className={`mx-3.5 sm:mx-4 my-2.5 p-3 rounded-xl border ${
              isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-[#f0f2f5]/60 border-[#e4e6eb] text-[#050505]'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate ${
                  isDark ? 'text-white/90' : 'text-[#65676b]'
                }`}>
                  <BarChart2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-white' : 'text-[#1877f2]'}`} />
                  <span className="truncate">{post.poll_question || 'Campus Poll'}</span>
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                  isDark ? 'bg-white/20 text-white border-white/30' : 'bg-white text-[#65676b] border-[#e4e6eb]'
                }`}>
                  {hasUserVoted ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}` : 'Tap option to vote'}
                </span>
              </div>

              <div className="space-y-1.5">
                {post.poll_options.map((opt) => {
                  const optVotes = opt.votes_count || 0;
                  const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                  const isMySelection = userVotedOption?.id === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => voteFreedomPoll(post.id, opt.id)}
                      className={`w-full relative text-left p-2 rounded-lg border transition-all overflow-hidden cursor-pointer ${
                        isMySelection
                          ? isDark
                            ? 'bg-white/30 border-white text-white font-bold ring-1 ring-white'
                            : 'bg-blue-50 border-[#1877f2] ring-1 ring-[#1877f2] text-[#050505]'
                          : isDark
                          ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white'
                          : 'bg-white hover:bg-gray-50 border-[#e4e6eb] text-[#050505]'
                      }`}
                    >
                      {/* Progress Bar Fill */}
                      {hasUserVoted && (
                        <div
                          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                            isMySelection
                              ? isDark ? 'bg-white/40' : 'bg-[#1877f2]/20'
                              : isDark ? 'bg-white/20' : 'bg-gray-200/70'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      )}

                      <div className="relative z-10 flex items-center justify-between gap-2 text-xs font-semibold">
                        <div className="flex items-center gap-1.5 truncate">
                          {isMySelection && <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-white' : 'text-[#1877f2]'}`} />}
                          <span className="truncate">{opt.text}</span>
                        </div>

                        {hasUserVoted ? (
                          <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold">
                            <span>{percentage}%</span>
                            <span className={`font-normal text-[10px] ${isDark ? 'text-white/80' : 'text-[#65676b]'}`}>({optVotes})</span>
                          </div>
                        ) : (
                          <div className={`shrink-0 text-[10px] font-bold uppercase ${isDark ? 'text-white' : 'text-[#1877f2]'}`}>
                            Vote
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {hasUserVoted ? (
                <p className={`text-[10px] font-bold text-center mt-1.5 ${isDark ? 'text-white' : 'text-[#1877f2]'}`}>
                  ✓ You voted in this poll
                </p>
              ) : (
                <p className={`text-[10px] text-center mt-1.5 italic ${isDark ? 'text-white/80' : 'text-[#65676b]'}`}>
                  Vote to reveal results
                </p>
              )}
            </div>
          );
        })()}

        {/* Post Metrics Bar */}
        <div className={`px-3.5 py-2 flex items-center justify-between text-[13px] border-t ${
          isDark ? 'border-white/15 text-white/80' : 'border-black/10 text-[#65676b]'
        }`}>
          <button
            type="button"
            onClick={() => setReactorsPost(post)}
            className="flex items-center gap-1.5 hover:underline cursor-pointer text-left"
          >
            {renderStackedReactionBadges(hasLiked, post.likes_count)}
            <span className={`font-medium text-[13px] ${isDark ? 'text-white/90' : 'text-[#65676b]'}`}>
              {post.likes_count > 0 ? `${post.likes_count} ${post.likes_count === 1 ? 'reaction' : 'reactions'}` : 'Be the first to react'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openCommentsModal(post)}
            className={`hover:underline cursor-pointer font-medium text-[13px] ${isDark ? 'text-white/90' : 'text-[#65676b]'}`}
          >
            {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
          </button>
        </div>

        {/* Action Buttons Bar (Like / Comment) */}
        <div className={`px-2 py-1 flex items-center justify-between border-t ${
          isDark ? 'border-white/15' : 'border-black/10'
        }`}>
          {/* Like Button */}
          <button
            type="button"
            onMouseDown={() => handleHeartPressStart(post)}
            onMouseUp={() => handleHeartPressEnd(post)}
            onMouseLeave={() => { if (heartPressTimer.current) clearTimeout(heartPressTimer.current); }}
            onTouchStart={() => handleHeartPressStart(post)}
            onTouchEnd={(e) => { e.preventDefault(); handleHeartPressEnd(post); }}
            onContextMenu={(e) => { e.preventDefault(); setReactorsPost(post); }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[13.5px] font-bold transition-colors cursor-pointer select-none ${
              hasLiked
                ? isDark
                  ? 'text-rose-300 hover:bg-white/10'
                  : 'text-[#f33e5b] hover:bg-black/5'
                : isDark
                ? 'text-white/80 hover:bg-white/10 hover:text-white'
                : 'text-[#65676b] hover:bg-black/5 hover:text-[#050505]'
            }`}
            title="Tap to like · Hold to see who liked"
          >
            <Heart className={`w-4 h-4 ${hasLiked ? (isDark ? 'fill-rose-300 text-rose-300' : 'fill-[#f33e5b] text-[#f33e5b]') : ''}`} />
            <span>{hasLiked ? 'Liked' : 'Like'}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={() => openCommentsModal(post)}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[13.5px] font-bold transition-colors cursor-pointer select-none ${
              isDark
                ? 'text-white/80 hover:bg-white/10 hover:text-white'
                : 'text-[#65676b] hover:bg-black/5 hover:text-[#050505]'
            }`}
          >
            <FbCommentSvg className="w-4 h-4" />
            <span>Comment</span>
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#050505] flex flex-col font-sans pb-16 sm:pb-8 pt-2 sm:pt-4 px-0 sm:px-4">
      {/* ── Main Feed Column (Matching MidtermSzn max-w-[620px]) ────────────── */}
      <main className="flex-1 max-w-[620px] mx-auto w-full space-y-3 sm:space-y-4">
        {/* ── Prominent "What's on your mind?" Composer Card ──────────────────── */}
        <div className="bg-white border-y sm:border border-[#e4e6eb] sm:rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all flex items-center gap-3">
          {/* User Avatar (Outside of the input element) */}
          <button
            type="button"
            onClick={() => setViewState(currentUser ? 'register' : 'register')}
            className="shrink-0 relative group/avatar cursor-pointer"
            title={currentUser ? `@${currentUser.username}` : 'Profile'}
          >
            <img
              src={currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg')}
              alt={currentUser?.username || 'You'}
              className="w-10 h-10 rounded-full object-cover border border-[#d1d5dc] bg-[#3a3b3c] group-hover/avatar:opacity-90 transition-opacity ring-2 ring-transparent group-hover/avatar:ring-[#1877f2]/40"
              onError={(e) => {
                (e.target as HTMLElement).setAttribute('src', getAvatarForPseudonym(currentUser?.username || 'Anon'));
              }}
            />
          </button>

          {/* Emphasized "What's on your mind?" Interactive Trigger */}
          <button
            type="button"
            onClick={() => setViewState('add_note')}
            className="flex-1 bg-[#f0f2f5] hover:bg-[#e4e6eb] border border-[#e4e6eb] hover:border-[#ccd0d5] transition-all rounded-full px-4 py-2.5 text-left text-[#65676b] hover:text-black text-[14px] sm:text-[15px] font-medium truncate cursor-pointer flex items-center justify-between gap-2 shadow-2xs group"
          >
            <span className="truncate">
              What&apos;s on your mind, {currentUser?.username || 'Capitolian'}?
            </span>
            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>
        </div>

        {/* ── Filter Tabs & Search Bar ────────────────────────────────────────── */}
        <div className="bg-white border-y sm:border border-[#e4e6eb] sm:rounded-xl p-2 sm:p-2.5 shadow-xs transition-all">
          {isSearchExpanded || searchQuery ? (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#65676b] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes, topics, aliases..."
                  className="w-full pl-9 pr-8 py-1.5 text-[13px] bg-[#f0f2f5] border border-[#e4e6eb] rounded-lg font-medium text-[#050505] focus:outline-none focus:border-[#1877f2] focus:bg-white transition-colors"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#65676b] hover:text-[#050505] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchExpanded(false);
                }}
                className="px-3 py-1.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] text-xs font-bold rounded-lg border border-[#e4e6eb] shrink-0 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('latest')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'latest'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Latest</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('trending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'trending'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5]'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${activeTab === 'trending' ? 'text-amber-300' : 'text-[#f7b125]'}`} />
                  <span>Trending</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my_notes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'my_notes'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-[#65676b] hover:text-[#050505] hover:bg-[#f0f2f5]'
                  }`}
                >
                  <span>Your notes</span>
                </button>

                {/* Admin Pending Review Tab */}
                {isAdminUser && pendingNotesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                      activeTab === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending ({pendingNotesCount})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="px-2.5 py-1.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#65676b] hover:text-[#050505] border border-[#e4e6eb] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Search campus notes"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeptModal(true)}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border relative ${
                    departmentFilter !== 'all'
                      ? 'bg-black text-white border-black'
                      : 'bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#65676b] hover:text-[#050505] border-[#e4e6eb]'
                  }`}
                  title={departmentFilter === 'all' ? 'Filter by department' : `Filtering by ${departmentFilter.replace('College of ', '')}`}
                  aria-label="Filter by department"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {departmentFilter !== 'all' && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#f33e5b] ring-2 ring-white" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Minimalist Department Filter Modal */}
        {showDeptModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
            onClick={() => setShowDeptModal(false)}
          >
            <div
              className="bg-white border border-[#e4e6eb] rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col font-sans text-[#050505] max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#e4e6eb] shrink-0">
                <h3 className="text-sm sm:text-base font-bold text-[#050505]">
                  Filter by Department
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="p-1 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto py-2 space-y-1 custom-scrollbar pr-1 flex-1">
                {/* All Departments Option */}
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentFilter('all');
                    setShowDeptModal(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between text-left cursor-pointer ${
                    departmentFilter === 'all'
                      ? 'bg-[#1877f2] text-white'
                      : 'bg-white hover:bg-[#f0f2f5] text-[#050505]'
                  }`}
                >
                  <span>All Departments</span>
                  {departmentFilter === 'all' && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* Individual Departments */}
                {CU_DEPARTMENTS.map((dept) => {
                  const isSelected = departmentFilter === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => {
                        setDepartmentFilter(dept);
                        setShowDeptModal(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#1877f2] text-white'
                          : 'bg-white hover:bg-[#f0f2f5] text-[#050505]'
                      }`}
                    >
                      <span>{dept.replace('College of ', '')}</span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Feed Content List ───────────────────────────────────────────────── */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-10 sm:py-16 bg-white border-y sm:border border-[#e4e6eb] sm:rounded-xl p-5 sm:p-8 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#f0f2f5] border border-[#e4e6eb] flex items-center justify-center mx-auto mb-3 text-xl">
              📝
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#050505]">
              {activeTab === 'my_notes' ? 'No Created Notes Yet' : 'No Campus Notes Found'}
            </h3>
            <p className="text-xs text-[#65676b] mt-1 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'my_notes'
                ? "You haven't posted any notes on the Campus Wall yet. Click below to share your first confession or thought!"
                : searchQuery || departmentFilter !== 'all'
                ? 'No notes match your active search filter. Try clearing your filters!'
                : 'Be the very first CU student to post an anonymous confession or thought on the wall!'}
            </p>
            <button
              type="button"
              onClick={() => setViewState('add_note')}
              className="mt-4 px-4 py-2 bg-[#701a31] hover:bg-[#581527] text-white text-xs font-bold rounded-full shadow-xs transition-all cursor-pointer"
            >
              <span>Share a Note</span>
            </button>
          </div>
        ) : (
          <div id="posts-feed-container" className="scroll-mt-6 space-y-3 sm:space-y-4">
            <div className="space-y-3 sm:space-y-4 mb-4">
              {paginatedPosts.map((post) => renderPostCard(post))}
            </div>

            {/* ── Minimalist Pagination Controls ─────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border-y sm:border border-[#e4e6eb] sm:rounded-xl p-3 sm:p-3.5 shadow-xs">
              <span className="text-xs font-medium text-[#65676b] text-center sm:text-left">
                Showing <span className="font-bold text-[#050505]">{((currentPage - 1) * NOTES_PER_PAGE) + 1}</span> - <span className="font-bold text-[#050505]">{Math.min(currentPage * NOTES_PER_PAGE, filteredPosts.length)}</span> of <span className="font-bold text-[#050505]">{filteredPosts.length}</span> notes
              </span>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="w-8 h-8 rounded-lg border border-[#e4e6eb] font-bold text-xs flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white hover:bg-[#f0f2f5] text-[#050505] active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                  title="Previous Page (<)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {visiblePageNumbers.map((pageNum) => {
                    const isDisabled = pageNum > totalPages;
                    const isCurrent = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => !isDisabled && handlePageChange(pageNum)}
                        disabled={isDisabled}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${
                          isCurrent
                            ? 'bg-[#1877f2] text-white border-[#1877f2] shadow-xs'
                            : isDisabled
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-40'
                            : 'bg-white text-[#050505] border-[#e4e6eb] hover:bg-[#f0f2f5] active:scale-95'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="w-8 h-8 rounded-lg border border-[#e4e6eb] font-bold text-xs flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white hover:bg-[#f0f2f5] text-[#050505] active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                  title="Next Page (>)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Threaded Comments Sheet / Modal (Minimalist Facebook-Style) ──────── */}
      {selectedPostForComments && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xs flex flex-col sm:items-center sm:justify-center animate-in fade-in duration-200"
          onClick={() => setSelectedPostForComments(null)}
        >
          <div
            className="bg-white sm:rounded-2xl border-t sm:border border-[#e4e6eb] w-full max-w-2xl h-[100dvh] sm:h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#e4e6eb] flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-base text-[#050505]">
                  {selectedPostForComments.author_alias}'s Note
                </h3>
                <span className="px-2.5 py-0.5 bg-[#f0f2f5] text-[#65676b] text-xs font-semibold rounded-full">
                  {commentsList.length} {commentsList.length === 1 ? 'comment' : 'comments'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostForComments(null)}
                className="p-1.5 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content (Original Note Snippet + Comments Thread) */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 bg-[#f0f2f5]">
              {/* Original Note Snippet */}
              {(() => {
                const isCmPostAdmin = Boolean(selectedPostForComments.is_admin);
                const cmNoteBg = selectedPostForComments.color || (isCmPostAdmin ? '#701a31' : '#ffffff');
                const isCmNoteDark = isColorDark(cmNoteBg);

                return (
                  <div
                    style={{ backgroundColor: cmNoteBg }}
                    className={`rounded-xl p-2.5 sm:p-3 border shadow-2xs space-y-1.5 ${
                      isCmNoteDark ? 'border-black/20 text-white' : 'border-[#e4e6eb] text-[#050505]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedPostForComments.author_avatar || getAvatarForPseudonym(selectedPostForComments.author_alias || 'Anon')}
                          alt={selectedPostForComments.author_alias}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border object-cover ${
                            isCmNoteDark ? 'border-white/40 bg-white/10' : 'border-[#e4e6eb] bg-[#f0f2f5]'
                          }`}
                        />
                        <div>
                          <p className={`font-bold text-xs ${isCmNoteDark ? 'text-white' : 'text-[#050505]'}`}>
                            {selectedPostForComments.author_alias}
                          </p>
                          <p className={`text-[10.5px] sm:text-[11px] ${isCmNoteDark ? 'text-white/80' : 'text-[#65676b]'}`}>
                            {!isCmPostAdmin && selectedPostForComments.department && (
                              `${selectedPostForComments.department.replace('College of ', '')} · `
                            )}
                            {formatRelativeTime(selectedPostForComments.created_at, now)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className={`text-[13px] sm:text-[13.5px] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                      isCmNoteDark ? 'text-white' : 'text-[#050505]'
                    }`}>
                      {selectedPostForComments.message}
                    </p>

                    {selectedPostForComments.image_url && (
                      <div className="rounded-lg overflow-hidden border border-[#e4e6eb] bg-[#1c1e21] max-h-44 mt-1.5">
                        <img
                          src={selectedPostForComments.image_url}
                          alt="Attached media"
                          className="w-full h-auto max-h-44 object-contain cursor-pointer"
                          onClick={() => setZoomedImage(selectedPostForComments?.image_url || null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Comments Feed List */}
              <div className="space-y-1 sm:space-y-1.5">
                {isFetchingComments ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-[#65676b]">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-[#1877f2] animate-spin" />
                    <p className="text-xs font-medium">Loading comments...</p>
                  </div>
                ) : commentsList.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-[#e4e6eb] p-4 shadow-2xs">
                    <p className="font-bold text-xs sm:text-sm text-[#050505]">No comments yet</p>
                    <p className="text-[11px] sm:text-xs text-[#65676b] mt-0.5">
                      Be the first to share your thoughts on this note!
                    </p>
                  </div>
                ) : (
                  (() => {
                    const allCommentIds = new Set(commentsList.map((c) => c.id));
                    const rootComments = commentsList.filter(
                      (c) => !c.reply_to_comment_id || !allCommentIds.has(c.reply_to_comment_id)
                    );

                    const countAllDescendants = (commentId: string, visited = new Set<string>()): number => {
                      if (visited.has(commentId)) return 0;
                      visited.add(commentId);
                      const children = commentsList.filter((c) => c.reply_to_comment_id === commentId);
                      return children.reduce((total, child) => total + 1 + countAllDescendants(child.id, visited), 0);
                    };

                    const renderNode = (cm: FreedomComment, depth = 0) => {
                      const directReplies = commentsList.filter((c) => c.reply_to_comment_id === cm.id);
                      const totalRepliesCount = countAllDescendants(cm.id);
                      const isReply = depth > 0;
                      const isExpanded = !!expandedReplyCommentIds[cm.id];

                      const currentUid = currentUser ? currentUser.id : (typeof window !== 'undefined' ? localStorage.getItem('capitalk_user_id') || getOrCreatePersistentUUID() : 'anon');
                      const likedUsers = cm.liked_by_users || [];
                      const hasLiked = likedUsers.includes(currentUid);
                      const likesCount = cm.likes_count || 0;
                      const isCmAdmin = Boolean(cm.is_admin);

                      return (
                        <div key={cm.id} className="space-y-0.5">
                          <div className={`flex items-start gap-1.5 sm:gap-2 ${isReply ? 'ml-5 sm:ml-7' : ''}`}>
                            <button
                              type="button"
                              onClick={() => setViewingProfile({
                                username: cm.author_alias,
                                department: cm.department || (isCmAdmin ? 'Admin' : 'General'),
                                avatar_url: cm.author_avatar || (isCmAdmin ? '/avatars/coin-left.jpg' : getAvatarForPseudonym(cm.author_alias)),
                                bio: cm.author_bio,
                                author_id: cm.author_id,
                                is_admin: isCmAdmin,
                              })}
                              className="shrink-0 cursor-pointer mt-0.5 relative group/avatar"
                              title={isCmAdmin ? "Official Admin" : `@${cm.author_alias}`}
                            >
                              <img
                                src={cm.author_avatar || (isCmAdmin ? '/avatars/coin-left.jpg' : getAvatarForPseudonym(cm.author_alias))}
                                alt={cm.author_alias}
                                className={`${isReply ? 'w-6 h-6' : 'w-7 h-7 sm:w-7.5 sm:h-7.5'} rounded-full object-cover bg-white ${
                                  isCmAdmin ? 'border-2 border-[#701a31] shadow-xs' : 'border border-[#e4e6eb]'
                                }`}
                              />
                              {isCmAdmin && (
                                <div
                                  className={`absolute -bottom-0.5 -right-0.5 ${isReply ? 'w-3 h-3 text-[7px]' : 'w-3.5 h-3.5 text-[8px]'} rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-white font-bold shadow-2xs`}
                                  title="Official Admin"
                                >
                                  ✓
                                </div>
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              {/* Thin Compact Bubble with Relative Position for Reaction Indicator */}
                              <div className="relative inline-block max-w-[92%] sm:max-w-[85%] group/bubble">
                                <div className={`rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-2xs space-y-0.5 transition-all ${
                                  isCmAdmin
                                    ? 'bg-gradient-to-br from-[#701a31]/10 via-[#fff8f9] to-[#701a31]/5 border border-[#701a31]/35 ring-1 ring-[#701a31]/20 shadow-xs'
                                    : 'bg-white border border-[#e4e6eb]'
                                }`}>
                                  <div className="flex items-center gap-1 leading-tight flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setViewingProfile({
                                        username: cm.author_alias,
                                        department: cm.department || (isCmAdmin ? 'Admin' : 'General'),
                                        avatar_url: cm.author_avatar || (isCmAdmin ? '/avatars/coin-left.jpg' : getAvatarForPseudonym(cm.author_alias)),
                                        bio: cm.author_bio,
                                        author_id: cm.author_id,
                                        is_admin: isCmAdmin,
                                      })}
                                      className={`font-bold text-[12px] sm:text-[12.5px] hover:underline cursor-pointer truncate ${
                                        isCmAdmin ? 'text-[#701a31] font-black' : 'text-[#050505]'
                                      }`}
                                    >
                                      @{cm.author_alias}
                                    </button>
                                    {isCmAdmin ? (
                                      <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded-full bg-[#701a31] text-white flex items-center gap-0.5 shadow-2xs shrink-0">
                                        <span>Official</span>
                                      </span>
                                    ) : (
                                      cm.department && (
                                        <span className="text-[10px] text-[#65676b] font-normal">
                                          · {cm.department.replace('College of ', '')}
                                        </span>
                                      )
                                    )}
                                  </div>

                                  <p className={`text-[12.5px] sm:text-[13px] leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                                    isCmAdmin ? 'text-[#1a050b] font-medium' : 'text-[#050505]'
                                  }`}>
                                    {cm.message}
                                  </p>
                                </div>

                                {/* Facebook Reaction Heart Indicator Badge attached to Comment Bubble */}
                                {likesCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCommentForReactors(cm);
                                    }}
                                    className="absolute -bottom-2 -right-1.5 sm:-right-2 bg-white px-1.5 py-0.5 rounded-full shadow-xs border border-[#e4e6eb] flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold text-[#65676b] select-none animate-in zoom-in-75 duration-150 z-10 hover:scale-105 active:scale-95 transition-all cursor-pointer group/pill"
                                    title={`${likesCount} ${likesCount === 1 ? 'person reacted with love' : 'people reacted with love'} (Click to see who reacted)`}
                                  >
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#f33e5b] flex items-center justify-center text-white shadow-2xs group-hover/pill:scale-110 transition-transform">
                                      <Heart className="w-2 h-2 fill-white text-white" />
                                    </div>
                                    <span className="text-zinc-700 font-semibold">{likesCount}</span>
                                  </button>
                                )}
                              </div>

                              {/* Footer action links */}
                              <div className="flex items-center gap-2.5 sm:gap-3 px-2 pt-1 text-[10.5px] sm:text-[11px] text-[#65676b] font-bold leading-none">
                                <span>{formatRelativeTime(cm.created_at, now)}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleLikeComment(cm)}
                                  className={`hover:underline cursor-pointer flex items-center gap-1 transition-colors active:scale-95 ${
                                    hasLiked ? 'text-[#f33e5b] font-bold' : 'text-[#65676b] hover:text-[#f33e5b]'
                                  }`}
                                >
                                  <span>{hasLiked ? 'Liked' : 'Like'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartReply(cm)}
                                  className="hover:underline cursor-pointer"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Nested Replies Collapsible */}
                          {directReplies.length > 0 && (
                            <div className="pl-6 sm:pl-7 space-y-1 pt-0.5">
                              <button
                                type="button"
                                onClick={() => toggleExpandReplies(cm.id)}
                                className="group/reply flex items-center gap-1.5 text-[11px] font-bold text-[#65676b] hover:text-[#050505] py-0.5 cursor-pointer select-none transition-colors"
                              >
                                <span className="w-4 h-[1.5px] bg-[#ccd0d5] group-hover/reply:bg-[#65676b] transition-colors shrink-0" />
                                {isExpanded ? (
                                  <span className="flex items-center gap-1 text-[#65676b] group-hover/reply:text-[#050505]">
                                    <ChevronUp className="w-3 h-3" />
                                    <span>Hide {totalRepliesCount === 1 ? 'reply' : `${totalRepliesCount} replies`}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[#65676b] group-hover/reply:text-[#050505]">
                                    <ChevronDown className="w-3 h-3" />
                                    <span>
                                      {totalRepliesCount === 1
                                        ? 'View 1 reply'
                                        : `View ${totalRepliesCount} replies`}
                                    </span>
                                  </span>
                                )}
                              </button>

                              {isExpanded && (
                                <div className="space-y-1 animate-in slide-in-from-top-1 duration-150 border-l border-[#e4e6eb] pl-2 -ml-2">
                                  {directReplies.map((reply) => renderNode(reply, depth + 1))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    };

                    return rootComments.map((rootCm) => renderNode(rootCm, 0));
                  })()
                )}
              </div>
            </div>

            {/* Modal Input Footer */}
            <div className="p-2 sm:p-2.5 bg-white border-t border-[#e4e6eb] shrink-0">
              {isAdminUser && (
                <div className="flex items-center justify-between px-1 mb-1.5 pb-1.5 border-b border-[#e4e6eb]">
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
                      Admin Badge Active
                    </span>
                  )}
                </div>
              )}

              {replyingTo && (
                <div className="mb-1.5 px-2.5 py-1 bg-[#f0f2f5] rounded-md text-[11px] font-medium text-[#050505] flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <Reply className="w-3 h-3 text-[#1877f2]" />
                    <span>Replying to <span className="font-bold">@{replyingTo.alias}</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-0.5 hover:bg-gray-200 rounded text-[#65676b] hover:text-[#050505] cursor-pointer"
                    title="Cancel reply"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleAddComment} className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative shrink-0 hidden xs:block">
                  <img
                    src={commentAsAdmin ? '/avatars/coin-left.jpg' : (currentUser?.avatar_url || getAvatarForPseudonym(commentAlias))}
                    alt="My avatar"
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover bg-[#f0f2f5] ${
                      commentAsAdmin ? 'border-2 border-[#701a31]' : 'border border-[#e4e6eb]'
                    }`}
                  />
                  {commentAsAdmin && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-[7px] text-white font-bold">
                      ✓
                    </div>
                  )}
                </div>
                <textarea
                  ref={commentInputRef}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(e);
                    }
                  }}
                  placeholder={
                    replyingTo
                      ? `Reply as ${commentAsAdmin ? 'Admin' : `@${commentAlias}`} to @${replyingTo.alias}...`
                      : `Write a comment as ${commentAsAdmin ? 'Admin' : `@${commentAlias}`}...`
                  }
                  rows={1}
                  maxLength={2000}
                  className={`flex-1 border rounded-2xl px-3 py-1.5 sm:py-2 text-[13px] text-[#050505] placeholder-[#65676b] outline-none transition-colors resize-none max-h-24 overflow-y-auto leading-snug ${
                    commentAsAdmin
                      ? 'bg-[#fff8f9] border-[#701a31]/30 focus:border-[#701a31] focus:bg-white'
                      : 'bg-[#f0f2f5] border-[#e4e6eb] focus:bg-white focus:border-[#1877f2]'
                  }`}
                  required
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer ${
                    commentAsAdmin
                      ? 'bg-[#701a31] hover:bg-[#5a1527]'
                      : 'bg-[#1877f2] hover:bg-[#166fe5]'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
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
          }}
          onClose={() => setSelectedPostForDelete(null)}
        />
      )}

      {/* Reactors Overlay — Who reacted to this note */}
      {reactorsPost && (
        <div
          className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setReactorsPost(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#e4e6eb] w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#e4e6eb] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#f33e5b] flex items-center justify-center shadow-2xs">
                  <Heart className="w-3.5 h-3.5 text-white fill-white" />
                </div>
                <h3 className="font-bold text-base text-[#050505]">Reactions</h3>
                <span className="text-xs text-[#65676b]">({reactorsPost.likes_count})</span>
              </div>
              <button
                type="button"
                onClick={() => setReactorsPost(null)}
                className="p-1 rounded-full hover:bg-[#f0f2f5] text-[#65676b] hover:text-[#050505] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reactors List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(reactorsPost.liked_by_users || []).length === 0 ? (
                <div className="text-center py-10 text-xs text-[#65676b]">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No reactions recorded yet.
                </div>
              ) : (
                (reactorsPost.liked_by_users || []).map((uid) => {
                  const profile = reactorsPost.liked_by_profiles?.[uid];
                  const displayName = profile?.username || (currentUser && currentUser.id === uid ? currentUser.username : `Student #${uid.slice(-4)}`);
                  const displayDept = profile?.department?.replace('College of ', '') || (currentUser && currentUser.id === uid ? currentUser.department.replace('College of ', '') : 'Campus');
                  const avatarUrl = (profile as any)?.avatar_url || getAvatarForPseudonym(displayName);

                  return (
                    <div key={uid} className="flex items-center gap-3 p-2.5 bg-[#f0f2f5]/60 hover:bg-[#f0f2f5] rounded-xl border border-[#e4e6eb] transition-colors">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-9 h-9 rounded-full border border-[#e4e6eb] object-cover bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-[#050505] truncate">{displayName}</p>
                        <p className="text-[11px] text-[#65676b] truncate">{displayDept}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#f33e5b] flex items-center justify-center shrink-0">
                        <Heart className="w-3 h-3 text-white fill-white" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-[#e4e6eb] shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setReactorsPost(null)}
                className="w-full py-2 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#050505] font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive User Profile Modal */}
      {viewingProfile && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setViewingProfile(null)}
        >
          <div
            className="bg-white border border-[#e4e6eb] p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl relative animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingProfile(null)}
              className="absolute top-3.5 right-3.5 p-1 hover:bg-[#f0f2f5] rounded-full transition-colors text-[#65676b] hover:text-[#050505] cursor-pointer"
              title="Close profile"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative w-20 h-20 mx-auto mb-3">
              <img
                src={viewingProfile.avatar_url || getAvatarForPseudonym(viewingProfile.username)}
                alt={viewingProfile.username}
                className="w-20 h-20 rounded-full border-2 border-[#e4e6eb] object-cover shadow-sm bg-[#f0f2f5]"
                onError={(e) => {
                  (e.target as HTMLElement).setAttribute('src', getAvatarForPseudonym(viewingProfile.username));
                }}
              />
              {viewingProfile.is_admin ? (
                <span className="absolute bottom-0 right-0 bg-[#701a31] text-white border-2 border-white rounded-full p-1 text-[10px]" title="Official Platform Admin">
                  👑
                </span>
              ) : (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Active Student" />
              )}
            </div>

            <h3 className="text-base font-bold text-[#050505] flex items-center justify-center gap-1.5">
              @{viewingProfile.username}
              {viewingProfile.is_admin && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#701a31]/10 text-[#701a31] rounded-full uppercase">
                  ADMIN
                </span>
              )}
            </h3>

            <div className="mt-1.5 inline-block px-2.5 py-0.5 bg-[#f0f2f5] text-[#65676b] rounded-full text-xs font-semibold">
              {viewingProfile.department.replace('College of ', '')}
            </div>

            <div className="mt-3.5 p-3 bg-[#f0f2f5] rounded-xl text-left border border-[#e4e6eb]">
              <p className="text-[10px] font-bold text-[#65676b] uppercase tracking-wider mb-0.5">Bio</p>
              <p className="text-xs text-[#050505] leading-relaxed">
                {viewingProfile.bio?.trim() ? viewingProfile.bio : "Active student at CU."}
              </p>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setViewingProfile(null);
                  startSearch();
                }}
                className="w-full py-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chat on Campus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMENT REACTORS MODAL (FACEBOOK STYLE BOTTOM SHEET / POPUP) ──────── */}
      {selectedCommentForReactors && (() => {
        const cm = selectedCommentForReactors;
        const profiles = cm.liked_by_profiles || {};
        const likedUserIds = cm.liked_by_users || Object.keys(profiles);
        const reactorsList = likedUserIds.map((uid) => {
          const prof = profiles[uid];
          return {
            id: uid,
            username: prof?.username || (currentUser && currentUser.id === uid ? currentUser.username : (uid.length > 8 ? `Student #${uid.slice(-4)}` : uid)),
            department: prof?.department?.replace('College of ', '') || (currentUser && currentUser.id === uid ? currentUser.department.replace('College of ', '') : 'CU Student'),
            avatar_url: prof?.avatar_url || (prof?.username ? getAvatarForPseudonym(prof.username) : getAvatarForPseudonym(uid)),
            reacted_at: prof?.reacted_at,
          };
        });

        return (
          <div
            className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
            onClick={() => setSelectedCommentForReactors(null)}
          >
            <div
              className="bg-white border-t-2 sm:border border-[#e4e6eb] rounded-t-3xl sm:rounded-2xl max-w-sm w-full shadow-2xl flex flex-col max-h-[75vh] sm:max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Grab Bar on Mobile */}
              <div className="pt-2.5 pb-1 flex flex-col items-center justify-center sm:hidden shrink-0 bg-white">
                <div className="w-12 h-1 bg-zinc-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="px-4 py-3 sm:py-3.5 border-b border-[#e4e6eb] flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#f33e5b] flex items-center justify-center text-white shadow-2xs">
                    <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#050505] tracking-tight leading-tight">
                      People who reacted
                    </h3>
                    <p className="text-[11px] text-[#65676b] font-medium">
                      {reactorsList.length} {reactorsList.length === 1 ? 'reaction' : 'reactions'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCommentForReactors(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-zinc-400 hover:text-black transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Reactors List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-[#f0f2f5] overscroll-contain">
                {reactorsList.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#65676b] font-medium">
                    No reactions yet.
                  </div>
                ) : (
                  reactorsList.map((user) => (
                    <div key={user.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar_url || getAvatarForPseudonym(user.username)}
                            alt={user.username}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-[#e4e6eb] bg-amber-50 shadow-2xs"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/avatars/coin-left.jpg');
                            }}
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#f33e5b] border-2 border-white flex items-center justify-center text-[8px] text-white shadow-2xs">
                            <Heart className="w-2 h-2 fill-white text-white" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-[#050505] truncate">
                            {user.username}
                          </p>
                          <p className="text-[11px] text-[#65676b] font-medium truncate">
                            {user.department}
                          </p>
                        </div>
                      </div>
                      {user.reacted_at && (
                        <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                          {formatRelativeTime(user.reacted_at, now)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fullscreen Image / GIF Lightbox Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-colors cursor-pointer"
            title="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="max-w-4xl max-h-[85vh] p-1 bg-white rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImage}
              alt="Campus Note Attachment Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
