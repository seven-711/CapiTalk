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
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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
} from 'lucide-react';

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

  const isMatchmakingTimedOut = showQueueTimeoutModal || (viewState === 'queue' && !isSearching && searchingTimeSeconds >= 35);
  const shouldHideNavAndFooter = viewState === 'chat' || viewState === 'kept_connections' || (viewState === 'queue' && isSearching) || isMatchmakingTimedOut || viewState === 'midterm_szn' || transitionPhase !== 'idle';

  const [hasAcceptedToc, setHasAcceptedToc] = React.useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('capitalk_toc_accepted_v1') === 'true' ||
        sessionStorage.getItem('capitalk_toc_accepted_session') === 'true'
      );
    }
    return null;
  });

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
  }, [initSession]);

  // Prevent accidental page reloads while searching or active in a chat
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSearching || (activeRoom && !partnerLeft)) {
        e.preventDefault();
        e.returnValue = 'You are currently searching for or chatting with a student. Are you sure you want to reload?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
    <div className={`flex flex-col bg-[#f4f4f0] text-[#000000] ${
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
          dotLottieRefCallback={(ref) => {
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
          <div className="w-full text-black font-sans">
            {/* ── HERO SECTION ──────────────────────────────────────────────── */}
            <section className="pt-3 pb-8 sm:pt-6 sm:pb-12 px-3 sm:px-6 max-w-[1100px] mx-auto">
              <div className="text-center max-w-3xl mx-auto space-y-6">
                {/* Midterm Season Spotlight Banner */}
                <button
                  id="midterm-banner-btn"
                  type="button"
                  onClick={handleMidtermBannerClick}
                  className="group relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all duration-200 cursor-pointer text-left block"
                >
                  <div className="relative w-full aspect-[16/6] sm:aspect-[16/4.5] overflow-hidden bg-[#0d2a0d]">
                    <img
                      src="/images/banner.webp"
                      alt="Midterm Season — Ready naka?"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-center pl-5 sm:pl-8">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ffc900] text-black text-[10px] sm:text-xs font-black rounded-full border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] w-fit mb-2 uppercase tracking-wider">
                        Midterm Season
                      </span>
                      <h2 className="text-white font-black text-lg sm:text-2xl md:text-3xl leading-tight tracking-tight drop-shadow-md">
                        Midterm na! Ready naka?
                      </h2>
                      <p className="text-white/90 text-xs sm:text-sm font-semibold mt-1 drop-shadow">
                        React and let the campus know how you feel &rarr;
                      </p>
                    </div>
                  </div>
                </button>

                {/* 3 Uniform Feature Quick-Jump Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 max-w-lg mx-auto w-full pt-1">
                  {/* 1. Live 1-on-1 Chat */}
                  <button
                    type="button"
                    onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                    className="relative p-3 sm:p-4 bg-white hover:bg-[#fff8e6] border-2 border-black rounded-2xl flex flex-col items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center group cursor-pointer"
                  >
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e599] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e599]"></span>
                    </span>

                    <div className="w-10 h-10 rounded-xl bg-[#701a31] text-white flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-105 transition-all">
                      <MessageSquare className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-black leading-tight truncate">1-on-1 Chat</span>
                      <span className="inline-block text-[10px] text-emerald-700 font-extrabold mt-0.5">Live Match</span>
                    </div>
                  </button>

                  {/* 2. Freedom Wall */}
                  <button
                    type="button"
                    onClick={() => setViewState('freedom_wall')}
                    className="relative p-3 sm:p-4 bg-white hover:bg-[#fff1f3] border-2 border-black rounded-2xl flex flex-col items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#ffc900] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-105 transition-all">
                      <Radio className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-black leading-tight truncate">Freedom Wall</span>
                      <span className="inline-block text-[10px] text-[#701a31] font-extrabold mt-0.5 truncate">
                        {freedomPosts.length > 0 ? `${freedomPosts.length} Notes` : 'Campus Notes'}
                      </span>
                    </div>
                  </button>

                  {/* 3. Music Wall */}
                  <button
                    type="button"
                    onClick={() => setViewState('music_wall')}
                    className="relative p-3 sm:p-4 bg-white hover:bg-[#ffe3e8] border-2 border-black rounded-2xl flex flex-col items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#ff90e8] text-black flex items-center justify-center border-2 border-black shadow-xs group-hover:scale-105 transition-all">
                      <Music className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-black text-black leading-tight truncate">Music Wall</span>
                      <span className="inline-block text-[10px] text-zinc-600 font-extrabold mt-0.5">Dedications</span>
                    </div>
                  </button>
                </div>

                {/* Primary CTA Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => setViewState('queue')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-black hover:bg-zinc-800 text-white font-black text-sm sm:text-base rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Start Matching</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewState('register')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-black hover:bg-zinc-800 text-white font-black text-sm sm:text-base rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-[#ffc900]" />
                      <span>Join CapiTalk &mdash; It&apos;s Free</span>
                    </button>
                  )}
                </div>

                {/* Micro Privacy Note */}
                <div className="pt-1 flex flex-col items-center gap-1 text-xs text-zinc-500 font-medium">
                  <p className="text-[11px] sm:text-xs">No real names, student numbers, or university logins required &middot; Ephemeral chat sessions.</p>
                  <button
                    type="button"
                    onClick={() => setViewState('privacy')}
                    className="text-[11px] sm:text-xs font-black text-[#701a31] hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>Read Privacy &amp; Data Transparency Guarantee</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ── CORE HIGHLIGHTS SECTION (3 Uniform Columns) ────────────────── */}
            <section id="features" className="py-8 sm:py-14 px-3 sm:px-6 max-w-[1100px] mx-auto border-t border-zinc-200">
              <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12 space-y-2">
                <span className="bg-[#701a31] text-white text-[11px] font-black px-3 py-1 rounded-full border border-black uppercase tracking-wider shadow-2xs inline-block">
                  Campus Platform
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                  Designed for Capitol University
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 font-medium">
                  Everything you need to discover new friendships and explore campus life safely.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
                {/* 1. Department Filtering */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#701a31] text-white border-2 border-black flex items-center justify-center shadow-xs">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                      Smart Department Matching
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                      Pair with students from your own college or explore connections across Computer Studies, Engineering, Nursing, Business, CAS, Maritime, Education, and Criminology.
                    </p>
                  </div>
                </div>

                {/* 2. Zero-Log Privacy */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00e599] text-black border-2 border-black flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                      Ephemeral &amp; Anonymous
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                      Chats exist in temporary memory only. No transcripts or sensitive data are stored, and messages automatically vanish forever when conversations finish.
                    </p>
                  </div>
                </div>

                {/* 3. Community Wall & Kept Connections */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ffc900] text-black border-2 border-black flex items-center justify-center shadow-xs">
                      <Radio className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-black tracking-tight">
                      Freedom Wall &amp; Friends
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                      Post anonymous notes, react to campus confessions, listen to shared music dedications, and save 1 kept connection to direct message even after skipping.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── OFFICIAL FACEBOOK COMMUNITY SHOWCASE ──────────────────────── */}
            <section className="py-6 sm:py-10 px-3 sm:px-6 max-w-[1100px] mx-auto">
              <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
                  {/* Left Info Column */}
                  <div className="flex-1 space-y-3 text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877f2]/10 border border-[#1877f2]/30 text-[#1877f2] font-black text-xs rounded-full shadow-2xs">
                      <FacebookIcon className="w-3.5 h-3.5 fill-[#1877f2]" />
                      <span>Official Facebook Page</span>
                    </div>

                    <h2 className="text-xl sm:text-3xl font-black text-black tracking-tight leading-tight">
                      Follow CapiTalk on Facebook
                    </h2>

                    <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
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
                      className="block group relative rounded-2xl overflow-hidden border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.02] active:scale-[0.99] transition-all bg-[#701a31] max-w-[280px]"
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
              <div className="bg-[#fff8e6] border-2 border-black rounded-3xl p-6 sm:p-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-1.5">
                  <span className="bg-[#ffc900] text-black text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border border-black uppercase tracking-wider shadow-2xs inline-block">
                    Student Data Guarantee
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black text-black tracking-tight">
                    Zero Data Harvested &middot; Student-Led Community
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-700 font-medium leading-relaxed">
                    CapiTalk is an independent student project created exclusively for Capitol University students. No student ID numbers, university portal logins, or real personal details are ever collected.
                  </p>
                  <p className="text-[11px] text-zinc-500 font-semibold pt-1">
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
            <section className="py-10 sm:py-14 px-3 sm:px-6 max-w-[1100px] mx-auto border-t border-zinc-200">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                    Community Guidelines
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 font-medium">
                    Keeping CapiTalk respectful, safe, and positive for all students.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 bg-white border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1">
                    <h4 className="font-black text-black text-xs sm:text-sm flex items-center gap-1.5">
                      Respect Every Peer
                    </h4>
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                      Treat every student with dignity. Bullying, hate speech, or harassment results in immediate restrictions.
                    </p>
                  </div>

                  <div className="p-4 bg-white border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1">
                    <h4 className="font-black text-black text-xs sm:text-sm flex items-center gap-1.5">
                      Protect Your Privacy
                    </h4>
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                      Never share real passwords, personal phone numbers, physical addresses, or ID credentials in chat.
                    </p>
                  </div>

                  <div className="p-4 bg-white border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1">
                    <h4 className="font-black text-black text-xs sm:text-sm flex items-center gap-1.5">
                      Prohibited Media
                    </h4>
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                      NSFW images, explicit content, spam links, and offensive files are blocked by moderation filters.
                    </p>
                  </div>

                  <div className="p-4 bg-white border-2 border-black rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1">
                    <h4 className="font-black text-black text-xs sm:text-sm flex items-center gap-1.5">
                      Live Moderation
                    </h4>
                    <p className="text-xs text-zinc-600 font-medium leading-relaxed">
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
        <footer className="bg-[#f4f4f0] border-t border-[#d1d5dc] pt-8 pb-24 sm:py-8 px-4 sm:px-8 mt-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <CoinMascot size={28} tiltAngle={-6} />
                <span className="font-extrabold text-sm text-black">CapiTalk</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[#242423]">
              <button onClick={() => setViewState('landing')} className="hover:text-black transition-colors">
                Home
              </button>
              <button onClick={() => setViewState('register')} className="hover:text-black transition-colors">
                Register
              </button>
              <button onClick={() => setViewState('freedom_wall')} className="hover:text-black transition-colors">
                Freedom Wall
              </button>
              <button onClick={() => setViewState('terms')} className="hover:text-[#701a31] font-extrabold transition-colors">
                Terms and Conditions
              </button>
              <button onClick={() => setViewState('privacy')} className="text-[#701a31] hover:underline font-extrabold transition-colors">
                Privacy Policy
              </button>
              <a
                href="https://www.facebook.com/share/17PF9MvuSC/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full font-extrabold text-xs shadow-2xs border border-black transition-all hover:scale-105 active:scale-95"
              >
                <FacebookIcon className="w-3.5 h-3.5 fill-white" />
                <span>Facebook Page</span>
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Daily Streak Flame Celebration Modal */}
      <StreakModal
        isOpen={showStreakCelebrationModal}
        onClose={() => setShowStreakCelebrationModal(false)}
        streakCount={streakCount}
      />
    </div>
  );
}
