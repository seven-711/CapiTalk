'use client';

import React from 'react';
import { useChatStore } from '../lib/store/useChatStore';
import { Navbar } from '../components/Navbar';
import { CoinMascot } from '../components/CoinMascot';
import { RegistrationModal } from '../components/RegistrationModal';
import { MatchmakingScreen } from '../components/MatchmakingScreen';
import { ChatRoom } from '../components/ChatRoom';
import { AdminDashboard } from '../components/AdminDashboard';
import { FreedomWall } from '../components/FreedomWall';
import { PostNotePage } from '../components/PostNotePage';
import { MusicWall } from '../components/MusicWall';
import { BannedScreen } from '../components/BannedScreen';
import { PrivacyPolicy } from '../components/PrivacyPolicy';
import { TermsOfConduct } from '../components/TermsOfConduct';
import { BlockedUsersPage } from '../components/BlockedUsersPage';
import { MidtermSzn } from '../components/MidtermSzn';
import { KeptConnectionsPage } from '../components/KeptConnectionsPage';
import { DedicateSongPage } from '../components/DedicateSongPage';
import { StreakModal } from '../components/StreakModal';
import { LoudspeakerModal } from '../components/LoudspeakerModal';
import { LoudspeakerLiveBanner } from '../components/LoudspeakerLiveBanner';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { getAvatarForPseudonym } from '../lib/constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Lock,
  ArrowRight,
  MessageSquare,
  ChevronDown,
  X,
  Radio,
  ExternalLink,
  Music,
  Compass,
  Heart,
  MessageCircle,
  Flame,
  Globe,
  Send,
} from 'lucide-react';

interface BannerComment {
  id: string;
  author: string;
  department: string;
  avatarUrl?: string;
  text: string;
  createdAt: number;
  likes: number;
  isLiked?: boolean;
}

interface ReactedUser {
  id: string;
  username: string;
  department?: string;
  avatarUrl?: string;
  reactedAt: number;
}


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
  return `${diffMonths}mo ago`;
};

const FacebookIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      clipRule="evenodd"
    />
  </svg>
);

export default function Home() {
  const {
    currentUser,
    viewState,
    setViewState,
    initSession,
    sendGlobalPresenceHeartbeat,
    queryPartnerPresence,
    isSearching,
    searchingTimeSeconds,
    showQueueTimeoutModal,
    activeRoom,
    partnerLeft,
    actionToast,
    clearToast,
    systemAnnouncement,
    dismissAnnouncement,
    freedomPosts,
    cancelSearch,
    isMatchTransitioning,
    setIsMatchTransitioning,
    streakCount,
    showStreakCelebrationModal,
    setShowStreakCelebrationModal,
    checkAndTriggerStreak,
  } = useChatStore();

  const [transitionPhase, setTransitionPhase] = React.useState<'idle' | 'in' | 'out'>('idle');
  const dotLottieRef = React.useRef<any>(null);
  const [isReactedUsersModalOpen, setIsReactedUsersModalOpen] = React.useState(false);
  const [reactedModalDragY, setReactedModalDragY] = React.useState(0);
  const [isReactedModalDragging, setIsReactedModalDragging] = React.useState(false);
  const reactedDragStartYRef = React.useRef<number | null>(null);

  const [reactedUsersList, setReactedUsersList] = React.useState<ReactedUser[]>([]);

  const isHeroHearted = React.useMemo(() => {
    const myId = currentUser?.id || currentUser?.username || 'me';
    const myName = currentUser?.username || 'You';
    return reactedUsersList.some((u) => u.id === myId || u.username === myName || u.id === 'me');
  }, [reactedUsersList, currentUser]);

  const [isCommentsModalOpen, setIsCommentsModalOpen] = React.useState(false);
  const [commentsList, setCommentsList] = React.useState<BannerComment[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUsers = localStorage.getItem('higalaay_banner_reacted_users_v1');
        if (savedUsers) setReactedUsersList(JSON.parse(savedUsers));
        const savedComments = localStorage.getItem('higalaay_banner_comments_v2');
        if (savedComments) setCommentsList(JSON.parse(savedComments));
      } catch (e) {}
    }
  }, []);
  const [newCommentInput, setNewCommentInput] = React.useState('');
  const [modalDragY, setModalDragY] = React.useState(0);
  const [isModalDragging, setIsModalDragging] = React.useState(false);
  const dragStartYRef = React.useRef<number | null>(null);
  const commentsContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Fetch reactions from Supabase DB / API for cross-device persistence
  const fetchHigalaayReactions = React.useCallback(async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('midterm_reactions')
          .select('user_id, user_name, updated_at')
          .eq('post_id', 'higalaay_banner_post_1')
          .order('updated_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const seen = new Set<string>();
          const list: ReactedUser[] = [];
          data.forEach((row: any, idx: number) => {
            const uid = row.user_id || row.user_name || `anon_${idx}`;
            if (!seen.has(uid)) {
              seen.add(uid);
              list.push({
                id: uid,
                username: row.user_name || 'Capitolian',
                department: 'CU Student',
                avatarUrl: getAvatarForPseudonym(row.user_name || 'Anon'),
                reactedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
              });
            }
          });
          setReactedUsersList(list);
          try {
            localStorage.setItem('higalaay_banner_reacted_users_v1', JSON.stringify(list));
            localStorage.setItem('higalaay_banner_heart_count', String(list.length));
          } catch (e) {}
          return;
        }
      }

      // Fallback API route
      const res = await fetch('/api/higalaay-reactions');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.users)) {
          const seen = new Set<string>();
          const list: ReactedUser[] = [];
          json.users.forEach((u: any, idx: number) => {
            const uid = u.id || u.username || `user_${idx}`;
            if (!seen.has(uid)) {
              seen.add(uid);
              list.push({
                ...u,
                id: uid,
              });
            }
          });
          setReactedUsersList(list);
          try {
            localStorage.setItem('higalaay_banner_reacted_users_v1', JSON.stringify(list));
            localStorage.setItem('higalaay_banner_heart_count', String(list.length));
          } catch (e) {}
        }
      }
    } catch (e) {}
  }, []);

  // Multi-Device Realtime & Polling Sync
  React.useEffect(() => {
    fetchHigalaayReactions();

    // Background interval to refresh total reactions across devices
    const syncTimer = setInterval(() => {
      fetchHigalaayReactions();
    }, 3500);

    // Supabase Realtime channel subscription
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('higalaay_reactions_channel')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'midterm_reactions', filter: 'post_id=eq.higalaay_banner_post_1' },
            () => {
              fetchHigalaayReactions();
            }
          )
          .subscribe();
      } catch (e) {}
    }

    // BroadcastChannel for instant local cross-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('capitalk_higalaay_reactions');
        bc.onmessage = (e) => {
          if (e.data?.type === 'SYNC_REACTIONS' && Array.isArray(e.data.users)) {
            setReactedUsersList(e.data.users);
          }
        };
      } catch (e) {}
    }

    return () => {
      clearInterval(syncTimer);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
    };
  }, [fetchHigalaayReactions]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('higalaay_banner_reacted_users_v1', JSON.stringify(reactedUsersList));
        localStorage.setItem('higalaay_banner_hearted', String(isHeroHearted));
        localStorage.setItem('higalaay_banner_heart_count', String(reactedUsersList.length));
      } catch (e) {}
    }
  }, [reactedUsersList, isHeroHearted]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('higalaay_banner_comments_v2', JSON.stringify(commentsList));
      } catch (e) {}
    }
  }, [commentsList]);

  const handleToggleHeroHeart = async () => {
    let deviceId = 'anon_dev';
    if (typeof window !== 'undefined') {
      try {
        let storedId = localStorage.getItem('capitalk_device_id_v1');
        if (!storedId) {
          storedId = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
          localStorage.setItem('capitalk_device_id_v1', storedId);
        }
        deviceId = storedId;
      } catch (e) {}
    }

    const myId = currentUser?.id || currentUser?.username || deviceId;
    const myName = currentUser?.username || 'Capitolian';
    const myDept = currentUser?.department?.replace('College of ', '') || 'CU Student';
    const myAvatar = currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg');

    const willHeart = !isHeroHearted;
    let nextList: ReactedUser[] = [];

    if (!willHeart) {
      nextList = reactedUsersList.filter((u) => u.id !== myId && u.username !== myName && u.id !== 'me');
    } else {
      const newReactedUser: ReactedUser = {
        id: myId,
        username: myName,
        department: myDept,
        avatarUrl: myAvatar,
        reactedAt: Date.now(),
      };
      nextList = [newReactedUser, ...reactedUsersList.filter((u) => u.id !== myId && u.username !== myName && u.id !== 'me')];
    }

    // Optimistic local state update
    setReactedUsersList(nextList);

    // Cross-tab broadcast
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('capitalk_higalaay_reactions');
        bc.postMessage({ type: 'SYNC_REACTIONS', users: nextList });
        bc.close();
      } catch (e) {}
    }

    // Persist to Supabase Database and Server API for cross-device reflection
    try {
      if (isSupabaseConfigured && supabase) {
        if (!willHeart) {
          await supabase
            .from('midterm_reactions')
            .delete()
            .eq('post_id', 'higalaay_banner_post_1')
            .eq('user_id', myId);
        } else {
          await supabase
            .from('midterm_reactions')
            .upsert({
              post_id: 'higalaay_banner_post_1',
              user_id: myId,
              user_name: myName,
              reaction_type: 'heart',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'post_id,user_id' });
        }
      } else {
        await fetch('/api/higalaay-reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: myId,
            username: myName,
            department: myDept,
            avatarUrl: myAvatar,
            action: willHeart ? 'add' : 'remove',
          }),
        });
      }
    } catch (err) {
      console.warn('Cross-device reaction sync error:', err);
    }
  };

  const handlePostBannerComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentInput.trim()) return;

    const newComment: BannerComment = {
      id: 'h_' + Date.now(),
      author: currentUser?.username || 'Capitolian_' + Math.floor(Math.random() * 899 + 100),
      department: currentUser?.department?.replace('College of ', '') || 'CU Student',
      avatarUrl: currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg'),
      text: newCommentInput.trim(),
      createdAt: Date.now(),
      likes: 0,
      isLiked: false,
    };

    setCommentsList((prev) => [newComment, ...prev]);
    setNewCommentInput('');
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = 0;
    }
  };

  const handleToggleCommentLike = (commentId: string) => {
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const isLiked = !c.isLiked;
          return {
            ...c,
            isLiked,
            likes: isLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
          };
        }
        return c;
      })
    );
  };

  // Slide Back Gestures (Touch & Pointer for Mobile + Desktop)
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
    setIsModalDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartYRef.current;
    if (deltaY > 0) {
      setModalDragY(deltaY);
    } else {
      setModalDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (modalDragY > 75) {
      setIsCommentsModalOpen(false);
    }
    setModalDragY(0);
    setIsModalDragging(false);
    dragStartYRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY;
    setIsModalDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isModalDragging || dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (deltaY > 0) {
      setModalDragY(deltaY);
    } else {
      setModalDragY(0);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (modalDragY > 75) {
      setIsCommentsModalOpen(false);
    }
    setModalDragY(0);
    setIsModalDragging(false);
    dragStartYRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {}
  };

  const isMatchmakingTimedOut = showQueueTimeoutModal || (viewState === 'queue' && !isSearching && searchingTimeSeconds >= 35);
  const shouldHideNavAndFooter = viewState === 'chat' || (viewState === 'queue' && isSearching) || isMatchmakingTimedOut || viewState === 'midterm_szn' || transitionPhase !== 'idle';

  React.useEffect(() => {
    if (viewState === 'kept_connections') {
      setViewState('landing');
    }
  }, [viewState, setViewState]);

  const [hasAcceptedToc, setHasAcceptedToc] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const accepted =
        localStorage.getItem('capitalk_toc_accepted_v1') === 'true' ||
        sessionStorage.getItem('capitalk_toc_accepted_session') === 'true';
      setHasAcceptedToc(accepted);
      if (accepted) {
        checkAndTriggerStreak();
      }
    }
  }, [checkAndTriggerStreak]);

  const handleAcceptToc = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('capitalk_toc_accepted_v1', 'true');
        sessionStorage.setItem('capitalk_toc_accepted_session', 'true');
      } catch (e) {}
    }
    setHasAcceptedToc(true);
    checkAndTriggerStreak(true);
    if (viewState === 'terms') {
      setViewState('landing');
    }
  };

  const handleMidtermBannerClick = () => {
    if (dotLottieRef.current) {
      try {
        dotLottieRef.current.stop();
        dotLottieRef.current.play();
      } catch (e) {}
    }
    setTransitionPhase('in');

    // Mount destination page in background while splash is 100% covering screen
    setTimeout(() => {
      setViewState('midterm_szn');
    }, 450);

    // Smooth fade-out
    setTimeout(() => {
      setTransitionPhase('out');
    }, 950);

    // Clean up
    setTimeout(() => {
      setTransitionPhase('idle');
    }, 1300);
  };

  // Match Preloader Transition Trigger (green_splash_transition.lottie)
  React.useEffect(() => {
    if (isMatchTransitioning) {
      if (dotLottieRef.current) {
        try {
          dotLottieRef.current.stop();
          dotLottieRef.current.play();
        } catch (e) {}
      }
      setTransitionPhase('in');

      // Hold splash transition as preloader while chatroom mounts & connects
      const timer1 = setTimeout(() => {
        setTransitionPhase('out');
      }, 1000);

      const timer2 = setTimeout(() => {
        setTransitionPhase('idle');
        setIsMatchTransitioning(false);
      }, 1350);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isMatchTransitioning, setIsMatchTransitioning]);

  React.useEffect(() => {
    if (actionToast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionToast, clearToast]);

  React.useEffect(() => {
    initSession();
    sendGlobalPresenceHeartbeat();
    queryPartnerPresence();
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('capitalk_theme');
        const isDark = saved !== null
          ? saved === '1'
          : (useChatStore.getState().themeMode === 1);
        const targetMode = isDark ? 1 : 0;
        if (isDark) {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
        if (useChatStore.getState().themeMode !== targetMode) {
          useChatStore.setState({ themeMode: targetMode });
        }
      } catch (e) {}
    }
  }, [initSession, sendGlobalPresenceHeartbeat, queryPartnerPresence]);

  // Prevent accidental page reloads while searching or active in a chat, and clean up queue on tab close
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSearching || (activeRoom && !partnerLeft)) {
        e.preventDefault();
        e.returnValue = 'You are currently searching for or chatting with a student. Are you sure you want to reload?';
        return e.returnValue;
      }
    };

    const handleUnload = () => {
      const store = useChatStore.getState();
      if (store.currentUser && store.isSearching) {
        store.cancelSearch();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isSearching, activeRoom, partnerLeft]);

  // Mobile browser history & hardware Back button synchronizer
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure initial entry exists in history state
    const currentView = useChatStore.getState().viewState;
    try {
      window.history.replaceState({ viewState: currentView, isAppRoot: true }, '', window.location.pathname);
    } catch (e) {}

    const handlePopState = (e: PopStateEvent) => {
      const store = useChatStore.getState();
      const targetView = e.state?.viewState;

      // Special handling when leaving active chatroom
      if (store.viewState === 'chat' && store.activeRoom && !store.partnerLeft) {
        const confirmLeave = window.confirm('Are you sure you want to leave the active chat?');
        if (!confirmLeave) {
          try {
            window.history.pushState({ viewState: 'chat' }, '', window.location.pathname);
          } catch (err) {}
          return;
        }
        store.leaveRoom();
      }

      if (targetView) {
        // Direct transition without pushing a duplicate entry
        store.setViewState(targetView, false);
        store.popViewHistory();
      } else {
        // If history state is null (e.g. backed to root of app), check viewHistory or return to landing
        if (store.viewHistory.length > 0) {
          store.goBack();
        } else if (store.viewState !== 'landing') {
          store.setViewState('landing', false);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (viewState === 'ceased') {
    return <BannedScreen />;
  }

  // Enforce Terms of Conduct (TOC) gate for the current browser session (allowing reading privacy policy)
  if (hasAcceptedToc === false && viewState !== 'privacy') {
    return <TermsOfConduct onAccept={handleAcceptToc} />;
  }

  return (
    <div className={`flex flex-col bg-[#f4f4f0] dark:bg-[#0e0e11] text-[#000000] dark:text-[#f4f4f6] transition-colors duration-200 ${
      viewState === 'chat' || viewState === 'kept_connections' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
    }`}>

      {/* ── Preloaded Fullscreen Green Splash Transition Overlay (Instant & White Background) ── */}
      <div
        className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden select-none ${
          transitionPhase === 'in'
            ? 'opacity-100 pointer-events-auto'
            : transitionPhase === 'out'
            ? 'opacity-0 pointer-events-none transition-opacity duration-300 ease-out'
            : 'opacity-0 pointer-events-none'
        }`}
        style={{
          visibility: transitionPhase === 'idle' ? 'hidden' : 'visible',
        }}
      >
        <DotLottieReact
          src="/animated-assets/green_splash_transition.lottie"
          autoplay={false}
          loop={false}
          dotLottieRefCallback={(ref: any) => {
            dotLottieRef.current = ref;
          }}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Floating Action Toast Notification */}
      {actionToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] animate-in fade-in slide-in-from-top-3 duration-300">
          <div className={`p-3 rounded-xl border-2 shadow-2xl flex items-center justify-between gap-3 text-xs font-bold ${
            actionToast.type === 'error' || actionToast.type === 'ban'
              ? 'bg-[#dc341e] text-white border-black'
              : actionToast.type === 'block' || actionToast.type === 'report'
              ? 'bg-black text-white border-black'
              : 'bg-[#ffc900] text-black border-black'
          }`}>
            <div className="flex items-center gap-2">
              <span>{actionToast.message}</span>
            </div>
            <button onClick={clearToast} className="p-0.5 hover:opacity-75 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Campus Loudspeaker Live Banner (Outside Chatroom) ───────────────── */}
      {viewState !== 'chat' && <LoudspeakerLiveBanner />}

      {/* ── Active Background Matchmaking Search Floating Bar ──────────────── */}
      {isSearching && viewState !== 'queue' && viewState !== 'chat' && (
        <aside
          aria-label="Active Matchmaking Status"
          onClick={() => setViewState('queue')}
          className="fixed bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] bg-[#1c1e21] hover:bg-[#282b30] text-white px-3.5 py-2.5 rounded-2xl shadow-[0_8px_28px_rgba(0,0,0,0.35)] border-2 border-black flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom-4 duration-200 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate flex items-center gap-1.5">
                <span>Looking for match...</span>
                <span className="text-[#ffc900] font-mono text-[11px]">
                  {Math.floor(searchingTimeSeconds / 60).toString().padStart(2, '0')}:{(searchingTimeSeconds % 60).toString().padStart(2, '0')}
                </span>
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                Tap anywhere to return to searching screen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 bg-[#ffc900] text-black text-[11px] font-extrabold rounded-lg">
              Back
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cancelSearch();
              }}
              className="px-2.5 py-1 bg-white/10 hover:bg-red-600 hover:text-white text-gray-300 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </aside>
      )}

      {/* Top Navbar (Hidden in chatroom view, during active queue searching, and on search timeout) */}
      {!shouldHideNavAndFooter && <Navbar />}

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {viewState === 'register' && <RegistrationModal />}

        {viewState === 'queue' && <MatchmakingScreen />}

        {viewState === 'chat' && <ChatRoom />}

        {viewState === 'admin' && <AdminDashboard />}

        {viewState === 'freedom_wall' && <FreedomWall />}
        {viewState === 'add_note' && <PostNotePage />}
        {viewState === 'music_wall' && <MusicWall />}
        {viewState === 'dedicate_song' && <DedicateSongPage />}
        {viewState === 'privacy' && <PrivacyPolicy />}
        {viewState === 'terms' && <TermsOfConduct onAccept={handleAcceptToc} isStandaloneView={true} />}
        {viewState === 'blocked_users' && <BlockedUsersPage />}
        {viewState === 'midterm_szn' && <MidtermSzn />}
        {viewState === 'kept_connections' && <KeptConnectionsPage />}

        {viewState === 'landing' && (
          <div className="w-full text-black dark:text-[#f4f4f6] font-sans transition-colors duration-200">
            {/* ── HERO SECTION ──────────────────────────────────────────────── */}
            <section className="sm:pt-6 sm:pb-12 sm:px-6 max-w-[1100px] mx-auto">
              <div className="text-center max-w-3xl mx-auto space-y-6">
                {/* Higalaay Festival Facebook Post Card */}
                <article
                  id="higalaay-banner-post"
                  className="overflow-hidden text-left w-full max-w-xl mx-auto rounded-3xl"
                >
                  {/* Post Header */}
                  <div className="p-3 sm:p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#701a31] to-[#4d0d1f] flex items-center justify-center text-white font-black text-xs sm:text-sm border border-black shadow-xs">
                          CT
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#1877f2] border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">
                          ✓
                        </div>
                      </div>

                      {/* Author Meta */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 leading-snug">
                          <span className="font-bold text-sm sm:text-[15px] text-[#050505] dark:text-white truncate">
                            CapiTalk
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium shrink-0">· Official</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          <span>Fiesta Season</span>
                          <span>·</span>
                          <Globe className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                          <span>Public</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Caption */}
                  <div className="px-3 sm:px-3.5 pb-2.5 text-xs sm:text-sm text-[#050505] dark:text-zinc-200 leading-relaxed">
                    <p>
                      Happy Higalaay Festival, Cagayan de Oro! 🎉✨ Viva Señor San Agustin! Wishing all Capitolians, friends, and higalas a joyous, safe, and festive celebration! 💛🎺🥁
                    </p>
                  </div>

                  {/* Pubmat Image */}
                  <div className="relative w-full bg-[#f8a81d] overflow-hidden border-y border-black/10 dark:border-white/10">
                    <img
                      src="/images/higalaay_banner.webp"
                      alt="Happy Higalaay Festival — Cagayan de Oro"
                      className="w-full h-auto object-cover max-h-[460px] mx-auto block select-none"
                      draggable={false}
                    />
                  </div>

                  {/* Reaction Summary Bar */}
                  <div className="px-3 sm:px-3.5 py-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setIsReactedUsersModalOpen(true)}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer group"
                      title="View total reactions"
                    >
                      <span className="w-5 h-5 flex items-center justify-center text-xs text-white group-hover:scale-110 transition-transform">
                        ❤️
                      </span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs sm:text-[13px] group-hover:underline">
                        {reactedUsersList.length.toLocaleString()} {reactedUsersList.length === 1 ? 'reaction' : 'reactions'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCommentsModalOpen(true)}
                      className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white font-medium hover:underline cursor-pointer"
                    >
                      {commentsList.length} {commentsList.length === 1 ? 'comment' : 'comments'}
                    </button>
                  </div>

                  {/* Post Action Buttons: Only Heart Reaction and Comments Button (No Share) */}
                  <div className="p-1 sm:p-1.5 grid grid-cols-2 gap-1.5">
                    {/* 1. Heart Reaction Button */}
                    <button
                      type="button"
                      onClick={handleToggleHeroHeart}
                      className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all cursor-pointer select-none active:scale-95 ${
                        isHeroHearted
                          ? 'text-[#f33e5b] bg-[#f33e5b]/10 hover:bg-[#f33e5b]/15'
                          : 'text-zinc-600 dark:text-zinc-300 hover:text-[#f33e5b] hover:bg-rose-50/60 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isHeroHearted ? 'fill-[#f33e5b] text-[#f33e5b] scale-110' : ''
                        }`}
                      />
                      <span>{isHeroHearted ? 'Loved' : 'Love'}</span>
                    </button>

                    {/* 2. Comments Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsCommentsModalOpen(true)}
                      className="py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer select-none active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Comments</span>
                    </button>
                  </div>
                </article>

                {/* 3 Uniform Feature Quick-Jump Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-lg mx-auto w-full px-4 pt-1">
                  {/* 1. Live 1-on-1 Chat */}
                  <button
                    type="button"
                    onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                    className="relative p-3 sm:p-4 bg-white dark:bg-[#18181b] hover:bg-[#fff8e6] dark:hover:bg-neutral-800 border-2 border-black dark:border-white/20 rounded-2xl flex flex-col items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center group cursor-pointer"
                  >
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599]"></span>
                    </span>

                    <div className="w-10 h-10 rounded-xl bg-[#701a31] text-white flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-105 transition-all">
                      <MessageSquare className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-black dark:text-white leading-tight truncate">1-on-1 Chat</span>
                      <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">Live Match</span>
                    </div>
                  </button>

                  {/* 2. Freedom Wall */}
                  <button
                    type="button"
                    onClick={() => setViewState('freedom_wall')}
                    className="relative p-3 sm:p-4 bg-white dark:bg-[#18181b] hover:bg-[#fff1f3] dark:hover:bg-[#271216] border-2 border-black dark:border-white/20 rounded-2xl flex flex-col items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#ffc900] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-105 transition-all">
                      <Radio className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-black dark:text-white leading-tight truncate">Freedom Wall</span>
                      <span className="inline-block text-[10px] text-[#701a31] dark:text-[#ff90e8] font-extrabold mt-0.5 truncate">
                        {freedomPosts.length > 0 ? `${freedomPosts.length} Notes` : 'Campus Notes'}
                      </span>
                    </div>
                  </button>

                  {/* 3. Music Wall */}
                  <button
                    type="button"
                    onClick={() => setViewState('music_wall')}
                    className="relative p-3 sm:p-4 bg-white dark:bg-[#18181b] hover:bg-[#ffe3e8] dark:hover:bg-[#35181e] border-2 border-black dark:border-white/20 rounded-2xl flex flex-col items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#ff90e8] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-105 transition-all">
                      <Music className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-black dark:text-white leading-tight truncate">Music Wall</span>
                      <span className="inline-block text-[10px] text-zinc-600 dark:text-zinc-400 font-extrabold mt-0.5">Dedications</span>
                    </div>
                  </button>
                </div>

                {/* Primary CTA Button */}
                <div className="pt-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => setViewState('queue')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-black text-sm sm:text-base rounded-2xl border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Start Matching</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewState('register')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-black text-sm sm:text-base rounded-2xl border-2 border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Start Matching</span>
                    </button>
                  )}
                </div>

                {/* Micro Privacy Note */}
                <div className="pt-1 flex flex-col items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  <p className="text-[11px] sm:text-xs">No real names, student numbers, or university logins required &middot; Ephemeral chat sessions.</p>
                  <button
                    type="button"
                    onClick={() => setViewState('privacy')}
                    className="text-[11px] sm:text-xs font-black text-[#701a31] dark:text-[#ff90e8] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>Read Privacy &amp; Data Transparency Guarantee</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ── CORE HIGHLIGHTS SECTION (3 Uniform Columns) ────────────────── */}
            <section id="features" className="py-8 sm:py-14 px-3 sm:px-6 max-w-[1100px] mx-auto border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-2">
                <span className="bg-[#701a31] text-white text-[11px] font-black px-3 py-1 rounded-full border border-black uppercase tracking-wider shadow-2xs inline-block">
                  Campus Platform
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight">
                  Designed for Capitol University
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                  Everything you need to discover new friendships and explore campus life safely.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. Department Filtering */}
                <div className="bg-white dark:bg-[#18181b] p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-[#27272a] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#701a31] text-white border-2 border-black flex items-center justify-center shadow-xs">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                      Smart Department Matching
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Pair with students from your own college or explore connections across Computer Studies, Engineering, Nursing, Business, CAS, Maritime, Education, and Criminology.
                    </p>
                  </div>
                </div>

                {/* 2. Zero-Log Privacy */}
                <div className="bg-white dark:bg-[#18181b] p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-[#27272a] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00e599] text-black border-2 border-black flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                      Ephemeral &amp; Anonymous
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Chats exist in temporary memory only. No transcripts or sensitive data are stored, and messages automatically vanish forever when conversations finish.
                    </p>
                  </div>
                </div>

                {/* 3. Community Wall & Kept Connections */}
                <div className="bg-white dark:bg-[#18181b] p-5 sm:p-6 rounded-2xl border-2 border-black dark:border-[#27272a] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.08)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ffc900] text-black border-2 border-black flex items-center justify-center shadow-xs">
                      <Radio className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                      Freedom Wall &amp; Friends
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Post anonymous notes, react to campus confessions, listen to shared music dedications, and save 1 kept connection to direct message even after skipping.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── OFFICIAL FACEBOOK COMMUNITY SHOWCASE ──────────────────────── */}
            <section className="py-6 sm:py-10 px-3 sm:px-6 max-w-[1100px] mx-auto">
              <div className="bg-white dark:bg-[#18181b] border-2 border-black dark:border-[#27272a] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.08)]">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
                  {/* Left Info Column */}
                  <div className="flex-1 space-y-3 text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877f2]/10 border border-[#1877f2]/30 text-[#1877f2] font-black text-xs rounded-full shadow-2xs">
                      <FacebookIcon className="w-3.5 h-3.5 fill-[#1877f2]" />
                      <span>Official Facebook Page</span>
                    </div>

                    <h2 className="text-xl sm:text-3xl font-black text-black dark:text-white tracking-tight leading-tight">
                      Follow CapiTalk on Facebook
                    </h2>

                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Stay updated with campus news, platform maintenance notices, trending Freedom Wall highlights, and official community announcements.
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <a
                        href="https://www.facebook.com/share/17PF9MvuSC/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto text-xs sm:text-sm px-6 py-3 bg-[#1877f2] hover:bg-[#166fe5] text-white font-black rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all active:scale-98"
                      >
                        <FacebookIcon className="w-4 h-4 fill-white" />
                        <span>Visit Facebook Page</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                      </a>
                    </div>
                  </div>

                  {/* Right Visual Card */}
                  <div className="w-full lg:w-[320px] shrink-0 flex justify-center">
                    <a
                      href="https://www.facebook.com/share/17PF9MvuSC/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group relative rounded-2xl overflow-hidden border-2 border-black dark:border-white/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.02] active:scale-[0.99] transition-all bg-[#701a31] max-w-[280px]"
                    >
                      <div className="relative aspect-[3/1] w-full overflow-hidden bg-[#701a31] border-b-2 border-black">
                        <img
                          src="/images/fb-cover-banner.png"
                          alt="CapiTalk Facebook Banner"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="relative bg-[#1c1c1e] p-2 text-white">
                        <img
                          src="/images/fb-page-preview.png"
                          alt="CapiTalk Facebook Page Preview"
                          className="w-full h-auto rounded-xl object-contain shadow-md"
                        />
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* ── DATA PRIVACY & NON-AFFILIATION DISCLAIMER ─────────────────── */}
            <section className="py-6 sm:py-10 px-3 sm:px-6 max-w-[1100px] mx-auto">
              <div className="bg-[#fff8e6] dark:bg-[#1f1a14] border-2 border-black dark:border-[#ffc900]/30 rounded-3xl p-6 sm:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,201,0,0.1)] text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-1.5">
                  <span className="bg-[#ffc900] text-black text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border border-black uppercase tracking-wider shadow-2xs inline-block">
                    Student Data Guarantee
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    Zero Data Harvested &middot; Student-Led Community
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed">
                    CapiTalk is an independent student project created exclusively for Capitol University students. No student ID numbers, university portal logins, or real personal details are ever collected.
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold pt-1">
                    * CapiTalk is an independent platform and is not officially affiliated with Capitol University administration.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewState('privacy')}
                  className="px-5 py-2.5 bg-[#701a31] hover:bg-[#4d0d1f] text-white font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 self-start md:self-center cursor-pointer transition-all active:scale-95"
                >
                  <span>Read Privacy Policy &rarr;</span>
                </button>
              </div>
            </section>

            {/* ── COMMUNITY GUIDELINES ──────────────────────────────────────── */}
            <section className="py-10 sm:py-14 px-3 sm:px-6 max-w-[1100px] mx-auto border-t border-zinc-200 dark:border-zinc-800">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    Community Guidelines
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                    Keeping CapiTalk respectful, safe, and positive for all students.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 bg-white dark:bg-[#18181b] border-2 border-black dark:border-[#27272a] rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)] space-y-1">
                    <h4 className="font-black text-black dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Respect Every Peer
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Treat every student with dignity. Bullying, hate speech, or harassment results in immediate restrictions.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#18181b] border-2 border-black dark:border-[#27272a] rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)] space-y-1">
                    <h4 className="font-black text-black dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Protect Your Privacy
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Never share real passwords, personal phone numbers, physical addresses, or ID credentials in chat.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#18181b] border-2 border-black dark:border-[#27272a] rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)] space-y-1">
                    <h4 className="font-black text-black dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Prohibited Media
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      NSFW images, explicit content, spam links, and offensive files are blocked by moderation filters.
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#18181b] border-2 border-black dark:border-[#27272a] rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.06)] space-y-1">
                    <h4 className="font-black text-black dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Live Moderation
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                      Use the top Report and Block tools anytime to alert moderators or permanently block troublesome users.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER — hidden during active chat, active search, and search timeout */}
      {!shouldHideNavAndFooter && (
        <footer className="bg-[#f4f4f0] dark:bg-[#0e0e11] border-t border-[#d1d5dc] dark:border-[#27272a] pt-8 pb-24 sm:py-8 px-4 sm:px-8 mt-auto transition-colors duration-200">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <CoinMascot size={28} tiltAngle={-6} />
                <span className="font-extrabold text-sm text-black dark:text-white">CapiTalk</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[#242423] dark:text-neutral-300">
              <button onClick={() => setViewState('landing')} className="hover:text-black dark:hover:text-white transition-colors">
                Home
              </button>
              <button onClick={() => setViewState('register')} className="hover:text-black dark:hover:text-white transition-colors">
                Register
              </button>
              <button onClick={() => setViewState('freedom_wall')} className="hover:text-black dark:hover:text-white transition-colors">
                Freedom Wall
              </button>
              <button onClick={() => setViewState('terms')} className="hover:text-[#701a31] dark:hover:text-[#ff90e8] font-extrabold transition-colors">
                Terms and Conditions
              </button>
              <button onClick={() => setViewState('privacy')} className="text-[#701a31] dark:text-[#ff90e8] hover:underline font-extrabold transition-colors">
                Privacy Policy
              </button>
              <a
                href="https://www.facebook.com/share/17PF9MvuSC/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full font-extrabold text-xs shadow-2xs border border-black dark:border-white/20 transition-all hover:scale-105 active:scale-95"
              >
                <FacebookIcon className="w-3.5 h-3.5 fill-white" />
                <span>Facebook Page</span>
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* ── WHO REACTED MODAL (FACEBOOK STYLE BOTTOM SHEET / DIALOG) ──────── */}
      {isReactedUsersModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center animate-in fade-in duration-200"
          onClick={() => {
            setIsReactedUsersModalOpen(false);
            setReactedModalDragY(0);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translateY(${reactedModalDragY}px)`,
              transition: isReactedModalDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-black shadow-2xl flex flex-col max-h-[75vh] sm:max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out font-sans"
          >
            {/* Grab Handle & Header */}
            <div
              onTouchStart={(e) => {
                reactedDragStartYRef.current = e.touches[0].clientY;
                setIsReactedModalDragging(true);
              }}
              onTouchMove={(e) => {
                if (reactedDragStartYRef.current === null) return;
                const delta = e.touches[0].clientY - reactedDragStartYRef.current;
                if (delta > 0) setReactedModalDragY(delta);
              }}
              onTouchEnd={() => {
                if (reactedModalDragY > 75) setIsReactedUsersModalOpen(false);
                setReactedModalDragY(0);
                setIsReactedModalDragging(false);
                reactedDragStartYRef.current = null;
              }}
              className="pt-2.5 pb-2 flex flex-col items-center justify-center touch-none cursor-grab active:cursor-grabbing select-none bg-white border-b border-zinc-100 shrink-0"
              title="Drag down to close"
            >
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full mb-2" />
              <div className="w-full px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center text-xs text-white">
                    ❤️
                  </span>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-[#050505] tracking-tight leading-snug">
                      Reactions
                    </h3>
                  </div>
                </div>  
                <button
                  type="button"
                  onClick={() => setIsReactedUsersModalOpen(false)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Reaction Filter / Summary Pill Tabs */}
              <div className="w-full px-4 pt-2.5 flex items-center gap-2">
                <div className="px-3 py-1 bg-zinc-100 text-zinc-800 text-xs font-bold rounded-full flex items-center gap-1.5 shadow-2xs">
                  <span>All</span>
                  <span className="text-zinc-500 font-normal">({reactedUsersList.length})</span>
                </div>
                <div className="px-3 py-1 bg-rose-50 text-[#f33e5b] text-xs font-bold rounded-full flex items-center gap-1.5 shadow-2xs border border-rose-100">
                  <span>❤️</span>
                  <span>{reactedUsersList.length}</span>
                </div>
              </div>
            </div>

            {/* Reacted Users List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-white overscroll-contain">
              {reactedUsersList.length === 0 ? (
                <div className="text-center py-10 px-4 flex flex-col items-center justify-center">
                  <span className="text-3xl mb-2">❤️</span>
                  <p className="font-bold text-sm text-[#050505]">No reactions yet</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Be the first to react with love!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {reactedUsersList.map((user, idx) => (
                    <div key={`reacted-user-${user.id || user.username || 'user'}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with Love Badge Overlay */}
                        <div className="relative shrink-0">
                          <img
                            src={user.avatarUrl || (user.username ? getAvatarForPseudonym(user.username) : '/avatars/coin-left.jpg')}
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover border border-black/15 bg-amber-50 shadow-2xs"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/avatars/coin-left.jpg');
                            }}
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[8px] text-white shadow-2xs">
                            ❤️
                          </span>
                        </div>

                        {/* Name & Department */}
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-[#050505] truncate">
                            {user.username}
                          </p>
                          {user.department && (
                            <p className="text-[11px] text-zinc-500 font-medium truncate">
                              {user.department}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Relative time */}
                      <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                        {formatRelativeTime(user.reactedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HIGALAAY COMMENTS BOTTOM-TO-TOP SHEET MODAL WITH SLIDE BACK GESTURE ── */}
      {isCommentsModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center animate-in fade-in duration-200"
          onClick={() => {
            setIsCommentsModalOpen(false);
            setModalDragY(0);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translateY(${modalDragY}px)`,
              transition: isModalDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-black shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300 ease-out font-sans"
          >
            {/* Grab Handle & Slide-back Drag Area */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="pt-2.5 pb-1 flex flex-col items-center justify-center touch-none cursor-grab active:cursor-grabbing select-none bg-white hover:bg-zinc-50/80 transition-colors border-b border-zinc-100 shrink-0"
              title="Drag down to close"
            >
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full mb-1.5" />
              <div className="w-full px-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base text-[#050505] tracking-tight">
                    Comments
                  </h3>
                  <span className="px-2 py-0.5 bg-[#f0f2f5] text-zinc-600 text-[11px] font-bold rounded-full">
                    {commentsList.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCommentsModalOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors cursor-pointer"
                  aria-label="Close comments"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Comments Feed */}
            <div
              ref={commentsContainerRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#f8f9fa] overscroll-contain"
            >
              {/* Comments List */}
              {commentsList.length === 0 ? (
                <div className="text-center py-14 px-4 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xl mb-2.5 text-zinc-400">
                    💬
                  </div>
                  <p className="font-bold text-sm text-[#050505]">No comments yet</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    Be the first to share a thought or greeting for Higalaay Festival!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commentsList.map((c, cIdx) => (
                    <div key={`banner-cm-${c.id || c.author || 'comment'}-${cIdx}`} className="flex items-start gap-2.5">
                      <img
                        src={c.avatarUrl || (c.author ? getAvatarForPseudonym(c.author) : '/avatars/coin-left.jpg')}
                        alt={c.author}
                        className="w-8 h-8 rounded-full object-cover border border-black/15 shrink-0 mt-0.5 bg-amber-50 shadow-2xs"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', '/avatars/coin-left.jpg');
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="inline-block bg-white border border-zinc-200 rounded-2xl px-3.5 py-2 text-xs sm:text-[13px] shadow-2xs max-w-full">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-[#050505] text-[12px] sm:text-xs">
                              {c.author}
                            </span>
                            {c.department && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-[#f0f2f5] text-zinc-600 rounded-md">
                                {c.department}
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-800 leading-snug break-words">
                            {c.text}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-1 text-[11px] text-zinc-500 font-semibold">
                          <span>{formatRelativeTime(c.createdAt)}</span>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => handleToggleCommentLike(c.id)}
                            className={`flex items-center gap-1 hover:underline cursor-pointer ${
                              c.isLiked ? 'text-[#f33e5b] font-bold' : 'text-zinc-500'
                            }`}
                          >
                            <Heart className={`w-3 h-3 ${c.isLiked ? 'fill-[#f33e5b]' : ''}`} />
                            <span>{c.likes > 0 ? c.likes : 'Like'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Bottom Comment Composer */}
            <div className="p-2.5 sm:p-3 bg-white border-t border-zinc-200 shrink-0">
              <form onSubmit={handlePostBannerComment} className="flex items-center gap-2">
                <img
                  src={currentUser?.avatar_url || (currentUser?.username ? getAvatarForPseudonym(currentUser.username) : '/avatars/coin-left.jpg')}
                  alt={currentUser?.username || 'You'}
                  className="w-8 h-8 rounded-full object-cover border border-black/15 shrink-0 bg-amber-50 shadow-2xs"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', '/avatars/coin-left.jpg');
                  }}
                />
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    value={newCommentInput}
                    onChange={(e) => setNewCommentInput(e.target.value)}
                    placeholder="Write a festival greeting..."
                    className="w-full bg-[#f0f2f5] hover:bg-[#ebedf0] focus:bg-white text-xs sm:text-[13px] text-[#050505] placeholder-[#65676b] px-3.5 py-2 pr-9 rounded-full border border-transparent focus:border-[#701a31] focus:outline-none transition-all"
                  />
                  {newCommentInput.trim() && (
                    <button
                      type="submit"
                      className="absolute right-2 p-1 text-[#701a31] hover:text-[#521323] transition-colors cursor-pointer"
                      title="Post comment"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Daily Streak Flame Celebration Modal */}
      <StreakModal
        isOpen={showStreakCelebrationModal}
        onClose={() => setShowStreakCelebrationModal(false)}
        streakCount={streakCount}
      />

      {/* Campus Loudspeaker Booking & Timetable Modal */}
      <LoudspeakerModal />
    </div>
  );
}
