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
import { MusicWall } from '../components/MusicWall';
import { CampusMap } from '../components/CampusMap';
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
} from 'lucide-react';

export default function Home() {
  const {
    currentUser,
    viewState,
    setViewState,
    initSession,
    isSearching,
    activeRoom,
    partnerLeft,
    actionToast,
    clearToast,
    systemAnnouncement,
    dismissAnnouncement,
  } = useChatStore();

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

  return (
    <div className={`flex flex-col bg-[#f4f4f0] text-[#000000] ${
      viewState === 'chat' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
    }`}>

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

      {/* Top Navbar (Hidden in chatroom view) */}
      {viewState !== 'chat' && <Navbar />}

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {viewState === 'register' && <RegistrationModal />}

        {viewState === 'queue' && <MatchmakingScreen />}

        {viewState === 'chat' && <ChatRoom />}

        {viewState === 'admin' && <AdminDashboard />}

        {viewState === 'freedom_wall' && <FreedomWall />}
        {viewState === 'music_wall' && <MusicWall />}
        {viewState === 'campus_map' && <CampusMap />}

        {viewState === 'landing' && (
          <div className="w-full">
            {/* HERO SECTION */}
            <section className="relative pt-3 pb-8 sm:pt-6 sm:pb-12 px-3 sm:px-6 max-w-[1200px] mx-auto overflow-hidden">
              {/* Floating Decorative Mascot Coins */}
              <div className="absolute top-6 left-4 sm:left-12 pointer-events-none opacity-85">
                <CoinMascot size={76} tiltAngle={-18} symbol="C" />
              </div>
              <div className="absolute top-12 right-6 sm:right-16 pointer-events-none opacity-90">
                <CoinMascot size={96} tiltAngle={22} symbol="G" />
              </div>
              <div className="absolute bottom-4 right-1/3 pointer-events-none opacity-40 hidden sm:block">
                <CoinMascot size={54} tiltAngle={-8} symbol="CU" />
              </div>

              <div className="text-center max-w-3xl mx-auto relative z-10">
                {/* School Tagline Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-black rounded-full text-xs font-extrabold text-black mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c41e3a] animate-pulse" />
                  <span>Campus-Wide Student Chat</span>
                </div>

                {/* Oversized Display Headline */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.02] text-black">
                  Connect Beyond Your Department.
                </h1>

                {/* Subtitle */}
                <p className="mt-6 text-lg sm:text-xl text-[#242423] max-w-2xl mx-auto font-normal leading-relaxed">
                  The anonymous, real-time campus chat built for students. Meet new friends from Computer Studies, Nursing, Engineering, and more.
                </p>

                {/* Main CTA Controls */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {currentUser ? (
                    <button
                      onClick={() => setViewState('queue')}
                      className="btn-gumroad-primary text-lg px-8 py-4 w-full sm:w-auto shadow-lg"
                    >
                      <span>Start Chatting Now</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setViewState('register')}
                      className="btn-gumroad-primary text-lg px-8 py-4 w-full sm:w-auto shadow-lg"
                    >
                      <span>Join CapiTalk — It's Free</span>
                    </button>
                  )}

                  <a
                    href="#features"
                    className="btn-gumroad-ghost text-base px-6 py-4 w-full sm:w-auto"
                  >
                    <span>Explore Features</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </a>
                </div>

                {/* Micro Guarantee Label */}
                <p className="mt-4 text-xs font-medium text-[#242423]">
                  No real names or student IDs are ever shared inside chats.
                </p>
              </div>
            </section>


            {/* FEATURE CARDS GRID (Gumroad Hairline Aesthetic) */}
            <section id="features" className="py-8 sm:py-16 px-3 sm:px-8 max-w-[1200px] mx-auto">
              <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
                <span className="bg-[#701a31] text-white text-xs font-extrabold px-3.5 py-1 rounded-full border-2 border-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  Campus Built
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-black tracking-tight mt-3">
                  Designed for CU Students
                </h2>
                <p className="text-sm sm:text-base text-[#242423] mt-2">
                  Everything you need to discover new friendships and expand your campus network safely.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Feature 1 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#701a31] border-2 border-black flex items-center justify-center mb-4 sm:mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Smart Department Filtering
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Choose to pair with students from your own department or explore connections in Engineering, Nursing, Education, Business, Computer Studies, CAS, Maritime, and Criminology.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#ffc900] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Instant Real-Time Chat
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Fast messaging powered by WebSocket real-time streams with live typing indicators, delivery checkmarks, and instant skip options.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#f1f333] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Privacy-First &amp; Ephemeral
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    No real names or student numbers are exposed. Chat logs and temporary media expire automatically when a conversation ends.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#dc341e] border border-black flex items-center justify-center mb-4 sm:mb-6">
                    <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                    Safety &amp; Moderation
                  </h3>
                  <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                    Integrated profanity filters, instant reporting, user blocking, and administrative review to keep the community safe.
                  </p>
                </div>

                {/* Feature 5 - Campus Freedom Wall */}
                <div className="gumroad-feature-card p-5 sm:p-8 hover:border-black transition-colors bg-[#fff1f3] border-2 border-black flex flex-col justify-between">
                  <div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#ffc900] border-2 border-black flex items-center justify-center mb-4 sm:mb-6 text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      📜
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                        Campus Freedom Wall
                      </h3>
                      <span className="px-2.5 py-0.5 bg-[#701a31] text-white text-[10px] font-extrabold rounded-full border border-black uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#242423] mt-2 leading-relaxed">
                      Leave anonymous thoughts, confessions, study advice, &amp; campus shoutouts on a dedicated public board with upvotes and department filtering.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewState('freedom_wall')}
                    className="mt-4 text-xs font-extrabold text-[#701a31] underline hover:text-black transition-colors flex items-center gap-1 self-start"
                  >
                    <span>View Freedom Wall</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Feature 6 - Action CTA Card */}
                <div className="gumroad-feature-card p-5 sm:p-8 bg-[#701a31] text-black hover:opacity-95 transition-opacity flex flex-col justify-between border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div>
                    <CoinMascot size={40} tiltAngle={12} className="mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-extrabold text-black tracking-tight">
                      Ready to Connect &amp; Share?
                    </h3>
                    <p className="text-xs sm:text-sm text-black-200 mt-2">
                      Join hundreds of students chatting live or posting on the Freedom Wall right now!
                    </p>
                  </div>
                  <div className="mt-5 sm:mt-6 flex flex-col gap-2">
                    <button
                      onClick={() => setViewState(currentUser ? 'queue' : 'register')}
                      className="bg-[#c41e3a] text-white font-extrabold py-2.5 px-4 rounded-xl border-2 border-black hover:bg-white hover:text-black transition-all text-xs sm:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Launch Chat Room →
                    </button>
                    <button
                      onClick={() => setViewState('freedom_wall')}
                      className="bg-white text-black font-extrabold py-2 px-4 rounded-xl border-2 border-black hover:bg-black hover:text-white transition-all text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Open Freedom Wall
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* COMMUNITY GUIDELINES SECTION */}
            <section className="bg-white border-t border-[#d1d5dc] py-16 px-4 sm:px-8">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-extrabold text-black tracking-tight">
                    Community Guidelines
                  </h2>
                  <p className="text-sm text-[#242423] mt-1">
                    Keep CapiTalk safe, welcoming, and fun for all students.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> Be Respectful
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      Treat every fellow student with kindness. Harassment or toxicity will result in an immediate ban.
                    </p>
                  </div>

                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> Keep Private Details Safe
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      Do not share passwords, phone numbers, or student ID numbers in random chat rooms.
                    </p>
                  </div>

                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> No Explicit Media
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      NSFW images or hate speech are strictly prohibited and flagged for administrative review.
                    </p>
                  </div>

                  <div className="p-4 bg-[#f4f4f0] border border-[#d1d5dc] rounded-lg">
                    <h4 className="font-bold text-black text-sm flex items-center gap-2">
                      <span className="text-emerald-600">✓</span> Report Misconduct
                    </h4>
                    <p className="text-xs text-[#242423] mt-1">
                      Use the top-bar Report button anytime to alert CapiTalk moderators to inappropriate behavior.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER — hidden during active chat & full screen campus map */}
      {viewState !== 'chat' && viewState !== 'campus_map' && (
        <footer className="bg-[#f4f4f0] border-t border-[#d1d5dc] py-8 px-4 sm:px-8 mt-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CoinMascot size={28} tiltAngle={-6} />
              <span className="font-bold text-sm text-black">CapiTalk</span>
              <span className="text-xs text-[#242423]">© 2026 CapiTalk Student Community</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-[#242423]">
              <button onClick={() => setViewState('landing')} className="hover:text-black">
                Home
              </button>
              <button onClick={() => setViewState('register')} className="hover:text-black">
                Register
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
